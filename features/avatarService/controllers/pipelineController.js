const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { randomUUID } = require('crypto');
const { uploadImage, uploadAudio, paths } = require('../middleware/upload');
const { createModelFromImageWithRpm } = require('../providers/rpmProvider');
const { createJob, updateJob, getJob } = require('../models/jobsDb');
const AvatarService = require('../avatarService');
const { ensureRhubarbCompatible } = require('../utils/audioConverter');
const { UserAvatar, AvatarAnimation } = require('../models/Avatar');

const service = new AvatarService();

function handleAsync(handler) {
  return async (req, res, next) => { try { await handler(req, res, next); } catch (e) { next(e); } };
}

// POST /api/avatar/pipeline/image -> { jobId }
const uploadImageMiddleware = uploadImage.single('image');
const startImageToModel = handleAsync(async (req, res) => {
  console.log('📤 [FRONTEND->BACKEND] Image upload received:', {
    filename: req.file?.originalname,
    size: req.file?.size,
    mimetype: req.file?.mimetype,
    path: req.file?.path
  });
  
  if (!req.file) return res.status(400).json({ error: 'image file is required' });
  
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const modelOutPath = path.join(paths.modelsDir, `${randomUUID()}.glb`);
  const job = createJob('image-to-model', { 
    imagePath: req.file.path, 
    modelOutPath,
    userId: userId, // Store user_id in job
    originalFilename: req.file.originalname
  });

  console.log('🆔 [JOB] Created job:', { jobId: job.id, type: 'image-to-model', userId });

  const provider = (process.env.AVATAR_PROVIDER || '').toUpperCase();
  updateJob(job.id, { status: 'running' });
  console.log('🔄 [JOB] Status updated to running:', job.id);
  
  if (provider === 'RPM') {
    console.log('🎯 [RPM] Starting Ready Player Me processing...');
    // Ready Player Me flow
    createModelFromImageWithRpm(req.file.path, modelOutPath)
      .then(async () => {
        console.log('✅ [RPM] Model creation completed, creating avatar record...');
        try {
          // Save to PostgreSQL ONLY
          const avatarId = randomUUID();
          const modelUrl = service.buildPublicUrl(modelOutPath);
          const avatarName = path.parse(req.file.originalname).name;
          
          const dbAvatar = await UserAvatar.create({
            id: avatarId,
            user_id: userId,
            name: avatarName,
            description: '',
            model_path: modelOutPath,
            model_url: modelUrl,
            metadata: {
              original_filename: req.file.originalname,
              mime_type: req.file.mimetype,
              size: req.file.size,
              source: 'pipeline_image_to_model'
            }
          });
          
          console.log('✅ [AVATAR] Avatar saved to PostgreSQL:', { id: dbAvatar.id, name: dbAvatar.name, user: userId });
          updateJob(job.id, { status: 'completed', result: { avatarId: dbAvatar.id, modelUrl: modelUrl } });
          console.log('✅ [JOB] Job completed successfully:', job.id);
        } catch (err) {
          console.error('❌ [AVATAR] Avatar creation error:', err);
          updateJob(job.id, { status: 'failed', error: String(err?.message || err) });
          console.log('❌ [JOB] Job failed:', job.id);
        }
      })
      .catch((err) => {
        console.error('❌ [RPM] RPM processing error:', err);
        updateJob(job.id, { status: 'failed', error: String(err?.message || err) });
        console.log('❌ [JOB] Job failed:', job.id);
      });
  } else {
    // External command fallback
    const cmd = process.env.AVATAR_IMAGE2MODEL_CMD;
    if (!cmd) {
      updateJob(job.id, { status: 'failed', error: 'No provider configured (set AVATAR_PROVIDER=RPM) and no AVATAR_IMAGE2MODEL_CMD set' });
    } else {
      const composed = cmd.replace('<image>', JSON.stringify(req.file.path)).replace('<out>', JSON.stringify(modelOutPath));
      const child = spawn(composed, { shell: true });
      child.on('exit', async (code) => {
        if (code === 0) {
          try {
            // Save to PostgreSQL ONLY
            const avatarId = randomUUID();
            const modelUrl = service.buildPublicUrl(modelOutPath);
            const avatarName = path.parse(req.file.originalname).name;
            
            const dbAvatar = await UserAvatar.create({
              id: avatarId,
              user_id: userId,
              name: avatarName,
              description: '',
              model_path: modelOutPath,
              model_url: modelUrl,
              metadata: {
                original_filename: req.file.originalname,
                source: 'pipeline_image_to_model_external'
              }
            });
            
            console.log('✅ [AVATAR] Avatar saved to PostgreSQL:', { id: dbAvatar.id, name: dbAvatar.name });
            updateJob(job.id, { status: 'completed', result: { avatarId: dbAvatar.id, modelUrl: modelUrl } });
          } catch (err) {
            updateJob(job.id, { status: 'failed', error: String(err?.message || err) });
          }
        } else {
          updateJob(job.id, { status: 'failed', error: `converter exited with code ${code}` });
        }
      });
    }
  }
  
  const response = { ok: true, jobId: job.id };
  console.log('📤 [BACKEND->FRONTEND] Job started response:', response);
  return res.status(202).json(response);
});

