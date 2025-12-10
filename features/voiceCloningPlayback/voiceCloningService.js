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

  // Clone voice from audio sample - Store locally (not in ElevenLabs to avoid 30 limit)
  // accent: 'en', 'ar', 'hi', 'es', 'fr', 'de', etc. (optional - will auto-detect if not provided)
  async cloneVoice(audioBuffer, voiceName, description = '', originalMimeType = 'audio/webm', accent = null) {
    try {
      if (!this.apiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      console.log('🎤 Starting voice cloning process (LOCAL STORAGE)...');
      console.log('📁 Audio buffer size:', audioBuffer.length, 'bytes');
      console.log('📁 Original MIME type:', originalMimeType);
      
      // Auto-detect accent if not provided (from voice name or description)
      let detectedAccent = accent;
      if (!detectedAccent) {
        // Try to detect from voice name or description
        const textToCheck = `${voiceName} ${description}`.toLowerCase();
        const languageDetectionService = require('../../../common/services/LanguageDetectionService');
        const detection = languageDetectionService.detectLanguage(textToCheck);
        detectedAccent = detection.language || 'en';
        console.log('🔍 Auto-detected accent from name/description:', detectedAccent);
      } else {
        console.log('🌍 Using provided accent:', detectedAccent);
      }
      
      // Create a simple WAV file from your audio (EXACT same as test)
      const timestamp = Date.now();
      const testAudioPath = path.join(this.uploadsDir, `real_audio_${timestamp}.wav`);
      
      // Save original audio locally (this is our voice clone - not stored in ElevenLabs)
      const originalExtension = originalMimeType.includes('m4a') ? '.m4a' : 
                               originalMimeType.includes('mp3') ? '.mp3' : 
                               originalMimeType.includes('wav') ? '.wav' : '.webm';
      // Use a unique local ID instead of ElevenLabs voice_id
      const localVoiceId = `local_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
      const originalFilepath = path.join(this.uploadsDir, `voice_clone_${localVoiceId}${originalExtension}`);
      await fs.writeFile(originalFilepath, audioBuffer);
      console.log('💾 Voice clone saved locally:', originalFilepath);
      
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
      
      // Clean up temporary conversion files (keep original)
      try {
        if (finalAudioPath !== originalFilepath) {
          await fs.unlink(finalAudioPath);
        }
        if (finalAudioPath !== testAudioPath && testAudioPath !== originalFilepath) {
          await fs.unlink(testAudioPath);
        }
      } catch (cleanupError) {
        console.warn('Warning: Could not clean up temporary files:', cleanupError.message);
      }
      
      // Return local voice ID (not stored in ElevenLabs - avoids 30 clone limit)
      console.log('✅ Voice clone saved locally (not in ElevenLabs)');
      console.log('💾 Local voice ID:', localVoiceId);
      console.log('📁 Sample file:', originalFilepath);
      
      return {
        voiceId: localVoiceId, // Local ID, not ElevenLabs ID
        name: voiceName,
        status: 'cloned_local',
        accent: detectedAccent, // Use detected accent
        sampleFilePath: `/uploads/voice-samples/voice_clone_${localVoiceId}${originalExtension}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Voice cloning failed:', error.message);
      throw error;
    }
  }

  // Generate speech from text using cloned voice (supports local clones and accents)
  async generateSpeech(text, voiceId, options = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      console.log('🔊 Generating speech with voice identifier:', voiceId);
      console.log('📝 Text:', text);
      
      // Auto-detect accent from text if not provided
      let accentToUse = options.accent;
      if (!accentToUse) {
        const languageDetectionService = require('../../../common/services/LanguageDetectionService');
        const detection = languageDetectionService.detectLanguage(text);
        accentToUse = detection.language || 'en';
        console.log('🔍 Auto-detected accent from text:', accentToUse);
      } else {
        console.log('🌍 Using provided accent:', accentToUse);
      }
      
      // Check if this is a local voice clone (starts with "local_")
      const isLocalVoice = voiceId && voiceId.startsWith('local_');
      
      if (isLocalVoice) {
        // Use local voice sample with temporary clone (create, use, delete - avoids 30 limit)
        console.log('💾 Using LOCAL voice clone (temporary clone method - no 30 limit!)');
        
        // Find the local voice sample file
        const { UserVoice } = require('./models/VoiceCloning');
        const voiceRecord = await UserVoice.findOne({
          where: { voice_id: voiceId }
        });
        
        if (!voiceRecord || !voiceRecord.sample_file_path) {
          throw new Error(`Local voice clone not found: ${voiceId}. Please check the voice ID.`);
        }
        
        const sampleFilePath = path.resolve(process.cwd(), voiceRecord.sample_file_path.replace(/^\//, ''));
        
        // Check if file exists
        try {
          await fs.access(sampleFilePath);
        } catch (fileError) {
          throw new Error(`Voice sample file not found: ${sampleFilePath}`);
        }
        
        console.log('📁 Using local sample file:', sampleFilePath);
        
        // Read the sample file
        const sampleBuffer = await fs.readFile(sampleFilePath);
        
        // Create temporary clone, use it, then delete it (avoids 30 limit)
        let tempVoiceId = null;
        try {
          // Create temporary clone
          console.log('🔄 Creating temporary voice clone...');
          const tempVoice = await this.client.voices.ivc.create({
            name: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            files: [sampleBuffer]
          });
          tempVoiceId = tempVoice.voiceId || tempVoice.voice_id || tempVoice.id;
          console.log('✅ Temporary clone created:', tempVoiceId);
          
          // Generate speech using temporary clone
          const finalAccent = accentToUse || voiceRecord.accent || 'en';
          const modelId = options.modelId || this.getModelForAccent(finalAccent);
          console.log('🌍 Using model for accent:', modelId, 'language:', finalAccent);
          
          // ElevenLabs API: Use language_code parameter for better pronunciation
          // Map our accent codes to ElevenLabs language codes
          const languageCode = this.getLanguageCodeForAccent(finalAccent);
          
          const audio = await this.client.textToSpeech.convert(
            tempVoiceId,
            {
              text: text,
              modelId: modelId,
              languageCode: languageCode, // NEW: Helps with pronunciation
              outputFormat: options.outputFormat || 'mp3_44100_128',
              voiceSettings: {
                stability: options.voiceSettings?.stability || 0.5,
                similarityBoost: options.voiceSettings?.similarityBoost || 0.75,
                style: options.voiceSettings?.style || 0.0,
                useSpeakerBoost: options.voiceSettings?.useSpeakerBoost !== false
              }
            }
          );
          
          // Save generated audio
          const timestamp = Date.now();
          const filename = `generated_speech_${timestamp}.mp3`;
          const filepath = path.join(this.uploadsDir, filename);
          await fs.writeFile(filepath, audio);
          
          const audioUrl = `/uploads/voice-samples/${filename}`;
          console.log('✅ Speech generated using local clone:', audioUrl);
          
          // Delete temporary clone immediately (avoids 30 limit)
          try {
            await this.client.voices.delete(tempVoiceId);
            console.log('🗑️ Temporary clone deleted:', tempVoiceId);
          } catch (deleteError) {
            console.warn('⚠️ Failed to delete temporary clone (non-critical):', deleteError.message);
          }
          
          return {
            audioUrl: audioUrl,
            audioPath: audioUrl,
            filename: filename,
            duration: options.duration || 0,
            text: text,
            voiceId: voiceId,
            accent: finalAccent,
            isLocalClone: true,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          // Clean up temporary clone if it was created
          if (tempVoiceId) {
            try {
              await this.client.voices.delete(tempVoiceId);
              console.log('🗑️ Cleaned up temporary clone after error');
            } catch (cleanupError) {
              console.warn('⚠️ Failed to cleanup temporary clone:', cleanupError.message);
            }
          }
          throw error;
        }
      } else {
        // Traditional ElevenLabs voice (pre-created clone or default voice)
        console.log('🔧 Using ElevenLabs voice (pre-created clone)');
        
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
        
        // Get accent-aware model
        const finalAccent = accentToUse || 'en';
        const modelId = options.modelId || this.getModelForAccent(finalAccent);
        console.log('🌍 Using model for accent:', modelId, 'language:', finalAccent);
        
        // ElevenLabs API: Use language_code parameter for better pronunciation
        const languageCode = this.getLanguageCodeForAccent(finalAccent);
        
        const audio = await this.client.textToSpeech.convert(
          resolvedVoiceId, // voice_id
          {
            text: text,
            modelId: modelId,
            languageCode: languageCode, // NEW: Helps with pronunciation
            outputFormat: options.outputFormat || 'mp3_44100_128',
            voiceSettings: {
              stability: options.voiceSettings?.stability || 0.5,
              similarityBoost: options.voiceSettings?.similarityBoost || 0.75,
              style: options.voiceSettings?.style || 0.0,
              useSpeakerBoost: options.voiceSettings?.useSpeakerBoost !== false
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
          accent: finalAccent,
          isLocalClone: false,
          timestamp: new Date().toISOString()
        };
      }
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

  // Get model ID based on accent/locale
  getModelForAccent(accent) {
    // eleven_multilingual_v2 supports all languages
    // This is the recommended model for multilingual support
    return 'eleven_multilingual_v2';
  }

  // Get ElevenLabs language_code from accent code
  // Maps our ISO 639-1 codes to ElevenLabs language codes
  getLanguageCodeForAccent(accent) {
    const languageCodeMap = {
      'en': 'en',      // English
      'ar': 'ar',      // Arabic
      'hi': 'hi',      // Hindi
      'es': 'es',      // Spanish
      'fr': 'fr',      // French
      'de': 'de',      // German
      'pt': 'pt',      // Portuguese
      'it': 'it',      // Italian
      'ja': 'ja',      // Japanese
      'ko': 'ko',      // Korean
      'zh': 'zh',      // Chinese
      'th': 'th',      // Thai
      'pl': 'pl',      // Polish
      'nl': 'nl',      // Dutch
      'cs': 'cs',      // Czech
      'ru': 'ru',      // Russian
      'tr': 'tr',      // Turkish
      'sv': 'sv',      // Swedish
      'da': 'da',      // Danish
      'fi': 'fi',      // Finnish
      'no': 'no',      // Norwegian
      'uk': 'uk',      // Ukrainian
      'el': 'el',      // Greek
      'he': 'he',      // Hebrew
      'id': 'id',      // Indonesian
      'vi': 'vi',      // Vietnamese
      'ms': 'ms',      // Malay
      'ro': 'ro',      // Romanian
      'hu': 'hu',      // Hungarian
      'bg': 'bg',      // Bulgarian
      'hr': 'hr',      // Croatian
      'sk': 'sk',      // Slovak
      'sl': 'sl'       // Slovenian
    };
    
    // Return mapped language code or default to English
    return languageCodeMap[accent] || 'en';
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
