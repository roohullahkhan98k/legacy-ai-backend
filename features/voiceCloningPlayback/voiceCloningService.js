const { ElevenLabsClient, play } = require('@elevenlabs/elevenlabs-js');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');

// Set ffmpeg and ffprobe paths
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

class VoiceCloningService {
  constructor() {
    this.name = 'Voice Cloning & Playback Service';
    this.status = 'Ready for APIs';
    this.apiKey = process.env.ELEVEN_LABS_API_FOR_VOICE;
    
    if (!this.apiKey) {
      console.warn('⚠️ ELEVEN_LABS_API_FOR_VOICE not found - voice cloning will be limited');
    } else {
      this.client = new ElevenLabsClient({
        apiKey: this.apiKey
      });
      console.log('✅ ElevenLabs client initialized');
    }
    
    // Ensure uploads directory exists
    this.uploadsDir = path.resolve(process.cwd(), 'uploads', 'voice-samples');
    this.ensureUploadsDir();
  }

  // Resolve a provided identifier (name or id) to a valid ElevenLabs voice_id
  async resolveVoiceId(identifier) {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    console.log(`🔍 Attempting to resolve voice identifier: "${identifier}"`);

    // Fast path: try treating it as an ID first
    try {
      console.log(`🔍 Trying as voice ID...`);
      const v = await this.client.voices.get(identifier);
      if (v && (v.voiceId || v.voice_id || v.id)) {
        const resolvedId = v.voiceId || v.voice_id || v.id;
        console.log(`✅ Found voice by ID: ${resolvedId} (Name: ${v.name})`);
        return resolvedId;
      }
    } catch (e) {
      console.log(`⚠️ Not found as ID, trying as name... (${e.message})`);
    }

    // Fallback: search by name (case-insensitive exact match) across ALL voices
    console.log(`🔍 Searching all voices by name...`);
    const all = await this.client.voices.getAll();
    const voicesArray = Array.isArray(all) ? all : (all && Array.isArray(all.voices) ? all.voices : []);

    if (!Array.isArray(voicesArray)) {
      throw new Error('Failed to load voices to resolve identifier');
    }

    console.log(`📋 Searching ${voicesArray.length} voices for name match...`);
    const normalized = String(identifier).trim().toLowerCase();
    const match = voicesArray.find((v) => String(v.name || '').trim().toLowerCase() === normalized);

    if (match && (match.voiceId || match.voice_id || match.id)) {
      const resolvedId = match.voiceId || match.voice_id || match.id;
      console.log(`✅ Resolved voice name "${identifier}" to ID: ${resolvedId}`);
      return resolvedId;
    }

    // Debug log ALL voices to help troubleshoot
    console.error('❌ Could not resolve voice identifier. ALL available voices:');
    voicesArray.forEach((v) => {
      console.error(`  - Name: "${v.name}" | ID: ${v.voiceId || v.voice_id || v.id || 'unknown'} | Category: ${v.category}`);
    });

    throw new Error(`Voice not found by id or name: ${identifier}. If you see the voice ID "${identifier}" in ElevenLabs dashboard but not in the list above, you need to ADD IT TO YOUR VOICE LAB from the Voice Library.`);
  }