// POST /api/avatar/pipeline/:id/audio -> { jobId }
const uploadAudioMiddleware = uploadAudio.single('audio');
const startAudioToLipsync = handleAsync(async (req, res) => {
  console.log('📤 [FRONTEND->BACKEND] Audio upload received:', {
    avatarId: req.params.id,
    filename: req.file?.originalname,
    size: req.file?.size,
    mimetype: req.file?.mimetype,
    path: req.file?.path
  });
  
  if (!req.file) return res.status(400).json({ error: 'audio file is required' });
  
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const avatarId = req.params.id;
  const lipsyncOutPath = path.join(paths.lipsyncDir, `${randomUUID()}.json`);
  const job = createJob('audio-to-lipsync', { 
    avatarId, 
    audioPath: req.file.path, 
    lipsyncOutPath,
    userId: userId
  });

  console.log('🆔 [JOB] Created job:', { jobId: job.id, type: 'audio-to-lipsync', avatarId, userId });

  try {
    // Ensure audio is in Rhubarb-compatible format
    console.log('🔄 [AUDIO] Preparing audio for Rhubarb processing...');
    const compatibleAudioPath = await ensureRhubarbCompatible(req.file.path);
    console.log('✅ [AUDIO] Audio prepared for Rhubarb:', compatibleAudioPath);

    // Get Rhubarb command from environment variable, with fallback for Docker
    const rhubarbCmd = process.env.RHUBARB_CMD || '/usr/local/bin/rhubarb';
    if (!rhubarbCmd) {
      const errorMsg = 'RHUBARB_CMD environment variable is not set. Please configure it in your .env file.';
      console.error('❌ [RHUBARB]', errorMsg);
      updateJob(job.id, { status: 'failed', error: errorMsg });
      return res.status(500).json({ error: errorMsg });
    }
    
    // Verify Rhubarb executable exists
    if (!fs.existsSync(rhubarbCmd)) {
      const errorMsg = `Rhubarb executable not found at: ${rhubarbCmd}. Please install Rhubarb or set RHUBARB_CMD to the correct path.`;
      console.error('❌ [RHUBARB]', errorMsg);
      updateJob(job.id, { status: 'failed', error: errorMsg });
      return res.status(500).json({ error: errorMsg });
    }

    const args = ['-f', 'json', '-o', lipsyncOutPath, compatibleAudioPath];
    console.log('🎵 [RHUBARB] Starting lipsync generation:', { cmd: rhubarbCmd, args, outputPath: lipsyncOutPath });
    
    const child = spawn(rhubarbCmd, args, { 
      shell: process.platform === 'win32'
    });
    
    let stdoutData = '';
    let stderrData = '';
    
    child.stdout?.on('data', (data) => {
      stdoutData += data.toString();
      console.log('[RHUBARB stdout]', data.toString().trim());
    });
    
    child.stderr?.on('data', (data) => {
      stderrData += data.toString();
      console.error('[RHUBARB stderr]', data.toString().trim());
    });
    
    updateJob(job.id, { status: 'running' });
    console.log('🔄 [JOB] Status updated to running:', job.id);
    
    child.on('exit', async (code) => {
      console.log('🎵 [RHUBARB] Process exited with code:', code);
      if (code === 0) {
        console.log('✅ [RHUBARB] Lipsync generation completed, saving to PostgreSQL...');
        try {
          const lipsyncUrl = service.buildPublicUrl(lipsyncOutPath);
          const audioUrl = service.buildPublicUrl(compatibleAudioPath);
          
          // Read lipsync data
          const fs = require('fs');
          let lipsyncData = null;
          try {
            const fileContent = fs.readFileSync(lipsyncOutPath, 'utf-8');
            lipsyncData = JSON.parse(fileContent);
          } catch (parseError) {
            console.warn('Could not parse lipsync JSON:', parseError.message);
          }
          
          // Save to PostgreSQL ONLY
          const animation = await AvatarAnimation.create({
            avatar_id: avatarId,
            user_id: userId,
            audio_path: compatibleAudioPath,
            audio_url: audioUrl,
            lipsync_path: lipsyncOutPath,
            lipsync_url: lipsyncUrl,
            lipsync_data: lipsyncData,
            status: 'completed',
            metadata: {
              original_audio_filename: req.file.originalname,
              source: 'pipeline_rhubarb'
            }
          });
          
          console.log('✅ [LIPSYNC] Animation saved to PostgreSQL:', { id: animation.id, avatar: avatarId, user: userId });
          
          updateJob(job.id, { status: 'completed', result: { lipsyncId: animation.id, lipsyncUrl: lipsyncUrl, audioUrl: audioUrl } });
          console.log('✅ [JOB] Job completed successfully:', job.id);
        } catch (err) {
          console.error('❌ [LIPSYNC] Save error:', err);
          updateJob(job.id, { status: 'failed', error: String(err?.message || err) });
          console.log('❌ [JOB] Job failed:', job.id);
        }
      } else {
        console.error('❌ [RHUBARB] Process failed with code:', code);
        console.error('❌ [RHUBARB] stdout:', stdoutData);
        console.error('❌ [RHUBARB] stderr:', stderrData);
        
        let errorMessage = `Rhubarb exited with code ${code}`;
        
        // Provide more specific error messages based on exit code or output
        if (code === 1) {
          errorMessage = 'Audio format not supported by Rhubarb. Error: ' + (stderrData || stdoutData || 'Unknown');
        } else if (code === 2) {
          errorMessage = 'Rhubarb could not process the audio file. Error: ' + (stderrData || stdoutData || 'Unknown');
        }
        
        updateJob(job.id, { status: 'failed', error: errorMessage });
        console.log('❌ [JOB] Job failed:', job.id);
      }
    });

    child.on('error', (err) => {
      console.error('❌ [RHUBARB] Process error:', err);
      updateJob(job.id, { status: 'failed', error: `Failed to start Rhubarb: ${err.message}` });
      console.log('❌ [JOB] Job failed:', job.id);
    });
    
  } catch (err) {
    console.error('❌ [AUDIO] Audio processing error:', err);
    updateJob(job.id, { status: 'failed', error: String(err?.message || err) });
    console.log('❌ [JOB] Job failed:', job.id);
  }
  
  const response = { ok: true, jobId: job.id };
  console.log('📤 [BACKEND->FRONTEND] Audio job started response:', response);
  return res.status(202).json(response);
});

// GET /api/avatar/pipeline/jobs/:jobId
const getJobStatus = handleAsync(async (req, res) => {
  const jobId = req.params.jobId;
  console.log('📥 [FRONTEND->BACKEND] Job status request:', jobId);
  
  const job = getJob(jobId);
  if (!job) {
    console.log('❌ [JOB] Job not found:', jobId);
    return res.status(404).json({ error: 'Job not found' });
  }
  
  const response = { ok: true, job };
  console.log('📤 [BACKEND->FRONTEND] Job status response:', { jobId, status: job.status });
  return res.json(response);
});

module.exports = {
  uploadImageMiddleware,
  startImageToModel,
  uploadAudioMiddleware,
  startAudioToLipsync,
  getJobStatus
};


