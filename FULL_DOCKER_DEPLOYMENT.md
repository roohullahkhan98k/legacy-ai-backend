# 🚀 AI Prototype Backend - Deployment Guide

**Version:** 2.0.0  
**Last Updated:** October 12, 2025  
**Status:** Production Ready  

---

## 📋 Overview

This document provides comprehensive instructions for deploying the AI Prototype Backend on any platform. The system is fully containerized using Docker, ensuring consistent behavior across all environments.

### **Key Features:**
- ✅ Fully Dockerized (PostgreSQL, ChromaDB, Node.js Backend)
- ✅ Cross-Platform Compatible (Windows, macOS, Linux)
- ✅ Cloud-Ready (AWS, Azure, Google Cloud, DigitalOcean)
- ✅ Production-Grade Security & Performance
- ✅ Easy Scaling & Maintenance

---

## 🎯 System Requirements

### **Minimum Requirements:**
- **Docker:** Version 20.10 or higher
- **Docker Compose:** Version 2.0 or higher
- **RAM:** 2GB minimum, 4GB recommended
- **Storage:** 10GB free space
- **OS:** Windows 10/11, macOS 10.15+, or Linux (Ubuntu 20.04+)

### **For Development (Optional):**
- **Node.js:** Version 18 or higher (if running backend outside Docker)
- **Git:** For version control

---

## 📦 What's Included

The system consists of three main components, all containerized:

### **1. PostgreSQL Database (Port 5433)**
- **Version:** PostgreSQL 14 Alpine
- **Purpose:** Primary data storage
- **Tables:** 12 tables (users, interviews, memories, media, etc.)
- **Persistent Storage:** Docker volume ensures data persistence

### **2. ChromaDB Vector Database (Port 8000)**
- **Version:** Latest stable
- **Purpose:** Semantic search and AI embeddings
- **Collections:** 2 collections (ai-interviews, memory-graph)
- **Persistent Storage:** Docker volume for embeddings

### **3. Node.js Backend (Port 3000)**
- **Version:** Node.js 18 Alpine
- **Purpose:** REST API server, WebSocket support
- **Features:** 
  - AI Interview Engine (Gemini API)
  - Memory Graph Service
  - Voice Cloning (ElevenLabs)
  - 3D Avatar Generation
  - Multimedia Management

---

## 🚀 Deployment Options

We provide two deployment modes to suit different needs:

### **Option 1: Development Mode (Hybrid)**
**Best for:** Local development, debugging, rapid iteration

**Architecture:**
```
Docker:
  ├─ PostgreSQL (Containerized)
  └─ ChromaDB (Containerized)

Local Machine:
  └─ Node.js Backend (Native)
```

**Use when:**
- You need to debug code frequently
- You want faster iteration cycles
- You're actively developing features

---

### **Option 2: Production Mode (Full Docker)**
**Best for:** Production deployment, cloud servers, sharing with team

**Architecture:**
```
Docker:
  ├─ PostgreSQL (Containerized)
  ├─ ChromaDB (Containerized)
  └─ Node.js Backend (Containerized)
```

**Use when:**
- Deploying to production servers
- Ensuring environment consistency
- Deploying to cloud platforms
- Sharing with clients or team members

---

## 📖 Deployment Instructions

### **Step 1: Prerequisites**

Ensure Docker is installed and running:

```bash
# Verify Docker installation
docker --version
# Expected: Docker version 20.10.0 or higher

# Verify Docker Compose
docker-compose --version
# Expected: Docker Compose version 2.0.0 or higher

# Test Docker is running
docker ps
# Should return empty list or running containers
```

---

### **Step 2: Obtain the Source Code**

```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd back-end
```

---

### **Step 3: Configure Environment Variables**

Create a `.env` file in the project root:

```bash
# Copy the example file
cp env.example .env

# Edit with your settings
# Use your preferred text editor (nano, vim, notepad, etc.)
```

**Required Configuration for Production Mode:**

