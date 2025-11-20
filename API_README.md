# Multimedia Management API - Complete Documentation

## 🎯 Overview

A comprehensive multimedia management system with advanced linking, analytics, and dedicated management pages. This API provides everything needed to build a professional multimedia management interface.

## 🚀 Base URL
```
http://localhost:3000/api/multimedia
```

---

## 📸 **1. MEDIA MANAGEMENT APIs**

### **Upload Media**
```http
POST /upload/single
Content-Type: multipart/form-data

FormData: { media: File }
```

```http
POST /upload/multiple
Content-Type: multipart/form-data

FormData: { media: File[] }
```

**Response:**
```json
{
  "success": true,
  "message": "Media uploaded successfully",
  "data": {
    "mediaId": "media_123_abc",
    "filename": "123_abc.jpg",
    "originalName": "vacation_photo.jpg",
    "type": "image",
    "downloadUrl": "/api/multimedia/media/media_123_abc/download",
    "metadata": {
      "fileSize": 1024000,
      "width": 1920,
      "height": 1080,
      "dateTaken": "2025-01-01T00:00:00Z",
      "device": "iPhone 15 Pro",
      "location": "Miami Beach",
      "tags": ["2025", "01", "01"]
    }
  }
}
```

### **Get All Media**
```http
GET /media?page=1&limit=20&type=image&sortBy=dateTaken&order=desc
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `type`: Filter by type (`image`, `video`)
- `sortBy`: Sort field (`dateTaken`, `createdAt`, `fileSize`, `originalName`)
- `order`: Sort order (`asc`, `desc`)

**Response:**
```json
{
  "success": true,
  "data": {
    "media": [
      {
        "id": "media_123_abc",
        "originalName": "vacation_photo.jpg",
        "filename": "123_abc.jpg",
        "type": "image",
        "mimeType": "image/jpeg",
        "metadata": { /* full metadata */ },
        "linkedNodes": [
          {
            "nodeId": "node_456_def",
            "title": "Summer Vacation 2024",
            "relationship": "primary"
          }
        ],
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100,
      "itemsPerPage": 20
    }
  }
}
```

### **Get Media Details**
```http
GET /media/{mediaId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "media": { /* full media object */ },
    "linkedNodes": [
      {
        "linkId": "link_789_ghi",
        "node": {
          "id": "node_456_def",
          "title": "Summer Vacation 2024",
          "type": "event",
          "description": "Family trip to Miami"
        },
        "relationship": "primary",
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "analytics": {
      "viewCount": 15,
      "lastViewed": "2025-01-15T10:30:00Z",
      "downloadCount": 3,
      "lastDownloaded": "2025-01-14T16:45:00Z"
    }
  }
}
```

### **Update Media**
```http
PUT /media/{mediaId}
Content-Type: application/json

{
  "metadata": {
    "tags": ["vacation", "beach", "family"],
    "description": "Beautiful sunset at Miami Beach"
  }
}
```

### **Delete Media**
```http
DELETE /media/{mediaId}
```

### **Download Media**
```http
GET /media/{mediaId}/download
```

---

## 🧠 **2. MEMORY NODES MANAGEMENT APIs**

### **Create Memory Node**
```http
POST /nodes
Content-Type: application/json

{
  "title": "Summer Vacation 2024",
  "description": "Family trip to Miami Beach",
  "type": "event",
  "metadata": {
    "location": "Miami, Florida",
    "startDate": "2024-07-15",
    "endDate": "2024-07-22",
    "participants": ["John", "Jane", "Kids"],
    "tags": ["vacation", "family", "beach"]
  }
}
```

### **Get All Memory Nodes**
```http
GET /nodes?page=1&limit=20&type=event&sortBy=createdAt&order=desc
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "node_456_def",
        "title": "Summer Vacation 2024",
        "description": "Family trip to Miami Beach",
        "type": "event",
        "metadata": { /* node metadata */ },
        "linkedMedia": [
          {
            "mediaId": "media_123_abc",
            "filename": "123_abc.jpg",
            "type": "image",
            "relationship": "primary"
          }
        ],
        "stats": {
          "totalMedia": 15,
          "images": 12,
          "videos": 3,
          "lastActivity": "2025-01-15T10:30:00Z"
        },
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": { /* pagination info */ }
  }
}
```

### **Get Memory Node Details**
```http
GET /nodes/{nodeId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "node": { /* full node object */ },
    "linkedMedia": [
      {
        "linkId": "link_789_ghi",
        "media": { /* full media object */ },
        "relationship": "primary",
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "analytics": {
      "totalViews": 45,
      "totalDownloads": 8,
      "lastAccessed": "2025-01-15T10:30:00Z",
      "mediaTypes": {
        "images": 12,
        "videos": 3
      }
    }
  }
}
```

### **Update Memory Node**
```http
PUT /nodes/{nodeId}
Content-Type: application/json

{
  "title": "Updated Vacation Title",
  "description": "Updated description",
  "metadata": {
    "location": "Updated location",
    "participants": ["John", "Jane"]
  }
}
```

### **Delete Memory Node**
```http
DELETE /nodes/{nodeId}
```

---

## 🔗 **3. LINKING MANAGEMENT APIs**

### **Link Single Media to Node**
```http
POST /link/{mediaId}/to/{nodeId}
Content-Type: application/json

{
  "relationship": "primary"
}
```

### **Bulk Link Media to Node**
```http
POST /link/bulk/to/{nodeId}
Content-Type: application/json

{
  "mediaIds": ["media_123_abc", "media_456_def"],
  "relationship": "associated"
}
```

### **Unlink Media from Node**
```http
DELETE /link/{mediaId}/from/{nodeId}
```

### **Bulk Unlink Media**
```http
POST /unlink/bulk/from/{nodeId}
Content-Type: application/json

{
  "mediaIds": ["media_123_abc", "media_456_def"]
}
```

### **Get Media for Memory Node**
```http
GET /nodes/{nodeId}/media?relationship=primary&page=1&limit=20
```

### **Get Memory Nodes for Media**
```http
GET /media/{mediaId}/nodes?relationship=associated
```

---

## 📊 **4. ANALYTICS & INSIGHTS APIs**

### **Dashboard Analytics**
```http
GET /analytics/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalMedia": 1250,
      "totalNodes": 45,
      "totalLinks": 2100,
      "storageUsed": "2.5 GB",
      "lastActivity": "2025-01-15T10:30:00Z"
    },
    "mediaStats": {
      "images": 980,
      "videos": 270,
      "unlinkedMedia": 150,
      "linkedMedia": 1100
    },
    "nodeStats": {
      "events": 25,
      "people": 15,
      "timeline": 5,
      "nodesWithMedia": 40,
      "emptyNodes": 5
    },
    "recentActivity": [
      {
        "type": "media_uploaded",
        "mediaId": "media_123_abc",
        "filename": "new_photo.jpg",
        "timestamp": "2025-01-15T10:30:00Z"
      },
      {
        "type": "media_linked",
        "mediaId": "media_456_def",
        "nodeId": "node_789_ghi",
        "nodeTitle": "Beach Trip",
        "timestamp": "2025-01-15T09:15:00Z"
      }
    ],
    "topNodes": [
      {
        "nodeId": "node_123_abc",
        "title": "Wedding 2024",
        "mediaCount": 45,
        "views": 120
      }
    ]
  }
}
```

### **Media Analytics**
```http
GET /analytics/media?period=30d&type=image
```

**Query Parameters:**
- `period`: `7d`, `30d`, `90d`, `1y`
- `type`: `image`, `video`, `all`

**Response:**
```json
{
  "success": true,
  "data": {
    "uploads": {
      "total": 45,
      "byDay": [
        { "date": "2025-01-15", "count": 5 },
        { "date": "2025-01-14", "count": 3 }
      ]
    },
    "linking": {
      "linked": 40,
      "unlinked": 5,
      "linkRate": 88.9
    },
    "popularMedia": [
      {
        "mediaId": "media_123_abc",
        "filename": "popular_photo.jpg",
        "views": 25,
        "downloads": 8
      }
    ]
  }
}
```

### **Node Analytics**
```http
GET /analytics/nodes?period=30d
```

**Response:**
```json
{
  "success": true,
  "data": {
    "creation": {
      "total": 8,
      "byType": {
        "event": 5,
        "person": 2,
        "timeline": 1
      }
    },
    "activity": {
      "mostActive": [
        {
          "nodeId": "node_123_abc",
          "title": "Wedding 2024",
          "views": 45,
          "mediaAdded": 3
        }
      ]
    }
  }
}
```

---

## 🔍 **5. SEARCH & DISCOVERY APIs**

### **Search Media**
```http
GET /search/media?q=beach&type=image&dateFrom=2024-01-01&dateTo=2024-12-31&device=iPhone&location=Miami&tags=vacation,family&page=1&limit=20
```

**Query Parameters:**
- `q`: Search query
- `type`: Media type filter
- `dateFrom`: Start date
- `dateTo`: End date
- `device`: Device filter
- `location`: Location filter
- `tags`: Comma-separated tags
- `page`, `limit`: Pagination

### **Search Memory Nodes**
```http
GET /search/nodes?q=wedding&type=event&location=Miami&participants=John&page=1&limit=20
```

### **Advanced Search**
```http
POST /search/advanced
Content-Type: application/json

