# 🚀 AI Prototype Backend Setup Guide

This guide will help you set up the AI Prototype backend with PostgreSQL database, authentication system, and database viewing tools.

## 📋 Table of Contents

1. [PostgreSQL Installation](#postgresql-installation)
2. [Database Setup](#database-setup)
3. [pgAdmin Setup](#pgadmin-setup)
4. [Simple Database Viewer](#simple-database-viewer)
5. [Authentication System](#authentication-system)
6. [Environment Configuration](#environment-configuration)
7. [Running the Application](#running-the-application)

---

## 🐘 PostgreSQL Installation

### Windows Installation

1. **Download PostgreSQL:**
   - Go to [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
   - Download the latest version (PostgreSQL 15+ recommended)
   - Run the installer as Administrator

2. **Installation Steps:**
   - Choose installation directory (default: `C:\Program Files\PostgreSQL\15`)
   - Select components: PostgreSQL Server, pgAdmin 4, Stack Builder, Command Line Tools
   - Set superuser password (remember this password!)
   - Set port (default: 5432)
   - Choose locale (default: Default locale)

3. **Verify Installation:**
   - Open Command Prompt
   - Run: `psql --version`
   - You should see PostgreSQL version information

### Alternative: Using Package Manager

**Using Chocolatey:**
```bash
choco install postgresql
```

**Using Winget:**
```bash
winget install PostgreSQL.PostgreSQL
```

---

## 🗄️ Database Setup

### 1. Create Database

1. **Open psql:**
   - Press `Win + R`, type `cmd`, press Enter
   - Run: `psql -U postgres`

2. **Create Database:**
   ```sql
   CREATE DATABASE ai_prototype;
   ```

3. **Verify Creation:**
   ```sql
   \l
   ```
   You should see `ai_prototype` in the list.

4. **Exit psql:**
   ```sql
   \q
   ```

### 2. Environment Configuration

Create a `.env` file in your project root:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_prototype
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# Server Configuration
PORT=3000
NODE_ENV=development
```

**Replace `your_postgres_password` with your actual PostgreSQL password.**

---

## 🖥️ pgAdmin Setup

### 1. Access pgAdmin

1. **Open pgAdmin:**
   - Search for "pgAdmin 4" in Start Menu
   - Or go to: `http://localhost/pgadmin4` in your browser

2. **First Time Setup:**
   - Set master password for pgAdmin (different from PostgreSQL password)
   - This is for pgAdmin security, not your database

### 2. Connect to PostgreSQL Server

1. **Add New Server:**
   - Right-click "Servers" in left panel
   - Select "Create" → "Server..."

2. **General Tab:**
   - **Name:** `AI Prototype Local` (or any name you prefer)

3. **Connection Tab:**
   - **Host name/address:** `localhost`
   - **Port:** `5432`
   - **Maintenance database:** `postgres`
   - **Username:** `postgres`
   - **Password:** Your PostgreSQL password

4. **Click "Save"**

### 3. View Your Database

1. **Navigate to Database:**
   - Expand "AI Prototype Local" → "Databases" → "ai_prototype"

2. **View Tables:**
   - Expand "ai_prototype" → "Schemas" → "public" → "Tables"
   - You'll see the `users` table after running the application

3. **View Data:**
   - Right-click on "users" table
   - Select "View/Edit Data" → "All Rows"
   - You can see all registered users and their data

---

## 📊 Simple Database Viewer

The project includes a simple web-based database viewer for quick data inspection.

### 1. Start the Database Viewer

```bash
node simple-db-viewer.js
```

### 2. Access the Viewer

- Open your browser
- Go to: `http://localhost:3001`
- You'll see a simple table showing all users

### 3. Features

- **User List:** Shows all registered users
- **Profile Pictures:** Displays uploaded profile pictures or default icon
- **User Details:** Name, email, username, registration date
- **Real-time:** Refreshes automatically when new users register

### 4. Stop the Viewer

- Press `Ctrl + C` in the terminal

---

## 🔐 Authentication System

The backend includes a complete JWT-based authentication system.

### Features

- **User Registration:** With optional profile picture upload
- **User Login:** Email/username and password
- **JWT Tokens:** Secure access and refresh tokens
- **Password Hashing:** Bcrypt with salt rounds
- **File Upload:** Profile pictures stored in `/uploads/users/`

### Security Features

- **Password Requirements:** Minimum 6 characters
- **JWT Expiration:** 7 days for access tokens, 30 days for refresh tokens
- **File Validation:** Only image files (JPEG, JPG, PNG, GIF, WebP)
- **File Size Limit:** 5MB maximum for profile pictures
- **Unique Constraints:** Email and username must be unique

### Database Schema

The `users` table includes:
- `id` - Primary key
- `email` - Unique email address
- `username` - Unique username
- `password` - Hashed password
- `firstName` - Optional first name
- `lastName` - Optional last name
- `avatar` - Profile picture path or URL
- `role` - User role (default: 'user')
- `isActive` - Account status
- `isVerified` - Email verification status
- `createdAt` - Registration timestamp
- `updatedAt` - Last update timestamp

---

## ⚙️ Environment Configuration

### Required Environment Variables

Create a `.env` file in your project root with these variables:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_prototype
DB_USER=postgres
DB_PASSWORD=your_password_here

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# Server
PORT=3000
NODE_ENV=development
```

### Important Notes

- **Never commit `.env` files** to version control
- **Use strong passwords** for production
- **Change JWT_SECRET** to a random, secure string
- **Use environment-specific values** for different deployments

---

## 🚀 Running the Application

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Server

**Development Mode (with auto-restart):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

### 3. Verify Setup

1. **Check Server Status:**
   - Go to: `http://localhost:3000/health`
   - You should see server status information

2. **Test Database Connection:**
   - Check console output for database connection messages
   - Look for: `✅ Database connection successful`

3. **View Database:**
   - Use pgAdmin or the simple database viewer
   - Verify tables are created automatically

### 4. Available Endpoints

- **Health Check:** `GET /health`
- **User Registration:** `POST /api/auth/register`
- **User Login:** `POST /api/auth/login`

---

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Failed:**
   - Check PostgreSQL is running
   - Verify credentials in `.env` file
   - Ensure database `ai_prototype` exists

2. **Port Already in Use:**
   - Change `PORT` in `.env` file
   - Or stop other services using port 3000

3. **File Upload Issues:**
   - Check `uploads/users/` directory exists
   - Verify file size is under 5MB
   - Ensure file is a valid image format

4. **JWT Token Issues:**
   - Check `JWT_SECRET` is set in `.env`
   - Verify token expiration settings

### Getting Help

- Check console output for error messages
- Verify all environment variables are set
- Ensure PostgreSQL service is running
- Check file permissions for uploads directory

---

## 📁 Project Structure

```
back-end/
├── common/
│   ├── auth/           # Authentication controllers and routes
│   ├── models/         # Database models (User, etc.)
│   ├── middleware/     # Upload middleware, etc.
│   └── database.js     # Database connection
├── uploads/
│   └── users/          # Profile picture uploads
├── simple-db-viewer.js # Simple database viewer
├── app.js              # Main application setup
├── server.js           # Server entry point
└── .env                # Environment variables
```

---

## 🎯 Next Steps

1. **Test Registration:** Try registering a new user with profile picture
2. **Test Login:** Login with created credentials
3. **View Data:** Check user data in pgAdmin or simple viewer
4. **Frontend Integration:** Use the authentication endpoints in your frontend
5. **Production Setup:** Configure for production deployment

---

**🎉 You're all set! Your AI Prototype backend is ready to use.**
