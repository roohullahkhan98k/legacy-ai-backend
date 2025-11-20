# 🚀 AI Prototype Backend - Complete Setup Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Database Setup](#database-setup)
4. [Environment Configuration](#environment-configuration)
5. [Starting the Server](#starting-the-server)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

---

## 1️⃣ Prerequisites

### **Required Software**
- ✅ **Node.js 18+** - [Download](https://nodejs.org/)
- ✅ **PostgreSQL 14+** - [Download](https://www.postgresql.org/download/)
- ✅ **Docker** (for ChromaDB) - [Download](https://www.docker.com/products/docker-desktop/)
- ✅ **Git** - [Download](https://git-scm.com/)

### **API Keys Needed**
- 🔑 **Gemini API Key** - [Get Free Key](https://ai.google.dev/)
- 🔑 **ElevenLabs API Key** - [Sign Up](https://elevenlabs.io/)
- 🔑 **Ready Player Me API Key** (optional) - [Sign Up](https://readyplayer.me/)

### **Check Installations**
```bash
node --version    # Should be v18 or higher
npm --version     # Should be 8 or higher
psql --version    # Should be 14 or higher
docker --version  # Any recent version
```

---

## 2️⃣ Installation

### **Step 1: Clone/Navigate to Project**
```bash
cd C:\Users\cenom\Downloads\back-end\back-end
```

### **Step 2: Install Dependencies**
```bash
npm install
```

This installs:
- Express.js, Sequelize, pg (PostgreSQL)
- JWT, bcryptjs (authentication)
- ChromaDB, @google/generative-ai (AI)
- ElevenLabs, Multer, Sharp (media)
- And 20+ other packages

**Wait for installation to complete** (may take 2-3 minutes)

---

## 3️⃣ Database Setup

### **Option A: Docker (Recommended)**

Start **both** PostgreSQL and ChromaDB with one command:
```bash
docker-compose up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- ChromaDB on `localhost:8000`

Verify:
```bash
docker ps
```

You should see:
```
ai-prototype-postgres    (healthy)
ai-prototype-chromadb    (healthy)
```

### **Option B: Manual PostgreSQL**

If you already have PostgreSQL installed:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE ai_prototype;

# Create user (optional)
CREATE USER ai_user WITH PASSWORD 'ai_password';
GRANT ALL PRIVILEGES ON DATABASE ai_prototype TO ai_user;

# Exit
\q
```

**Then start ChromaDB separately:**
```bash
cd chromaDB
docker compose up -d
cd ..
```

---

## 4️⃣ Environment Configuration

### **Create `.env` File**

Copy this template to `.env` in the project root:

```env
# ============================================
# DATABASE CONFIGURATION
# ============================================
DATABASE_URL=postgresql://ai_user:ai_password@localhost:5432/ai_prototype

# ============================================
# AUTHENTICATION
# ============================================
JWT_SECRET=change-this-to-a-random-32-character-string-in-production
JWT_EXPIRATION=24h

# ============================================
# AI SERVICES
# ============================================
# Gemini AI (Google)
GEMINI_API_KEY=your-gemini-api-key-here

# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8000

# ============================================
# VOICE CLONING (ElevenLabs)
# ============================================
ELEVENLABS_API_KEY=your-elevenlabs-api-key-here

# ============================================
# AVATAR SERVICE
# ============================================
# Ready Player Me
RPM_API_KEY=your-rpm-api-key-here

# Rhubarb Lip Sync (Windows path example)
RHUBARB_CMD=C:\Program Files\Rhubarb-Lip-Sync-1.13.0\rhubarb.exe

# ============================================
# SERVER CONFIGURATION
# ============================================
PORT=3000
NODE_ENV=development

# ============================================
# CORS
# ============================================
FRONTEND_URL=http://localhost:5173
```

### **Get API Keys**

1. **Gemini API Key (Free)**
   - Go to: https://ai.google.dev/
   - Click "Get API Key"
   - Copy key to `.env`

2. **ElevenLabs API Key**
   - Sign up: https://elevenlabs.io/
   - Go to Profile → API Keys
   - Copy key to `.env`

3. **Rhubarb Lip Sync**
   - Download: https://github.com/DanielSWolf/rhubarb-lip-sync/releases
   - Extract to `C:\Program Files\`
   - Update path in `.env`

---

## 5️⃣ Starting the Server

### **Step 1: Start Databases**
```bash
docker-compose up -d
```

Wait 10 seconds for databases to initialize.

### **Step 2: Verify Databases**
```bash
# Check PostgreSQL
docker exec ai-prototype-postgres pg_isready -U ai_user

# Check ChromaDB
curl http://localhost:8000/api/v1/heartbeat
```

Both should respond with success.

### **Step 3: Start Backend**
```bash
node server.js
```

**Expected output:**
```
🚀 Starting AI Prototype Backend...
✅ AI Prototype PostgreSQL database connection established successfully
✅ Database connection successful
🔄 Initializing database schema...
✅ AI Prototype database synchronized successfully
✅ AI Prototype application initialized successfully
🌐 Server running on port 3000
📡 AI Prototype Backend is running at http://localhost:3000
```

### **Step 4: Verify Server**
```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "status": "OK",
  "database": "Connected"
}
```

---

## 6️⃣ Verification

### **Test 1: Create User**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"email\":\"admin@test.com\",\"password\":\"admin123\"}"
```

### **Test 2: Login**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@test.com\",\"password\":\"admin123\"}"
```

**Save the token!** You'll need it for other requests.

### **Test 3: View Database**
```bash
node simple-db-viewer.js
```

Visit: `http://localhost:3001`

You should see:
- ✅ 1 user in Users table
- ✅ All tables created (12 total)
- ✅ Statistics showing counts

### **Test 4: Test Upload**
```bash
curl -X POST http://localhost:3000/api/multimedia/upload/single \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "media=@test-image.jpg"
```

Should return success with `mediaId`.

---

## 7️⃣ Troubleshooting

### **Problem: `npm install` fails**
**Solution:**
```bash
# Clear cache
npm cache clean --force

# Delete node_modules
rmdir /s /q node_modules  # Windows
rm -rf node_modules       # Mac/Linux

# Reinstall
npm install
```

### **Problem: Database connection error**
**Solution:**
1. Check PostgreSQL is running:
   ```bash
   docker ps | grep postgres
   ```

2. Verify credentials in `.env`:
   ```env
   DATABASE_URL=postgresql://ai_user:ai_password@localhost:5432/ai_prototype
   ```

3. Test connection manually:
   ```bash
   psql -U ai_user -d ai_prototype -h localhost
   ```

### **Problem: ChromaDB not accessible**
**Solution:**
```bash
# Restart ChromaDB
docker restart ai-prototype-chromadb

# Check logs
docker logs ai-prototype-chromadb

# Test connection
curl http://localhost:8000/api/v1/heartbeat
```

### **Problem: Port 3000 already in use**
**Solution:**
1. Find process using port:
   ```bash
   # Windows
   netstat -ano | findstr :3000

   # Mac/Linux
   lsof -i :3000
   ```

2. Kill process or change port in `.env`:
   ```env
   PORT=3001
   ```

### **Problem: Module not found**
**Solution:**
```bash
npm install
```

### **Problem: Gemini API 404**
**Solution:**
1. Verify API key in `.env`
2. Check key is active: https://aistudio.google.com/app/apikey
3. Model must be `gemini-2.0-flash` (free tier)

### **Problem: File upload fails**
**Solution:**
1. Check `uploads/` folder exists
2. Verify write permissions
3. Check file size limit (default 100MB)

---

## 🎯 Quick Commands

```bash
# Start everything
docker-compose up -d && node server.js

# View database
node simple-db-viewer.js

# Stop databases
docker-compose down

# Check health
curl http://localhost:3000/health

# View logs
docker logs ai-prototype-postgres
docker logs ai-prototype-chromadb
```

---

## ✅ Success Checklist

After setup, verify:
- [ ] Server starts without errors
- [ ] Health endpoint returns "Connected"
- [ ] Can register and login users
- [ ] Database viewer shows all tables
- [ ] Can upload files
- [ ] PostgreSQL has all 12 tables
- [ ] ChromaDB has 2 collections
- [ ] All features accessible via API

---

## 🎓 Next Steps

1. **Read Feature Documentation**
   - See `features/*/` folders for detailed API docs

2. **Test with Frontend**
   - Start your React/Vue/Angular frontend
   - Test all integrations

3. **Check Database Viewer**
   - Monitor data in real-time at `http://localhost:3001`

4. **Explore APIs**
   - Use Postman/Thunder Client
   - Import collection from docs

---

**🎉 Setup Complete!**

**Your AI Prototype Backend is ready for development!**

Need help? Check feature-specific READMEs or backend logs! 📚

