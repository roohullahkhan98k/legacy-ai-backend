# 🎯 Frontend 35% Implementation Guide - Milestone 6 Integration

## 📋 Overview

This document explains the **backend implementation** for Milestone 6 (35% complete) and what the **frontend needs to integrate** to display multilingual functionality.

---

## ✅ Backend Implementation (COMPLETED)

### **What Backend Does:**

1. **Automatic Language Detection**
   - When a memory is created via `POST /api/memory-graph/memories`, the backend automatically detects the language from the `document` text
   - Supports: English, Arabic, Hindi, Spanish, French, German, Portuguese, Italian, Russian, Japanese, Korean, Chinese, and more
   - Detection happens automatically - frontend does NOT need to send language code

2. **Language Storage**
   - Backend stores detected language in `original_language` column in database
   - Language is stored as ISO 639-1 code (e.g., 'en', 'ar', 'hi', 'es')

3. **API Response Enhancement**
   - All memory creation/update endpoints now return language information
   - Language info includes: code, name, confidence, and RTL flag

4. **Multilingual Embeddings**
   - Backend uses `text-embedding-3-large` (multilingual support)
   - Embeddings are generated in the original language (not translated)

---

## 🔌 API Response Format

### **Memory Creation Response**

**Endpoint:** `POST /api/memory-graph/memories`

**Response includes:**
```json
{
  "ok": true,
  "id": "memory-123",
  "language": {
    "code": "ar",
    "name": "Arabic",
    "confidence": 0.95,
    "isRTL": true
  }
}
```

**For English memory:**
```json
{
  "ok": true,
  "id": "memory-456",
  "language": {
    "code": "en",
    "name": "English",
    "confidence": 0.92,
    "isRTL": false
  }
}
```

**For Hindi memory:**
```json
{
  "ok": true,
  "id": "memory-789",
  "language": {
    "code": "hi",
    "name": "Hindi",
    "confidence": 0.88,
    "isRTL": false
  }
}
```

### **Memory Update Response**

**Endpoint:** `POST /api/memory-graph/memories/:id/tags`

**Response includes:**
```json
{
  "ok": true,
  "id": "memory-123",
  "tags": ["work", "important"],
  "language": {
    "code": "ar",
    "name": "Arabic",
    "isRTL": true
  }
}
```

**Note:** If `document` field is updated, language is automatically re-detected.

### **Graph Response**

**Endpoint:** `GET /api/memory-graph/graph`

**Response includes language in node metadata:**
```json
{
  "nodes": [
    {
      "id": "memory-123",
      "label": "Memory text",
      "type": "memory",
      "data": {
        "person": "أحمد",
        "language": "ar"  // Language code included
      }
    }
  ],
  "edges": []
}
```

---

## 🎯 Frontend Integration Requirements

### **Requirement 1: Display Detected Language**

**What to Show:**
- When a memory is created, display the detected language from the API response
- Show language name (e.g., "Arabic", "English", "Hindi")
- Show RTL indicator if `language.isRTL === true`

**Where to Show:**
- In success toast/notification after memory creation
- In search results - show language badge on each memory card
- In memory detail modal - show language information section
- In memory list/graph view - show language indicator

**Example Display:**
- Toast: "Memory created successfully! (Language: Arabic, RTL)"
- Badge: "Language: Arabic [RTL]"
- Modal: Language section showing "Arabic" with RTL badge

---

### **Requirement 2: Apply RTL Layout for Arabic**

**What to Do:**
- When `language.isRTL === true` (Arabic, Hebrew, Urdu), apply right-to-left layout
- Set `dir="rtl"` on text elements containing Arabic content
- Mirror UI elements (buttons, menus, icons) for RTL languages
- Ensure text alignment is right-aligned for RTL content

**Where to Apply:**
- Memory text content (document field)
- Search result cards with Arabic text
- Memory detail modal content
- Form inputs when displaying Arabic text

**CSS Requirements:**
- Support `[dir="rtl"]` selector
- Mirror flexbox layouts for RTL
- Ensure proper text alignment

---

### **Requirement 3: UI Localization (i18next)**

**What Milestone 6 Requires:**
- Support for multiple UI languages (English, Arabic, Hindi)
- Translation files: `locales/en.json`, `locales/ar.json`, `locales/hi.json`
- Language switcher component
- UI text should translate based on user's language preference

**What to Implement:**
- Install and configure i18next
- Create translation files with UI text
- Add language switcher (dropdown/buttons)
- Translate all UI labels, buttons, messages
- Store user's language preference (localStorage)

**Translation File Structure (from Milestone 6):**
- `locales/en-AU.json` or `locales/en.json` - English translations
- `locales/ar.json` - Arabic translations
- `locales/hi.json` - Hindi translations

**Example translations needed:**
- "Welcome" / "مرحبا" / "स्वागत है"
- "Record a Memory" / "سجّل ذكرى" / "याद रिकॉर्ड करें"
- "Language" / "اللغة" / "भाषा"
- All UI buttons, labels, messages

---

### **Requirement 4: Language Badge Display**

**What to Show:**
- Language badge on memory cards in search results
- Language badge in memory detail view
- Language badge in memory list/graph view

**Badge Information:**
- Language name (from `language.name` in API response)
- Language code (from `language.code`)
- RTL indicator if applicable (from `language.isRTL`)

**Visual Requirements:**
- Clear, visible badge
- Color-coded or styled differently for RTL languages
- Icon (globe icon) to indicate language

