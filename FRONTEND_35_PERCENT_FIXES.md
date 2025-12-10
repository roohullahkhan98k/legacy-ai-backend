# 🔧 Frontend 35% Milestone 6 - Fixes Needed

## Issues Found

### Issue 1: "View Original" Shows Same Text
**Problem:** When translation fails (API quota), backend returns original text as "translated" text, so both views show the same.

**Root Cause:** Translation service returns original text on quota errors, so `translatedData.document === originalDocument`.

**Fix:** Check if translation actually changed the text before showing "View Original" button.

### Issue 2: "Available in all language" Badge Not Clickable
**Problem:** Badge shows translations are available but user can't select which language to view.

**Root Cause:** Badge is just visual, no interaction.

**Fix:** Make it a dropdown/button to switch languages.

---

## Backend Changes (Already Done ✅)

1. **`/memories/:id/translated` endpoint now returns:**
   ```json
   {
     "document": "translated text or original",
     "original_document": "original text",
     "original_language": "ar",
     "display_language": "en",
     "translated_texts": { "en": "...", "hi": "..." },
     "available_languages": ["ar", "en", "hi"],  // NEW
     "has_translations": true  // NEW - only true if actual translations exist
   }
   ```

2. **Search results now include:**
   ```json
   {
     "metadatas": [{
       "language": "ar",
       "hasTranslations": true,
       "availableLanguages": ["ar", "en", "hi"]  // NEW
     }]
   }
   ```

3. **Graph nodes now include:**
   ```json
   {
     "data": {
       "language": "ar",
       "hasTranslations": true,
       "availableLanguages": ["ar", "en", "hi"]  // NEW
     }
   }
   ```

---

## Frontend Fixes Needed

### Fix 1: Detect Failed Translations

**Location:** `MemoryGraphPage.tsx` - Memory Detail Modal

**Current Code:**
```typescript
const document = translatedData && !isViewingOriginal 
  ? translatedData.document 
  : originalDocument;
```

**Fixed Code:**
```typescript
// Check if translation actually changed the text (not a failed translation)
const isTranslationValid = translatedData && 
  translatedData.document !== translatedData.original_document &&
  translatedData.has_translations;

const document = isTranslationValid && !isViewingOriginal 
  ? translatedData.document 
  : originalDocument;
```

**Also update the button logic:**
```typescript
// Only show "View Original" if translation is valid
{isTranslationValid && !isViewingOriginal ? (
  <Button onClick={() => setViewingOriginal(prev => {
    const next = new Set(prev);
    next.add(node.id);
    return next;
  })}>
    {t('memory.viewOriginal')}
  </Button>
) : (
  // Only show translate button if translations actually exist
  hasTranslations && translatedData?.has_translations && (
    <Button onClick={async () => {
      if (!translatedData) {
        await loadTranslatedMemory(node.id, userLang);
      } else {
        setViewingOriginal(prev => {
          const next = new Set(prev);
          next.delete(node.id);
          return next;
        });
      }
    }}>
      <Languages className="h-3 w-3" />
      {t('memory.translateTo', { language: userLang.toUpperCase() })}
    </Button>
  )
)}
```

---

### Fix 2: Make Language Badge Clickable

**Location:** `MemoryGraphPage.tsx` - Search Results & Memory Modal

**Option A: Dropdown Menu (Recommended)**

Replace the badge with a dropdown:

```typescript
import { ChevronDown } from 'lucide-react';

// In search results
{meta.availableLanguages && meta.availableLanguages.length > 1 && (
  <div className="relative">
    <button
      onClick={(e) => {
        e.stopPropagation();
        // Toggle dropdown or show language selector
      }}
      className="px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] flex items-center gap-1 hover:bg-green-200 dark:hover:bg-green-900/50"
    >
      <Languages className="h-3 w-3" />
      {t('memory.availableLanguages')} ({meta.availableLanguages.length})
      <ChevronDown className="h-2 w-2" />
    </button>
    
    {/* Dropdown menu */}
    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10 min-w-[120px]">
      {meta.availableLanguages.map((lang: string) => (
        <button
          key={lang}
          onClick={async () => {
            await loadTranslatedMemory(r.id, lang);
            // Close dropdown
          }}
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <Globe className="h-3 w-3" />
          {lang.toUpperCase()}
          {lang === meta.language && (
            <span className="ml-auto text-xs text-primary-600">✓</span>
          )}
        </button>
      ))}
    </div>
  </div>
)}
```

