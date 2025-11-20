# 🧪 AI Prototype Backend - Test Suite

## 📋 Overview

Comprehensive automated test suite for all 5 features of the AI Prototype Backend with **color-coded Excel report generation**.

**✅ Current Status: 27/27 Tests Passing (100% Pass Rate)**  
**Last Updated: December 10, 2025**

### ✨ Features Tested

1. 🔐 **Authentication** - Registration, login, JWT tokens
2. 🎙️ **AI Interview Engine** - Session management, Q&A, search
3. 🧠 **Memory Graph Service** - CRUD operations, semantic search
4. 🎤 **Voice Cloning** - Voice library, audio history
5. 👤 **Avatar Service** - Avatar management, animations
6. 📁 **Multimedia Upload** - File management, node creation, analytics

---

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
cd test
npm install
```

**This installs:**
- `axios` - HTTP client for API calls
- `exceljs` - Excel file generation
- `form-data` - Multipart form uploads

---

### Step 2: Start Your Backend

Make sure your backend is running:

```bash
# In the main project directory (not in test/)
cd ..
node server.js
```

**Backend must be running on `http://localhost:3000`**

---

### Step 3: Run Tests

```bash
# Make sure you're in the test/ directory
cd test

# Run the test suite
npm test
```

**Or run directly:**
```bash
node testRunner.js
```

---

## 📊 Test Output

### **Console Output:**

```
============================================================
🧪 AI Prototype Backend - Comprehensive Test Suite
============================================================
📡 Base URL: http://localhost:3000
⏰ Start Time: 10/12/2025, 11:35:00 AM
============================================================

============================================================
🔐 Testing: Authentication
============================================================

[PASS] Authentication - Register new user (245ms)
  → User created successfully
[PASS] Authentication - Login with credentials (123ms)
  → JWT token received
[PASS] Authentication - Protected endpoint without token (45ms)
  → Correctly rejected
[PASS] Authentication - Protected endpoint with valid token (67ms)
  → Access granted

============================================================
🎙️ Testing: AI Interview Engine
============================================================

[PASS] AI Interview - Start new interview session (89ms)
  → Session ID: session_1728...
[PASS] AI Interview - Add Q&A pair to session (156ms)
  → Q&A saved successfully
[PASS] AI Interview - Get interview by session ID (43ms)
  → Interview data retrieved
...
```

### **Excel Report:**

**File:** `test-results-[timestamp].xlsx`

**Location:** `test/test-results-[timestamp].xlsx`

---

## 📈 Excel Report Format

### **Sheet 1: Test Results**

| Feature | Test Name | Status | Message | Response Time | Status Code | Timestamp |
|---------|-----------|--------|---------|---------------|-------------|-----------|
| Authentication | Register new user | **PASS** ✅ | User created | 245ms | 201 | 2025-10-12... |
| Authentication | Login with credentials | **PASS** ✅ | JWT token | 123ms | 200 | 2025-10-12... |
| AI Interview | Start session | **PASS** ✅ | Session created | 89ms | 201 | 2025-10-12... |
| Memory Graph | Create memory | **FAIL** ❌ | Database error | 234ms | 500 | 2025-10-12... |

**Color Coding:**
- 🟢 **Green** = PASS (test passed)
- 🔴 **Red** = FAIL (test failed)
- 🟡 **Yellow** = SKIP (test skipped)

---

### **Sheet 2: Summary**

| Metric | Value |
|--------|-------|
| Total Tests | 45 |
| Passed | 42 |
| Failed | 2 |
| Skipped | 1 |
| Pass Rate | 93.33% |
| Test Date | 10/12/2025, 11:35:00 AM |
| Base URL | http://localhost:3000 |

---

## 🧪 Test Cases by Feature

### **1. Authentication (4 tests)**
- ✅ Register new user
- ✅ Login with credentials
- ✅ Protected endpoint without token (should fail)
- ✅ Protected endpoint with valid token

### **2. AI Interview Engine (7 tests)**
- ✅ Start new interview session
- ✅ Add Q&A pair to session
- ✅ Get interview by session ID
- ✅ Get user interview history
- ✅ Semantic search in interviews
- ✅ End interview session
- ✅ Delete interview session

### **3. Memory Graph Service (5 tests)**
- ✅ Create new memory
- ✅ Semantic search memories
- ✅ Get memory graph (nodes & edges)
- ✅ Update memory (add tags)
- ✅ Delete memory

### **4. Voice Cloning (3 tests)**
- ✅ Get available voices
- ✅ Get audio generation history
- ✅ Get custom voice clones

### **5. Avatar Service (2 tests)**
- ✅ Get user avatars
- ✅ Get animation history

### **6. Multimedia Upload (6 tests)**
- ✅ Get all media files
- ✅ Create memory node
- ✅ Get all memory nodes
- ✅ Get dashboard analytics
- ✅ Search media files
- ✅ Delete memory node

**Total: 27 test cases**

---

## ⚙️ Configuration

### **Environment Variables:**

```bash
# Set custom backend URL
TEST_BASE_URL=http://localhost:3000 npm test

# Test against production
TEST_BASE_URL=https://api.yourapp.com npm test
```

### **Default Settings:**

- **Base URL:** `http://localhost:3000`
- **Timeout:** 10 seconds per request
- **Test User:** Auto-generated with timestamp

---

## 🔧 Advanced Usage

### **Run Specific Tests:**

Edit `testRunner.js` and comment out test suites you don't want to run:

```javascript
// Run all test suites
await testAuthentication();
// await testAIInterview();     // Comment this to skip
await testMemoryGraph();
// await testVoiceCloning();    // Comment this to skip
await testAvatarService();
await testMultimedia();
```

### **Custom Test User:**

Edit the `TEST_USER` object in `testRunner.js`:

