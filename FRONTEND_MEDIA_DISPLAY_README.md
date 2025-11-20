# Frontend Media Display & Metadata Guide

## 🎯 **Overview**

This guide shows how to display media files (images, videos, audio) with their metadata in the frontend, including geotag, device info, and camera settings.

---

## 📱 **Media Types Supported**

### **Images** ✅ **FULL SUPPORT**
- ✅ JPEG/JPG (with full EXIF support)
- ✅ PNG (limited EXIF support)
- ✅ TIFF (with EXIF support)
- ✅ WebP (with EXIF support)

**Metadata Extracted:**
- Device info (Make, Model)
- GPS coordinates
- Camera settings (fNumber, ISO, exposure time, focal length)
- File dimensions, format, color space
- Date taken, created, modified

### **Videos** ✅ **ENHANCED SUPPORT**
- ✅ MP4 (full metadata with ffmpeg)
- ✅ AVI (full metadata with ffmpeg)
- ✅ MOV (full metadata with ffmpeg)
- ✅ WMV (full metadata with ffmpeg)
- ✅ MKV (full metadata with ffmpeg)
- ✅ WebM (full metadata with ffmpeg)
- ✅ FLV (full metadata with ffmpeg)

**Metadata Extracted:**
- Duration, resolution, codec, bitrate
- Frame rate (fps)
- Audio codec, channels, bitrate
- Title, artist, album, year (if available)

### **Audio** ✅ **FULL SUPPORT**
- ✅ MP3 (ID3 tags + technical metadata)
- ✅ WAV (technical metadata)
- ✅ AAC (technical metadata)
- ✅ FLAC (technical metadata)
- ✅ OGG (technical metadata)
- ✅ M4A (technical metadata)
- ✅ WMA (technical metadata)

**Metadata Extracted:**
- Duration, bitrate, sample rate, channels
- Codec information
- ID3 tags: title, artist, album, year, genre
- Track and disc numbers

---

## 🔧 **Backend Metadata Extraction**

### **✅ What's Working (Backend Already Supports):**

#### **Image Metadata (EXIF):**
```json
{
  "device": "iPhone 15 Pro",
  "gps": {
    "latitude": 25.7617,
    "longitude": -80.1918,
    "altitude": 2.5
  },
  "cameraSettings": {
    "make": "Apple",
    "model": "iPhone 15 Pro",
    "fNumber": 1.78,
    "iso": 100,
    "exposureTime": "1/120",
    "focalLength": "26"
  }
}
```

#### **Video Metadata (FFmpeg):**
```json
{
  "videoMetadata": {
    "duration": 120.5,
    "resolution": "1920x1080",
    "codec": "h264",
    "bitrate": 5000000,
    "fps": "30.00",
    "audioCodec": "aac",
    "audioChannels": 2,
    "audioBitrate": 128000,
    "title": "My Video",
    "artist": "John Doe",
    "album": "Vacation 2024"
  }
}
```

#### **Audio Metadata (FFmpeg):**
```json
{
  "audioMetadata": {
    "duration": 240.0,
    "bitrate": 320000,
    "sampleRate": 44100,
    "channels": 2,
    "codec": "mp3",
    "title": "My Song",
    "artist": "Artist Name",
    "album": "Album Name",
    "year": "2024",
    "genre": "Pop",
    "track": "1",
    "disc": "1"
  }
}
```

### **🎯 Current API Response Structure:**

```json
{
  "success": true,
  "data": {
    "media": [
      {
        "id": "media_123_abc",
        "originalName": "vacation_photo.jpg",
        "type": "image",
        "metadata": {
          "fileSize": 1024000,
          "width": 1920,
          "height": 1080,
          "device": "iPhone 15 Pro",
          "gps": {
            "latitude": 25.7617,
            "longitude": -80.1918
          },
          "cameraSettings": {
            "make": "Apple",
            "model": "iPhone 15 Pro",
            "fNumber": 1.78,
            "iso": 100
          },
          "videoMetadata": null,  // Only for videos
          "audioMetadata": null,  // Only for audio
          "tags": ["2024", "01", "15", "iphone", "gps", "geotagged"]
        }
      }
    ]
  }
}
```