{
  "media": {
    "type": "image",
    "dateRange": {
      "from": "2024-01-01",
      "to": "2024-12-31"
    },
    "metadata": {
      "device": "iPhone",
      "location": "Miami"
    },
    "tags": ["vacation", "beach"]
  },
  "nodes": {
    "type": "event",
    "metadata": {
      "location": "Miami",
      "participants": ["John"]
    }
  },
  "linking": {
    "relationship": "primary",
    "linkedOnly": true
  }
}
```

---

## 🎯 **6. DEDICATED MANAGEMENT PAGES APIs**

### **Media Management Page**
```http
GET /management/media?view=grid&filter=unlinked&sortBy=dateTaken&order=desc&page=1&limit=50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "media": [ /* media array with full details */ ],
    "filters": {
      "types": ["image", "video"],
      "statuses": ["linked", "unlinked"],
      "dateRanges": ["today", "week", "month", "year"],
      "devices": ["iPhone", "Samsung", "Canon"],
      "locations": ["Miami", "New York", "Paris"]
    },
    "bulkActions": [
      "link_to_node",
      "delete",
      "export_metadata",
      "add_tags"
    ],
    "pagination": { /* pagination info */ }
  }
}
```

### **Memory Node Management Page**
```http
GET /management/nodes?view=list&filter=with_media&sortBy=mediaCount&order=desc&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nodes": [ /* nodes array with media counts */ ],
    "filters": {
      "types": ["event", "person", "timeline"],
      "statuses": ["with_media", "empty"],
      "dateRanges": ["today", "week", "month", "year"]
    },
    "bulkActions": [
      "delete",
      "merge",
      "export",
      "add_media"
    ],
    "pagination": { /* pagination info */ }
  }
}
```

### **Linking Management Page**
```http
GET /management/links?view=table&filter=recent&sortBy=createdAt&order=desc&page=1&limit=50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "links": [
      {
        "linkId": "link_123_abc",
        "media": {
          "id": "media_123_abc",
          "filename": "photo.jpg",
          "type": "image",
          "thumbnail": "/api/multimedia/media/media_123_abc/thumbnail"
        },
        "node": {
          "id": "node_456_def",
          "title": "Beach Trip",
          "type": "event"
        },
        "relationship": "primary",
        "createdAt": "2025-01-15T10:30:00Z",
        "actions": ["unlink", "change_relationship", "view_details"]
      }
    ],
    "filters": {
      "relationships": ["primary", "associated", "reference"],
      "dateRanges": ["today", "week", "month", "year"],
      "nodeTypes": ["event", "person", "timeline"]
    },
    "bulkActions": [
      "unlink",
      "change_relationship",
      "export_links"
    ],
    "pagination": { /* pagination info */ }
  }
}
```

---

## 🎨 **7. FRONTEND INTEGRATION APIs**

### **Get Thumbnails**
```http
GET /media/{mediaId}/thumbnail?size=small|medium|large
```

### **Get Media Preview**
```http
GET /media/{mediaId}/preview?width=800&height=600&quality=80
```

### **Bulk Operations**
```http
POST /bulk/media
Content-Type: application/json