  async ensureUploadsDir() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating uploads directory:', error);
    }
  }

  // Convert audio to WAV format for ElevenLabs compatibility
  async convertToWav(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('wav')
        .audioChannels(1) // Mono
        .audioFrequency(16000) // 16kHz - supported by ElevenLabs for voice cloning
        .audioCodec('pcm_s16le') // 16-bit
        .on('end', () => {
          console.log('✅ Audio converted to WAV successfully');
          resolve();
        })
        .on('error', (err) => {
          console.error('❌ Audio conversion failed:', err);
          reject(err);
        })
        .save(outputPath);
    });
  }

  // Get audio duration using FFmpeg
  async getAudioDuration(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.warn('Could not get audio duration:', err.message);
          resolve(0); // Default to 0 if we can't get duration
        } else {
          const duration = metadata.format.duration || 0;
          resolve(duration);
        }
      });
    });
  }

  // Trim audio to 30 seconds for voice cloning
  async trimAudioTo30Seconds(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      console.log('✂️ Trimming audio to 30 seconds...');
      
      ffmpeg(inputPath)
        .toFormat('wav')
        .audioChannels(1) // Mono
        .audioFrequency(16000) // 16kHz
        .audioCodec('pcm_s16le') // 16-bit
        .duration(30) // Trim to 30 seconds
        .on('end', () => {
          console.log('✅ Audio trimmed to 30 seconds successfully');
          resolve();
        })
        .on('error', (err) => {
          console.error('❌ Error trimming audio:', err.message);
          reject(err);
        })
        .save(outputPath);
    });
  }

  // Clone voice from audio sample - EXACT same approach as test
  async cloneVoice(audioBuffer, voiceName, description = '', originalMimeType = 'audio/webm') {
    try {
      if (!this.apiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      console.log('🎤 Starting voice cloning process...');
      console.log('📁 Audio buffer size:', audioBuffer.length, 'bytes');
      console.log('📁 Original MIME type:', originalMimeType);
      
      // Create a simple WAV file from your audio (EXACT same as test)
      const timestamp = Date.now();
      const testAudioPath = path.join(this.uploadsDir, `real_audio_${timestamp}.wav`);
      
      // Save original audio with correct extension based on MIME type
      const originalExtension = originalMimeType.includes('m4a') ? '.m4a' : 
                               originalMimeType.includes('mp3') ? '.mp3' : 
                               originalMimeType.includes('wav') ? '.wav' : '.webm';
      const originalFilepath = path.join(this.uploadsDir, `original_${timestamp}${originalExtension}`);
      await fs.writeFile(originalFilepath, audioBuffer);
      
      // Convert to WAV using the same method as test
      await this.convertToWav(originalFilepath, testAudioPath);
      
      // Trim if needed (same as before)
      const audioDuration = await this.getAudioDuration(testAudioPath);
      console.log('⏱️ Audio duration:', audioDuration, 'seconds');
      
      let finalAudioPath = testAudioPath;
      if (audioDuration > 30) {
        console.log('⚠️ Audio is too long. Trimming to 30 seconds...');
        const trimmedPath = path.join(this.uploadsDir, `trimmed_real_audio_${timestamp}.wav`);
        await this.trimAudioTo30Seconds(testAudioPath, trimmedPath);
        finalAudioPath = trimmedPath;
      }
      
      // Test API connection first
      console.log('🧪 Testing API connection...');
      const apiTest = await this.testApiConnection();
      if (!apiTest) {
        throw new Error('ElevenLabs API connection failed. Please check your API key and internet connection.');
      }
      
      // Use EXACT same approach as working test
      console.log('📤 Creating voice with ElevenLabs API (EXACT same as test)...');
      console.log('  - Name:', voiceName);
      console.log('  - File:', finalAudioPath);
      
      // Read the file as a buffer (EXACT same as test)
      const fileBuffer = await fs.readFile(finalAudioPath);
      
      // Try IVC API first (EXACT same as test)
      try {
        console.log('📤 Trying IVC API first...');
        const voice = await this.client.voices.ivc.create({
          name: voiceName,
          files: [fileBuffer]
        });
        
        // Log the full response to debug
        console.log('📋 Full IVC API Response:', JSON.stringify(voice, null, 2));
        
        // Extract voice ID - SDK might return camelCase 'voiceId' or snake_case 'voice_id'
        const voiceId = voice.voiceId || voice.voice_id || voice.id;
        
        if (!voiceId) {
          console.error('❌ No voice ID found in IVC response!', voice);
          throw new Error('Voice created but no voice ID returned');
        }
        
        console.log('✅ Voice created successfully with IVC API:', voiceId);
        console.log('📝 Voice Name:', voice.name || voiceName);
        
        // Verify the voice exists by fetching it
        try {
          console.log('🔍 Verifying voice exists...');
          const verifiedVoice = await this.client.voices.get(voiceId);
          console.log('✅ Voice verified:', verifiedVoice.name, '(ID:', voiceId, ')');
          console.log('📊 Voice samples:', verifiedVoice.samples?.length || 0);
        } catch (verifyError) {
          console.warn('⚠️ Voice verification failed:', verifyError.message);
        }
        
        // Clean up temporary files
        try {
          await fs.unlink(finalAudioPath);
          await fs.unlink(originalFilepath);
          if (finalAudioPath !== testAudioPath) {
            await fs.unlink(testAudioPath);
          }
        } catch (cleanupError) {
          console.warn('Warning: Could not clean up temporary files:', cleanupError.message);
        }
        
        return {
          voiceId: voiceId,
          name: voice.name || voiceName,
          status: 'cloned',
          timestamp: new Date().toISOString()
        };
        
      } catch (ivcError) {
        console.log('❌ IVC API failed:', ivcError.message);
        
        // Try REST API as fallback (EXACT same as test)
        console.log('📤 Trying REST API fallback...');
        
        // Use native FormData (Node.js 18+)
        const form = new FormData();
        
        form.append('name', voiceName);
        form.append('files', new Blob([fileBuffer], { type: 'audio/wav' }), 'real_audio.wav');
        
        // Debug: Log what we're sending
        console.log('🔍 File buffer size:', fileBuffer.length);
        console.log('🔍 Voice name:', voiceName);
        
        const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
          method: 'POST',
          headers: {
            'xi-api-key': this.apiKey
          },
          body: form
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ ElevenLabs API Error Response:', errorText);
          console.error('❌ Response Status:', response.status);
          console.error('❌ Response Headers:', Object.fromEntries(response.headers.entries()));
          
          // Clean up temporary files
          try {
            await fs.unlink(finalAudioPath);
            await fs.unlink(originalFilepath);
            if (finalAudioPath !== testAudioPath) {
              await fs.unlink(testAudioPath);
            }
          } catch (cleanupError) {
            console.warn('Warning: Could not clean up temporary files:', cleanupError.message);
          }
          
          throw new Error(`Voice creation failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const voice = await response.json();
        
        // Log the full response to debug
        console.log('📋 Full API Response:', JSON.stringify(voice, null, 2));
        
        // Extract voice ID - SDK might return camelCase 'voiceId' or snake_case 'voice_id'
        const voiceId = voice.voiceId || voice.voice_id || voice.id;
        
        if (!voiceId) {
          console.error('❌ No voice ID found in response!', voice);
          throw new Error('Voice created but no voice ID returned. Response: ' + JSON.stringify(voice));
        }
        
        console.log('✅ Voice created successfully with REST API:', voiceId);
        console.log('📝 Voice Name:', voice.name || voiceName);
        
        // Verify the voice exists by fetching it
        try {
          console.log('🔍 Verifying voice exists...');
          const verifyResponse = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
            method: 'GET',
            headers: {
              'xi-api-key': this.apiKey
            }
          });
          
          if (verifyResponse.ok) {
            const verifiedVoice = await verifyResponse.json();
            console.log('✅ Voice verified:', verifiedVoice.name, '(ID:', voiceId, ')');
            console.log('📊 Voice samples:', verifiedVoice.samples?.length || 0);
          } else {
            console.warn('⚠️ Could not verify voice:', verifyResponse.status);
          }
        } catch (verifyError) {
          console.warn('⚠️ Voice verification failed:', verifyError.message);
        }
        
        // Clean up temporary files
        try {
          await fs.unlink(finalAudioPath);
          await fs.unlink(originalFilepath);
          if (finalAudioPath !== testAudioPath) {
            await fs.unlink(testAudioPath);
          }
        } catch (cleanupError) {
          console.warn('Warning: Could not clean up temporary files:', cleanupError.message);
        }
        
        return {
          voiceId: voiceId,
          name: voice.name || voiceName,
          status: 'cloned',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('❌ Voice cloning failed:', error.message);
      throw error;
    }
  }

  // Generate speech from text using cloned voice
  async generateSpeech(text, voiceId, options = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      console.log('🔊 Generating speech with voice identifier:', voiceId);
      console.log('📝 Text:', text);
      
      // Resolve provided identifier (it may be a name from the frontend)
      const resolvedVoiceId = await this.resolveVoiceId(voiceId);
      console.log('🔧 Using resolved voice ID:', resolvedVoiceId);
      
      // First, verify the voice exists
      try {
        console.log('🔍 Verifying voice exists before generating speech...');
        const voice = await this.client.voices.get(resolvedVoiceId);
        console.log('✅ Voice found:', voice.name);
        console.log('📊 Voice has', voice.samples?.length || 0, 'samples');
        
        if (!voice.samples || voice.samples.length === 0) {
          console.warn('⚠️ WARNING: Voice has no samples! This may cause issues.');
        }
      } catch (voiceError) {
        console.error('❌ Voice not found:', resolvedVoiceId);
        console.error('❌ Error:', voiceError.message);
        
        // List available voices to help debug
        try {
          const voices = await this.getVoices();
          console.log('📋 Available cloned voices:');
          voices.forEach(v => {
            console.log(`  - ${v.name} (ID: ${v.voiceId})`);
          });
        } catch (listError) {
          console.error('❌ Could not list voices:', listError.message);
        }
        
        throw new Error(`Voice not found: ${resolvedVoiceId}. Please check the voice ID is correct.`);
      }
      
      const audio = await this.client.textToSpeech.convert(
        resolvedVoiceId, // voice_id
        {
          text: text,
          modelId: options.modelId || 'eleven_multilingual_v2',
          outputFormat: options.outputFormat || 'mp3_44100_128',
          voiceSettings: options.voiceSettings || {
            stability: 0.5,
            similarityBoost: 0.75
          }
        }
      );

      // Save generated audio
      const timestamp = Date.now();
      const filename = `generated_speech_${timestamp}.mp3`;
      const filepath = path.join(this.uploadsDir, filename);
      
      await fs.writeFile(filepath, audio);
      
      const audioUrl = `/uploads/voice-samples/${filename}`;
      
      console.log('✅ Speech generated successfully:', audioUrl);
      
      return {
        audioUrl: audioUrl,
        audioPath: audioUrl, // For DB storage
        filename: filename,
        duration: options.duration || 0,
        text: text,
        voiceId: resolvedVoiceId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Speech generation failed:', error.message);
      console.error('❌ Full error:', error);
      throw error;
    }
  }

  // Get all available voices (including cloned ones)
  async getVoices() {
    try {
      if (!this.apiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      const voices = await this.client.voices.getAll();
      
      // DEBUG: Log the raw response structure
      console.log('🔍 Raw API response type:', typeof voices);
      console.log('🔍 Raw API response keys:', voices ? Object.keys(voices) : 'null');

      // Extract the voices array from the response object
      let voicesArray = [];
      if (typeof voices === 'object' && voices.voices && Array.isArray(voices.voices)) {
        voicesArray = voices.voices;
        console.log(`📦 Extracted ${voicesArray.length} voices from response.voices`);
      } else if (Array.isArray(voices)) {
        voicesArray = voices;
        console.log(`📦 Response is already an array with ${voicesArray.length} voices`);
      } else {
        console.log('⚠️ Could not find voices array in response');
        console.log('🔍 Full response:', JSON.stringify(voices, null, 2));
        return [];
      }

      console.log(`✅ Found ${voicesArray.length} total voices`);
      
      // DEBUG: Log ALL voice IDs from the API
      console.log('📋 All voice IDs from API:');
      voicesArray.forEach(v => {
        const vid = v.voiceId || v.voice_id || v.id;
        console.log(`  - ${v.name} | ID: ${vid} | Category: ${v.category}`);
        
        // DEBUG: For cloned voices, show ALL properties
        if (v.category === 'cloned' || v.category === 'instant' || v.category === 'generated') {
          console.log(`    🔍 RAW CLONED VOICE OBJECT:`, JSON.stringify(v, null, 2));
        }
      });

      // Return all voices with normalized id
      return voicesArray.map(voice => {
        // SDK returns camelCase 'voiceId', not snake_case 'voice_id'
        const voiceId = voice.voiceId || voice.voice_id || voice.id;
        
        return {
          voiceId: voiceId,
          name: voice.name,
          category: voice.category,
          description: voice.description,
          labels: voice.labels || {},
          isCloned: (voice.category === 'cloned' || voice.category === 'instant' || voice.category === 'generated')
        };
      });
    } catch (error) {
      console.error('❌ Failed to get voices:', error.message);
      throw error;
    }
  }

  // Delete a cloned voice
  async deleteVoice(voiceId) {
    try {
      if (!this.apiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      await this.client.voices.delete(voiceId);
      console.log('✅ Voice deleted successfully:', voiceId);
      
      return {
        voiceId: voiceId,
        status: 'deleted',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Voice deletion failed:', error.message);
      throw error;
    }
  }

  // Get voice details
  async getVoiceDetails(voiceId) {
    try {
      if (!this.apiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      const voice = await this.client.voices.get(voiceId);
      
      // SDK returns camelCase 'voiceId', not snake_case 'voice_id'
      const extractedVoiceId = voice.voiceId || voice.voice_id || voice.id;
      
      return {
        voiceId: extractedVoiceId,
        name: voice.name,
        category: voice.category,
        description: voice.description,
        labels: voice.labels,
        isCloned: voice.category === 'cloned',
        samples: voice.samples || []
      };
    } catch (error) {
      console.error('❌ Failed to get voice details:', error.message);
      throw error;
    }
  }

  // Play audio using ElevenLabs play function
  async playAudio(audioUrl) {
    try {
      console.log('▶️ Audio playback requested:', audioUrl);
      
      // For server-side playback, we can use the ElevenLabs play function
      // Note: This is mainly for testing. Frontend should handle actual playback
      if (audioUrl && audioUrl.startsWith('/uploads/')) {
        const filepath = path.join(process.cwd(), audioUrl);
        const audioBuffer = await fs.readFile(filepath);
        
        // Use ElevenLabs play function for server-side playback
        await play(audioBuffer);
        
        return { 
          status: 'played_successfully', 
          audioUrl,
          timestamp: new Date().toISOString()
        };
      } else {
        return { 
          status: 'ready_for_playback', 
          audioUrl,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('❌ Audio playback failed:', error.message);
      return { 
        status: 'playback_failed', 
        audioUrl,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.apiKey) {
        return {
          status: 'warning',
          message: 'ElevenLabs API key not configured',
          apiKey: false
        };
      }

      // Test API connection by getting voices
      console.log('🔍 Testing API connection...');
      const voices = await this.client.voices.getAll();
      console.log('🔍 Health check - voices response:', typeof voices);
      
      return {
        status: 'healthy',
        message: 'ElevenLabs API connection successful',
        apiKey: true
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'ElevenLabs API connection failed',
        error: error.message,
        apiKey: !!this.apiKey
      };
    }
  }

  // Test ElevenLabs API connection
  async testApiConnection() {
    try {
      console.log('🧪 Testing ElevenLabs API connection...');
      
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        method: 'GET',
        headers: {
          'xi-api-key': this.apiKey
        }
      });
      
      if (response.ok) {
        const voices = await response.json();
        console.log('✅ API connection successful! Found', voices.voices?.length || 0, 'voices');
        return true;
      } else {
        console.error('❌ API connection failed:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ API connection error:', error.message);
      return false;
    }
  }

  // Test with fake audio file
  async testWithFakeAudio() {
    try {
      console.log('🧪 Testing with fake audio file...');
      
      // Create a simple test audio file (1 second of silence)
      const testAudioPath = path.join(this.uploadsDir, 'test_audio.wav');
      
      // Create a minimal WAV file (1 second of silence at 16kHz)
      const sampleRate = 16000;
      const duration = 1; // 1 second
      const numSamples = sampleRate * duration;
      
      // WAV header (44 bytes)
      const header = Buffer.alloc(44);
      header.write('RIFF', 0);
      header.writeUInt32LE(36 + numSamples * 2, 4); // File size
      header.write('WAVE', 8);
      header.write('fmt ', 12);
      header.writeUInt32LE(16, 16); // fmt chunk size
      header.writeUInt16LE(1, 20); // PCM format
      header.writeUInt16LE(1, 22); // Mono
      header.writeUInt32LE(sampleRate, 24); // Sample rate
      header.writeUInt32LE(sampleRate * 2, 28); // Byte rate
      header.writeUInt16LE(2, 32); // Block align
      header.writeUInt16LE(16, 34); // Bits per sample
      header.write('data', 36);
      header.writeUInt32LE(numSamples * 2, 40); // Data size
      
      // Create silent audio data
      const audioData = Buffer.alloc(numSamples * 2, 0); // 16-bit samples
      
      // Combine header and audio data
      const wavFile = Buffer.concat([header, audioData]);
      
      // Write test file
      await fs.writeFile(testAudioPath, wavFile);
      console.log('✅ Test audio file created:', testAudioPath);
      
      // Try to create voice with test file
      const fileBuffer = await fs.readFile(testAudioPath);
      
      try {
        const voice = await this.client.voices.ivc.create({
          name: 'Test Voice Clone',
          files: [fileBuffer]
        });
        
        const voiceId = voice.voiceId || voice.voice_id || voice.id;
        console.log('✅ Test voice created successfully:', voiceId);
        
        // Clean up test file
        await fs.unlink(testAudioPath);
        
        return {
          success: true,
          voiceId: voiceId,
          message: 'Test voice creation successful!'
        };
        
      } catch (ivcError) {
        console.log('❌ IVC API failed:', ivcError.message);
        
        // Try REST API as fallback
        const form = new FormData();
        
        form.append('name', 'Test Voice Clone');
        form.append('files', new Blob([fileBuffer], { type: 'audio/wav' }), 'test_audio.wav');
        
        const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
          method: 'POST',
          headers: {
            'xi-api-key': this.apiKey
          },
          body: form
        });
        
        if (response.ok) {
          const voice = await response.json();
          const voiceId = voice.voiceId || voice.voice_id || voice.id;
          console.log('✅ Test voice created with REST API:', voiceId);
          
          // Clean up test file
          await fs.unlink(testAudioPath);
          
          return {
            success: true,
            voiceId: voiceId,
            message: 'Test voice creation successful with REST API!'
          };
        } else {
          const errorText = await response.text();
          console.log('❌ REST API also failed:', errorText);
          
          // Clean up test file
          await fs.unlink(testAudioPath);
          
          return {
            success: false,
            error: errorText,
            message: 'Both IVC and REST API failed'
          };
        }
      }
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Test failed'
      };
    }
  }
}

module.exports = VoiceCloningService;
