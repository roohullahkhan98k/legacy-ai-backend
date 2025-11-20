# 🚀 AI Prototype Backend - Production Ready

## 📋 Overview

Complete AI-powered backend system with **PostgreSQL** and **ChromaDB** integration. All features are user-based, authenticated, and production-ready.

---

## ✨ Features

### 🎙️ **1. AI Interview Engine**
- Real-time AI interviews with Gemini 2.0
- WebSocket streaming responses
- Q&A history stored in PostgreSQL
- Semantic search with ChromaDB
- Auto-generated interview titles
- User-specific interview sessions

### 🧠 **2. Memory Graph Service**
- Semantic memory storage with ChromaDB
- Graph visualization (person, event, tags, media)
- PostgreSQL + ChromaDB hybrid storage
- User-based memory filtering
- Advanced search capabilities

### 🎤 **3. Voice Cloning & Playback**
- Custom voice cloning with ElevenLabs
- User-specific voice library
- Generated audio history
- Default + custom voices
- PostgreSQL storage for all user data

### 👤 **4. Avatar Service**
- 3D avatar generation (Ready Player Me)
- Lipsync animation (Rhubarb)
- Audio-to-animation pipeline
- User-specific avatars
- PostgreSQL + file storage

### 📁 **5. Multimedia Upload & Linking**
- Image/video/audio uploads
- Auto metadata extraction (EXIF, GPS, dimensions)
- Memory nodes (events, people, timelines)
- Smart linking with relationships
- User-specific galleries
- PostgreSQL storage (no db.json!)

### 🔐 **6. Authentication & Users**
- JWT-based authentication
- User registration & login
- Bcrypt password hashing
- Profile management

---

## 🗄️ Database Structure

### **PostgreSQL Tables (12 Total)**

| Table | Purpose | Records |
|-------|---------|---------|
| `users` | User accounts | Users, profiles |
| `interviews` | AI interview sessions | Sessions, Q&A pairs (JSONB) |
| `memory_nodes` | Memory graph nodes | Semantic memories |
| `user_voices` | Custom voice clones | ElevenLabs voice IDs |
| `generated_audio` | Speech generation history | Audio files, metadata |
| `user_avatars` | 3D avatars | Avatar models, metadata |
| `avatar_animations` | Lipsync animations | Animations, audio |
| `multimedia_files` | Uploaded media | Images, videos, audio |
| `multimedia_memory_nodes` | Multimedia memories | Events, people, timelines |
| `multimedia_links` | Media ↔ Node links | Relationships |

### **ChromaDB Collections (2 Total)**

| Collection | Purpose | Data |
|------------|---------|------|
| `ai-interviews` | Interview Q&A embeddings | Questions, answers, metadata |
| `memory-graph` | Memory embeddings | Documents, person, event, tags |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Express.js Backend                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   JWT Auth   │  │  PostgreSQL  │  │   ChromaDB   │      │
│  │  Middleware  │  │  (Sequelize) │  │  (Vector DB) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Feature Services                        │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ • AI Interview Engine (Gemini + ChromaDB)          │    │
│  │ • Memory Graph (PostgreSQL + ChromaDB)             │    │
│  │ • Voice Cloning (ElevenLabs + PostgreSQL)          │    │
│  │ • Avatar Service (RPM + Rhubarb + PostgreSQL)      │    │
│  │ • Multimedia Upload (PostgreSQL + File Storage)    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              RESTful APIs + WebSockets               │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+
- PostgreSQL 14+
- Docker (for ChromaDB)

### **1. Install Dependencies**
```bash
npm install
```

### **2. Setup Environment**
Create `.env` file:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ai_prototype

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# ElevenLabs Voice Cloning
ELEVENLABS_API_KEY=your-elevenlabs-api-key

# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8000

# Ready Player Me
RPM_API_KEY=your-rpm-api-key

