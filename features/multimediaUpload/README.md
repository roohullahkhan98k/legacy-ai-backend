# Multimedia Upload & Linking Service

A comprehensive backend service for uploading, managing, and linking multimedia files (images and videos) with memory nodes. Features automatic metadata extraction, drag-and-drop support, and JSON-based database storage. 

**✅ Fully Integrated**: Routes are automatically mounted at `/api/multimedia` when the server starts.

## Features

### 📁 File Upload
- **Single File Upload**: Upload one image or video at a time
- **Multiple File Upload**: Upload up to 10 files simultaneously
- **Drag & Drop Support**: Frontend-ready for drag-and-drop interfaces
- **File Type Validation**: Supports images (JPEG, PNG, TIFF, WebP) and videos (MP4, AVI, MOV, WMV, MKV)
- **Size Limits**: 100MB per file, 10 files per request
- **Unique Naming**: Automatic unique filename generation to prevent conflicts

### 🏷️ Auto-Tagging & Metadata
- **EXIF Data Extraction**: Automatically extracts camera settings, GPS data, and device info
- **Image Metadata**: Width, height, color space, camera make/model, lens info
- **GPS Coordinates**: Automatic geotag extraction from EXIF data
- **Date Information**: Creation date, modification date, and photo taken date
- **Searchable Tags**: Auto-generated tags for easy searching and filtering

### 🔗 Memory Node Linking
- **Create Memory Nodes**: Create events, people, or timeline entries
- **Link Media to Nodes**: Associate uploaded media with specific memory nodes
- **Relationship Types**: Define relationships (primary, associated, reference, etc.)
- **Bulk Operations**: Link or unlink multiple media files at once
- **Bidirectional Links**: View all media for a node or all nodes for media

### 🗄️ JSON Database
- **Local Storage**: Uses JSON file for database (no external dependencies)
- **Automatic Backup**: File-based storage with automatic persistence
- **Search & Filter**: Advanced search by metadata, date ranges, device, location
- **Statistics**: Track media counts, types, and linking statistics

## Quick Start

The multimedia service is automatically available when you start the server. All endpoints are prefixed with `/api/multimedia`:

```bash
# Start the server
npm start

# Test the service
curl http://localhost:3000/api/multimedia/media
curl http://localhost:3000/api/multimedia/docs
```

## API Endpoints

### Upload Endpoints
```
POST /api/multimedia/upload/single
POST /api/multimedia/upload/multiple
```

### Media Management
```
GET    /api/multimedia/media                    # Get all media
GET    /api/multimedia/media/:mediaId           # Get media by ID
GET    /api/multimedia/media/:mediaId/download  # Download media file
PUT    /api/multimedia/media/:mediaId           # Update media metadata
DELETE /api/multimedia/media/:mediaId           # Delete media
```

### Memory Nodes
```
POST   /api/multimedia/nodes                    # Create memory node
GET    /api/multimedia/nodes                    # Get all nodes
GET    /api/multimedia/nodes/:nodeId            # Get node by ID
PUT    /api/multimedia/nodes/:nodeId            # Update node
DELETE /api/multimedia/nodes/:nodeId            # Delete node
```

### Linking
```
POST   /api/multimedia/link/:mediaId/to/:nodeId           # Link media to node
DELETE /api/multimedia/link/:mediaId/from/:nodeId         # Unlink media from node
GET    /api/multimedia/nodes/:nodeId/media                # Get media for node
GET    /api/multimedia/media/:mediaId/nodes               # Get nodes for media
POST   /api/multimedia/link/bulk/to/:nodeId               # Bulk link media
POST   /api/multimedia/unlink/bulk/from/:nodeId           # Bulk unlink media
```

### Search & Discovery
```
GET /api/multimedia/search/media                # Search media by metadata
GET /api/multimedia/search/nodes                # Search memory nodes
```

### Service Information
```
GET /health                                     # Main server health check
GET /api/multimedia/docs                        # API documentation
```

## Usage Examples

### Upload Single Image
```javascript
const formData = new FormData();
formData.append('media', imageFile);

fetch('/api/multimedia/upload/single', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('Uploaded:', data.data.mediaId);
  console.log('Metadata:', data.data.metadata);
});
```

### Create Memory Node
```javascript
fetch('/api/multimedia/nodes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Summer Vacation 2023',
    description: 'Photos from our family vacation to the beach',
    type: 'event',
    metadata: {
      location: 'Miami Beach',
      participants: ['John', 'Jane', 'Kids'],
      date: '2023-07-15'
    }
  })
});
```

### Link Media to Node
```javascript
fetch('/api/multimedia/link/media_123/to/node_456', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    relationship: 'primary'
  })
});
```