---

### **Requirement 5: Language Switcher Component**

**What Milestone 6 Requires:**
- User can switch UI language
- Supports: English, Arabic, Hindi (and more as needed)
- Preference persists across sessions

**What to Implement:**
- Language switcher UI component (dropdown/buttons)
- Switch between: English, Arabic, Hindi
- Update all UI text when language changes
- Apply RTL layout when Arabic is selected
- Save preference to localStorage

**Behavior:**
- When user selects Arabic → UI switches to Arabic translations + RTL layout
- When user selects Hindi → UI switches to Hindi translations + LTR layout
- When user selects English → UI switches to English translations + LTR layout

---

### **Requirement 6: Memory Text Display**

**What to Do:**
- Display memory text (`document` field) with correct text direction
- If `language.isRTL === true` → display with `dir="rtl"` and right alignment
- If `language.isRTL === false` → display with `dir="ltr"` and left alignment

**Where to Apply:**
- Search result cards
- Memory detail modal
- Memory list view
- Memory graph nodes

---

## 📊 Integration Points

### **1. Memory Creation Flow**

**Current Flow:**
1. User fills form → Clicks "Create"
2. Frontend sends `POST /api/memory-graph/memories`
3. Backend detects language automatically
4. Backend returns response with `language` object

**What Frontend Should Do:**
- Read `response.language` from API response
- Display language info in success message
- Show language badge on the created memory
- Apply RTL if `language.isRTL === true`

---

### **2. Search Results Display**

**Current Flow:**
1. User searches → Frontend sends `GET /api/memory-graph/memories/search`
2. Backend returns search results
3. Results may include `language` in metadata

**What Frontend Should Do:**
- Extract `language` from each result's metadata
- Display language badge on each result card
- Apply RTL text direction if `language.isRTL === true`
- Show language name and RTL indicator

---

### **3. Memory Detail View**

**Current Flow:**
1. User clicks memory → Frontend fetches memory details
2. Memory data includes `original_language` or `language` in metadata

**What Frontend Should Do:**
- Display language information section
- Show language name, code, and RTL indicator
- Apply RTL text direction to memory content
- Show confidence score if available

---

### **4. Graph View**

**Current Flow:**
1. User views graph → Frontend fetches `GET /api/memory-graph/graph`
2. Graph nodes include `language` in `data` object

**What Frontend Should Do:**
- Extract `language` from node `data`
- Display language indicator on graph nodes
- Apply RTL for Arabic nodes if needed

---

## 🎯 Milestone 6 Requirements Reference

### **From Milestone 6 Section 3: JSON Templates for All Languages**

**Required:**
- Translation files: `locales/en-AU.json`, `locales/ar.json`, `locales/hi.json`
- UI text should be translatable
- Example: `{ "welcome": "Welcome", "recordMemory": "Record a Memory" }`

**Frontend Must:**
- Create these translation files
- Implement i18next for UI localization
- Support language switching

---

### **From Milestone 6 Section 5: UI Screenshots (RTL and LTR Layouts)**

**Required:**
- Support for LTR layout (English)
- Support for RTL layout (Arabic)

**Frontend Must:**
- Implement RTL CSS support
- Mirror UI elements for RTL
- Apply `dir="rtl"` for Arabic content

---

### **From Milestone 6 Section 7: Developer SOW**

**Deliverable 1: Implement i18next and locale switching**
- Frontend must implement i18next
- Frontend must add locale switching UI

**Deliverable 6: Implement RTL UI support**
- Frontend must support RTL layouts
- Frontend must mirror UI elements

---

## ✅ Verification Checklist

### **Backend Integration:**
- [ ] API response includes `language` object when creating memory
- [ ] API response includes `language` object when updating memory
- [ ] Graph API includes `language` in node data
- [ ] Language detection works for English text
- [ ] Language detection works for Arabic text
- [ ] Language detection works for Hindi text

### **Frontend Display:**
- [ ] Language badge appears on memory cards
- [ ] Language name displays correctly
- [ ] RTL indicator shows for Arabic
- [ ] Memory text displays with correct direction (RTL for Arabic)
- [ ] Success toast shows detected language

### **UI Localization:**
- [ ] i18next installed and configured
- [ ] Translation files created (en.json, ar.json, hi.json)
- [ ] Language switcher component works
- [ ] UI text translates when language changes
- [ ] Language preference persists

### **RTL Support:**
- [ ] RTL layout applies for Arabic UI
- [ ] RTL layout applies for Arabic memory content
- [ ] UI elements mirror correctly in RTL
- [ ] Text alignment is correct (right for RTL)

---

## 📝 Summary

**Backend Provides:**
- Automatic language detection
- Language info in all API responses
- RTL flag (`isRTL`) for proper layout
- Language code and name

**Frontend Must Integrate:**
- Display language information from API responses
- Apply RTL layout when `isRTL === true`
- Implement i18next for UI localization
- Create language switcher
- Create translation files (en, ar, hi)
- Support RTL CSS and layout

**Milestone 6 Requirements:**
- ✅ Backend: Language detection (DONE)
- ⏳ Frontend: i18next and locale switching (TODO)
- ⏳ Frontend: RTL UI support (TODO)
- ⏳ Frontend: Translation files (TODO)

---

**🎯 Goal: Frontend integrates with backend API responses to display multilingual functionality as specified in Milestone 6.**
