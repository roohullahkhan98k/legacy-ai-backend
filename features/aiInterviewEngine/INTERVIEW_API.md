# 🎤 AI Interview API - Simple Guide

## Overview
**ONE TABLE** system for storing interview sessions with Q&A pairs as JSON.

Base URL: `/api/interview`

---

## 📊 Database Structure

### Table: `interviews`
```sql
- id (UUID)
- session_id (STRING) - WebSocket session ID
- user_id (UUID) - Optional
- title (STRING) - Auto-generated if not provided
- status ('active' | 'completed')
- qa_pairs (JSONB) - Array of {question, answer, timestamp}
- total_qa (INTEGER)
- started_at (TIMESTAMP)
- ended_at (TIMESTAMP)
```

### Q&A Pair Format (in `qa_pairs` JSON array):
```json
{
  "question": "What is closure?",
  "answer": "A closure is...",
  "timestamp": "2025-10-11T08:00:00Z"
}
```

---

## 🔌 API Endpoints

### 1. Start Interview

**POST** `/api/interview/start`

When user starts an interview (WebSocket connects).

**Request:**
```json
{
  "session_id": "websocket-session-123",
  "user_id": "user-uuid-optional"
}
```

**Response:**
```json
{
  "success": true,
  "interview_id": "interview-uuid"
}
```

---

### 2. Add Q&A Pair

**POST** `/api/interview/qa`

Save each question-answer pair as they happen.

**Request:**
```json
{
  "session_id": "websocket-session-123",
  "question": "What is JavaScript closure?",
  "answer": "A closure is a function that has access to variables..."
}
```

**Response:**
```json
{
  "success": true,
  "total_qa": 5
}
```

**When to call:**
- After AI asks question + user answers
- One call per Q&A pair

---

### 3. End Interview

**POST** `/api/interview/end`

When user clicks "End Interview" button (disconnects WebSocket).

**Request:**
```json
{
  "session_id": "websocket-session-123",
  "title": "JavaScript Interview"  // Optional - auto-generated if not provided
}
```

**Response:**
```json
{
  "success": true,
  "interview": {
    "id": "interview-uuid",
    "title": "JavaScript Interview",
    "total_qa": 10,
    "started_at": "2025-10-11T08:00:00Z",
    "ended_at": "2025-10-11T08:15:00Z",
    "qa_pairs": [
      {
        "question": "What is closure?",
        "answer": "A closure is...",
        "timestamp": "2025-10-11T08:01:00Z"
      },
      ...
    ]
  }
}
```

---

### 4. Get Interview

**GET** `/api/interview/:sessionId`

Get full interview data including all Q&A pairs.

**Response:**
```json
{
  "success": true,
  "interview": {
    "id": "interview-uuid",
    "session_id": "websocket-session-123",
    "title": "JavaScript Interview",
    "status": "completed",
    "total_qa": 10,
    "started_at": "2025-10-11T08:00:00Z",
    "ended_at": "2025-10-11T08:15:00Z",
    "qa_pairs": [...]
  }
}
```

---

### 5. Get User's Interviews

**GET** `/api/interview/user/:userId`

Get all interviews for a specific user.

**Response:**
```json
{
  "success": true,
  "interviews": [
    {
      "id": "interview-uuid",
      "title": "JavaScript Interview",
      "status": "completed",
      "total_qa": 10,
      "started_at": "2025-10-11T08:00:00Z",
      "ended_at": "2025-10-11T08:15:00Z"
    },
    ...
  ]
}
```

---

### 6. Search Similar Q&A

**POST** `/api/interview/search`

Find similar questions/answers using ChromaDB semantic search.

**Request:**
```json
{
  "query": "How do closures work in JavaScript?",
  "limit": 5
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "question": "What is closure?",
      "answer": "A closure is...",
      "interview_id": "interview-uuid",
      "similarity": 0.85
    },
    ...
  ]
}
```

---

### 7. Delete Interview

**DELETE** `/api/interview/:sessionId`

Delete an interview (removes from both PostgreSQL & ChromaDB).

**Response:**
```json
{
  "success": true,
  "message": "Interview deleted"
}
```

---

## 🔄 Complete Flow

### Frontend Integration:

```javascript
// 1. User starts interview (WebSocket connects)
const sessionId = generateSessionId(); // e.g., crypto.randomUUID()

await fetch('/api/interview/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: sessionId,
    user_id: currentUserId
  })
});

// 2. During interview - save each Q&A
// When AI asks & user answers:
await fetch('/api/interview/qa', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: sessionId,
    question: aiQuestion,
    answer: userAnswer
  })
});

// 3. User clicks "End Interview"
const response = await fetch('/api/interview/end', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: sessionId,
    title: userEnteredTitle || null // Will auto-generate if null
  })
});

const { interview } = await response.json();

// Show user the full transcript
console.log('Transcript:', interview.qa_pairs);
console.log('Total Q&A:', interview.total_qa);
```

---

## 📝 Key Points

### ✅ Simple Flow:
1. **Start** → Create interview record
2. **Add Q&A** → Keep adding pairs as they happen
3. **End** → Mark complete, set title, get full transcript

### ✅ Title Auto-Generation:
- If user doesn't provide title → Auto-generated as "Interview 1", "Interview 2", etc.
- Based on total count in database

### ✅ JSON Storage:
- All Q&A pairs stored in single `qa_pairs` JSONB column
- Fast, simple, no extra table needed
- Easy to query and display

### ✅ ChromaDB Integration:
- Each Q&A pair automatically saved to ChromaDB
- Enables semantic search for similar questions
- Completely optional - works without it

---

## 🎯 Frontend Response Examples

### After starting:
```json
{
  "success": true,
  "interview_id": "abc-123"
}
```
**Show:** "Interview started! Session: abc-123"

### After adding Q&A:
```json
{
  "success": true,
  "total_qa": 5
}
```
**Show:** "5 questions answered so far"

### After ending:
```json
{
  "success": true,
  "interview": {
    "title": "My JavaScript Interview",
    "total_qa": 10,
    "qa_pairs": [...]
  }
}
```
**Show:** Full transcript page with all Q&A pairs

---

## 🗄️ View Data

Run the database viewer:
```bash
node simple-db-viewer.js
```

Then open: `http://localhost:3001`

You'll see:
- ✅ All interviews
- ✅ Full transcripts (expandable)
- ✅ Statistics

---

## ⚡ Quick Test

```bash
# 1. Start interview
curl -X POST http://localhost:3000/api/interview/start \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test-123"}'

# 2. Add Q&A
curl -X POST http://localhost:3000/api/interview/qa \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test-123","question":"What is JS?","answer":"JavaScript is..."}'

# 3. End interview
curl -X POST http://localhost:3000/api/interview/end \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test-123","title":"My Test"}'

# 4. Get interview
curl http://localhost:3000/api/interview/test-123
```

---

## ✨ That's It!

**Super simple:**
- ONE table
- THREE main endpoints (start, add Q&A, end)
- JSON storage for Q&A pairs
- Auto-generated titles
- Full transcript on end

No complexity, just works! 🚀