```env
# ============================================
# DATABASE CONFIGURATION
# ============================================
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=ai_prototype
DB_HOST=postgres          # Use container name
DB_PORT=5432              # Internal Docker port

# ============================================
# VECTOR DATABASE
# ============================================
CHROMA_HOST=chromadb      # Use container name
CHROMA_PORT=8000

# ============================================
# AUTHENTICATION
# ============================================
JWT_SECRET=your-production-secret-min-32-characters
JWT_EXPIRES_IN=7d

# ============================================
# AI SERVICES (Optional - Add your API keys)
# ============================================
GEMINI_API_KEY=your-gemini-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
RPM_API_KEY=your-ready-player-me-api-key

# ============================================
# ENVIRONMENT
# ============================================
NODE_ENV=production
```

**⚠️ Important Security Notes:**
- Generate a strong random JWT_SECRET (minimum 32 characters)
- Never commit `.env` to version control
- Change default database password for production
- Keep API keys confidential

---

### **Step 4: Deploy the System**

#### **For Production Mode (Full Docker - Recommended):**

```bash
# Build the Docker images (first time only)
docker-compose build

# Start all services
docker-compose up -d

# Verify all containers are running
docker ps
```

**Expected output:**
```
CONTAINER ID   IMAGE                    STATUS        PORTS                    NAMES
xxxxxxxxxx     ai-prototype-backend     Up 10s        0.0.0.0:3000->3000/tcp   ai-prototype-backend
xxxxxxxxxx     postgres:14-alpine       Up 11s        0.0.0.0:5433->5432/tcp   ai-prototype-postgres
xxxxxxxxxx     chromadb/chroma:latest   Up 12s        0.0.0.0:8000->8000/tcp   ai-prototype-chromadb
```

---

#### **For Development Mode (Hybrid):**

```bash
# Update .env for hybrid mode
DB_HOST=localhost         # Use localhost
DB_PORT=5433              # External Docker port
CHROMA_HOST=localhost     # Use localhost

# Start only databases
docker-compose up -d postgres chromadb

# Install Node.js dependencies (first time only)
npm install

# Start backend locally
node server.js
```

---

### **Step 5: Verify Deployment**

#### **Health Check:**
```bash
curl http://localhost:3000/health
```

**Expected response:**
```json
{
  "status": "OK",
  "message": "AI Prototype server is running",
  "database": "Connected",
  "services": [
    "Authentication",
    "AI Interview Engine",
    "Memory Graph Service",
    "Voice Cloning",
    "Avatar Service",
    "Multimedia Upload"
  ]
}
```

#### **Check Container Logs:**
```bash
# View all logs
docker-compose logs

# View specific service logs
docker logs ai-prototype-backend
docker logs ai-prototype-postgres
docker logs ai-prototype-chromadb

# Follow logs in real-time
docker-compose logs -f
```

#### **Access Database Viewer:**
```bash
# Run the database viewer utility
node simple-db-viewer.js

# Access via browser
http://localhost:3001
```

**You should see:**
- All 12 database tables
- Current statistics
- User data (if any)
- System information

---

## 🌐 Cloud Deployment Examples

### **AWS EC2 Deployment**

**Prerequisites:**
- EC2 instance (t2.medium or larger recommended)
- Ubuntu 20.04 LTS or Amazon Linux 2
- Security group allowing ports: 22 (SSH), 3000 (API)

**Steps:**

```bash
# 1. Connect to your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# 2. Install Docker
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu

# 3. Clone repository
git clone <repository-url>
cd back-end

# 4. Configure environment
cp env.example .env
nano .env  # Edit with your settings

# 5. Deploy
sudo docker-compose up -d

# 6. Verify
curl http://localhost:3000/health
```

**Access:** `http://your-ec2-ip:3000`

---

### **Azure Container Instances**

**Prerequisites:**
- Azure account with active subscription
- Azure CLI installed

**Steps:**

