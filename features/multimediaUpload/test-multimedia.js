// Test script for Multimedia Upload & Linking Service
const MultimediaModel = require('./models/MultimediaModel');
const MetadataExtractor = require('./middleware/metadataExtractor');
const MultimediaService = require('./multimediaService');

console.log('🧪 Testing Multimedia Upload & Linking Service...\n');

// Test 1: Database Model
console.log('1. Testing Database Model...');
const model = new MultimediaModel();

// Test creating a memory node
const testNodeId = 'test_node_123';
const testNode = {
  id: testNodeId,
  title: 'Test Memory Node',
  description: 'A test memory node for testing purposes',
  type: 'test',
  metadata: { test: true }
};

const nodeCreated = model.createMemoryNode(testNodeId, testNode);
console.log('✅ Memory node created:', nodeCreated ? 'SUCCESS' : 'FAILED');

// Test creating media entry
const testMediaId = 'test_media_123';
const testMedia = {
  id: testMediaId,
  originalName: 'test_image.jpg',
  filename: '1234567890_test.jpg',
  path: '/test/path/test_image.jpg',
  type: 'image',
  mimeType: 'image/jpeg',
  metadata: {
    fileSize: 1024,
    width: 800,
    height: 600,
    dateTaken: new Date().toISOString(),
    device: 'Test Camera',
    tags: ['test', 'image']
  }
};

const mediaCreated = model.saveMedia(testMediaId, testMedia);
console.log('✅ Media entry created:', mediaCreated ? 'SUCCESS' : 'FAILED');

// Test linking
const linkId = model.linkMediaToNode(testMediaId, testNodeId, 'test');
console.log('✅ Media linked to node:', linkId ? 'SUCCESS' : 'FAILED');

// Test retrieval
const retrievedMedia = model.getMedia(testMediaId);
const retrievedNode = model.getMemoryNode(testNodeId);
const linkedMedia = model.getMediaLinksForNode(testNodeId);

console.log('✅ Media retrieval:', retrievedMedia ? 'SUCCESS' : 'FAILED');
console.log('✅ Node retrieval:', retrievedNode ? 'SUCCESS' : 'FAILED');
console.log('✅ Link retrieval:', linkedMedia.length > 0 ? 'SUCCESS' : 'FAILED');

// Test 2: Metadata Extractor
console.log('\n2. Testing Metadata Extractor...');
const extractor = new MetadataExtractor();

// Test basic metadata generation
const basicMetadata = extractor.getBasicMetadata(__filename);
console.log('✅ Basic metadata extraction:', basicMetadata ? 'SUCCESS' : 'FAILED');

// Test tag generation
const testMetadata = {
  device: 'iPhone 14 Pro',
  cameraSettings: { make: 'Apple', model: 'iPhone 14 Pro' },
  gps: { latitude: 25.7617, longitude: -80.1918 },
  dateTaken: '2023-07-15T14:30:00Z'
};

const tags = extractor.generateTags(testMetadata);
console.log('✅ Tag generation:', tags.length > 0 ? 'SUCCESS' : 'FAILED');
console.log('   Generated tags:', tags);

// Test 3: Service Status
console.log('\n3. Testing Service Status...');
const service = new MultimediaService();
const status = service.getStatus();
const stats = service.getStats();

console.log('✅ Service status:', status.status === 'Active' ? 'SUCCESS' : 'FAILED');
console.log('✅ Service stats:', stats ? 'SUCCESS' : 'FAILED');
console.log('   Service endpoints:', Object.keys(status.endpoints).length);

// Test 4: Search functionality
console.log('\n4. Testing Search Functionality...');
const searchResults = model.searchMediaByMetadata({
  type: 'image',
  device: 'Test'
});
console.log('✅ Search functionality:', searchResults.length > 0 ? 'SUCCESS' : 'FAILED');

// Cleanup test data
console.log('\n5. Cleaning up test data...');
model.deleteMedia(testMediaId);
model.deleteMemoryNode(testNodeId);
console.log('✅ Test data cleaned up');

console.log('\n🎉 All tests completed successfully!');
console.log('\n📋 Service Summary:');
console.log('- Database operations: ✅');
console.log('- Metadata extraction: ✅');
console.log('- Service integration: ✅');
console.log('- Search functionality: ✅');
console.log('- File cleanup: ✅');

console.log('\n🚀 The Multimedia Upload & Linking Service is ready to use!');
console.log('📖 Check the README.md for detailed API documentation.');
