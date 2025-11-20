# Multimedia Linking System - Complete Guide

## 🎯 Overview

The Multimedia Linking System allows you to connect uploaded media files (images/videos) to memory nodes (events, people, timeline entries). This creates a powerful way to organize and retrieve your media based on context and relationships.

## 🔗 How Linking Works

### Core Concepts:
- **Media Files**: Images and videos with extracted metadata
- **Memory Nodes**: Events, people, or timeline entries
- **Links**: Relationships between media and nodes with different types

### Link Types:
- **`primary`**: Main/featured media for a memory node
- **`associated`**: Related media that supports the memory
- **`reference`**: Media that references or mentions the memory

## 📊 Data Structure

### Database Structure:
```json
{
  "media": {
    "media_123_abc": {
      "id": "media_123_abc",
      "originalName": "vacation_photo.jpg",
      "filename": "123_abc.jpg",
      "type": "image",
      "metadata": { /* EXIF data, dimensions, etc. */ },
      "linkedNodes": [],
      "createdAt": "2025-01-01T00:00:00Z"
    }
  },
  "memoryNodes": {
    "node_456_def": {
      "id": "node_456_def",
      "title": "Summer Vacation 2024",
      "description": "Family trip to the beach",
      "type": "event",
      "metadata": { "location": "Miami", "participants": ["John", "Jane"] },
      "linkedMedia": [],
      "createdAt": "2025-01-01T00:00:00Z"
    }
  },
  "mediaLinks": {
    "link_789_ghi": {
      "id": "link_789_ghi",
      "mediaId": "media_123_abc",
      "nodeId": "node_456_def",
      "relationship": "primary",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  }
}
```

## 🚀 API Endpoints for Linking

### Base URL: `http://localhost:3000/api/multimedia`

### 1. Single Media Linking
```http
POST /link/{mediaId}/to/{nodeId}
Content-Type: application/json

{
  "relationship": "primary"  // optional: "primary", "associated", "reference"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Media linked successfully",
  "data": {
    "linkId": "link_789_ghi",
    "link": {
      "id": "link_789_ghi",
      "mediaId": "media_123_abc",
      "nodeId": "node_456_def",
      "relationship": "primary",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  }
}
```

### 2. Bulk Media Linking
```http
POST /link/bulk/to/{nodeId}
Content-Type: application/json

{
  "mediaIds": ["media_123_abc", "media_456_def"],
  "relationship": "associated"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk linking completed: 2 successful, 0 failed, 0 already linked",
  "data": {
    "linked": 2,
    "node": { /* memory node details */ },
    "results": {
      "successful": [
        { "mediaId": "media_123_abc", "linkId": "link_789_ghi" },
        { "mediaId": "media_456_def", "linkId": "link_790_hij" }
      ],
      "failed": [],
      "alreadyLinked": []
    },
    "summary": {
      "total": 2,
      "successful": 2,
      "failed": 0,
      "alreadyLinked": 0
    }
  }
}
```

### 3. Get Media for a Memory Node
```http
GET /nodes/{nodeId}/media
```

**Response:**
```json
{
  "success": true,
  "data": {
    "node": {
      "id": "node_456_def",
      "title": "Summer Vacation 2024",
      "description": "Family trip to the beach",
      "type": "event",
      "metadata": { "location": "Miami" }
    },
    "linkedMedia": [
      {
        "linkId": "link_789_ghi",
        "media": {
          "id": "media_123_abc",
          "originalName": "vacation_photo.jpg",
          "filename": "123_abc.jpg",
          "type": "image",
          "metadata": { /* full metadata */ }
        },
        "relationship": "primary",
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "count": 1
  }
}
```

### 4. Get Memory Nodes for Media
```http
GET /media/{mediaId}/nodes
```

**Response:**
```json
{
  "success": true,
  "data": {
    "media": { /* media details */ },
    "linkedNodes": [
      {
        "linkId": "link_789_ghi",
        "node": {
          "id": "node_456_def",
          "title": "Summer Vacation 2024",
          "type": "event"
        },
        "relationship": "primary",
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "count": 1
  }
}
```

### 5. Unlink Media from Node
```http
DELETE /link/{mediaId}/from/{nodeId}
```

### 6. Bulk Unlink Media
```http
POST /unlink/bulk/from/{nodeId}
Content-Type: application/json

{
  "mediaIds": ["media_123_abc", "media_456_def"]
}
```

## 🎨 Frontend Implementation - Best Practices

