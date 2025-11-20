const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

/**
 * Converts audio file to WAVE format compatible with Rhubarb using FFmpeg
 * @param {string} inputPath - Path to input audio file
 * @param {string} outputPath - Path for output WAVE file
 * @returns {Promise<string>} - Path to converted file
 */
async function convertToRhubarbWave(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    console.log('🔄 [AUDIO] Converting audio for Rhubarb compatibility:', {
      input: inputPath,
      output: outputPath
    });

    // Use a temporary file to avoid "same as input" error
    const tempPath = outputPath + '.tmp';

    ffmpeg(inputPath)
      .audioCodec('pcm_s16le')  // 16-bit PCM (required by Rhubarb)
      .audioFrequency(22050)    // 22.05 kHz sample rate (optimal for Rhubarb)
      .audioChannels(1)         // Mono audio
      .format('wav')            // WAVE format
      .on('start', (commandLine) => {
        console.log('🎵 [FFMPEG] Starting conversion:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`🎵 [FFMPEG] Conversion progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', async () => {
        try {
          // Move temp file to final location
          await fs.rename(tempPath, outputPath);
          console.log('✅ [AUDIO] Conversion completed successfully');
          resolve(outputPath);
        } catch (moveError) {
          console.error('❌ [AUDIO] Failed to move converted file:', moveError.message);
          reject(new Error(`Failed to move converted file: ${moveError.message}`));
        }
      })
      .on('error', (err) => {
        console.error('❌ [AUDIO] Conversion failed:', err);
        // Clean up temp file if it exists
        fs.unlink(tempPath).catch(() => {});
        reject(new Error(`Audio conversion failed: ${err.message}`));
      })
      .save(tempPath);
  });
}

/**
 * Alternative conversion using Windows built-in tools (fallback)
 * @param {string} inputPath - Path to input audio file
 * @param {string} outputPath - Path for output WAVE file
 * @returns {Promise<string>} - Path to converted file
 */
async function convertWithWindowsTools(inputPath, outputPath) {
  return new Promise(async (resolve, reject) => {
    console.log('🔄 [AUDIO] Attempting conversion with Windows tools...');
    
    try {
      // Read the original file
      const originalData = await fs.readFile(inputPath);
      
      // Create a proper WAVE header
      const sampleRate = 22050;
      const channels = 1;
      const bitsPerSample = 16;
      const byteRate = sampleRate * channels * bitsPerSample / 8;
      const blockAlign = channels * bitsPerSample / 8;
      const dataSize = originalData.length;
      const fileSize = 36 + dataSize;
      
      // WAVE header
      const header = Buffer.alloc(44);
      header.write('RIFF', 0);
      header.writeUInt32LE(fileSize, 4);
      header.write('WAVE', 8);
      header.write('fmt ', 12);
      header.writeUInt32LE(16, 16); // fmt chunk size
      header.writeUInt16LE(1, 20);  // audio format (PCM)
      header.writeUInt16LE(channels, 22);
      header.writeUInt32LE(sampleRate, 24);
      header.writeUInt32LE(byteRate, 28);
      header.writeUInt16LE(blockAlign, 32);
      header.writeUInt16LE(bitsPerSample, 34);
      header.write('data', 36);
      header.writeUInt32LE(dataSize, 40);
      
      // Combine header with original data
      const waveData = Buffer.concat([header, originalData]);
      
      // Write the new WAVE file
      await fs.writeFile(outputPath, waveData);
      
      console.log('✅ [AUDIO] Created WAVE file with proper header');
      resolve(outputPath);
    } catch (error) {
      console.error('❌ [AUDIO] Windows tools conversion failed:', error);
      reject(error);
    }
  });
}

/**
 * Validates if a file is a proper WAVE file that Rhubarb can process
 * @param {string} filePath - Path to audio file
 * @returns {Promise<boolean>} - True if valid WAVE file
 */
async function isValidWaveFile(filePath) {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) return false;

    // Read more of the header to properly validate WAVE format
    const buffer = await fs.readFile(filePath, { start: 0, end: 44 });
    
    // Check for RIFF header
    if (buffer.toString('ascii', 0, 4) !== 'RIFF') return false;
    
    // Check for WAVE format
    if (buffer.toString('ascii', 8, 12) !== 'WAVE') return false;
    
    // Check for fmt chunk
    if (buffer.toString('ascii', 12, 16) !== 'fmt ') return false;
    
    // Check for data chunk (should be at position 36)
    if (buffer.toString('ascii', 36, 40) !== 'data') return false;
    
    console.log('✅ [AUDIO] Valid WAVE file detected');
    return true;
  } catch (error) {
    console.error('❌ [AUDIO] Error validating WAVE file:', error);
    return false;
  }
}

/**
 * Ensures audio file is in proper format for Rhubarb processing
 * @param {string} inputPath - Path to input audio file
 * @returns {Promise<string>} - Path to Rhubarb-compatible audio file
 */
async function ensureRhubarbCompatible(inputPath) {
  console.log('🔍 [AUDIO] Checking audio compatibility for Rhubarb...');
  
  // Always try to convert to ensure proper WAVE format for Rhubarb
  console.log('🔄 [AUDIO] Converting to ensure proper WAVE format for Rhubarb');
  
  try {
    const outputPath = inputPath; // Use same path to replace original
    const convertedPath = await convertToRhubarbWave(inputPath, outputPath);
    console.log('✅ [AUDIO] FFmpeg conversion successful, using:', convertedPath);
    return convertedPath;
  } catch (ffmpegError) {
    console.error('❌ [AUDIO] FFmpeg conversion failed:', ffmpegError.message);
    console.log('💡 [AUDIO] Please install FFmpeg for proper audio conversion');
    console.log('⚠️ [AUDIO] Using original file (may not work with Rhubarb)');
    return inputPath; // Return original file instead of corrupting it
  }
}

module.exports = {
  convertToRhubarbWave,
  convertWithWindowsTools,
  isValidWaveFile,
  ensureRhubarbCompatible
};
