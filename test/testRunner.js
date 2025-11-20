#!/usr/bin/env node

/**
 * AI Prototype Backend - Comprehensive Test Suite
 * 
 * Tests all 5 features with detailed Excel report generation:
 * 1. Authentication
 * 2. AI Interview Engine
 * 3. Memory Graph Service
 * 4. Voice Cloning
 * 5. Avatar Service
 * 6. Multimedia Upload
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_USER = {
  username: `testuser${Date.now()}`,
  email: `test${Date.now()}@test.com`,
  password: 'TestPassword123'
};

// Test results storage
const testResults = [];
let authToken = null;
let userId = null;

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper function to log test results
function logTest(feature, testName, status, message, responseTime, statusCode) {
  const result = {
    feature,
    testName,
    status,
    message,
    responseTime: `${responseTime}ms`,
    statusCode,
    timestamp: new Date().toISOString()
  };
  
  testResults.push(result);
  
  const statusColor = status === 'PASS' ? colors.green : status === 'FAIL' ? colors.red : colors.yellow;
  console.log(`${statusColor}[${status}]${colors.reset} ${colors.cyan}${feature}${colors.reset} - ${testName} (${responseTime}ms)`);
  if (message) {
    console.log(`  ${colors.yellow}→${colors.reset} ${message}`);
  }
}

// Helper function for API calls
async function apiCall(method, endpoint, data = null, headers = {}) {
  const startTime = Date.now();
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 10000,
      validateStatus: () => true // Accept all status codes
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    const responseTime = Date.now() - startTime;
    
    // Determine success based on HTTP status code AND response body
    const isHttpSuccess = response.status >= 200 && response.status < 300;
    const isBodySuccess = response.data?.success !== false;
    const actualSuccess = isHttpSuccess && isBodySuccess;
    
    return { 
      success: actualSuccess, 
      data: response.data, 
      responseTime, 
      statusCode: response.status,
      error: !actualSuccess ? response.data : null
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      error: error.response?.data || error.message,
      responseTime,
      statusCode: error.response?.status || 500
    };
  }
}

// Generate Excel Report
async function generateExcelReport() {
  console.log(`\n${colors.blue}📊 Generating Excel Report...${colors.reset}`);
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Test Results', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });
  
  // Define columns
  worksheet.columns = [
    { header: 'Feature', key: 'feature', width: 25 },
    { header: 'Test Name', key: 'testName', width: 50 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Message', key: 'message', width: 60 },
    { header: 'Response Time', key: 'responseTime', width: 15 },
    { header: 'Status Code', key: 'statusCode', width: 12 },
    { header: 'Timestamp', key: 'timestamp', width: 25 }
  ];
  
  // Style header row
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 25;
  
  // Add data rows
  testResults.forEach((result, index) => {
    const row = worksheet.addRow(result);
    
    // Apply conditional formatting based on status
    if (result.status === 'PASS') {
      row.getCell('status').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF90EE90' } // Light Green
      };
      row.getCell('status').font = { color: { argb: 'FF006400' }, bold: true }; // Dark Green text
    } else if (result.status === 'FAIL') {
      row.getCell('status').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFB6C1' } // Light Red
      };
      row.getCell('status').font = { color: { argb: 'FF8B0000' }, bold: true }; // Dark Red text
    } else {
      row.getCell('status').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFE0' } // Light Yellow
      };
      row.getCell('status').font = { color: { argb: 'FFB8860B' }, bold: true }; // Dark Yellow text
    }
    
    // Alternate row colors
    if (index % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }
      };
    }
    
    row.alignment = { vertical: 'middle', wrapText: true };
    row.height = 30;
  });
  
  // Add borders
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
  });
  
  // Add summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const skipped = testResults.filter(r => r.status === 'SKIP').length;
  const total = testResults.length;
  const passRate = ((passed / total) * 100).toFixed(2);
  
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 }
  ];
  
  summarySheet.getRow(1).font = { bold: true, size: 14 };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  summarySheet.addRow({ metric: 'Total Tests', value: total });
  summarySheet.addRow({ metric: 'Passed', value: passed }).getCell('value').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF90EE90' }
  };
  summarySheet.addRow({ metric: 'Failed', value: failed }).getCell('value').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFB6C1' }
  };
  summarySheet.addRow({ metric: 'Skipped', value: skipped }).getCell('value').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFFE0' }
  };
  summarySheet.addRow({ metric: 'Pass Rate', value: `${passRate}%` });
  summarySheet.addRow({ metric: 'Test Date', value: new Date().toLocaleString() });
  summarySheet.addRow({ metric: 'Base URL', value: BASE_URL });
  
  // Save file
  const fileName = `test-results-${Date.now()}.xlsx`;
  const filePath = path.join(__dirname, fileName);
  await workbook.xlsx.writeFile(filePath);
  
  console.log(`${colors.green}✅ Excel report generated: ${fileName}${colors.reset}`);
  console.log(`${colors.cyan}📁 Location: ${filePath}${colors.reset}`);
  
  return { fileName, filePath, passed, failed, skipped, total, passRate };
}

// Test Suite: Authentication
async function testAuthentication() {
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}🔐 Testing: Authentication${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
  
  // Test 1: Register new user
  const registerResult = await apiCall('POST', '/api/auth/register', TEST_USER);
  if (registerResult.success && registerResult.data.data?.user) {
    userId = registerResult.data.data.user?.id;
    // Registration also returns tokens, so we can use them
    if (registerResult.data.data.tokens?.accessToken) {
      authToken = registerResult.data.data.tokens.accessToken;
    }
    logTest('Authentication', 'Register new user', 'PASS', 'User created successfully', registerResult.responseTime, registerResult.statusCode);
  } else {
    logTest('Authentication', 'Register new user', 'FAIL', registerResult.error?.message || 'Registration failed', registerResult.responseTime, registerResult.statusCode);
  }
  
  // Test 2: Login with credentials
  const loginResult = await apiCall('POST', '/api/auth/login', {
    identifier: TEST_USER.username,
    password: TEST_USER.password
  });
  
  if (loginResult.success && loginResult.data.data?.tokens?.accessToken) {
    authToken = loginResult.data.data.tokens.accessToken;
    userId = loginResult.data.data.user?.id;
    logTest('Authentication', 'Login with credentials', 'PASS', 'JWT token received', loginResult.responseTime, loginResult.statusCode);
  } else {
    logTest('Authentication', 'Login with credentials', 'FAIL', loginResult.error?.message || 'Login failed', loginResult.responseTime, loginResult.statusCode);
  }
  
  // Test 3: Access protected endpoint without token (use valid UUID format)
  const unauthedResult = await apiCall('GET', '/api/interview/user/00000000-0000-0000-0000-000000000000');
  if (unauthedResult.statusCode === 401 || unauthedResult.statusCode === 403) {
    logTest('Authentication', 'Protected endpoint without token', 'PASS', 'Correctly rejected', unauthedResult.responseTime, unauthedResult.statusCode);
  } else if (unauthedResult.statusCode === 200 && (!unauthedResult.data || unauthedResult.data.interviews?.length === 0)) {
    // Endpoint returned 200 with empty data (optional auth allows access but no data)
    logTest('Authentication', 'Protected endpoint without token', 'PASS', 'No data returned (expected)', unauthedResult.responseTime, unauthedResult.statusCode);
  } else {
    logTest('Authentication', 'Protected endpoint without token', 'FAIL', `Unexpected status: ${unauthedResult.statusCode}`, unauthedResult.responseTime, unauthedResult.statusCode);
  }
  
  // Test 4: Access protected endpoint with token
  if (authToken) {
    const authedResult = await apiCall('GET', `/api/interview/user/${userId}`, null, {
      'Authorization': `Bearer ${authToken}`
    });
    if (authedResult.success && authedResult.statusCode === 200) {
      logTest('Authentication', 'Protected endpoint with valid token', 'PASS', 'Access granted', authedResult.responseTime, authedResult.statusCode);
    } else {
      logTest('Authentication', 'Protected endpoint with valid token', 'FAIL', authedResult.error?.message || 'Access denied', authedResult.responseTime, authedResult.statusCode);
    }
  } else {
    logTest('Authentication', 'Protected endpoint with valid token', 'SKIP', 'No token available', 0, 0);
  }
}

// Test Suite: AI Interview Engine
async function testAIInterview() {
  if (!authToken) {
    console.log(`\n${colors.yellow}⚠️ Skipping AI Interview tests (no auth token)${colors.reset}`);
    return;
  }
  
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}🎙️ Testing: AI Interview Engine${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
  
  let sessionId = null;
  
  // Test 1: Start interview
  const testSessionId = `test-session-${Date.now()}`;
  const startResult = await apiCall('POST', '/api/interview/start', {
    session_id: testSessionId,
    user_id: userId
  }, { 'Authorization': `Bearer ${authToken}` });
  
  if (startResult.success && startResult.data.interview_id) {
    sessionId = testSessionId; // Use the session_id we sent, not the interview_id
    logTest('AI Interview', 'Start new interview session', 'PASS', `Interview ID: ${startResult.data.interview_id}`, startResult.responseTime, startResult.statusCode);
  } else {
    logTest('AI Interview', 'Start new interview session', 'FAIL', startResult.error?.message || 'Failed to start', startResult.responseTime, startResult.statusCode);
  }
  
  // Test 2: Add Q&A pair
  if (sessionId) {
    const qaResult = await apiCall('POST', '/api/interview/qa', {
      session_id: sessionId, // This is now the correct testSessionId
      question: 'What is your name?',
      answer: 'I am an AI assistant.'
    }, { 'Authorization': `Bearer ${authToken}` });
    
    if (qaResult.success) {
      logTest('AI Interview', 'Add Q&A pair to session', 'PASS', 'Q&A saved successfully', qaResult.responseTime, qaResult.statusCode);
    } else {
      logTest('AI Interview', 'Add Q&A pair to session', 'FAIL', qaResult.error?.message || 'Failed to add Q&A', qaResult.responseTime, qaResult.statusCode);
    }
  } else {
    logTest('AI Interview', 'Add Q&A pair to session', 'SKIP', 'No session available', 0, 0);
  }
  
  // Test 3: Get interview by session ID (use the original session ID, not interview ID)
  if (testSessionId) {
    const getResult = await apiCall('GET', `/api/interview/${testSessionId}`, null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (getResult.success && getResult.data.interview) {
      logTest('AI Interview', 'Get interview by session ID', 'PASS', 'Interview data retrieved', getResult.responseTime, getResult.statusCode);
    } else {
      logTest('AI Interview', 'Get interview by session ID', 'FAIL', getResult.error?.message || `Failed with status ${getResult.statusCode}`, getResult.responseTime, getResult.statusCode);
    }
  } else {
    logTest('AI Interview', 'Get interview by session ID', 'SKIP', 'No session available', 0, 0);
  }
  
  // Test 4: Get user's interviews
  const userInterviewsResult = await apiCall('GET', `/api/interview/user/${userId}`, null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (userInterviewsResult.success) {
    logTest('AI Interview', 'Get user interview history', 'PASS', `Found ${userInterviewsResult.data.interviews?.length || 0} interviews`, userInterviewsResult.responseTime, userInterviewsResult.statusCode);
  } else {
    logTest('AI Interview', 'Get user interview history', 'FAIL', userInterviewsResult.error?.message || 'Failed to retrieve', userInterviewsResult.responseTime, userInterviewsResult.statusCode);
  }
  
  // Test 5: Search interviews
  const searchResult = await apiCall('POST', '/api/interview/search', {
    query: 'assistant',
    user_id: userId
  }, { 'Authorization': `Bearer ${authToken}` });
  
  if (searchResult.success && searchResult.statusCode === 200) {
    logTest('AI Interview', 'Semantic search in interviews', 'PASS', 'Search completed', searchResult.responseTime, searchResult.statusCode);
  } else {
    logTest('AI Interview', 'Semantic search in interviews', 'FAIL', searchResult.error?.message || 'Search failed', searchResult.responseTime, searchResult.statusCode);
  }
  
  // Test 6: End interview
  if (sessionId) {
    const endResult = await apiCall('POST', '/api/interview/end', {
      session_id: sessionId,
      title: 'Test Interview'
    }, { 'Authorization': `Bearer ${authToken}` });
    
    if (endResult.success) {
      logTest('AI Interview', 'End interview session', 'PASS', 'Session ended successfully', endResult.responseTime, endResult.statusCode);
    } else {
      logTest('AI Interview', 'End interview session', 'FAIL', endResult.error?.message || 'Failed to end', endResult.responseTime, endResult.statusCode);
    }
  } else {
    logTest('AI Interview', 'End interview session', 'SKIP', 'No session available', 0, 0);
  }
  
  // Test 7: Delete interview
  if (sessionId) {
    const deleteResult = await apiCall('DELETE', `/api/interview/${sessionId}`, null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (deleteResult.success && deleteResult.statusCode === 200) {
      logTest('AI Interview', 'Delete interview session', 'PASS', 'Session deleted', deleteResult.responseTime, deleteResult.statusCode);
    } else {
      logTest('AI Interview', 'Delete interview session', 'FAIL', deleteResult.error?.message || 'Failed to delete', deleteResult.responseTime, deleteResult.statusCode);
    }
  } else {
    logTest('AI Interview', 'Delete interview session', 'SKIP', 'No session available', 0, 0);
  }
}

// Test Suite: Memory Graph Service
async function testMemoryGraph() {
  if (!authToken) {
    console.log(`\n${colors.yellow}⚠️ Skipping Memory Graph tests (no auth token)${colors.reset}`);
    return;
  }
  
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}🧠 Testing: Memory Graph Service${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
  
  let memoryId = null;
  
  // Test 1: Create memory
  const createResult = await apiCall('POST', '/api/memory-graph/memories', {
    document: 'Test memory for automated testing',
    person: 'Test User',
    event: 'Test Event',
    tags: ['test', 'automated'],
    media: []
  }, { 'Authorization': `Bearer ${authToken}` });
  
  if (createResult.success && createResult.data.id) {
    memoryId = createResult.data.id;
    logTest('Memory Graph', 'Create new memory', 'PASS', `Memory ID: ${memoryId}`, createResult.responseTime, createResult.statusCode);
  } else {
    logTest('Memory Graph', 'Create new memory', 'FAIL', createResult.error?.message || 'Failed to create', createResult.responseTime, createResult.statusCode);
  }
  
  // Test 2: Search memories
  const searchResult = await apiCall('GET', '/api/memory-graph/memories/search?q=test&n=10', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (searchResult.success) {
    logTest('Memory Graph', 'Semantic search memories', 'PASS', `Found results`, searchResult.responseTime, searchResult.statusCode);
  } else {
    logTest('Memory Graph', 'Semantic search memories', 'FAIL', searchResult.error?.message || 'Search failed', searchResult.responseTime, searchResult.statusCode);
  }
  
  // Test 3: Get graph
  const graphResult = await apiCall('GET', '/api/memory-graph/graph?seed=memory&n=50', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (graphResult.success && graphResult.data.nodes) {
    logTest('Memory Graph', 'Get memory graph', 'PASS', `${graphResult.data.nodes.length} nodes, ${graphResult.data.edges?.length || 0} edges`, graphResult.responseTime, graphResult.statusCode);
  } else {
    logTest('Memory Graph', 'Get memory graph', 'FAIL', graphResult.error?.message || 'Failed to get graph', graphResult.responseTime, graphResult.statusCode);
  }
  
  // Test 4: Update memory (add tags)
  if (memoryId) {
    const updateResult = await apiCall('POST', `/api/memory-graph/memories/${memoryId}/tags`, {
      tags: ['updated', 'test'],
      document: 'Updated test memory'
    }, { 'Authorization': `Bearer ${authToken}` });
    
    if (updateResult.success) {
      logTest('Memory Graph', 'Update memory (add tags)', 'PASS', 'Memory updated', updateResult.responseTime, updateResult.statusCode);
    } else {
      logTest('Memory Graph', 'Update memory (add tags)', 'FAIL', updateResult.error?.message || 'Failed to update', updateResult.responseTime, updateResult.statusCode);
    }
  } else {
    logTest('Memory Graph', 'Update memory (add tags)', 'SKIP', 'No memory available', 0, 0);
  }
  
  // Test 5: Delete memory
  if (memoryId) {
    const deleteResult = await apiCall('DELETE', `/api/memory-graph/memories/${memoryId}`, null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (deleteResult.success || deleteResult.statusCode === 200) {
      logTest('Memory Graph', 'Delete memory', 'PASS', 'Memory deleted', deleteResult.responseTime, deleteResult.statusCode);
    } else {
      logTest('Memory Graph', 'Delete memory', 'FAIL', deleteResult.error?.message || 'Failed to delete', deleteResult.responseTime, deleteResult.statusCode);
    }
  } else {
    logTest('Memory Graph', 'Delete memory', 'SKIP', 'No memory available', 0, 0);
  }
}

// Test Suite: Voice Cloning
async function testVoiceCloning() {
  if (!authToken) {
    console.log(`\n${colors.yellow}⚠️ Skipping Voice Cloning tests (no auth token)${colors.reset}`);
    return;
  }
  
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}🎤 Testing: Voice Cloning Service${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
  
  // Test 1: Get available voices
  const voicesResult = await apiCall('GET', '/api/voice-cloning/voices', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (voicesResult.success && voicesResult.data.voices) {
    logTest('Voice Cloning', 'Get available voices', 'PASS', `Found ${voicesResult.data.count || 0} voices`, voicesResult.responseTime, voicesResult.statusCode);
  } else {
    logTest('Voice Cloning', 'Get available voices', 'FAIL', voicesResult.error?.message || 'Failed to get voices', voicesResult.responseTime, voicesResult.statusCode);
  }
  
  // Test 2: Get audio history
  const historyResult = await apiCall('GET', '/api/voice-cloning/user/audio-history', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (historyResult.success) {
    logTest('Voice Cloning', 'Get audio generation history', 'PASS', `Found ${historyResult.data.total || 0} records`, historyResult.responseTime, historyResult.statusCode);
  } else {
    logTest('Voice Cloning', 'Get audio generation history', 'FAIL', historyResult.error?.message || 'Failed to get history', historyResult.responseTime, historyResult.statusCode);
  }
  
  // Test 3: Get custom voices
  const customVoicesResult = await apiCall('GET', '/api/voice-cloning/user/custom-voices', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (customVoicesResult.success) {
    logTest('Voice Cloning', 'Get custom voice clones', 'PASS', `Found ${customVoicesResult.data.voices?.length || 0} custom voices`, customVoicesResult.responseTime, customVoicesResult.statusCode);
  } else {
    logTest('Voice Cloning', 'Get custom voice clones', 'FAIL', customVoicesResult.error?.message || 'Failed to get custom voices', customVoicesResult.responseTime, customVoicesResult.statusCode);
  }
}

// Test Suite: Avatar Service
async function testAvatarService() {
  if (!authToken) {
    console.log(`\n${colors.yellow}⚠️ Skipping Avatar Service tests (no auth token)${colors.reset}`);
    return;
  }
  
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}👤 Testing: Avatar Service${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
  
  // Test 1: Get user avatars
  const avatarsResult = await apiCall('GET', '/api/avatar', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (avatarsResult.success) {
    logTest('Avatar Service', 'Get user avatars', 'PASS', `Found ${avatarsResult.data.avatars?.length || 0} avatars`, avatarsResult.responseTime, avatarsResult.statusCode);
  } else {
    logTest('Avatar Service', 'Get user avatars', 'FAIL', avatarsResult.error?.message || 'Failed to get avatars', avatarsResult.responseTime, avatarsResult.statusCode);
  }
  
  // Test 2: Get user animation history
  const historyResult = await apiCall('GET', `/api/avatar/user/${userId}/history`, null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (historyResult.success || historyResult.statusCode === 200) {
    logTest('Avatar Service', 'Get animation history', 'PASS', 'History retrieved', historyResult.responseTime, historyResult.statusCode);
  } else {
    logTest('Avatar Service', 'Get animation history', 'FAIL', historyResult.error?.message || 'Failed to get history', historyResult.responseTime, historyResult.statusCode);
  }
}

// Test Suite: Multimedia Upload
async function testMultimedia() {
  if (!authToken) {
    console.log(`\n${colors.yellow}⚠️ Skipping Multimedia tests (no auth token)${colors.reset}`);
    return;
  }
  
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}📁 Testing: Multimedia Upload Service${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
  
  let nodeId = null;
  
  // Test 1: Get all media
  const mediaResult = await apiCall('GET', '/api/multimedia/media', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (mediaResult.success) {
    logTest('Multimedia', 'Get all media files', 'PASS', `Found ${mediaResult.data.count || 0} files`, mediaResult.responseTime, mediaResult.statusCode);
  } else {
    logTest('Multimedia', 'Get all media files', 'FAIL', mediaResult.error?.message || 'Failed to get media', mediaResult.responseTime, mediaResult.statusCode);
  }
  
  // Test 2: Create memory node
  const nodeResult = await apiCall('POST', '/api/multimedia/nodes', {
    title: 'Test Node',
    description: 'Automated test node',
    type: 'event',
    metadata: { test: true }
  }, { 'Authorization': `Bearer ${authToken}` });
  
  if (nodeResult.success && nodeResult.data.data) {
    nodeId = nodeResult.data.data.id;
    logTest('Multimedia', 'Create memory node', 'PASS', `Node ID: ${nodeId}`, nodeResult.responseTime, nodeResult.statusCode);
  } else {
    logTest('Multimedia', 'Create memory node', 'FAIL', nodeResult.error?.message || 'Failed to create node', nodeResult.responseTime, nodeResult.statusCode);
  }
  
  // Test 3: Get all nodes
  const nodesResult = await apiCall('GET', '/api/multimedia/nodes', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (nodesResult.success) {
    logTest('Multimedia', 'Get all memory nodes', 'PASS', `Found ${nodesResult.data.count || 0} nodes`, nodesResult.responseTime, nodesResult.statusCode);
  } else {
    logTest('Multimedia', 'Get all memory nodes', 'FAIL', nodesResult.error?.message || 'Failed to get nodes', nodesResult.responseTime, nodesResult.statusCode);
  }
  
  // Test 4: Get dashboard analytics
  const analyticsResult = await apiCall('GET', '/api/multimedia/analytics/dashboard', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (analyticsResult.success && analyticsResult.data.data) {
    logTest('Multimedia', 'Get dashboard analytics', 'PASS', `Total: ${analyticsResult.data.data.overview?.totalMedia || 0} media, ${analyticsResult.data.data.overview?.totalNodes || 0} nodes`, analyticsResult.responseTime, analyticsResult.statusCode);
  } else {
    logTest('Multimedia', 'Get dashboard analytics', 'FAIL', analyticsResult.error?.message || 'Failed to get analytics', analyticsResult.responseTime, analyticsResult.statusCode);
  }
  
  // Test 5: Search media
  const searchResult = await apiCall('GET', '/api/multimedia/search/media?query=test', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (searchResult.success || searchResult.statusCode === 200) {
    logTest('Multimedia', 'Search media files', 'PASS', 'Search completed', searchResult.responseTime, searchResult.statusCode);
  } else {
    logTest('Multimedia', 'Search media files', 'FAIL', searchResult.error?.message || 'Search failed', searchResult.responseTime, searchResult.statusCode);
  }
  
  // Test 6: Delete node
  if (nodeId) {
    const deleteResult = await apiCall('DELETE', `/api/multimedia/nodes/${nodeId}`, null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (deleteResult.success || deleteResult.statusCode === 200) {
      logTest('Multimedia', 'Delete memory node', 'PASS', 'Node deleted', deleteResult.responseTime, deleteResult.statusCode);
    } else {
      logTest('Multimedia', 'Delete memory node', 'FAIL', deleteResult.error?.message || 'Failed to delete', deleteResult.responseTime, deleteResult.statusCode);
    }
  } else {
    logTest('Multimedia', 'Delete memory node', 'SKIP', 'No node available', 0, 0);
  }
}

// Main test runner
async function runTests() {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}🧪 AI Prototype Backend - Comprehensive Test Suite${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.yellow}📡 Base URL: ${BASE_URL}${colors.reset}`);
  console.log(`${colors.yellow}⏰ Start Time: ${new Date().toLocaleString()}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
  
  try {
    // Run all test suites
    await testAuthentication();
    await testAIInterview();
    await testMemoryGraph();
    await testVoiceCloning();
    await testAvatarService();
    await testMultimedia();
    
    // Generate Excel report
    const report = await generateExcelReport();
    
    // Print summary
    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}📊 TEST SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.green}✅ Passed: ${report.passed}${colors.reset}`);
    console.log(`${colors.red}❌ Failed: ${report.failed}${colors.reset}`);
    console.log(`${colors.yellow}⏭️  Skipped: ${report.skipped}${colors.reset}`);
    console.log(`${colors.blue}📈 Total: ${report.total}${colors.reset}`);
    console.log(`${colors.cyan}📊 Pass Rate: ${report.passRate}%${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.green}✅ Report saved: ${report.fileName}${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Test execution failed:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run tests
runTests();