# Rhubarb Lipsync
RHUBARB_CMD=C:\path\to\rhubarb\rhubarb.exe
```

### **3. Start ChromaDB**
```bash
npm run chroma:up
```

### **4. Start Backend**
```bash
node server.js
```

Server runs on: `http://localhost:3000`

### **5. View Database (Optional)**
```bash
node simple-db-viewer.js
```

Database viewer: `http://localhost:3001`

---

## 📚 API Documentation

### **Base URL:** `http://localhost:3000/api`

### **Authentication**
All endpoints require JWT token:
```
Authorization: Bearer <your-jwt-token>
```

### **Core Endpoints**

#### **Auth**
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login, get JWT token

#### **AI Interviews**
- `POST /api/interview/start` - Start interview session
- `POST /api/interview/qa` - Add Q&A pair
- `POST /api/interview/end` - End interview
- `GET /api/interview/:sessionId` - Get interview
- `GET /api/interview/user/:userId` - User's interviews
- `POST /api/interview/search` - Semantic search
- `DELETE /api/interview/:sessionId` - Delete interview

#### **Memory Graph**
- `POST /api/memory-graph/memories` - Create memory
- `POST /api/memory-graph/memories/:id/tags` - Update memory
- `DELETE /api/memory-graph/memories/:id` - Delete memory
- `GET /api/memory-graph/memories/search` - Semantic search
- `GET /api/memory-graph/graph` - Get graph data
- `POST /api/memory-graph/media/upload` - Upload media

#### **Voice Cloning**
- `POST /api/voice-cloning/clone` - Clone voice
- `POST /api/voice-cloning/generate` - Generate speech
- `GET /api/voice-cloning/voices` - Get voices (default + custom)
- `DELETE /api/voice-cloning/voices/:voiceId` - Delete custom voice
- `GET /api/voice-cloning/user/audio-history` - Audio history
- `GET /api/voice-cloning/user/custom-voices` - Custom voices

#### **Avatar Service**
- `POST /api/avatar` - Create avatar
- `GET /api/avatar` - List avatars
- `GET /api/avatar/:id` - Get avatar
- `DELETE /api/avatar/:id` - Delete avatar
- `POST /api/avatar/pipeline/image-to-model` - Image → 3D model
- `POST /api/avatar/pipeline/:id/audio-to-lipsync` - Audio → Lipsync
- `GET /api/avatar/pipeline/job/:jobId` - Job status

#### **Multimedia Upload**
- `POST /api/multimedia/upload/single` - Upload file
- `POST /api/multimedia/upload/multiple` - Upload multiple
- `GET /api/multimedia/media` - Get all media
- `GET /api/multimedia/media/:id` - Get media
- `GET /api/multimedia/media/:id/download` - Download
- `DELETE /api/multimedia/media/:id` - Delete media
- `POST /api/multimedia/nodes` - Create memory node
- `GET /api/multimedia/nodes` - Get all nodes
- `POST /api/multimedia/link/:mediaId/to/:nodeId` - Link
- `DELETE /api/multimedia/link/:mediaId/from/:nodeId` - Unlink
- `POST /api/multimedia/link/bulk/to/:nodeId` - Bulk link
- `GET /api/multimedia/analytics/dashboard` - Analytics

---

## 📁 Project Structure