{
  "action": "link_to_node",
  "mediaIds": ["media_123_abc", "media_456_def"],
  "params": {
    "nodeId": "node_789_ghi",
    "relationship": "associated"
  }
}
```

**Available Actions:**
- `link_to_node`
- `unlink_from_node`
- `delete`
- `add_tags`
- `remove_tags`
- `export_metadata`

### **Get Available Actions**
```http
GET /bulk/actions?type=media&selectedCount=5
```

---

## 🔧 **8. UTILITY APIs**

### **Health Check**
```http
GET /health
```

### **System Status**
```http
GET /status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": "2d 5h 30m",
    "database": "connected",
    "storage": {
      "total": "10 GB",
      "used": "2.5 GB",
      "available": "7.5 GB"
    },
    "services": {
      "upload": "active",
      "metadata": "active",
      "linking": "active",
      "analytics": "active"
    }
  }
}
```

### **Export Data**
```http
GET /export/media?format=json|csv&includeMetadata=true&dateFrom=2024-01-01
```

### **Import Data**
```http
POST /import/media
Content-Type: multipart/form-data

FormData: { file: File, format: "json" }
```

---

## 🎯 **9. DEDICATED PAGE STRUCTURES**

### **Media Detail Page**
```
GET /media/{mediaId}/page
```
**Returns complete page data:**
- Media details with full metadata
- Linked memory nodes with navigation
- Analytics (views, downloads)
- Related media suggestions
- Action buttons (edit, delete, link, unlink)

### **Memory Node Detail Page**
```
GET /nodes/{nodeId}/page
```
**Returns complete page data:**
- Node details with full metadata
- Linked media gallery with thumbnails
- Media management tools
- Analytics (views, activity)
- Action buttons (edit, delete, add media)

### **Linking Management Page**
```
GET /links/page
```
**Returns complete page data:**
- All links with media/node previews
- Filter and search tools
- Bulk action controls
- Link analytics
- Quick navigation to linked items

---

## 🚀 **10. FRONTEND IMPLEMENTATION EXAMPLES**

### **Media Management Component**
```jsx
function MediaManagement() {
  const [media, setMedia] = useState([]);
  const [filters, setFilters] = useState({});
  const [selectedMedia, setSelectedMedia] = useState([]);
  
  // Fetch media with filters
  useEffect(() => {
    fetch(`/api/multimedia/management/media?${buildQueryString(filters)}`)
      .then(res => res.json())
      .then(data => setMedia(data.data.media));
  }, [filters]);
  
  // Bulk link to node
  const handleBulkLink = async (nodeId) => {
    const response = await fetch('/api/multimedia/bulk/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'link_to_node',
        mediaIds: selectedMedia,
        params: { nodeId, relationship: 'associated' }
      })
    });
    
    if (response.ok) {
      // Refresh data
      setSelectedMedia([]);
    }
  };
  
  return (
    <div className="media-management">
      <MediaFilters filters={filters} onChange={setFilters} />
      <MediaGrid 
        media={media} 
        selected={selectedMedia}
        onSelectionChange={setSelectedMedia}
        onMediaClick={(media) => navigate(`/media/${media.id}`)}
      />
      <BulkActions 
        selectedCount={selectedMedia.length}
        onBulkLink={handleBulkLink}
      />
    </div>
  );
}
```

### **Memory Node Detail Component**
```jsx
function MemoryNodeDetail({ nodeId }) {
  const [node, setNode] = useState(null);
  const [linkedMedia, setLinkedMedia] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  
  useEffect(() => {
    // Fetch complete page data
    fetch(`/api/multimedia/nodes/${nodeId}/page`)
      .then(res => res.json())
      .then(data => {
        setNode(data.data.node);
        setLinkedMedia(data.data.linkedMedia);
        setAnalytics(data.data.analytics);
      });
  }, [nodeId]);
  
  return (
    <div className="node-detail">
      <NodeHeader node={node} analytics={analytics} />
      <LinkedMediaGallery 
        media={linkedMedia}
        onMediaClick={(media) => navigate(`/media/${media.id}`)}
        onUnlink={(mediaId) => handleUnlink(mediaId)}
      />
      <NodeActions node={node} />
    </div>
  );
}
```

---

## 📱 **11. RESPONSIVE DESIGN CONSIDERATIONS**

### **Mobile APIs**
```http
GET /mobile/media?limit=20&thumbnail=true
GET /mobile/nodes?limit=10&preview=true
```

### **Touch-Friendly Actions**
```http
POST /touch/media/{mediaId}/quick-link
POST /touch/nodes/{nodeId}/quick-add-media
```

---

## 🔐 **12. SECURITY & PERMISSIONS**

### **Authentication**
```http
GET /auth/status
POST /auth/login
POST /auth/logout
```

### **Permissions**
```http
GET /permissions/media/{mediaId}
GET /permissions/nodes/{nodeId}
```

---

## 📊 **13. PERFORMANCE OPTIMIZATION**

### **Caching Headers**
All GET requests include proper caching headers:
- `Cache-Control: public, max-age=300` (5 minutes)
- `ETag` for conditional requests
- `Last-Modified` for cache validation

### **Pagination**
All list endpoints support pagination:
- `page`: Page number (1-based)
- `limit`: Items per page (max 100)
- `totalPages`: Total number of pages
- `hasNext`: Whether more pages exist

### **Lazy Loading**
```http
GET /media/{mediaId}/metadata?lazy=true
GET /nodes/{nodeId}/media?lazy=true&limit=10
```

---

This comprehensive API provides everything needed to build a professional multimedia management system with dedicated pages, analytics, and advanced linking capabilities. Each endpoint is designed to support rich frontend experiences with proper data structures and navigation support.