### Search Media by Date
```javascript
fetch('/api/multimedia/search/media?dateFrom=2023-01-01&dateTo=2023-12-31&type=image')
.then(response => response.json())
.then(data => {
  console.log('Found images from 2023:', data.data.results);
});
```

## File Structure

```
features/multimediaUpload/
├── controllers/
│   ├── multimediaController.js      # Media CRUD operations
│   ├── memoryNodeController.js      # Memory node operations
│   └── linkingController.js         # Media-node linking
├── middleware/
│   ├── upload.js                    # Multer configuration
│   └── metadataExtractor.js         # EXIF/metadata extraction
├── models/
│   ├── MultimediaModel.js           # JSON database operations
│   └── db.json                      # JSON database file
├── routes/
│   ├── multimediaRoutes.js          # API route definitions
│   └── index.js                     # Route mounting and docs
├── multimediaService.js             # Main service class
└── README.md                        # This documentation

# Integration
server.js                            # Main server file (imports multimedia routes)
├── const multimediaRoutes = require('./features/multimediaUpload/routes');
└── app.use('/api/multimedia', multimediaRoutes);
```

## Database Schema

### Media Object
```json
{
  "id": "media_1234567890_abc123",
  "originalName": "vacation_photo.jpg",
  "filename": "1234567890_abc123.jpg",
  "path": "/uploads/multimedia/images/1234567890_abc123.jpg",
  "type": "image",
  "mimeType": "image/jpeg",
  "metadata": {
    "fileSize": 2048576,
    "width": 1920,
    "height": 1080,
    "dateTaken": "2023-07-15T14:30:00Z",
    "device": "iPhone 14 Pro",
    "location": "GPS Location Available",
    "gps": {
      "latitude": 25.7617,
      "longitude": -80.1918
    },
    "cameraSettings": {
      "make": "Apple",
      "model": "iPhone 14 Pro",
      "fNumber": 1.78,
      "exposureTime": "1/120",
      "iso": 100
    },
    "tags": ["iphone", "apple", "gps", "geotagged", "2023", "07", "15"]
  },
  "createdAt": "2023-12-01T10:00:00Z",
  "updatedAt": "2023-12-01T10:00:00Z"
}
```

### Memory Node Object
```json
{
  "id": "node_1234567890_def456",
  "title": "Summer Vacation 2023",
  "description": "Photos from our family vacation to the beach",
  "type": "event",
  "metadata": {
    "location": "Miami Beach",
    "participants": ["John", "Jane", "Kids"],
    "date": "2023-07-15"
  },
  "createdAt": "2023-12-01T10:00:00Z",
  "updatedAt": "2023-12-01T10:00:00Z"
}
```

### Media Link Object
```json
{
  "linkId": "link_1234567890_ghi789",
  "mediaId": "media_1234567890_abc123",
  "nodeId": "node_1234567890_def456",
  "relationship": "primary",
  "createdAt": "2023-12-01T10:00:00Z"
}
```

## Dependencies

- **express**: Web framework
- **multer**: File upload handling
- **sharp**: Image processing and EXIF extraction
- **crypto**: Built-in crypto module for UUID generation
- **fs**: File system operations (built-in)
- **path**: Path utilities (built-in)

## Installation

1. Install dependencies:
```bash
npm install express multer sharp
```

2. The service is automatically integrated into the main server via `server.js`
   - Routes are mounted at `/api/multimedia`
   - All endpoints are available immediately after server start

3. Start the server:
```bash
npm start
# or with nodemon for development
nodemon server.js
```

## Configuration

### File Storage
- **Upload Directory**: `uploads/multimedia/`
- **Images**: `uploads/multimedia/images/`
- **Videos**: `uploads/multimedia/videos/`
- **Database**: `features/multimediaUpload/models/db.json`

### Limits
- **Max File Size**: 100MB
- **Max Files per Request**: 10
- **Supported Image Types**: JPEG, PNG, TIFF, WebP
- **Supported Video Types**: MP4, AVI, MOV, WMV, MKV

## Error Handling

The service includes comprehensive error handling:
- File validation errors
- Upload size limits
- Database operation failures
- Metadata extraction errors
- File system errors

All errors return structured JSON responses with appropriate HTTP status codes.

## Security Considerations

- File type validation
- File size limits
- Unique filename generation
- Path traversal protection
- Input sanitization

## Performance

- Efficient metadata extraction using Sharp
- JSON database for fast read/write operations
- Automatic file cleanup on failed operations
- Optimized search and filtering algorithms

## Future Enhancements

- Cloud storage integration (S3, Google Cloud)
- Video metadata extraction with FFprobe
- Image thumbnail generation
- Advanced search with full-text indexing
- Batch processing for large uploads
- WebSocket real-time updates
- Image compression and optimization
