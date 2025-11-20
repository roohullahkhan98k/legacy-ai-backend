# 🤖 AI Prototype Backend

**Complete AI-powered backend with voice cloning, 3D avatars, semantic memory, and multimedia management.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_DB-purple.svg)](https://www.trychroma.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ Features

🎙️ **AI Interview Engine** - Real-time AI interviews with semantic search  
🧠 **Memory Graph** - Semantic memory storage with graph visualization  
🎤 **Voice Cloning** - Custom voice synthesis with ElevenLabs  
👤 **3D Avatars** - Avatar generation with lipsync animation  
📁 **Multimedia Management** - Smart media organization with auto-tagging  
🔐 **Authentication** - JWT-based user system  

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start databases (PostgreSQL + ChromaDB)
docker-compose up -d

# 3. Create .env file (see SETUP_GUIDE.md)
cp .env.example .env
# Edit .env with your API keys

# 4. Start server
node server.js

# 5. View database (optional)
node simple-db-viewer.js
```

**Server:** `http://localhost:3000`  
**Database Viewer:** `http://localhost:3001`  
**API Docs:** See `PRODUCTION_READY.md`

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** | Complete installation guide |
| **[PRODUCTION_READY.md](./PRODUCTION_READY.md)** | Architecture & API reference |
| **[features/*/README](./features/)** | Feature-specific documentation |

---

## 🗄️ Database

### **PostgreSQL Tables (12)**
- `users` - User accounts
- `interviews` - AI interview sessions
- `memory_nodes` - Semantic memory graph
- `user_voices` - Custom voice clones
- `generated_audio` - Speech generation history
- `user_avatars` - 3D avatars
- `avatar_animations` - Lipsync animations
- `multimedia_files` - Uploaded media
- `multimedia_memory_nodes` - Media organization
- `multimedia_links` - Media ↔ Memory connections

### **ChromaDB Collections (2)**
- `ai-interviews` - Interview Q&A embeddings
- `memory-graph` - Memory embeddings

---

## 🔑 Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ai_prototype

# Authentication
JWT_SECRET=your-secret-key-here

# AI Services
GEMINI_API_KEY=your-gemini-key
ELEVENLABS_API_KEY=your-elevenlabs-key

# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8000

# Avatar Service
RHUBARB_CMD=/path/to/rhubarb.exe
```

See **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** for complete configuration.

---

## 📡 API Endpoints

### **Authentication**
```
POST /api/auth/register    - Create account
POST /api/auth/login       - Get JWT token
```

### **AI Interviews**
```
POST   /api/interview/start           - Start session
POST   /api/interview/qa              - Add Q&A
GET    /api/interview/user/:userId    - User's interviews
POST   /api/interview/search          - Semantic search
DELETE /api/interview/:sessionId      - Delete
```

### **Memory Graph**
```
POST   /api/memory-graph/memories          - Create memory
GET    /api/memory-graph/memories/search   - Search
GET    /api/memory-graph/graph             - Get graph
POST   /api/memory-graph/media/upload      - Upload media
DELETE /api/memory-graph/memories/:id      - Delete
```

### **Voice Cloning**
```
POST   /api/voice-cloning/clone              - Clone voice
POST   /api/voice-cloning/generate           - Generate speech
GET    /api/voice-cloning/voices             - Get all voices
GET    /api/voice-cloning/user/audio-history - Audio history
DELETE /api/voice-cloning/voices/:id         - Delete voice
```

### **Avatar Service**
```
POST   /api/avatar                           - Create avatar
GET    /api/avatar                           - List avatars
POST   /api/avatar/pipeline/image-to-model   - Image → 3D
POST   /api/avatar/pipeline/:id/audio-to-lipsync  - Audio → Lipsync
DELETE /api/avatar/:id                       - Delete avatar
```

### **Multimedia Upload**
```
POST   /api/multimedia/upload/single         - Upload file
GET    /api/multimedia/media                 - Get media
POST   /api/multimedia/nodes                 - Create node
POST   /api/multimedia/link/:mediaId/to/:nodeId  - Link
GET    /api/multimedia/analytics/dashboard   - Analytics
```

See **[PRODUCTION_READY.md](./PRODUCTION_READY.md)** for complete API documentation.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│         Express.js Server           │
│         (Node.js Backend)           │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────┐  ┌──────────┐       │
│  │PostgreSQL│  │ChromaDB  │       │
│  │ (Data)   │  │(Vectors) │       │
│  └──────────┘  └──────────┘       │
│                                     │
│  ┌─────────────────────────────┐   │
│  │    AI Services              │   │
│  │  • Gemini 2.0 (Google)     │   │
│  │  • ElevenLabs (Voice)      │   │
│  │  • Ready Player Me (3D)    │   │
│  │  • Rhubarb (Lipsync)       │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │    File Storage             │   │
│  │  /uploads/multimedia/       │   │
│  │  /uploads/avatars/          │   │
│  │  /uploads/voice-samples/    │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

**Backend:**
- Node.js 18+
- Express.js 5
- Sequelize ORM
- Socket.io (WebSockets)

**Databases:**
- PostgreSQL 14+ (primary data)
- ChromaDB (vector embeddings)

**AI/ML:**
- Google Gemini 2.0 (conversational AI)
- ChromaDB (semantic search)
- Xenova Transformers (local embeddings)

**Media Processing:**
- Multer (file uploads)
- Sharp (image processing)
- FFmpeg (audio/video conversion)
- ExifReader (metadata extraction)

**External APIs:**
- ElevenLabs (voice cloning)
- Ready Player Me (3D avatars)
- Rhubarb Lip Sync (lipsync)

---

## 📦 Installation

### **Method 1: Docker (Recommended)**

```bash
# Start all services
docker-compose up -d

# Install Node packages
npm install

# Start backend
node server.js
```

### **Method 2: Manual Setup**

See **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** for step-by-step instructions.

---

## 🧪 Testing

### **1. Health Check**
```bash
curl http://localhost:3000/health
```

### **2. Register User**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@test.com","password":"admin123"}'
```

### **3. Login & Get Token**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'
```

### **4. Test Upload**
```bash
curl -X POST http://localhost:3000/api/multimedia/upload/single \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "media=@test.jpg"
```

### **5. View Database**
```bash
node simple-db-viewer.js
# Visit: http://localhost:3001
```

---

## 📊 Monitoring

### **Database Viewer**
```bash
node simple-db-viewer.js
```

Real-time view of all 12 PostgreSQL tables:
- Users, Interviews, Memories
- Voices, Audio, Avatars, Animations
- Multimedia Files, Nodes, Links

### **Logs**
All operations log to console:
- ✅ Green = Success
- ⚠️ Yellow = Warning
- ❌ Red = Error

---

## 🔐 Security

✅ **JWT Authentication** - All protected endpoints  
✅ **Password Hashing** - Bcrypt with salt rounds  
✅ **User Isolation** - `user_id` on all resources  
✅ **Ownership Verification** - Can't access others' data  
✅ **Input Validation** - File types, sizes, formats  
✅ **SQL Injection Prevention** - Sequelize ORM  
✅ **CORS Protection** - Configured origins  

---

## 🚢 Deployment

See deployment checklist in **[PRODUCTION_READY.md](./PRODUCTION_READY.md)**

Key points:
- [ ] Change JWT_SECRET to strong random value
- [ ] Use production PostgreSQL credentials
- [ ] Enable HTTPS
- [ ] Configure CORS for production domains
- [ ] Set up database backups
- [ ] Use PM2 for process management
- [ ] Configure file storage (S3/CDN)
- [ ] Set up monitoring and logging

---

## 📁 File Structure

```
back-end/
├── server.js                    # Entry point
├── app.js                       # Express app
├── package.json                 # Dependencies
├── docker-compose.yml           # PostgreSQL + ChromaDB
├── .env                         # Environment config
├── README.md                    # This file
├── SETUP_GUIDE.md              # Setup instructions
├── PRODUCTION_READY.md         # Production guide
│
├── common/                      # Shared code
│   ├── auth/                    # Authentication
│   ├── middleware/              # Auth, upload
│   ├── models/                  # User model
│   └── database.js              # PostgreSQL setup
│
├── features/                    # Feature modules
│   ├── aiInterviewEngine/       # AI interviews
│   ├── memoryGraphService/      # Memory graph
│   ├── voiceCloningPlayback/    # Voice cloning
│   ├── avatarService/           # 3D avatars
│   └── multimediaUpload/        # Media management
│
├── chromaDB/                    # Vector database
│   ├── chromadb.js
│   ├── routes.js
│   └── docker-compose.yml
│
├── uploads/                     # File storage
│   ├── avatars/
│   ├── multimedia/
│   ├── users/
│   └── voice-samples/
│
└── simple-db-viewer.js          # Database viewer
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🆘 Support

### **Documentation**
- Setup: `SETUP_GUIDE.md`
- Production: `PRODUCTION_READY.md`
- Features: `features/*/README.md`

### **Issues**
- Check backend console logs
- Visit database viewer at `http://localhost:3001`
- Review feature-specific documentation

---

## 🎯 Version

**Current Version:** 2.0.0  
**Last Updated:** October 12, 2025  
**Status:** ✅ Production Ready

---

## 🌟 Highlights

✨ **5 AI Features** - Interview, Memory, Voice, Avatar, Multimedia  
🗄️ **12 PostgreSQL Tables** - Fully relational, indexed  
🔍 **2 ChromaDB Collections** - Semantic search enabled  
🔐 **100% User-Based** - Complete data isolation  
📚 **Fully Documented** - API guides for every feature  
🐳 **Docker Ready** - One-command setup  
🚀 **Production Ready** - Scalable & secure  

---

**Built with ❤️ using Node.js, PostgreSQL, ChromaDB, and AI**

**Ready to power your AI application! 🚀**