### **📊 Enhanced Tag Generation:**

The backend now generates comprehensive tags from all metadata:

- **Device tags**: "iphone", "canon", "samsung"
- **GPS tags**: "gps", "geotagged"
- **Video tags**: "h264", "1920x1080", "video"
- **Audio tags**: "mp3", "pop", "audio"
- **Date tags**: "2024", "01", "15"
- **Custom tags**: From title, artist, album, etc.

---

## 🎨 **Frontend Components**

### **1. MediaCard Component**

```jsx
import React from 'react';
import { 
  Image, Video, Music, Camera, MapPin, Calendar, 
  Clock, Settings, ExternalLink, Download, Eye,
  Smartphone, Monitor, Tablet, Globe, Tag
} from 'lucide-react';

interface MediaCardProps {
  media: MediaFile;
  onSelect?: (media: MediaFile) => void;
  onDownload?: (media: MediaFile) => void;
  showMetadata?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const MediaCard: React.FC<MediaCardProps> = ({
  media,
  onSelect,
  onDownload,
  showMetadata = true,
  size = 'medium'
}) => {
  const getMediaIcon = () => {
    switch (media.type) {
      case 'image': return <Image className="h-6 w-6" />;
      case 'video': return <Video className="h-6 w-6" />;
      case 'audio': return <Music className="h-6 w-6" />;
      default: return <File className="h-6 w-6" />;
    }
  };

  const getDeviceIcon = (device: string) => {
    if (device?.toLowerCase().includes('iphone') || device?.toLowerCase().includes('android')) {
      return <Smartphone className="h-4 w-4" />;
    } else if (device?.toLowerCase().includes('ipad') || device?.toLowerCase().includes('tablet')) {
      return <Tablet className="h-4 w-4" />;
    } else {
      return <Monitor className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGoogleMapsUrl = (lat: number, lng: number) => {
    return `https://maps.google.com/?q=${lat},${lng}`;
  };

  return (
    <div className={`media-card bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg ${
      size === 'small' ? 'max-w-xs' : size === 'large' ? 'max-w-md' : 'max-w-sm'
    }`}>
      {/* Media Preview */}
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
        {media.type === 'image' ? (
          <img
            src={getMediaUrl(media.id)}
            alt={media.originalName}
            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
            onClick={() => onSelect?.(media)}
          />
        ) : media.type === 'video' ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <video
              src={getMediaUrl(media.id)}
              className="w-full h-full object-cover"
              controls
              preload="metadata"
            />
          </div>
        ) : media.type === 'audio' ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
            <div className="text-center text-white">
              <Music className="h-12 w-12 mx-auto mb-2" />
              <p className="text-sm font-medium">{media.originalName}</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-600">
            {getMediaIcon()}
          </div>
        )}

        {/* Media Type Badge */}
        <div className="absolute top-2 left-2">
          <div className="flex items-center space-x-1 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs">
            {getMediaIcon()}
            <span className="capitalize">{media.type}</span>
          </div>
        </div>

        {/* GPS Badge */}
        {media.metadata?.gps && (
          <div className="absolute top-2 right-2">
            <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
              <MapPin className="h-3 w-3" />
              <span>GPS</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="absolute bottom-2 right-2 flex space-x-1">
          <button
            onClick={() => onSelect?.(media)}
            className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDownload?.(media)}
            className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Media Info */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 dark:text-white truncate mb-2">
          {media.originalName}
        </h3>

        {/* Basic Info */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
          <span>{formatFileSize(media.metadata?.fileSize || 0)}</span>
          <span>{formatDate(media.createdAt)}</span>
        </div>

        {/* Metadata (if enabled) */}
        {showMetadata && (
          <div className="space-y-2">
            {/* Device Information */}
            {media.metadata?.device && (
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                {getDeviceIcon(media.metadata.device)}
                <span className="truncate">{media.metadata.device}</span>
              </div>
            )}

            {/* GPS Location */}
            {media.metadata?.gps && (
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="h-4 w-4 text-green-600" />
                <span className="truncate">
                  {media.metadata.gps.latitude.toFixed(4)}, {media.metadata.gps.longitude.toFixed(4)}
                </span>
                <a
                  href={getGoogleMapsUrl(media.metadata.gps.latitude, media.metadata.gps.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {/* Date Taken */}
            {media.metadata?.dateTaken && (
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="h-4 w-4" />
                <span>Taken: {formatDate(media.metadata.dateTaken)}</span>
              </div>
            )}

            {/* Camera Settings (for images) */}
            {media.type === 'image' && media.metadata?.cameraSettings && (
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                {media.metadata.cameraSettings.fNumber && (
                  <div className="flex items-center space-x-1">
                    <Settings className="h-3 w-3" />
                    <span>f/{media.metadata.cameraSettings.fNumber}</span>
                  </div>
                )}
                {media.metadata.cameraSettings.iso && (
                  <div className="flex items-center space-x-1">
                    <span>ISO {media.metadata.cameraSettings.iso}</span>
                  </div>
                )}
                {media.metadata.cameraSettings.exposureTime && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{media.metadata.cameraSettings.exposureTime}s</span>
                  </div>
                )}
                {media.metadata.cameraSettings.focalLength && (
                  <div className="flex items-center space-x-1">
                    <span>{media.metadata.cameraSettings.focalLength}mm</span>
                  </div>
                )}
              </div>
            )}

            {/* Video/Audio specific metadata */}
            {media.type === 'video' && media.metadata?.videoMetadata && (
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                {media.metadata.videoMetadata.duration && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{media.metadata.videoMetadata.duration}</span>
                  </div>
                )}
                {media.metadata.videoMetadata.resolution && (
                  <div className="flex items-center space-x-1">
                    <Monitor className="h-3 w-3" />
                    <span>{media.metadata.videoMetadata.resolution}</span>
                  </div>
                )}
              </div>
            )}

            {media.type === 'audio' && media.metadata?.audioMetadata && (
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                {media.metadata.audioMetadata.duration && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{media.metadata.audioMetadata.duration}</span>
                  </div>
                )}
                {media.metadata.audioMetadata.bitrate && (
                  <div className="flex items-center space-x-1">
                    <span>{media.metadata.audioMetadata.bitrate} kbps</span>
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            {media.metadata?.tags && media.metadata.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {media.metadata.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </span>
                ))}
                {media.metadata.tags.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{media.metadata.tags.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaCard;
```

### **2. MediaDetailModal Component**

```jsx
import React from 'react';
import { X, Download, Share, MapPin, ExternalLink } from 'lucide-react';

interface MediaDetailModalProps {
  media: MediaFile | null;
  isOpen: boolean;
  onClose: () => void;
}

const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  media,
  isOpen,
  onClose
}) => {
  if (!isOpen || !media) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {media.originalName}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {/* Share logic */}}
              className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Share className="h-5 w-5" />
            </button>
            <button
              onClick={() => {/* Download logic */}}
              className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row h-[calc(90vh-120px)]">
          {/* Media Display */}
          <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            {media.type === 'image' ? (
              <img
                src={getMediaUrl(media.id)}
                alt={media.originalName}
                className="max-w-full max-h-full object-contain"
              />
            ) : media.type === 'video' ? (
              <video
                src={getMediaUrl(media.id)}
                controls
                className="max-w-full max-h-full"
              />
            ) : media.type === 'audio' ? (
              <div className="text-center">
                <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Music className="h-16 w-16 text-white" />
                </div>
                <audio
                  src={getMediaUrl(media.id)}
                  controls
                  className="w-full max-w-md"
                />
              </div>
            ) : null}
          </div>

          {/* Metadata Panel */}
          <div className="w-full lg:w-80 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  File Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Type:</span>
                    <span className="capitalize">{media.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Size:</span>
                    <span>{formatFileSize(media.metadata?.fileSize || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Format:</span>
                    <span>{media.metadata?.format || media.mimeType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Created:</span>
                    <span>{formatDate(media.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Device Information */}
              {media.metadata?.device && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Device Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Device:</span>
                      <span>{media.metadata.device}</span>
                    </div>
                    {media.metadata.cameraSettings?.make && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Make:</span>
                        <span>{media.metadata.cameraSettings.make}</span>
                      </div>
                    )}
                    {media.metadata.cameraSettings?.model && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Model:</span>
                        <span>{media.metadata.cameraSettings.model}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* GPS Information */}
              {media.metadata?.gps && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Location Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Latitude:</span>
                      <span>{media.metadata.gps.latitude.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Longitude:</span>
                      <span>{media.metadata.gps.longitude.toFixed(6)}</span>
                    </div>
                    {media.metadata.gps.altitude && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Altitude:</span>
                        <span>{media.metadata.gps.altitude}m</span>
                      </div>
                    )}
                    <a
                      href={getGoogleMapsUrl(media.metadata.gps.latitude, media.metadata.gps.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <MapPin className="h-4 w-4" />
                      <span>View on Google Maps</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Camera Settings */}
              {media.type === 'image' && media.metadata?.cameraSettings && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Camera Settings
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {media.metadata.cameraSettings.fNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Aperture:</span>
                        <span>f/{media.metadata.cameraSettings.fNumber}</span>
                      </div>
                    )}
                    {media.metadata.cameraSettings.iso && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">ISO:</span>
                        <span>{media.metadata.cameraSettings.iso}</span>
                      </div>
                    )}
                    {media.metadata.cameraSettings.exposureTime && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Shutter:</span>
                        <span>{media.metadata.cameraSettings.exposureTime}s</span>
                      </div>
                    )}
                    {media.metadata.cameraSettings.focalLength && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Focal Length:</span>
                        <span>{media.metadata.cameraSettings.focalLength}mm</span>
                      </div>
                    )}
                    {media.metadata.cameraSettings.lens && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Lens:</span>
                        <span>{media.metadata.cameraSettings.lens}</span>
                      </div>
                    )}
                    {media.metadata.cameraSettings.flash && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Flash:</span>
                        <span>{media.metadata.cameraSettings.flash}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {media.metadata?.tags && media.metadata.tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {media.metadata.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaDetailModal;
```

### **3. MediaGallery Component**

```jsx
import React, { useState, useEffect } from 'react';
import { Grid3X3, List, Filter, Search } from 'lucide-react';
import MediaCard from './MediaCard';
import MediaDetailModal from './MediaDetailModal';
import { getAllMedia, MediaFile } from '../services/multimediaApi';

const MediaGallery: React.FC = () => {
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'audio'>('all');

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const response = await getAllMedia();
      setMedia(response.data.media || []);
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMedia = media.filter(item => {
    const matchesSearch = item.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.metadata?.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
          </select>
        </div>

        {/* View Mode */}
        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-800 shadow-sm' : ''}`}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 shadow-sm' : ''}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Media Grid/List */}
      {filteredMedia.length > 0 ? (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        }>
          {filteredMedia.map((item) => (
            <MediaCard
              key={item.id}
              media={item}
              onSelect={setSelectedMedia}
              onDownload={(media) => {
                // Download logic
                window.open(getMediaUrl(media.id), '_blank');
              }}
              showMetadata={true}
              size={viewMode === 'list' ? 'large' : 'medium'}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            {searchQuery || filterType !== 'all' ? (
              <Filter className="h-16 w-16 mx-auto" />
            ) : (
              <Grid3X3 className="h-16 w-16 mx-auto" />
            )}
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery || filterType !== 'all' ? 'No media found' : 'No media uploaded'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || filterType !== 'all' 
              ? 'Try adjusting your search or filters.'
              : 'Upload some media files to get started.'}
          </p>
        </div>
      )}

      {/* Detail Modal */}
      <MediaDetailModal
        media={selectedMedia}
        isOpen={!!selectedMedia}
        onClose={() => setSelectedMedia(null)}
      />
    </div>
  );
};

export default MediaGallery;
```

---

## 🎯 **Backend API Support**

### **Current Backend Support:**

✅ **Images**: Full EXIF metadata extraction
✅ **Videos**: Basic file metadata
✅ **Audio**: Basic file metadata

### **✅ Backend Already Enhanced!**

The backend has been enhanced with full video and audio metadata extraction:

#### **✅ Video Metadata (Already Implemented):**
- Duration, resolution, codec, bitrate
- Frame rate (fps)
- Audio codec, channels, bitrate
- Title, artist, album, year (if available)

#### **✅ Audio Metadata (Already Implemented):**
- Duration, bitrate, sample rate, channels
- Codec information
- ID3 tags: title, artist, album, year, genre
- Track and disc numbers

#### **✅ Enhanced Features:**
- **FFmpeg Integration**: Uses fluent-ffmpeg for video/audio analysis
- **Comprehensive Tags**: Auto-generates tags from all metadata
- **Error Handling**: Graceful fallback when metadata extraction fails
- **Multiple Formats**: Supports 7 video formats and 7 audio formats

---

## 🚀 **Implementation Steps**

### **1. Install Dependencies**
```bash
npm install lucide-react
```

### **2. Create Components**
- Copy the `MediaCard` component
- Copy the `MediaDetailModal` component  
- Copy the `MediaGallery` component

### **3. Update API Service**
```typescript
// Add to multimediaApi.ts
export function getMediaUrl(mediaId: string): string {
  return withBase(`/api/multimedia/media/${mediaId}/download`);
}
```

### **4. Add CSS Classes**
```css
/* Add to your CSS file */
.media-card {
  transition: all 0.2s ease-in-out;
}

.media-card:hover {
  transform: translateY(-2px);
}
```

### **5. Test with Real Media**
- **Upload photos from your phone** → Will show GPS, device info, camera settings
- **Upload videos** → Will show duration, resolution, codec, bitrate, fps
- **Upload audio files** → Will show duration, bitrate, artist, album, genre

### **6. Backend Requirements**
- **FFmpeg**: Required for video/audio metadata extraction
- **Install FFmpeg**: `npm install fluent-ffmpeg` (already done)
- **System FFmpeg**: May need to install FFmpeg system binary for full functionality

---

## 📱 **Mobile Responsive Design**

The components are designed to be mobile-responsive:

- **Grid view**: 1 column on mobile, 2-4 columns on desktop
- **Touch-friendly**: Large tap targets for mobile
- **Responsive modal**: Full-screen on mobile, centered on desktop
- **Optimized images**: Proper aspect ratios and loading

---

## 🎨 **Customization Options**

### **Themes**
- Dark mode support built-in
- Customizable colors via CSS variables
- Responsive design for all screen sizes

### **Metadata Display**
- Toggle metadata on/off
- Customize which metadata to show
- Add custom metadata fields

### **Media Types**
- Easy to add new media types
- Custom icons for different file types
- Extensible metadata structure

---

## 🔧 **Troubleshooting**

### **Common Issues:**

1. **No metadata showing**: Upload real photos (not screenshots)
2. **GPS not working**: Check if location services were enabled when photo was taken
3. **Video not playing**: Check browser video codec support
4. **Audio not playing**: Check browser audio format support

### **Browser Support:**
- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support  
- ✅ Safari: Full support
- ✅ Mobile browsers: Full support

---

**Your backend already handles all the metadata extraction! The frontend just needs to display it beautifully.**
