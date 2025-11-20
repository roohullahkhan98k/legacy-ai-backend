const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

class MetadataExtractor {
  constructor() {
    this.supportedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/tiff', 'image/webp'];
    this.supportedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/mkv', 'video/webm', 'video/flv'];
    this.supportedAudioTypes = ['audio/mp3', 'audio/wav', 'audio/aac', 'audio/flac', 'audio/ogg', 'audio/m4a', 'audio/wma'];
  }

  async extractMetadata(filePath, mimeType) {
    try {
      if (this.supportedImageTypes.includes(mimeType)) {
        return await this.extractImageMetadata(filePath);
      } else if (this.supportedVideoTypes.includes(mimeType)) {
        return await this.extractVideoMetadata(filePath);
      } else if (this.supportedAudioTypes.includes(mimeType)) {
        return await this.extractAudioMetadata(filePath);
      } else {
        return this.getBasicMetadata(filePath);
      }
    } catch (error) {
      console.error('Error extracting metadata:', error);
      return this.getBasicMetadata(filePath);
    }
  }

  async extractImageMetadata(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();
      const stats = fs.statSync(filePath);
      
      const extractedData = {
        // Basic file info
        fileSize: stats.size,
        fileExtension: path.extname(filePath).toLowerCase(),
        
        // Image dimensions
        width: metadata.width,
        height: metadata.height,
        
        // EXIF data
        dateTaken: metadata.exif?.DateTime || metadata.exif?.DateTimeOriginal || new Date().toISOString(),
        device: this.extractDeviceInfo(metadata.exif),
        location: this.extractLocationInfo(metadata.exif),
        
        // Technical details
        format: metadata.format,
        colorSpace: metadata.space,
        hasAlpha: metadata.hasAlpha,
        
        // Camera settings (if available)
        cameraSettings: {
          make: metadata.exif?.Make || null,
          model: metadata.exif?.Model || null,
          lens: metadata.exif?.LensModel || null,
          fNumber: metadata.exif?.FNumber || null,
          exposureTime: metadata.exif?.ExposureTime || null,
          iso: metadata.exif?.ISO || null,
          focalLength: metadata.exif?.FocalLength || null,
          flash: metadata.exif?.Flash || null
        },
        
        // GPS data
        gps: this.extractGPSData(metadata.exif),
        
        // Additional metadata
        orientation: metadata.exif?.Orientation || 1,
        software: metadata.exif?.Software || null,
        artist: metadata.exif?.Artist || null,
        
        // File timestamps
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString()
      };

      return extractedData;
    } catch (error) {
      console.error('Error extracting image metadata:', error);
      return this.getBasicMetadata(filePath);
    }
  }

  async extractVideoMetadata(filePath) {
    try {
      const stats = fs.statSync(filePath);
      
      // Try to extract advanced video metadata using ffprobe
      const videoMetadata = await this.extractVideoMetadataWithFFmpeg(filePath);
      
      const extractedData = {
        // Basic file info
        fileSize: stats.size,
        fileExtension: path.extname(filePath).toLowerCase(),
        
        // Video basic info
        type: 'video',
        
        // File timestamps
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
        dateTaken: stats.birthtime.toISOString(), // Use file creation time as fallback
        
        // Enhanced video metadata
        videoMetadata: videoMetadata
      };

      return extractedData;
    } catch (error) {
      console.error('Error extracting video metadata:', error);
      return this.getBasicMetadata(filePath);
    }
  }

  async extractVideoMetadataWithFFmpeg(filePath) {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.warn('FFmpeg metadata extraction failed:', err.message);
          resolve({
            duration: null,
            resolution: null,
            codec: null,
            bitrate: null,
            fps: null,
            audioCodec: null,
            audioChannels: null,
            audioBitrate: null
          });
          return;
        }

        try {
          const videoStream = metadata.streams.find(s => s.codec_type === 'video');
          const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

          resolve({
            duration: metadata.format.duration ? parseFloat(metadata.format.duration) : null,
            resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : null,
            codec: videoStream?.codec_name || null,
            bitrate: metadata.format.bit_rate ? parseInt(metadata.format.bit_rate) : null,
            fps: videoStream?.r_frame_rate ? this.parseFrameRate(videoStream.r_frame_rate) : null,
            audioCodec: audioStream?.codec_name || null,
            audioChannels: audioStream?.channels || null,
            audioBitrate: audioStream?.bit_rate ? parseInt(audioStream.bit_rate) : null,
            title: metadata.format.tags?.title || null,
            artist: metadata.format.tags?.artist || null,
            album: metadata.format.tags?.album || null,
            year: metadata.format.tags?.date || metadata.format.tags?.year || null
          });
        } catch (parseError) {
          console.error('Error parsing video metadata:', parseError);
          resolve({
            duration: null,
            resolution: null,
            codec: null,
            bitrate: null,
            fps: null,
            audioCodec: null,
            audioChannels: null,
            audioBitrate: null
          });
        }
      });
    });
  }

  async extractAudioMetadata(filePath) {
    try {
      const stats = fs.statSync(filePath);
      
      // Try to extract advanced audio metadata using ffprobe
      const audioMetadata = await this.extractAudioMetadataWithFFmpeg(filePath);
      
      const extractedData = {
        // Basic file info
        fileSize: stats.size,
        fileExtension: path.extname(filePath).toLowerCase(),
        
        // Audio basic info
        type: 'audio',
        
        // File timestamps
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
        dateTaken: stats.birthtime.toISOString(), // Use file creation time as fallback
        
        // Enhanced audio metadata
        audioMetadata: audioMetadata
      };

      return extractedData;
    } catch (error) {
      console.error('Error extracting audio metadata:', error);
      return this.getBasicMetadata(filePath);
    }
  }

  async extractAudioMetadataWithFFmpeg(filePath) {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.warn('FFmpeg audio metadata extraction failed:', err.message);
          resolve({
            duration: null,
            bitrate: null,
            sampleRate: null,
            channels: null,
            codec: null,
            title: null,
            artist: null,
            album: null,
            year: null,
            genre: null
          });
          return;
        }

        try {
          const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

          resolve({
            duration: metadata.format.duration ? parseFloat(metadata.format.duration) : null,
            bitrate: metadata.format.bit_rate ? parseInt(metadata.format.bit_rate) : null,
            sampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate) : null,
            channels: audioStream?.channels || null,
            codec: audioStream?.codec_name || null,
            title: metadata.format.tags?.title || null,
            artist: metadata.format.tags?.artist || null,
            album: metadata.format.tags?.album || null,
            year: metadata.format.tags?.date || metadata.format.tags?.year || null,
            genre: metadata.format.tags?.genre || null,
            track: metadata.format.tags?.track || null,
            disc: metadata.format.tags?.disc || null
          });
        } catch (parseError) {
          console.error('Error parsing audio metadata:', parseError);
          resolve({
            duration: null,
            bitrate: null,
            sampleRate: null,
            channels: null,
            codec: null,
            title: null,
            artist: null,
            album: null,
            year: null,
            genre: null
          });
        }
      });
    });
  }

  getBasicMetadata(filePath) {
    const stats = fs.statSync(filePath);
    return {
      fileSize: stats.size,
      fileExtension: path.extname(filePath).toLowerCase(),
      createdAt: stats.birthtime.toISOString(),
      modifiedAt: stats.mtime.toISOString(),
      dateTaken: stats.birthtime.toISOString()
    };
  }

  extractDeviceInfo(exifData) {
    if (!exifData) return null;
    
    const make = exifData.Make;
    const model = exifData.Model;
    
    if (make && model) {
      return `${make} ${model}`.trim();
    } else if (model) {
      return model;
    } else if (make) {
      return make;
    }
    
    return null;
  }

  extractLocationInfo(exifData) {
    if (!exifData) return null;
    
    // Try to get location from various EXIF fields
    const locationFields = [
      exifData.GPSLatitudeRef && exifData.GPSLatitude ? 'GPS' : null,
      exifData.UserComment ? 'UserComment' : null,
      exifData.ImageDescription ? 'ImageDescription' : null
    ].filter(Boolean);
    
    if (locationFields.includes('GPS')) {
      return 'GPS Location Available';
    }
    
    return locationFields.length > 0 ? locationFields.join(', ') : null;
  }

  extractGPSData(exifData) {
    if (!exifData || !exifData.GPSLatitude || !exifData.GPSLongitude) {
      return null;
    }
    
    try {
      const lat = this.parseGPSCoordinate(exifData.GPSLatitude, exifData.GPSLatitudeRef);
      const lng = this.parseGPSCoordinate(exifData.GPSLongitude, exifData.GPSLongitudeRef);
      
      if (lat !== null && lng !== null) {
        return {
          latitude: lat,
          longitude: lng,
          altitude: exifData.GPSAltitude || null,
          timestamp: exifData.GPSTimeStamp || null
        };
      }
    } catch (error) {
      console.error('Error parsing GPS data:', error);
    }
    
    return null;
  }

  parseGPSCoordinate(coord, ref) {
    if (!coord || !ref) return null;
    
    try {
      let degrees, minutes, seconds;
      
      if (Array.isArray(coord) && coord.length >= 3) {
        degrees = parseFloat(coord[0]);
        minutes = parseFloat(coord[1]);
        seconds = parseFloat(coord[2]);
      } else {
        return null;
      }
      
      let decimal = degrees + (minutes / 60) + (seconds / 3600);
      
      if (ref === 'S' || ref === 'W') {
        decimal = -decimal;
      }
      
      return decimal;
    } catch (error) {
      console.error('Error parsing GPS coordinate:', error);
      return null;
    }
  }

  parseFrameRate(frameRate) {
    if (!frameRate) return null;
    
    try {
      if (typeof frameRate === 'string' && frameRate.includes('/')) {
        const [numerator, denominator] = frameRate.split('/').map(Number);
        return denominator ? (numerator / denominator).toFixed(2) : null;
      }
      return parseFloat(frameRate);
    } catch (error) {
      console.error('Error parsing frame rate:', error);
      return null;
    }
  }

  // Helper method to generate searchable tags from metadata
  generateTags(metadata) {
    const tags = [];
    
    // Image metadata tags
    if (metadata.device) {
      tags.push(metadata.device.toLowerCase());
    }
    
    if (metadata.cameraSettings?.make) {
      tags.push(metadata.cameraSettings.make.toLowerCase());
    }
    
    if (metadata.cameraSettings?.model) {
      tags.push(metadata.cameraSettings.model.toLowerCase());
    }
    
    if (metadata.gps) {
      tags.push('gps', 'geotagged');
    }
    
    if (metadata.location) {
      tags.push('location');
    }
    
    // Video metadata tags
    if (metadata.videoMetadata) {
      if (metadata.videoMetadata.codec) {
        tags.push(metadata.videoMetadata.codec.toLowerCase());
      }
      if (metadata.videoMetadata.resolution) {
        tags.push(metadata.videoMetadata.resolution.toLowerCase());
      }
      if (metadata.videoMetadata.title) {
        tags.push(metadata.videoMetadata.title.toLowerCase());
      }
      if (metadata.videoMetadata.artist) {
        tags.push(metadata.videoMetadata.artist.toLowerCase());
      }
      if (metadata.videoMetadata.album) {
        tags.push(metadata.videoMetadata.album.toLowerCase());
      }
      tags.push('video');
    }
    
    // Audio metadata tags
    if (metadata.audioMetadata) {
      if (metadata.audioMetadata.codec) {
        tags.push(metadata.audioMetadata.codec.toLowerCase());
      }
      if (metadata.audioMetadata.title) {
        tags.push(metadata.audioMetadata.title.toLowerCase());
      }
      if (metadata.audioMetadata.artist) {
        tags.push(metadata.audioMetadata.artist.toLowerCase());
      }
      if (metadata.audioMetadata.album) {
        tags.push(metadata.audioMetadata.album.toLowerCase());
      }
      if (metadata.audioMetadata.genre) {
        tags.push(metadata.audioMetadata.genre.toLowerCase());
      }
      tags.push('audio');
    }
    
    // Add date-based tags
    if (metadata.dateTaken) {
      const date = new Date(metadata.dateTaken);
      tags.push(
        date.getFullYear().toString(),
        date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : (date.getMonth() + 1).toString(),
        date.getDate() < 10 ? `0${date.getDate()}` : date.getDate().toString()
      );
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }
}

module.exports = MetadataExtractor;