```
back-end/
├── server.js                         # Main entry point
├── app.js                            # Express app setup
├── package.json                      # Dependencies
├── .env                              # Environment variables
│
├── common/                           # Shared utilities
│   ├── auth/                         # Authentication
│   │   ├── authController.js
│   │   └── authRoutes.js
│   ├── middleware/
│   │   ├── authMiddleware.js         # JWT verification
│   │   └── upload.js                 # Multer config
│   ├── models/
│   │   └── User.js                   # User model
│   └── database.js                   # PostgreSQL connection
│
├── features/                         # Feature modules
│   ├── aiInterviewEngine/
│   │   ├── controllers/
│   │   │   ├── geminiController.js
│   │   │   └── interviewController.js
│   │   ├── models/
│   │   │   └── Interview.js          # PostgreSQL model
│   │   ├── services/
│   │   │   ├── GeminiService.js      # Gemini API
│   │   │   ├── InterviewService.js   # Business logic
│   │   │   └── InterviewChromaService.js  # ChromaDB
│   │   └── routes/
│   │       ├── geminiRoutes.js
│   │       └── interviewRoutes.js
│   │
│   ├── memoryGraphService/
│   │   ├── controllers/
│   │   │   └── memoryGraphController.js
│   │   ├── models/
│   │   │   └── MemoryNode.js         # PostgreSQL model
│   │   ├── routes/
│   │   │   └── memoryGraphRoutes.js
│   │   └── memoryGraphService.js     # ChromaDB integration
│   │
│   ├── voiceCloningPlayback/
│   │   ├── controllers/
│   │   │   └── voiceCloningController.js
│   │   ├── models/
│   │   │   └── VoiceCloning.js       # PostgreSQL models
│   │   ├── routes/
│   │   │   └── voiceCloningRoutes.js
│   │   └── voiceCloningService.js    # ElevenLabs API
│   │
│   ├── avatarService/
│   │   ├── controllers/
│   │   │   ├── avatarController.js
│   │   │   └── pipelineController.js # RPM + Rhubarb
│   │   ├── models/
│   │   │   ├── Avatar.js             # PostgreSQL models
│   │   │   └── jobsDb.js             # Job tracking
│   │   └── routes/
│   │       ├── avatarRoutes.js
│   │       └── pipelineRoutes.js
│   │
│   └── multimediaUpload/
│       ├── controllers/
│       │   ├── multimediaController.js    # Upload, CRUD
│       │   ├── memoryNodeController.js    # Nodes CRUD
│       │   └── linkingController.js       # Linking logic
│       ├── models/
│       │   └── Multimedia.js              # 3 PostgreSQL models
│       ├── services/
│       │   └── PostgresMultimediaService.js
│       ├── middleware/
│       │   ├── upload.js
│       │   └── metadataExtractor.js       # EXIF extraction
│       └── routes/
│           └── multimediaRoutes.js
│
├── chromaDB/
│   ├── chromadb.js                   # ChromaDB client
│   ├── routes.js                     # ChromaDB routes
│   └── docker-compose.yml            # ChromaDB Docker
│
├── uploads/                          # File storage
│   ├── avatars/
│   ├── multimedia/
│   ├── users/
│   └── voice-samples/
│
└── simple-db-viewer.js               # Database web viewer
```

---

## 🔐 Security Features

✅ **Authentication**
- JWT tokens on all protected endpoints
- Bcrypt password hashing (10 rounds)
- Token expiration (24 hours)

✅ **User Isolation**
- Every resource linked to `user_id`
- Users only see their own data
- Ownership verification on all operations

✅ **Data Protection**
- SQL injection prevention (Sequelize ORM)
- File upload validation
- CORS configuration
- Secure file paths

✅ **Cascading Deletes**
- Delete user → All their data deleted
- Delete avatar → All animations deleted
- Delete media → All links deleted

---

## 📊 Database Schema

### **User-Related Tables**
```sql
users (id, username, email, password_hash, avatar, created_at)
  ├── interviews (user_id FK)
  ├── memory_nodes (user_id FK)
  ├── user_voices (user_id FK)
  ├── generated_audio (user_id FK)
  ├── user_avatars (user_id FK)
  ├── multimedia_files (user_id FK)
  ├── multimedia_memory_nodes (user_id FK)
  └── multimedia_links (user_id FK)
```

### **Relationships**
```
user_avatars (1) ──< (Many) avatar_animations
multimedia_files (1) ──< (Many) multimedia_links >── (1) multimedia_memory_nodes
```

---

## 🎯 API Response Format

### **Success Response**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### **Error Response**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

### **Common Status Codes**
- `200` - Success
- `201` - Created
- `400` - Bad request (validation error)
- `401` - Unauthorized (no token or invalid token)
- `403` - Forbidden (not your resource)
- `404` - Not found
- `500` - Server error