```bash
# 1. Login to Azure
az login

# 2. Create resource group
az group create --name ai-prototype-rg --location eastus

# 3. Create container registry
az acr create --resource-group ai-prototype-rg \
  --name aiprototypecr --sku Basic

# 4. Build and push image
az acr build --registry aiprototypecr \
  --image ai-prototype-backend:latest .

# 5. Deploy container
az container create \
  --resource-group ai-prototype-rg \
  --name ai-prototype-backend \
  --image aiprototypecr.azurecr.io/ai-prototype-backend:latest \
  --dns-name-label ai-prototype \
  --ports 3000

# 6. Get URL
az container show --resource-group ai-prototype-rg \
  --name ai-prototype-backend \
  --query ipAddress.fqdn
```

---

### **Google Cloud Run**

**Prerequisites:**
- Google Cloud account
- gcloud CLI installed

**Steps:**

```bash
# 1. Authenticate
gcloud auth login

# 2. Set project
gcloud config set project YOUR_PROJECT_ID

# 3. Build container
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ai-prototype-backend

# 4. Deploy to Cloud Run
gcloud run deploy ai-prototype-backend \
  --image gcr.io/YOUR_PROJECT_ID/ai-prototype-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000

# 5. Get URL
gcloud run services describe ai-prototype-backend \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)'
```

---

### **DigitalOcean Droplet**

**Prerequisites:**
- DigitalOcean account
- Droplet with Docker (One-Click App)

**Steps:**

```bash
# 1. Create Docker Droplet via DigitalOcean dashboard
# Choose: Docker One-Click App, 2GB RAM minimum

# 2. SSH into droplet
ssh root@your-droplet-ip

# 3. Clone repository
git clone <repository-url>
cd back-end

# 4. Configure
cp env.example .env
nano .env

# 5. Deploy
docker-compose up -d

# 6. Setup firewall
ufw allow 3000/tcp
ufw enable
```

**Access:** `http://your-droplet-ip:3000`

---

## 🔧 Management & Maintenance

### **Common Operations**

#### **Start Services:**
```bash
docker-compose up -d
```

#### **Stop Services:**
```bash
docker-compose down
```

#### **Restart Services:**
```bash
docker-compose restart
```

#### **Update Application:**
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build
```

#### **View Logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker logs -f ai-prototype-backend
```

#### **Database Backup:**
```bash
# Backup PostgreSQL
docker exec ai-prototype-postgres pg_dump -U postgres ai_prototype > backup_$(date +%Y%m%d).sql

# Restore from backup
docker exec -i ai-prototype-postgres psql -U postgres ai_prototype < backup_20251012.sql
```

#### **Reset Database (⚠️ Caution: Deletes all data):**
```bash
# Stop services
docker-compose down

# Remove volumes
docker-compose down -v

# Start fresh
docker-compose up -d
```

---

## 📊 Monitoring & Health Checks

### **System Health Endpoints**

#### **Main Health Check:**
```bash
curl http://localhost:3000/health
```

**Returns:**
- Server status
- Database connection status
- List of active services

#### **Database Viewer:**
```bash
node simple-db-viewer.js
# Access: http://localhost:3001
```

**Provides:**
- Real-time database statistics
- Table contents
- User information
- System metrics

#### **Container Status:**
```bash
# Check running containers
docker ps

# Check container health
docker inspect ai-prototype-backend | grep -A 5 Health
```

---

## 🔒 Security Considerations

### **Production Checklist:**

- [ ] Change default database password
- [ ] Generate strong JWT_SECRET (32+ characters)
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure firewall rules (allow only necessary ports)
- [ ] Regularly update Docker images
- [ ] Enable Docker security scanning
- [ ] Implement rate limiting
- [ ] Set up monitoring and alerts
- [ ] Regular database backups
- [ ] Restrict API access with authentication
- [ ] Use environment-specific .env files
- [ ] Never commit sensitive data to Git

### **Recommended Security Practices:**

1. **Use Strong Passwords:**
   ```env
   # Generate strong password
   openssl rand -base64 32
   ```