### 1. Memory Node View (Recommended)
```jsx
// MemoryNodeDetail.jsx
function MemoryNodeDetail({ nodeId }) {
  const [node, setNode] = useState(null);
  const [linkedMedia, setLinkedMedia] = useState([]);
  
  useEffect(() => {
    // Fetch node details and linked media
    fetch(`/api/multimedia/nodes/${nodeId}/media`)
      .then(res => res.json())
      .then(data => {
        setNode(data.data.node);
        setLinkedMedia(data.data.linkedMedia);
      });
  }, [nodeId]);

  return (
    <div className="memory-node-detail">
      <h1>{node?.title}</h1>
      <p>{node?.description}</p>
      
      {/* Linked Media Section */}
      <div className="linked-media-section">
        <h2>Linked Media ({linkedMedia.length})</h2>
        <div className="media-grid">
          {linkedMedia.map(link => (
            <MediaCard 
              key={link.linkId}
              media={link.media}
              relationship={link.relationship}
              onUnlink={() => unlinkMedia(link.media.id, nodeId)}
            />
          ))}
        </div>
        
        {/* Add Media Button */}
        <AddMediaToNode 
          nodeId={nodeId}
          onMediaAdded={handleMediaAdded}
        />
      </div>
    </div>
  );
}
```

### 2. Media Gallery with Linking Status
```jsx
// MediaGallery.jsx
function MediaGallery() {
  const [media, setMedia] = useState([]);
  
  return (
    <div className="media-gallery">
      {media.map(item => (
        <MediaCard 
          key={item.id}
          media={item}
          showLinkedNodes={true}
          onLinkToNode={handleLinkToNode}
        />
      ))}
    </div>
  );
}

// MediaCard.jsx
function MediaCard({ media, showLinkedNodes, onLinkToNode }) {
  return (
    <div className="media-card">
      <img src={`/api/multimedia/media/${media.id}/download`} alt={media.originalName} />
      
      {/* Linking Status */}
      {showLinkedNodes && (
        <div className="linking-status">
          {media.linkedNodes?.length > 0 ? (
            <div className="linked-badge">
              Linked to {media.linkedNodes.length} memory node(s)
            </div>
          ) : (
            <div className="unlinked-badge">Not linked</div>
          )}
        </div>
      )}
      
      {/* Link to Node Button */}
      <button onClick={() => onLinkToNode(media.id)}>
        Link to Memory Node
      </button>
    </div>
  );
}
```

### 3. Bulk Linking Interface
```jsx
// BulkLinkModal.jsx
function BulkLinkModal({ selectedMedia, onClose }) {
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState('');
  const [relationship, setRelationship] = useState('associated');
  
  const handleBulkLink = async () => {
    const mediaIds = selectedMedia.map(m => m.id);
    
    const response = await fetch(`/api/multimedia/link/bulk/to/${selectedNode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaIds, relationship })
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert(`Successfully linked ${result.data.linked} media files`);
      onClose();
    } else {
      alert('Linking failed');
    }
  };
  
  return (
    <div className="modal">
      <h2>Link {selectedMedia.length} Media Files</h2>
      
      <select value={selectedNode} onChange={(e) => setSelectedNode(e.target.value)}>
        <option value="">Select Memory Node</option>
        {nodes.map(node => (
          <option key={node.id} value={node.id}>{node.title}</option>
        ))}
      </select>
      
      <select value={relationship} onChange={(e) => setRelationship(e.target.value)}>
        <option value="primary">Primary</option>
        <option value="associated">Associated</option>
        <option value="reference">Reference</option>
      </select>
      
      <button onClick={handleBulkLink}>Link Media</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}
