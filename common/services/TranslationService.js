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
   * Translate text to multiple target languages (OPTIMIZED: Single API call)
   * @param {string} text - Text to translate
   * @param {string} sourceLang - Source language code
   * @param {string[]} targetLangs - Array of target language codes
   * @returns {Promise<Object>} - { "en": "English text", "ar": "Arabic text" }
   */
  async translateToMultiple(text, sourceLang, targetLangs) {
    if (!this.apiKey || !this.client) {
      throw new Error('OpenAI API key not configured');
    }

    // Filter out source language
    const languagesToTranslate = targetLangs.filter(lang => lang !== sourceLang);
    const totalLanguages = languagesToTranslate.length;
    
    if (totalLanguages === 0) {
      console.log(`[TranslationService] No languages to translate (source: ${sourceLang})`);
      return {};
    }

    console.log(`[TranslationService] 🚀 Starting SINGLE API call translation to ${totalLanguages} languages:`, languagesToTranslate.join(', '));
    const startTime = Date.now();

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
    const targetLanguageList = languagesToTranslate.map(lang => `${lang} (${languageNames[lang] || lang})`).join(', ');

    const prompt = `Translate the following text from ${sourceName} to ALL of these languages: ${targetLanguageList}

Original text:
"${text}"

Return ONLY a valid JSON object with language codes as keys and translations as values. No explanations, no markdown, no extra text.
Example format:
{
  "en": "English translation here",
  "ar": "Arabic translation here",
  "de": "German translation here"
}

JSON translations:`;

    try {
      console.log(`[TranslationService] 📤 Sending single translation request to OpenAI...`);
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" } // Force JSON response
      });
      
      const responseTime = Date.now() - startTime;
      const responseText = response.choices[0].message.content.trim();
      console.log(`[TranslationService] 📥 Received response in ${responseTime}ms (${response.usage?.total_tokens || 'unknown'} tokens)`);
      
      // Parse JSON response
      let translations = {};
      try {
        // Clean response - remove markdown if present
        let cleanResponse = responseText;
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        translations = JSON.parse(cleanResponse);
        console.log(`[TranslationService] ✅ Successfully parsed JSON with ${Object.keys(translations).length} languages`);
      } catch (parseError) {
        console.error(`[TranslationService] ❌ Failed to parse JSON response:`, parseError.message);
        console.error(`[TranslationService] Raw response:`, responseText.substring(0, 200));
        // Fallback: try to extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            translations = JSON.parse(jsonMatch[0]);
            console.log(`[TranslationService] ✅ Recovered JSON from response`);
          } catch (e) {
            console.error(`[TranslationService] ❌ Could not recover JSON, returning empty`);
            return {};
          }
        } else {
          return {};
        }
      }

      // Validate and filter translations
      const validTranslations = {};
      let validCount = 0;
      let invalidCount = 0;

      for (const targetLang of languagesToTranslate) {
        if (translations[targetLang] && typeof translations[targetLang] === 'string') {
          const translated = translations[targetLang].trim();
          // Only add if translation is different from original and not empty
          if (translated && translated !== text && translated.length > 0) {
            validTranslations[targetLang] = translated;
            validCount++;
          } else {
            console.log(`[TranslationService] ⚠️ ${targetLang}: Translation is empty or same as original`);
            invalidCount++;
          }
        } else {
          console.log(`[TranslationService] ⚠️ ${targetLang}: Missing or invalid in response`);
          invalidCount++;
        }
      }

      const totalTime = Date.now() - startTime;
      console.log(`[TranslationService] ✅ Translation complete in ${totalTime}ms: ${validCount}/${totalLanguages} languages succeeded, ${invalidCount} failed`);
      console.log(`[TranslationService] 📊 Success rate: ${Math.round((validCount / totalLanguages) * 100)}%`);
      console.log(`[TranslationService] 💰 Tokens used: ${response.usage?.total_tokens || 'unknown'} (prompt: ${response.usage?.prompt_tokens || 'unknown'}, completion: ${response.usage?.completion_tokens || 'unknown'})`);
      
      if (validCount > 0) {
        console.log(`[TranslationService] ✅ Successfully translated to:`, Object.keys(validTranslations).join(', '));
      } else {
        console.log(`[TranslationService] ⚠️ No valid translations generated`);
      }

      return validTranslations;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`[TranslationService] ❌ Translation failed after ${totalTime}ms:`, error.message);
      
      if (error.status === 401) {
        throw new Error('Invalid API key or access denied.');
      } else if (error.status === 429) {
        console.warn('⚠️ TranslationService: Rate limit exceeded. Returning empty translations.');
        return {};
      } else if (error.message?.includes('quota') || error.message?.includes('billing')) {
        console.warn('⚠️ TranslationService: API quota exceeded. Returning empty translations.');
        return {};
      }
      
      // For other errors, return empty (translations are optional)
      console.warn('⚠️ Translation failed, returning empty translations:', error.message);
      return {};
    }
  }

  /**
   * Check if translation service is available
   */
  isAvailable() {
    return !!this.apiKey && !!this.client;
  }
}

module.exports = new TranslationService();