**Option B: Simple Button (Simpler)**

Replace badge with clickable button that cycles through languages:

```typescript
const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

// In search results
{meta.availableLanguages && meta.availableLanguages.length > 1 && (
  <button
    onClick={async (e) => {
      e.stopPropagation();
      const currentLang = selectedLanguage || meta.language;
      const currentIndex = meta.availableLanguages.indexOf(currentLang);
      const nextIndex = (currentIndex + 1) % meta.availableLanguages.length;
      const nextLang = meta.availableLanguages[nextIndex];
      
      setSelectedLanguage(nextLang);
      if (nextLang !== meta.language) {
        await loadTranslatedMemory(r.id, nextLang);
      }
    }}
    className="px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] flex items-center gap-1 hover:bg-green-200 dark:hover:bg-green-900/50 cursor-pointer"
    title={`Click to switch language. Available: ${meta.availableLanguages.join(', ')}`}
  >
    <Languages className="h-3 w-3" />
    {t('memory.availableLanguages')} ({meta.availableLanguages.length})
  </button>
)}
```

---

### Fix 3: Update Translation Loading Logic

**Location:** `MemoryGraphPage.tsx` - useEffect for auto-loading translations

**Current Code:**
```typescript
if (hasTranslations && language && language.code !== userLang && !translatedData && !isTranslating) {
  loadTranslatedMemory(node.id, userLang);
}
```

**Fixed Code:**
```typescript
// Only auto-load if:
// 1. Translations actually exist (not just hasTranslations flag)
// 2. User language is different from original
// 3. Translation not already loaded
// 4. Not currently loading
const shouldAutoLoad = hasTranslations && 
  language && 
  language.code !== userLang && 
  !translatedData && 
  !isTranslating &&
  meta.availableLanguages?.includes(userLang); // Check if user's language is available

if (shouldAutoLoad) {
  loadTranslatedMemory(node.id, userLang);
}
```

---

### Fix 4: Show Translation Status Message

**Location:** `MemoryGraphPage.tsx` - Memory Modal

Add a message when translations are not available due to quota:

```typescript
{!hasTranslations && language && language.code !== userLang && (
  <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded mt-2">
    ⚠️ {t('memory.translationNotAvailable')} ({t('memory.quotaExceeded')})
  </div>
)}
```

---

## Summary

### ✅ Backend: 100% Done
- Returns `available_languages` array
- Returns `has_translations` boolean (only true if actual translations exist)
- Translation endpoint properly handles empty translations

### ⚠️ Frontend: Needs These Fixes
1. ✅ Check if translation is valid before showing "View Original"
2. ✅ Make language badge clickable (dropdown or button)
3. ✅ Use `availableLanguages` array to show language options
4. ✅ Show message when translations unavailable due to quota

---

## Quick Test After Fixes

1. **Create Arabic memory:** `هذه ذاكرة بالعربية`
2. **Open memory modal:** Should show "Translation not available" (quota issue)
3. **Check search results:** Language badge should show available languages
4. **Click language badge:** Should show dropdown/switch languages (if translations exist)

---

## Translation Keys Needed

Add these to your i18n files:

```json
{
  "memory": {
    "availableLanguages": "Available in",
    "translationNotAvailable": "Translation not available",
    "quotaExceeded": "API quota exceeded",
    "switchLanguage": "Switch to {language}",
    "viewingLanguage": "Viewing in {language}"
  }
}
```