```

### 4. Dashboard with Tabs
```jsx
// MultimediaDashboard.jsx
function MultimediaDashboard() {
  const [activeTab, setActiveTab] = useState('media');
  
  return (
    <div className="dashboard">
      <div className="tabs">
        <button 
          className={activeTab === 'media' ? 'active' : ''}
          onClick={() => setActiveTab('media')}
        >
          Media Gallery
        </button>
        <button 
          className={activeTab === 'nodes' ? 'active' : ''}
          onClick={() => setActiveTab('nodes')}
        >
          Memory Nodes
        </button>
        <button 
          className={activeTab === 'links' ? 'active' : ''}
          onClick={() => setActiveTab('links')}
        >
          All Links
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'media' && <MediaGallery />}
        {activeTab === 'nodes' && <MemoryNodesList />}
        {activeTab === 'links' && <LinksOverview />}
      </div>
    </div>
  );
}
```

## 🎯 Recommended UI Structure

### Option 1: Memory-Centric View (Best for Storytelling)
```
┌─────────────────────────────────────┐
│ Memory Node: "Summer Vacation 2024" │
├─────────────────────────────────────┤
│ Description: Family trip to Miami   │
│ Type: Event | Location: Miami       │
├─────────────────────────────────────┤
│ 📸 Linked Media (3)                 │
│ ┌─────┐ ┌─────┐ ┌─────┐            │
│ │ IMG │ │ IMG │ │ VID │            │
│ │ [P] │ │ [A] │ │ [A] │            │
│ └─────┘ └─────┘ └─────┘            │
│ [P]=Primary [A]=Associated          │
├─────────────────────────────────────┤
│ [+ Add More Media] [Edit Node]      │
└─────────────────────────────────────┘
```

### Option 2: Media-Centric View (Best for Browsing)
```
┌─────────────────────────────────────┐
│ Media Gallery                       │
├─────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐            │
│ │ IMG │ │ IMG │ │ VID │            │
│ │     │ │     │ │     │            │
│ │ [🔗]│ │ [❌]│ │ [🔗]│            │
│ └─────┘ └─────┘ └─────┘            │
│ Linked  Not     Linked             │
│ to 2    Linked  to 1               │
│ nodes          node                │
├─────────────────────────────────────┤
│ [Select Multiple] [Bulk Link]       │
└─────────────────────────────────────┘
```

### Option 3: Dashboard View (Best for Management)
```
┌─────────────────────────────────────┐
│ [Media] [Nodes] [Links] [Search]    │
├─────────────────────────────────────┤
│ 📊 Overview                         │
│ • Total Media: 45                   │
│ • Memory Nodes: 12                  │
│ • Linked Media: 38                  │
│ • Unlinked Media: 7                 │
├─────────────────────────────────────┤
│ 🔗 Recent Links                     │
│ • 3 media → "Beach Trip" (2h ago)  │
│ • 1 media → "Birthday Party" (1d)  │
│ • 5 media → "Wedding" (3d ago)     │
└─────────────────────────────────────┘
```

## 🔧 Helper Functions

### JavaScript/TypeScript Utilities:
```javascript
// API Helper Functions
export const multimediaAPI = {
  // Link single media to node
  async linkMedia(mediaId, nodeId, relationship = 'associated') {
    const response = await fetch(`/api/multimedia/link/${mediaId}/to/${nodeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relationship })
    });
    return response.json();
  },

  // Bulk link multiple media
  async bulkLinkMedia(mediaIds, nodeId, relationship = 'associated') {
    const response = await fetch(`/api/multimedia/link/bulk/to/${nodeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaIds, relationship })
    });
    return response.json();
  },

  // Get media for a memory node
  async getMediaForNode(nodeId) {
    const response = await fetch(`/api/multimedia/nodes/${nodeId}/media`);
    return response.json();
  },

  // Get memory nodes for media
  async getNodesForMedia(mediaId) {
    const response = await fetch(`/api/multimedia/media/${mediaId}/nodes`);
    return response.json();
  },

  // Unlink media from node
  async unlinkMedia(mediaId, nodeId) {
    const response = await fetch(`/api/multimedia/link/${mediaId}/from/${nodeId}`, {
      method: 'DELETE'
    });
    return response.json();
  }
};

// Utility Functions
export const linkingUtils = {
  // Get relationship badge color
  getRelationshipColor(relationship) {
    const colors = {
      primary: '#4CAF50',    // Green
      associated: '#2196F3', // Blue
      reference: '#FF9800'   // Orange
    };
    return colors[relationship] || '#9E9E9E';
  },

  // Format relationship text
  formatRelationship(relationship) {
    return relationship.charAt(0).toUpperCase() + relationship.slice(1);
  },

  // Check if media is linked
  isMediaLinked(media) {
    return media.linkedNodes && media.linkedNodes.length > 0;
  },

  // Get media download URL
  getMediaUrl(mediaId) {
    return `/api/multimedia/media/${mediaId}/download`;
  }
};
```

## 🎨 CSS Styling Examples

```css
/* Media Card with Linking Status */
.media-card {
  position: relative;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.media-card:hover {
  border-color: #2196F3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.linking-status {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.linked-badge {
  background: #4CAF50;
  color: white;
}

.unlinked-badge {
  background: #f44336;
  color: white;
}

/* Relationship Indicators */
.relationship-indicator {
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  color: white;
}

.relationship-primary { background: #4CAF50; }
.relationship-associated { background: #2196F3; }
.relationship-reference { background: #FF9800; }

/* Bulk Selection */
.media-card.selected {
  border-color: #FF9800;
  background: rgba(255, 152, 0, 0.1);
}

.selection-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 20px;
  height: 20px;
}
```

## 🚀 Getting Started

1. **Start the backend server** (if not already running):
   ```bash
   nodemon server.js
   ```

2. **Test the linking endpoints**:
   ```bash
   # Get all media
   curl http://localhost:3000/api/multimedia/media
   
   # Get all memory nodes
   curl http://localhost:3000/api/multimedia/nodes
   
   # Link media to node (replace IDs with actual ones)
   curl -X POST http://localhost:3000/api/multimedia/link/MEDIA_ID/to/NODE_ID \
        -H "Content-Type: application/json" \
        -d '{"relationship": "primary"}'
   ```

3. **Build your frontend** using the examples above

4. **Test the complete flow**:
   - Upload some media files
   - Create memory nodes
   - Link media to nodes
   - View linked media in different ways

---

This linking system provides a powerful way to organize and retrieve your multimedia content based on context and relationships. The API is flexible and the frontend can be implemented in many different ways depending on your specific needs.