2. **Enable Firewall:**
   ```bash
   # Ubuntu/Debian
   sudo ufw allow 22/tcp
   sudo ufw allow 3000/tcp
   sudo ufw enable
   ```

3. **Regular Updates:**
   ```bash
   # Update Docker images
   docker-compose pull
   docker-compose up -d --build
   ```

---

## 🚨 Troubleshooting

### **Issue: Containers won't start**

**Solution:**
```bash
# Check logs
docker-compose logs

# Check disk space
df -h

# Check port conflicts
netstat -tulpn | grep :3000
netstat -tulpn | grep :5433
netstat -tulpn | grep :8000

# Remove old containers
docker-compose down
docker-compose up -d
```

---

### **Issue: Database connection failed**

**Solution:**
```bash
# Verify PostgreSQL is healthy
docker exec ai-prototype-postgres pg_isready -U postgres

# Check connection settings in .env
cat .env | grep DB_

# Test connection manually
docker exec -it ai-prototype-postgres psql -U postgres -d ai_prototype
```

---

### **Issue: Port already in use**

**Solution:**
```bash
# Find process using port
# Windows:
netstat -ano | findstr :3000

# Linux/Mac:
lsof -i :3000

# Kill process or change port in docker-compose.yml
```

---

### **Issue: Out of disk space**

**Solution:**
```bash
# Clean up Docker
docker system prune -a --volumes

# Check space
docker system df

# Remove unused images
docker image prune -a
```

---

## 📈 Performance Optimization

### **For Production Environments:**

1. **Increase Container Resources:**
   ```yaml
   # In docker-compose.yml
   backend:
     deploy:
       resources:
         limits:
           cpus: '2'
           memory: 2G
         reservations:
           cpus: '1'
           memory: 1G
   ```

2. **Enable Connection Pooling:**
   Already configured in `common/database.js`:
   ```javascript
   pool: {
     max: 20,      // Maximum connections
     min: 5,       // Minimum connections
     acquire: 30000,
     idle: 10000
   }
   ```

3. **Use Production Node Environment:**
   ```env
   NODE_ENV=production
   ```

4. **Enable Gzip Compression:**
   Already enabled in the backend

---

## 📞 Support & Contact

### **Technical Support:**
- **Email:** support@your-company.com
- **Documentation:** See `README.md` and `PRODUCTION_READY.md`
- **API Reference:** See feature-specific READMEs in `features/*/`

### **Reporting Issues:**
When reporting issues, please include:
- Docker version (`docker --version`)
- OS and version
- Container logs (`docker-compose logs`)
- Health check response
- Steps to reproduce

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | Oct 12, 2025 | Full Docker migration, Production-ready |
| 1.0.0 | - | Initial release |

---

## ✅ Deployment Checklist

Before going live, ensure:

- [ ] All environment variables are configured
- [ ] Docker containers are running and healthy
- [ ] Health check endpoint returns success
- [ ] Database viewer shows all tables
- [ ] Can register and login users
- [ ] Can upload files successfully
- [ ] All API endpoints are accessible
- [ ] SSL/HTTPS is configured (production)
- [ ] Firewall rules are in place
- [ ] Monitoring is set up
- [ ] Backup strategy is implemented
- [ ] Team has access credentials
- [ ] Documentation is shared with team

---

## 🎉 Conclusion

Your AI Prototype Backend is now fully containerized and ready for deployment on any platform. The Docker-based architecture ensures:

✅ **Consistency** - Same behavior across all environments  
✅ **Portability** - Deploy anywhere Docker runs  
✅ **Scalability** - Easy to scale horizontally  
✅ **Maintainability** - Simple updates and rollbacks  
✅ **Security** - Isolated containers, controlled access  

**For additional assistance or custom deployment scenarios, please contact our technical support team.**

---

**Document Version:** 1.0  
**Last Reviewed:** October 12, 2025  
**Next Review:** January 12, 2026  

---

© 2025 AI Prototype Backend. All rights reserved.
