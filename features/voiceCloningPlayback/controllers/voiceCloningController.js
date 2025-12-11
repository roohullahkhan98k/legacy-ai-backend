const VoiceCloningService = require('../voiceCloningService');
const { UserVoice, GeneratedAudio } = require('../models/VoiceCloning');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { Op } = require('sequelize');

class VoiceCloningController {
  constructor() {
    this.voiceService = new VoiceCloningService();
    
    // Configure multer for audio file uploads
    this.uploadsDir = path.resolve(process.cwd(), 'uploads', 'voice-samples');
    this.storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadsDir);
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname) || '.wav';
        cb(null, `voice_sample_${timestamp}${ext}`);
      }
    });
    
    this.upload = multer({
      storage: this.storage,
      fileFilter: (req, file, cb) => {
        // Accept audio files
        if (file.mimetype.startsWith('audio/')) {
          cb(null, true);
        } else {
          cb(new Error('Only audio files are allowed'), false);
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
      }
    });
  }

  // Health check endpoint
  async healthCheck(req, res) {
    try {
      const health = await this.voiceService.healthCheck();
      res.json(health);
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Health check failed',
        error: error.message
      });
    }
  }

  // Clone voice from uploaded audio sample
  async cloneVoice(req, res) {
    try {
      // Use multer middleware for file upload
      this.upload.single('audio')(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            error: 'File upload error',
            message: err.message
          });
        }

        if (!req.file) {
          return res.status(400).json({
            error: 'No audio file provided',
            message: 'Please upload an audio file for voice cloning'
          });
        }

        const { voiceName, description, accent } = req.body;
        
        if (!voiceName) {
          return res.status(400).json({
            error: 'Voice name required',
            message: 'Please provide a name for the cloned voice'
          });
        }

        // Check subscription and feature limit
        const userId = req.user?.id;
        if (userId) {
          const featureLimitService = require('../../subscriptionService/services/FeatureLimitService');
          const limitCheck = await featureLimitService.checkLimit(userId, 'voice_clones');
          
          if (!limitCheck.allowed) {
            // Clean up uploaded file
            try {
              await fs.unlink(req.file.path);
            } catch (cleanupError) {
              console.warn('Warning: Could not clean up uploaded file:', cleanupError.message);
            }
            
            // Different response based on whether they need subscription or hit limit
            if (limitCheck.needsSubscription) {
              return res.status(403).json({
                error: 'Subscription required',
                message: 'You need an active subscription to use voice cloning. Please subscribe to continue.',
                hasSubscription: false,
                needsSubscription: true,
                redirectToPricing: true
              });
            } else if (limitCheck.limitReached) {
              return res.status(403).json({
                error: 'Limit reached',
                message: limitCheck.message || `You have reached your voice cloning limit (${limitCheck.limit}). Upgrade your plan to create more voice clones.`,
                limit: limitCheck.limit,
                currentUsage: limitCheck.currentUsage,
                remaining: limitCheck.remaining,
                plan: limitCheck.plan,
                hasSubscription: true,
                limitReached: true,
                redirectToPricing: true
              });
            }
          }
        }

        try {
          // Read the uploaded file
          const audioBuffer = await fs.readFile(req.file.path);
          
          // Clone the voice - pass the original MIME type and accent
          const result = await this.voiceService.cloneVoice(
            audioBuffer, 
            voiceName, 
            description, 
            req.file.mimetype,
            accent || 'en' // Default to English if not specified
          );
          
          // Save to PostgreSQL
          const voiceIdToSave = result.voiceId || result.voice_id;
          
          console.log('[VoiceCloning] Clone result - voiceId:', voiceIdToSave, 'userId:', userId, 'name:', voiceName);
          
          if (userId && voiceIdToSave) {
            try {
              await UserVoice.create({
                user_id: userId,
                voice_id: voiceIdToSave,
                voice_name: voiceName,
                sample_file_path: result.sampleFilePath || `/uploads/voice-samples/${req.file.filename}`,
                accent: result.accent || accent || 'en',
                is_local_only: true, // All new clones are local-only
                metadata: {
                  description: description || '',
                  accent: result.accent || accent || 'en',
                  isLocalClone: true
                }
              });
              
              // Record usage after successful creation
              const featureLimitService = require('../../subscriptionService/services/FeatureLimitService');
              await featureLimitService.recordUsage(userId, 'voice_clones', {
                    voice_id: voiceIdToSave,
                    voice_name: voiceName,
                    created_at: new Date()
                  });
              
              console.log('✅ Voice saved to DB - user:', userId, 'voice_id:', voiceIdToSave);
            } catch (dbError) {
              console.error('❌ Failed to save voice to DB:', dbError.message);
            }
          } else {
            console.warn('⚠️ Not saving to DB - userId:', userId, 'voiceId:', voiceIdToSave);
          }

          // Keep sample file (don't delete - it's the user's voice sample)
          // Clean up uploaded file - COMMENTED OUT to keep sample
          // try {
          //   await fs.unlink(req.file.path);
          // } catch (cleanupError) {
          //   console.warn('Warning: Could not clean up uploaded file:', cleanupError.message);
          // }

          res.json({
            success: true,
            ...result
          });
        } catch (cloneError) {
          // Clean up uploaded file on error
          try {
            await fs.unlink(req.file.path);
          } catch (cleanupError) {
            console.warn('Warning: Could not clean up uploaded file:', cleanupError.message);
          }
          
          throw cloneError;
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Voice cloning failed',
        message: error.message
      });
    }
  }

  // Generate speech from text using a voice
  async generateSpeech(req, res) {
    try {
      const { text, voiceId, modelId, outputFormat, voiceSettings, accent } = req.body;
      
      if (!text) {
        return res.status(400).json({
          error: 'Text required',
          message: 'Please provide text to convert to speech'
        });
      }

      if (!voiceId) {
        return res.status(400).json({
          error: 'Voice ID required',
          message: 'Please provide a voice ID for speech generation'
        });
      }

      const options = {
        modelId,
        outputFormat,
        voiceSettings,
        accent: accent || 'en' // Pass accent for multilingual support
      };

      const result = await this.voiceService.generateSpeech(text, voiceId, options);
      
      // Save generated audio to DB
      const userId = req.user?.id;
      console.log('[GenerateSpeech] Result:', { userId, hasAudioPath: !!result.audioPath, audioPath: result.audioPath });
      
      if (userId && result.audioPath) {
        try {
          const stats = await fs.stat(path.resolve(process.cwd(), result.audioPath.replace(/^\//, '')));
          
          await GeneratedAudio.create({
            user_id: userId,
            voice_id: voiceId,
            voice_name: req.body.voiceName || 'Unknown Voice',
            accent: result.accent || accent || 'en',
            text: text.substring(0, 500), // Store first 500 chars
            audio_file_path: result.audioPath,
            duration_seconds: result.duration || null,
            file_size_bytes: stats.size,
            metadata: {
              model_id: modelId,
              output_format: outputFormat,
              voice_settings: voiceSettings,
              accent: result.accent || accent || 'en',
              isLocalClone: result.isLocalClone || false
            }
          });
          console.log('✅ Generated audio saved to DB for user:', userId, 'path:', result.audioPath);
        } catch (dbError) {
          console.error('❌ Failed to save audio to DB:', dbError.message, dbError.stack);
        }
      } else {
        console.warn('⚠️ NOT saving to DB - userId:', userId, 'audioPath:', result.audioPath);
      }
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      res.status(500).json({
        error: 'Speech generation failed',
        message: error.message
      });
    }
  }

  // Get all available voices (default + user's custom voices)
  async getVoices(req, res) {
    try {
      // Get ALL voices from ElevenLabs
      const allVoicesFromElevenLabs = await this.voiceService.getVoices();
      
      // Filter: Only show "premade" voices as default (NOT cloned/generated ones)
      // This prevents showing other users' clones that are in the ElevenLabs account
      const defaultVoices = allVoicesFromElevenLabs.filter(v => 
        v.category === 'premade' || v.category === 'professional'
      );
      
      console.log('[VoiceCloning] ElevenLabs voices - Total:', allVoicesFromElevenLabs.length, 'Default only:', defaultVoices.length);
      
      // Get user's custom voices from PostgreSQL (user-specific)
      const userId = req.user?.id;
      let customVoices = [];
      
      if (userId) {
        const userVoices = await UserVoice.findAll({
          where: { user_id: userId },
          order: [['created_at', 'DESC']],
          raw: true // Get plain objects with snake_case fields
        });
        
        customVoices = userVoices.map(v => ({
          voice_id: v.voice_id,
          voice_name: v.voice_name,
          name: v.voice_name, // Also include 'name' for compatibility
          category: 'custom',
          description: v.metadata?.description || '',
          isCustom: true,
          sample_path: v.sample_file_path,
          created_at: v.createdAt || v.created_at || new Date().toISOString()
        }));
        
        console.log('[VoiceCloning] User custom voices:', customVoices.length, 'for user:', userId);
      }
      
      res.json({
        success: true,
        voices: {
          default: defaultVoices,
          custom: customVoices
        },
        count: defaultVoices.length + customVoices.length
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get voices',
        message: error.message
      });
    }
  }

  // Get specific voice details
  async getVoiceDetails(req, res) {
    try {
      const { voiceId } = req.params;
      
      if (!voiceId) {
        return res.status(400).json({
          error: 'Voice ID required',
          message: 'Please provide a voice ID'
        });
      }

      const voice = await this.voiceService.getVoiceDetails(voiceId);
      
      res.json({
        success: true,
        voice
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get voice details',
        message: error.message
      });
    }
  }

  // Delete a voice
  async deleteVoice(req, res) {
    try {
      const { voiceId } = req.params;
      
      if (!voiceId) {
        return res.status(400).json({
          error: 'Voice ID required',
          message: 'Please provide a voice ID to delete'
        });
      }

      const userId = req.user?.id;
      
      // Check if this is a local voice (starts with "local_")
      const isLocalVoice = voiceId && voiceId.startsWith('local_');
      
      if (isLocalVoice) {
        // Local voice - only delete from DB and file system, not from ElevenLabs
        console.log('🗑️ Deleting local voice (not in ElevenLabs):', voiceId);
        
        // Find the voice record to get file path
        const voiceRecord = await UserVoice.findOne({
          where: { 
            voice_id: voiceId,
            user_id: userId
          }
        });
        
        if (voiceRecord) {
          // Delete the audio file from file system
          if (voiceRecord.sample_file_path) {
            try {
              const fs = require('fs').promises;
              const path = require('path');
              const filePath = path.resolve(process.cwd(), voiceRecord.sample_file_path.replace(/^\//, ''));
              await fs.unlink(filePath);
              console.log('✅ Deleted local voice file:', filePath);
            } catch (fileError) {
              console.warn('⚠️ Failed to delete voice file (non-critical):', fileError.message);
            }
          }
          
          // Delete from DB
          await UserVoice.destroy({
            where: { 
              voice_id: voiceId,
              user_id: userId
            }
          });
          console.log('✅ Local voice deleted from DB');
        } else {
          return res.status(404).json({
            error: 'Voice not found',
            message: 'Voice not found or does not belong to this user'
          });
        }
        
        return res.json({
          success: true,
          voiceId: voiceId,
          status: 'deleted',
          isLocalVoice: true,
          timestamp: new Date().toISOString()
        });
      } else {
        // ElevenLabs voice - delete from ElevenLabs first, then from DB
        const result = await this.voiceService.deleteVoice(voiceId);
        
        // Delete from DB
        if (userId) {
          try {
            await UserVoice.destroy({
              where: { 
                voice_id: voiceId,
                user_id: userId
              }
            });
            console.log('✅ Voice deleted from DB for user:', userId);
          } catch (dbError) {
            console.warn('⚠️ Failed to delete voice from DB:', dbError.message);
          }
        }
        
        return res.json({
          success: true,
          ...result
        });
      }
    } catch (error) {
      res.status(500).json({
        error: 'Voice deletion failed',
        message: error.message
      });
    }
  }

  // Delete generated audio history entry and associated file
  async deleteGeneratedAudio(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!id) {
        return res.status(400).json({
          error: 'Generated audio ID required',
          message: 'Please provide an audio history ID to delete'
        });
      }

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User authentication required'
        });
      }

      const record = await GeneratedAudio.findOne({
        where: {
          id,
          user_id: userId
        }
      });

      if (!record) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Generated audio not found for this user'
        });
      }

      const audioPath = record.audio_file_path;
      if (audioPath) {
        const normalizedPath = audioPath.startsWith('/') ? audioPath.slice(1) : audioPath;
        const absolutePath = path.resolve(process.cwd(), normalizedPath);
        try {
          await fs.unlink(absolutePath);
          console.log('🗑️ Deleted generated audio file:', absolutePath);
        } catch (fileErr) {
          if (fileErr.code !== 'ENOENT') {
            console.warn('⚠️ Failed to delete generated audio file:', fileErr.message);
          }
        }
      }

      await record.destroy();

      res.json({
        success: true,
        id
      });
    } catch (error) {
      console.error('❌ Failed to delete generated audio:', error.message);
      res.status(500).json({
        error: 'Delete generated audio failed',
        message: error.message
      });
    }
  }

  // Play audio (returns audio URL for frontend playback)
  async playAudio(req, res) {
    try {
      const { audioUrl } = req.body;
      
      if (!audioUrl) {
        return res.status(400).json({
          error: 'Audio URL required',
          message: 'Please provide an audio URL to play'
        });
      }

      const result = await this.voiceService.playAudio(audioUrl);
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      res.status(500).json({
        error: 'Audio playback failed',
        message: error.message
      });
    }
  }

  // Test voice cloning with fake audio
  async testVoiceCloning(req, res) {
    try {
      console.log('🧪 Testing voice cloning with fake audio...');
      
      const result = await this.voiceService.testWithFakeAudio();
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          voiceId: result.voiceId,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Voice cloning test failed',
          message: result.message,
          details: result.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Test failed',
        message: error.message
      });
    }
  }

  // Get multer upload middleware for use in routes
  getUploadMiddleware() {
    return this.upload;
  }
}

module.exports = VoiceCloningController;