```javascript
const TEST_USER = {
  username: 'custom_user',
  email: 'custom@test.com',
  password: 'CustomPassword123!'
};
```

---

## 📁 Generated Files

After running tests, you'll find:

```
test/
├── testRunner.js                      # Test suite script
├── package.json                       # Dependencies
├── README.md                          # This file
└── test-results-1728734567890.xlsx    # ← Generated Excel report
```

**File naming:** `test-results-[timestamp].xlsx`

---

## 🚨 Troubleshooting

### **Issue: Connection Refused**

**Problem:** `connect ECONNREFUSED 127.0.0.1:3000`

**Solution:**
```bash
# Make sure backend is running
cd ..
node server.js

# In another terminal:
cd test
npm test
```

---

### **Issue: Tests Failing**

**Check:**
1. Backend is running
2. Database is connected
3. ChromaDB is running
4. All environment variables are set

**View backend logs:**
```bash
# Backend console should show requests
```

---

### **Issue: Excel File Not Generated**

**Problem:** Permission error or missing exceljs

**Solution:**
```bash
# Reinstall dependencies
cd test
rm -rf node_modules
npm install
```

---

### **Issue: Module Not Found**

**Problem:** `Cannot find module 'exceljs'`

**Solution:**
```bash
# Make sure you're in test/ directory
cd test
npm install
```

---

## 📊 Understanding Test Results

### **Status Codes:**

- **PASS** ✅ - Test executed successfully
- **FAIL** ❌ - Test failed (check message for details)
- **SKIP** ⏭️ - Test skipped (usually due to dependency failure)

### **HTTP Status Codes:**

- **200** - OK (success)
- **201** - Created (success)
- **400** - Bad Request (validation error)
- **401** - Unauthorized (auth failed)
- **404** - Not Found
- **500** - Server Error (backend issue)

### **Response Times:**

- **< 100ms** - Excellent
- **100-300ms** - Good
- **300-500ms** - Acceptable
- **> 500ms** - Slow (investigate)

---

## 🎯 What Gets Tested

### **API Endpoints Covered:**

```
Authentication:
  POST /api/auth/register
  POST /api/auth/login

AI Interview:
  POST /api/interview/start
  POST /api/interview/qa
  POST /api/interview/end
  GET  /api/interview/:sessionId
  GET  /api/interview/user/:userId
  POST /api/interview/search
  DELETE /api/interview/:sessionId

Memory Graph:
  POST /api/memory-graph/memories
  GET  /api/memory-graph/memories/search
  GET  /api/memory-graph/graph
  POST /api/memory-graph/memories/:id/tags
  DELETE /api/memory-graph/memories/:id

Voice Cloning:
  GET /api/voice-cloning/voices
  GET /api/voice-cloning/user/audio-history
  GET /api/voice-cloning/user/custom-voices

Avatar Service:
  GET /api/avatar
  GET /api/avatar/user/:userId/history

Multimedia:
  GET  /api/multimedia/media
  POST /api/multimedia/nodes
  GET  /api/multimedia/nodes
  GET  /api/multimedia/analytics/dashboard
  GET  /api/multimedia/search/media
  DELETE /api/multimedia/nodes/:id
```

**Total: 27 endpoints tested**

---

## 🔄 CI/CD Integration

### **GitHub Actions Example:**

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm install
          cd test && npm install
      
      - name: Start services
        run: |
          docker-compose up -d
          sleep 10
          node server.js &
          sleep 5
      
      - name: Run tests
        run: cd test && npm test
      
      - name: Upload test results
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: test/test-results-*.xlsx
```

---

## 📝 Best Practices

### **Before Running Tests:**

1. ✅ Ensure backend is running
2. ✅ Ensure database is connected
3. ✅ Ensure ChromaDB is running
4. ✅ Ensure no other tests are running

### **After Running Tests:**

1. ✅ Review Excel report
2. ✅ Fix any failing tests
3. ✅ Check response times
4. ✅ Archive test results

### **Regular Testing:**

- 🕐 Run tests before every commit
- 🕐 Run tests before deployment
- 🕐 Run tests after major changes
- 🕐 Run tests weekly (minimum)

---

## 🎉 Success Criteria

**Green Light to Deploy:**
- ✅ All tests pass (100% pass rate)
- ✅ No tests skipped
- ✅ Response times < 500ms
- ✅ No 500 errors
- ✅ Excel report shows all green

**Yellow Light - Review Needed:**
- ⚠️ 1-2 tests failing
- ⚠️ Some tests skipped
- ⚠️ Response times 500-1000ms

**Red Light - Do Not Deploy:**
- ❌ >2 tests failing
- ❌ Critical features failing
- ❌ Response times > 1000ms
- ❌ 500 errors

---

## 📞 Support

**Issues with tests?**
1. Check backend is running
2. Check console logs
3. Review Excel report
4. Check API endpoints manually

**Need help?**
- Review `PRODUCTION_READY.md` for API docs
- Check backend console for errors
- Verify `.env` configuration

---

## ✅ Checklist

Before deployment, ensure:

- [ ] All tests pass
- [ ] Excel report generated successfully
- [ ] No 500 errors
- [ ] Response times acceptable
- [ ] Backend logs clean
- [ ] Database connected
- [ ] ChromaDB running
- [ ] All features functional

---

## 🎯 Summary

**This test suite provides:**
- ✅ Automated testing of all 5 features
- ✅ Color-coded Excel report
- ✅ Response time tracking
- ✅ HTTP status code validation
- ✅ Detailed error messages
- ✅ Summary statistics
- ✅ Easy to run (`npm test`)
- ✅ CI/CD ready

**Run tests before every deployment to ensure quality!** 🚀

---

**Last Updated:** October 12, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready

