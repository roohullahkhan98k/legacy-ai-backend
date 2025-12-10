/**
 * Language Detection Service - Milestone 6 (35% Implementation)
 * Simple language detection using character pattern matching
 * Supports: English, Arabic, Hindi, Spanish, and more
 */
class LanguageDetectionService {
  constructor() {
    this.defaultLanguage = 'en';
    
    // Language detection patterns
    this.patterns = {
      'ar': /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/,
      'hi': /[\u0900-\u097F]/,
      'zh': /[\u4E00-\u9FFF]/,
      'ja': /[\u3040-\u309F\u30A0-\u30FF]/,
      'ko': /[\uAC00-\uD7AF]/,
      'th': /[\u0E00-\u0E7F]/,
      'he': /[\u0590-\u05FF]/,
      'ru': /[\u0400-\u04FF]/,
      'es': /\b(el|la|los|las|de|del|en|un|una|es|son|con|por|para|que|más|muy|este|esta|estos|estas)\b/i,
      'fr': /\b(le|la|les|de|du|des|un|une|est|sont|avec|pour|que|plus|très|ce|ceci|cette)\b/i,
      'de': /\b(der|die|das|und|oder|ist|sind|mit|für|von|zu|ein|eine|nicht|auch)\b/i,
      'pt': /\b(o|a|os|as|de|do|da|dos|das|em|um|uma|é|são|com|por|para|que|mais|muito)\b/i,
      'it': /\b(il|la|lo|gli|le|di|del|della|dei|delle|un|una|uno|è|sono|con|per|che|più|molto)\b/i,
    };
    
    // Language names
    this.languageNames = {
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
      'it': 'Italian',
      'th': 'Thai',
      'he': 'Hebrew'
    };
  }

  /**
   * Detect language from text automatically
   * @param {string} text - Text to detect language from
   * @returns {Object} - { language: 'en', confidence: 0.95 }
   */
  detectLanguage(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return {
        language: this.defaultLanguage,
        name: this.getLanguageName(this.defaultLanguage),
        confidence: 0,
        isRTL: this.isRTL(this.defaultLanguage),
        error: 'Empty or invalid text'
      };
    }

    const minLength = 10;
    const trimmedText = text.trim();
    
    if (trimmedText.length < minLength) {
      return {
        language: this.defaultLanguage,
        name: this.getLanguageName(this.defaultLanguage),
        confidence: 0.5,
        isRTL: this.isRTL(this.defaultLanguage),
        warning: 'Text too short for reliable detection'
      };
    }

    try {
      // Check for non-Latin scripts first (Arabic, Hindi, Chinese, etc.)
      for (const [lang, pattern] of Object.entries(this.patterns)) {
        if (pattern.test(trimmedText)) {
          // Count matches to calculate confidence
          const matches = (trimmedText.match(pattern) || []).length;
          const confidence = Math.min(0.95, 0.6 + (matches / trimmedText.length) * 0.35);
          
          return {
            language: lang,
            name: this.getLanguageName(lang),
            confidence: Math.round(confidence * 100) / 100,
            isRTL: this.isRTL(lang),
            detected: lang,
            method: 'pattern'
          };
        }
      }
      
      // If no pattern matches, check for Latin-based languages
      // Check Spanish
      if (this.patterns.es.test(trimmedText)) {
        return {
          language: 'es',
          name: this.getLanguageName('es'),
          confidence: 0.85,
          isRTL: this.isRTL('es'),
          detected: 'es',
          method: 'pattern'
        };
      }
      
      // Check French
      if (this.patterns.fr.test(trimmedText)) {
        return {
          language: 'fr',
          name: this.getLanguageName('fr'),
          confidence: 0.85,
          isRTL: this.isRTL('fr'),
          detected: 'fr',
          method: 'pattern'
        };
      }
      
      // Check German
      if (this.patterns.de.test(trimmedText)) {
        return {
          language: 'de',
          name: this.getLanguageName('de'),
          confidence: 0.85,
          isRTL: this.isRTL('de'),
          detected: 'de',
          method: 'pattern'
        };
      }
      
      // Check Portuguese
      if (this.patterns.pt.test(trimmedText)) {
        return {
          language: 'pt',
          name: this.getLanguageName('pt'),
          confidence: 0.85,
          isRTL: this.isRTL('pt'),
          detected: 'pt',
          method: 'pattern'
        };
      }
      
      // Check Italian
      if (this.patterns.it.test(trimmedText)) {
        return {
          language: 'it',
          name: this.getLanguageName('it'),
          confidence: 0.85,
          isRTL: this.isRTL('it'),
          detected: 'it',
          method: 'pattern'
        };
      }
      
      // Default to English if no pattern matches
      return {
        language: this.defaultLanguage,
        name: this.getLanguageName(this.defaultLanguage),
        confidence: 0.7,
        isRTL: this.isRTL(this.defaultLanguage),
        detected: 'en',
        method: 'default'
      };
    } catch (error) {
      console.error('Language detection error:', error);
      return {
        language: this.defaultLanguage,
        name: this.getLanguageName(this.defaultLanguage),
        confidence: 0,
        isRTL: this.isRTL(this.defaultLanguage),
        error: error.message
      };
    }
  }

  /**
   * Check if language is RTL (Right-to-Left)
   */
  isRTL(languageCode) {
    const rtlLanguages = ['ar', 'he', 'ur', 'fa', 'yi'];
    return rtlLanguages.includes(languageCode);
  }

  /**
   * Get language name from code
   */
  getLanguageName(languageCode) {
    return this.languageNames[languageCode] || languageCode.toUpperCase();
  }
}

module.exports = new LanguageDetectionService();
