const OpenAI = require('openai');

/**
 * Translation Service - Milestone 6 (Next 35% Implementation)
 * Translates text between languages using OpenAI API
 */
class TranslationService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.quotaErrorLogged = false; // Track if quota error was already logged
    
    if (!this.apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not found in environment variables');
    } else {
      this.client = new OpenAI({
        apiKey: this.apiKey
      });
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
    if (!this.apiKey || !this.client) {
      throw new Error('OpenAI API key not configured');
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
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });
      
      const translated = response.choices[0].message.content.trim();
      
      // Clean up response (remove quotes if present)
      return translated.replace(/^["']|["']$/g, '');
    } catch (error) {
      // Match OpenAI error handling pattern
      console.error('❌ Translation API Error:', error.message);
      
      if (error.status === 401) {
        throw new Error('Invalid API key or access denied.');
      } else if (error.status === 429) {
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
    const totalLanguages = targetLangs.filter(lang => lang !== sourceLang).length;
    let completed = 0;
    
    console.log(`[TranslationService] Translating to ${totalLanguages} languages...`);
    
    // Translate to each target language
    for (const targetLang of targetLangs) {
      // Skip same language - don't add original to translations object
      if (targetLang === sourceLang) {
        continue;
      }
      
      try {
        const langStartTime = Date.now();
        const translated = await this.translate(text, sourceLang, targetLang);
        const langTime = Date.now() - langStartTime;
        completed++;
        
        // Only add if translation succeeded (not same as original due to error)
        // If translation failed, translate() returns original text, so this check prevents adding it
        if (translated && translated !== text && translated.trim().length > 0) {
          translations[targetLang] = translated;
          console.log(`[TranslationService] ✅ ${targetLang} translated (${completed}/${totalLanguages}) in ${langTime}ms`);
        } else {
          console.log(`[TranslationService] ⚠️ ${targetLang} translation returned original text (${completed}/${totalLanguages})`);
        }
      } catch (error) {
        completed++;
        // Log error but continue with other translations
        console.warn(`[TranslationService] ❌ Failed to translate to ${targetLang} (${completed}/${totalLanguages}):`, error.message);
        // Skip this translation if it fails
      }
    }

    console.log(`[TranslationService] Translation complete: ${Object.keys(translations).length}/${totalLanguages} languages succeeded`);
    
    // Only return translations if we actually have some (not empty object)
    return Object.keys(translations).length > 0 ? translations : {};
  }

  /**
   * Check if translation service is available
   */
  isAvailable() {
    return !!this.apiKey && !!this.client;
  }
}

module.exports = new TranslationService();