---

## 🧪 Testing

### **1. Health Check**
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "AI Prototype server is running",
  "database": "Connected",
  "services": [
    "Authentication", "AI Interview", "Memory Graph",
    "Voice Cloning", "Avatar Service", "Multimedia Upload"
  ]
}
```

### **2. Register User**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### **3. Login**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the `token` from response!

### **4. Test Upload**
```bash
curl -X POST http://localhost:3000/api/multimedia/upload/single \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "media=@photo.jpg"
```

---

## 📦 Dependencies

### **Core**
- `express` - Web framework
- `sequelize` - PostgreSQL ORM
- `pg` - PostgreSQL driver
- `dotenv` - Environment variables
- `cors` - CORS middleware

### **Authentication**
- `jsonwebtoken` - JWT tokens
- `bcryptjs` - Password hashing

### **AI & ML**
- `@google/generative-ai` - Gemini AI SDK
- `chromadb` - Vector database
- `chromadb-default-embed` - Embeddings

### **Voice & Audio**
- `@elevenlabs/elevenlabs-js` - Voice cloning
- `fluent-ffmpeg` - Audio processing
- `ffmpeg-static` - FFmpeg binary

### **Avatar & 3D**
- `axios` - HTTP client (RPM API)
- `sharp` - Image processing

### **File Upload**
- `multer` - File upload middleware
- `exif-reader` - EXIF metadata extraction

### **Real-time**
- `socket.io` - WebSocket server
- `ws` - WebSocket client

---

## 🔧 Configuration

### **PostgreSQL Setup**
```bash
# Create database
createdb ai_prototype

# Or using psql
psql -U postgres
CREATE DATABASE ai_prototype;
\q
```

### **ChromaDB Setup**
```bash
# Start with Docker
npm run chroma:up

# Stop
npm run chroma:down

