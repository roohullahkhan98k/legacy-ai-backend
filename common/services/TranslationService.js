const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Translation Service - Milestone 6 (Next 35% Implementation)
 * Translates text between languages using Gemini API
 */
class TranslationService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.quotaErrorLogged = false; // Track if quota error was already logged
    
    if (!this.apiKey) {
      console.warn('⚠️ GEMINI_API_KEY not found in environment variables');
    } else {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    }
  }

  /**
   * Translate text from source language to target language
   * @param {string} text - Text to translate
   * @param {string} sourceLang - Source language code (e.g., 'ar', 'en')
   * @param {string} targetLang - Target language code (e.g., 'en', 'ar')
   * @returns {Promise<string>} - Translated text
   */
  async translate(text, sourceLang, targetLang) {
    if (!this.apiKey || !this.genAI) {
      throw new Error('Gemini API key not configured');
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return text;
    }

    // If same language, return original
    if (sourceLang === targetLang) {
      return text;
    }

    const languageNames = {
      'en': 'English',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'it': 'Italian'
    };

    const sourceName = languageNames[sourceLang] || sourceLang;
    const targetName = languageNames[targetLang] || targetLang;

    const prompt = `Translate the following text from ${sourceName} to ${targetName}. 
Return ONLY the translated text, no explanations, no markdown, no quotes.

Text to translate:
${text}

Translated text:`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const translated = response.text().trim();
      
      // Clean up response (remove quotes if present)
      return translated.replace(/^["']|["']$/g, '');
    } catch (error) {
      // Match GeminiService error handling pattern exactly
      console.error('❌ Translation API Error:', error.message);
      
      if (error.message?.includes('API_KEY_INVALID')) {
        throw new Error('Invalid API key or access denied.');
      } else if (error.message?.includes('RATE_LIMIT') || error.message?.includes('429')) {
        // Rate limit - return original text (graceful degradation for translations)
        if (!this.quotaErrorLogged) {
          console.warn('⚠️ TranslationService: Rate limit exceeded. Returning original text.');
          this.quotaErrorLogged = true;
        }
        return text;
      } else if (error.message?.includes('QUOTA') || error.message?.includes('quota')) {
        // Quota exceeded - return original text (graceful degradation for translations)
        if (!this.quotaErrorLogged) {
          console.warn('⚠️ TranslationService: API quota exceeded. Returning original text.');
          this.quotaErrorLogged = true;
        }
        return text;
      }
      
      // For other errors, return original text (translations are optional)
      console.warn('⚠️ Translation failed, returning original text:', error.message);
      return text;
    }
  }

  /**
   * Translate text to multiple target languages
   * @param {string} text - Text to translate
   * @param {string} sourceLang - Source language code
   * @param {string[]} targetLangs - Array of target language codes
   * @returns {Promise<Object>} - { "en": "English text", "ar": "Arabic text" }
   */
  async translateToMultiple(text, sourceLang, targetLangs) {
    const translations = {};
    
    // Translate to each target language
    for (const targetLang of targetLangs) {
      // Skip same language - don't add original to translations object
      if (targetLang === sourceLang) {
        continue;
      }
      
      try {
        const translated = await this.translate(text, sourceLang, targetLang);
        // Only add if translation succeeded (not same as original due to error)
        // If translation failed, translate() returns original text, so this check prevents adding it
        if (translated && translated !== text && translated.trim().length > 0) {
          translations[targetLang] = translated;
        }
      } catch (error) {
        // Log error but continue with other translations
        console.warn(`⚠️ Failed to translate to ${targetLang}:`, error.message);
        // Skip this translation if it fails
      }
    }

    // Only return translations if we actually have some (not empty object)
    return Object.keys(translations).length > 0 ? translations : {};
  }

  /**
   * Check if translation service is available
   */
  isAvailable() {
    return !!this.apiKey && !!this.genAI;
  }
}

module.exports = new TranslationService();


