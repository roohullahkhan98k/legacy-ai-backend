# Next 35% Implementation - Frontend Integration Guide

## ✅ Backend Changes (COMPLETED)

### **What Backend Now Does:**

1. **Translation Service**
   - Automatically translates memories to multiple languages (en, ar, hi)
   - Uses Gemini API for translations
   - Stores translations in `translated_texts` JSONB column

2. **Cross-Lingual Search**
   - Search in English → finds Arabic/Hindi memories
   - Search in Arabic → finds English/Hindi memories
   - Works because `text-embedding-3-large` is multilingual

3. **New API Endpoint**
   - `GET /api/memory-graph/memories/:id/translated?lang=en`
   - Returns memory in user's preferred language

4. **Enhanced Search Response**
   - Includes `queryLanguage` (detected language of search query)
   - Includes `language` and `hasTranslations` in each result

---

## 🔌 API Changes

### **1. Memory Creation Response (Same as before)**
```json
{
  "ok": true,
  "id": "memory-123",
  "language": {
    "code": "ar",
    "name": "Arabic",
    "isRTL": true
  }
}
```

**Note:** Translations are generated in background (async), so they may not be available immediately.

---

### **2. Search Response (ENHANCED)**

**Endpoint:** `GET /api/memory-graph/memories/search?q=meeting`

**New fields added:**
```json
{
  "ids": [["memory-123"]],
  "metadatas": [[
    {
      "person": "أحمد",
      "language": "ar",
      "hasTranslations": true
    }
  ]],
  "queryLanguage": {
    "code": "en",
    "name": "English",
    "confidence": 0.95
  }
}
```

**What Frontend Should Do:**
- Show `queryLanguage` to user: "Searching in English"
- Show `hasTranslations` badge if translation available
- Display `language` badge on each result

---

### **3. Get Memory in Preferred Language (NEW)**

**Endpoint:** `GET /api/memory-graph/memories/:id/translated?lang=en`

**Response:**
```json
{
  "ok": true,
  "id": "memory-123",
  "document": "This is a memory in English",  // Translated if lang != original
  "original_document": "هذه ذاكرة بالعربية",  // Original text
  "original_language": "ar",
  "display_language": "en",
  "translated_texts": {
    "en": "This is a memory in English",
    "ar": "هذه ذاكرة بالعربية",
    "hi": "यह हिंदी में है"
  },
  "person": "أحمد",
  "event": "اجتماع",
  "tags": ["work"],
  "media": []
}
```

**What Frontend Should Do:**
- Use this endpoint when user wants to see memory in their language
- Pass `?lang=en` (or user's preferred language)
- Show translated text if available, fallback to original

---

### **4. Graph Response (ENHANCED)**

**Endpoint:** `GET /api/memory-graph/graph`

**Nodes now include:**
```json
{
  "nodes": [
    {
      "id": "memory-123",
      "label": "Memory text",
      "data": {
        "language": "ar",
        "translated_texts": {
          "en": "English translation",
          "ar": "Original Arabic"
        },
        "hasTranslations": true
      }
    }
  ]
}
```

**What Frontend Should Do:**
- Check `hasTranslations` to show translation button
- Use `translated_texts[userLang]` to display in user's language

---

## 🎯 Frontend Integration Requirements

### **Requirement 1: Show Translation Availability**

**What to Show:**
- Badge/icon if `hasTranslations === true` in search results
- "Available in English/Arabic/Hindi" indicator
- Translation button on memory cards

**Where to Show:**
- Search results
- Memory detail modal
- Graph nodes

---

### **Requirement 2: Cross-Lingual Search Indicator**

**What to Show:**
- Display detected query language: "Searching in English"
- Show that results may be in different languages
- Example: "Found 3 results (2 in Arabic, 1 in English)"

**Where to Show:**
- Search results header
- Search input helper text

---

### **Requirement 3: Language-Specific Memory Display**

**What to Do:**
- When user clicks memory, check their preferred language
- Call `GET /memories/:id/translated?lang=userLang`
- Display translated text if available
- Show "Original" button to see original text

**User Flow:**
1. User clicks memory
2. Frontend calls `/memories/:id/translated?lang=en`
3. Display translated text
4. Show language badge: "Translated from Arabic"

---

### **Requirement 4: Translation Loading State**

**What to Do:**
- Translations are generated async (may take 2-5 seconds)
- Show "Translating..." indicator if `hasTranslations === false`
- Poll or refresh to check if translations are ready

**Implementation:**
- After creating memory, wait 3 seconds
- Check if `translated_texts` has data
- Show translations when available

---

## 📊 Integration Examples

### **Example 1: Search in English, Find Arabic Memory**

**User Action:** Search "meeting"

**Backend Response:**
```json
{
  "queryLanguage": { "code": "en", "name": "English" },
  "metadatas": [[
    {
      "language": "ar",
      "hasTranslations": true
    }
  ]]
}
```

**Frontend Should:**
- Show: "Found 1 result in Arabic (translated)"
- Display Arabic text with "Translate to English" button
- When clicked, show English translation from `translated_texts.en`

---

### **Example 2: Get Memory in User's Language**

**User Action:** Click Arabic memory, user prefers English

**Frontend Call:**
```
GET /api/memory-graph/memories/memory-123/translated?lang=en
```

**Backend Response:**
```json
{
  "document": "This is a memory in English",
  "original_language": "ar",
  "display_language": "en"
}
```

**Frontend Should:**
- Display English text
- Show badge: "Translated from Arabic"
- Show "View Original" button

---

## ✅ Verification Checklist

### **Backend Tests:**
- [ ] Create Arabic memory → Check `translated_texts` has English/Hindi after 5 seconds
- [ ] Search "meeting" in English → Find Arabic memory
- [ ] Call `/memories/:id/translated?lang=en` → Get English translation
- [ ] Search response includes `queryLanguage` and `hasTranslations`

### **Frontend Tests:**
- [ ] Search results show `hasTranslations` badge
- [ ] Search results show `queryLanguage` indicator
- [ ] Memory detail shows translated text when `?lang=` is used
- [ ] Translation button works on memory cards

---

## 📝 Summary

**Backend Provides:**
- ✅ Automatic translations (async)
- ✅ Cross-lingual search
- ✅ Get memory in preferred language endpoint
- ✅ Language info in all responses

**Frontend Must:**
- ⏳ Show translation availability
- ⏳ Display cross-lingual search indicator
- ⏳ Use translated endpoint for user's language
- ⏳ Handle translation loading states

---

**🎯 Goal: Frontend displays translations and cross-lingual search results properly!**