# Check status
docker ps | grep chroma
```

### **File Upload Limits**
Default: 100MB per file

To change, edit `features/multimediaUpload/middleware/upload.js`:
```javascript
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});
```

---

## 📈 Performance

### **Optimizations**
- ✅ Database indexes on all foreign keys
- ✅ JSONB for flexible metadata storage
- ✅ Raw queries for read-heavy operations
- ✅ File streaming for downloads
- ✅ Connection pooling (Sequelize default)

### **Scaling Considerations**
- Use `PM2` for process management
- Enable PostgreSQL connection pooling
- Add Redis for session storage
- Use CDN for static files
- Implement rate limiting

---

## 🐛 Debugging

### **Enable Debug Logs**
```javascript
// In common/database.js
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: console.log, // Enable SQL logging
  // ...
});
```

### **Check Database Connection**
```bash
node -e "require('./common/database').sequelize.authenticate().then(() => console.log('✅ Connected')).catch(e => console.error('❌ Failed:', e))"
```

### **View All Tables**
```bash
node simple-db-viewer.js
# Visit: http://localhost:3001
```

### **Check ChromaDB**
```bash
curl http://localhost:8000/api/v1/collections
```

---

## 🚨 Common Issues

### **Issue: Database connection failed**
**Fix:**
1. Check PostgreSQL is running
2. Verify `DATABASE_URL` in `.env`
3. Ensure database exists

### **Issue: ChromaDB not found**
**Fix:**
```bash
cd chromaDB
docker compose up -d
```

### **Issue: 401 Unauthorized**
**Fix:**
- Include JWT token in request headers
- Token format: `Authorization: Bearer <token>`

### **Issue: Rhubarb not found**
**Fix:**
- Set correct path in `.env`: `RHUBARB_CMD=C:\full\path\to\rhubarb.exe`
- Ensure Rhubarb is installed

---

## 📊 Monitoring

### **Database Viewer**
```bash
node simple-db-viewer.js
```

Shows:
- 👥 Users
- 🎙️ Interviews
- 🧠 Memory Graph Nodes
- 🎤 Custom Voices
- 🔊 Generated Audio
- 👤 Avatars
- 🎬 Animations
- 📁 Multimedia Files
- 🧠 Multimedia Memory Nodes
- 🔗 Multimedia Links

### **Health Endpoint**
```bash
curl http://localhost:3000/health
```

### **Service Status**
Each feature has a status endpoint:
- `/api/interview/status`
- `/api/memory-graph/status`
- `/api/voice-cloning/status`
- `/api/avatar/status`
- `/api/multimedia/status`

---

## 🔄 Development Workflow

### **1. Make Changes**
Edit files in `features/`, `common/`, etc.

### **2. Restart Server**
```bash
# Stop with Ctrl+C
node server.js
```

Or use `nodemon`:
```bash
npx nodemon server.js
```

### **3. Test**
- Use Postman/Thunder Client
- Check database viewer
- Test with frontend

### **4. Check Logs**
Watch console for:
- ✅ Success logs (green)
- ⚠️ Warnings (yellow)
- ❌ Errors (red)

---

## 🎓 Feature Guides

| Feature | Documentation |
|---------|---------------|
| AI Interview | `features/aiInterviewEngine/INTERVIEW_API.md` |
| Memory Graph | `features/memoryGraphService/MEMORY_GRAPH_API.md` |
| Voice Cloning | `features/voiceCloningPlayback/VOICE_CLONING_API.md` |
| Avatar Service | `features/avatarService/AVATAR_API.md` |
| Multimedia Upload | `features/multimediaUpload/FRONTEND_GUIDE.md` |

---

## 🌟 Best Practices

### **For Backend Development:**
1. Always add `user_id` to new tables
2. Use `authenticateToken` middleware on protected routes
3. Validate input with proper error messages
4. Log important operations for debugging
5. Use transactions for multi-step operations
6. Add indexes for frequently queried columns

### **For Frontend Integration:**
1. Always send JWT token in headers
2. Handle 401 errors (redirect to login)
3. Show loading states during uploads
4. Cache responses when appropriate
5. Validate files before uploading
6. Use optimistic UI updates

---

## 🚀 Deployment Checklist

- [ ] Change `JWT_SECRET` to strong random value
- [ ] Set production database credentials
- [ ] Enable HTTPS
- [ ] Configure CORS for production domains
- [ ] Set up database backups
- [ ] Configure file storage (S3 or CDN)
- [ ] Set up logging (Winston, Papertrail)
- [ ] Enable rate limiting
- [ ] Set up monitoring (PM2, New Relic)
- [ ] Configure environment variables
- [ ] Test all endpoints with production data
- [ ] Set up CI/CD pipeline

---

## 📞 Support

### **Database Issues**
```bash
node simple-db-viewer.js
# Check all tables and data
```

### **API Issues**
Check individual feature READMEs in `features/*/` folders

### **Backend Logs**
All operations log to console with emojis:
- ✅ Success
- ⚠️ Warning
- ❌ Error

---

## 📝 Changelog

### **v2.0 - PostgreSQL Migration (Oct 2025)**
- ✅ Migrated ALL features to PostgreSQL
- ✅ Removed db.json completely
- ✅ Added user-based isolation
- ✅ Implemented JWT authentication
- ✅ Added comprehensive documentation

### **v1.0 - Initial Release**
- Basic features with file-based storage

---

## 🎯 What's Next?

**Potential Enhancements:**
- [ ] Add Redis for caching
- [ ] Implement real-time notifications
- [ ] Add file compression
- [ ] Implement image resizing
- [ ] Add video thumbnails
- [ ] Implement search pagination
- [ ] Add bulk delete operations
- [ ] Implement data export (JSON, CSV)
- [ ] Add audit logging
- [ ] Implement API rate limiting

---

**🎉 Backend is Production-Ready!**

**All features working • PostgreSQL integrated • User-based • Secure • Documented**

---

**Last Updated:** October 12, 2025
**Version:** 2.0.0
**Status:** ✅ Production Ready

