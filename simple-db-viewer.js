#!/usr/bin/env node

/**
 * Simple Database Viewer
 * 
 * This creates a simple web interface to view your database data
 * Just run: node simple-db-viewer.js
 * Then go to: http://localhost:3001
 */

const express = require('express');
const { sequelize } = require('./common/database');
const User = require('./common/models/User');
const Interview = require('./features/aiInterviewEngine/models/Interview');
const MemoryNode = require('./features/memoryGraphService/models/MemoryNode');
const { UserVoice, GeneratedAudio } = require('./features/voiceCloningPlayback/models/VoiceCloning');

// Avatar models - will self-initialize
const { UserAvatar, AvatarAnimation } = require('./features/avatarService/models/Avatar');

// Multimedia models - will self-initialize
const { MultimediaFile, MultimediaMemoryNode, MultimediaLink } = require('./features/multimediaUpload/models/Multimedia');

const app = express();
const PORT = 3001;

// Simple HTML template
const htmlTemplate = (users, interviews, memories, voices, generatedAudio, avatars, animations, multimediaFiles, multimediaNodes, multimediaLinks, stats) => `
<!DOCTYPE html>
<html>
<head>
    <title>Database Viewer - AI Prototype</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background: #f5f5f5; 
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            padding: 20px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { 
            color: #333; 
            text-align: center; 
            margin-bottom: 30px;
        }
        .stats { 
            background: #e3f2fd; 
            padding: 15px; 
            border-radius: 5px; 
            margin-bottom: 20px; 
            display: flex; 
            justify-content: space-around;
        }
        .stat { 
            text-align: center; 
        }
        .stat-number { 
            font-size: 24px; 
            font-weight: bold; 
            color: #1976d2; 
        }
        .stat-label { 
            color: #666; 
            font-size: 14px; 
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px; 
        }
        th, td { 
            padding: 12px; 
            text-align: left; 
            border-bottom: 1px solid #ddd; 
        }
        th { 
            background: #f8f9fa; 
            font-weight: bold; 
            color: #333; 
        }
        tr:hover { 
            background: #f5f5f5; 
        }
        .empty { 
            text-align: center; 
            color: #666; 
            font-style: italic; 
            padding: 40px; 
        }
        .add-user-btn { 
            background: #4caf50; 
            color: white; 
            padding: 10px 20px; 
            border: none; 
            border-radius: 5px; 
            cursor: pointer; 
            margin: 20px 0; 
        }
        .add-user-btn:hover { 
            background: #45a049; 
        }
        .refresh-btn { 
            background: #2196f3; 
            color: white; 
            padding: 10px 20px; 
            border: none; 
            border-radius: 5px; 
            cursor: pointer; 
            margin: 20px 0; 
        }
        .refresh-btn:hover { 
            background: #1976d2; 
        }
        .profile-picture { 
            width: 40px; 
            height: 40px; 
            border-radius: 50%; 
            object-fit: cover; 
            border: 2px solid #ddd; 
        }
        .no-picture { 
            width: 40px; 
            height: 40px; 
            border-radius: 50%; 
            background: #f0f0f0; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: #999; 
            font-size: 12px; 
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🗄️ AI Prototype Database Viewer</h1>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-number">${stats.totalUsers}</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat">
                <div class="stat-number">${stats.totalInterviews}</div>
                <div class="stat-label">Interviews</div>
            </div>
            <div class="stat">
                <div class="stat-number">${stats.totalCompleted}</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat">
                <div class="stat-number">${stats.totalMemories}</div>
                <div class="stat-label">Memory Nodes</div>
            </div>
            <div class="stat">
                <div class="stat-number">${stats.totalVoices}</div>
                <div class="stat-label">Custom Voices</div>
            </div>
            <div class="stat">
                <div class="stat-number">${stats.totalGeneratedAudio}</div>
                <div class="stat-label">Generated Audio</div>
            </div>
            <div class="stat">
                <div class="stat-number">${stats.totalAvatars}</div>
                <div class="stat-label">Avatars</div>
            </div>
            <div class="stat">
                <div class="stat-number">${stats.totalAnimations}</div>
                <div class="stat-label">Animations</div>
            </div>
            <div class="stat">
                <div class="stat-number">${stats.totalMultimediaFiles}</div>
                <div class="stat-label">Media Files</div>
            </div>
            <div class="stat">
                <div class="stat-number">${stats.totalMultimediaNodes}</div>
                <div class="stat-label">Multimedia Memories</div>
            </div>
            <div class="stat">
                <div class="stat-number">${stats.totalMultimediaLinks}</div>
                <div class="stat-label">Media Links</div>
            </div>
        </div>

        <button class="add-user-btn" onclick="addTestUser()">➕ Add Test User</button>
        <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>

        <h2>👥 Users Table</h2>
        
        ${users.length === 0 ? 
            '<div class="empty">📭 No users found. Click "Add Test User" to create one!</div>' :
            `<table>
                <thead>
                    <tr>
                        <th>Picture</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Username</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>
                                ${user.avatar ? 
                                    `<img src="${user.avatar}" alt="Profile" class="profile-picture" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                     <div class="no-picture" style="display:none;">👤</div>` :
                                    `<div class="no-picture">👤</div>`
                                }
                            </td>
                            <td>${user.firstName || ''} ${user.lastName || ''}</td>
                            <td>${user.email}</td>
                            <td>${user.username}</td>
                            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`
        }

        <h2>🎤 AI Interviews</h2>
        
        ${interviews.length === 0 ? 
            '<div class="empty">📭 No interviews yet!</div>' :
            `<table>
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Total Q&A</th>
                        <th>Started</th>
                        <th>Duration</th>
                    </tr>
                </thead>
                <tbody>
                    ${interviews.map(interview => {
                        const duration = interview.ended_at ? 
                            Math.floor((new Date(interview.ended_at) - new Date(interview.started_at)) / 1000 / 60) : 
                            '-';
                        return `
                        <tr onclick="viewInterview('${interview.session_id}')" style="cursor:pointer">
                            <td><strong>${interview.title || 'Interview ' + interview.id.substring(0,8)}</strong></td>
                            <td>
                                <span style="
                                    padding: 4px 8px; 
                                    border-radius: 12px; 
                                    font-size: 12px;
                                    background: ${interview.status === 'completed' ? '#c8e6c9' : '#fff9c4'};
                                    color: ${interview.status === 'completed' ? '#2e7d32' : '#f57f17'};
                                ">
                                    ${interview.status === 'completed' ? '✅' : '🟡'} ${interview.status}
                                </span>
                            </td>
                            <td style="text-align:center">${interview.total_qa}</td>
                            <td>${new Date(interview.started_at).toLocaleString()}</td>
                            <td>${duration !== '-' ? duration + ' min' : '-'}</td>
                        </tr>
                        <tr>
                            <td colspan="5" style="padding:0;">
                                <details style="padding:10px; background:#f9f9f9;">
                                    <summary style="cursor:pointer; font-weight:bold;">📄 View Transcript (${interview.qa_pairs?.length || 0} Q&A)</summary>
                                    <div style="max-height:300px; overflow-y:auto; margin-top:10px;">
                                        ${interview.qa_pairs && interview.qa_pairs.length > 0 ? 
                                            interview.qa_pairs.map((qa, idx) => `
                                                <div style="margin-bottom:15px; padding:10px; background:white; border-radius:5px;">
                                                    <div style="color:#1976d2; font-weight:bold;">Q${idx + 1}: ${qa.question}</div>
                                                    <div style="color:#666; margin-top:5px; padding-left:20px;">A: ${qa.answer}</div>
                                                    <div style="font-size:11px; color:#999; margin-top:5px;">${new Date(qa.timestamp).toLocaleString()}</div>
                                                </div>
                                            `).join('') :
                                            '<div style="color:#999; font-style:italic;">No Q&A pairs yet</div>'
                                        }
                                    </div>
                                </details>
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>`
        }

        <h2>🧠 Memory Graph Nodes (Main Service)</h2>
        
        ${memories.length === 0 ? 
            '<div class="empty">📭 No memory nodes yet!</div>' :
            `<table>
                <thead>
                    <tr>
                        <th>Document</th>
                        <th>Person</th>
                        <th>Event</th>
                        <th>Tags</th>
                        <th>Media</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    ${memories.map(memory => `
                        <tr>
                            <td style="max-width:300px; font-size:13px">
                                <strong>${memory.document ? memory.document.substring(0, 100) : '-'}</strong>
                                ${memory.document && memory.document.length > 100 ? '...' : ''}
                            </td>
                            <td>
                                <span style="padding:4px 8px; background:#e3f2fd; border-radius:8px; font-size:12px;">
                                    👤 ${memory.person || '-'}
                                </span>
                            </td>
                            <td>
                                ${memory.event ? 
                                    `<span style="padding:4px 8px; background:#e8f5e9; border-radius:8px; font-size:12px;">📅 ${memory.event}</span>` : 
                                    '<span style="color:#999">-</span>'
                                }
                            </td>
                            <td style="font-size:11px">
                                ${memory.tags && memory.tags.length > 0 ? 
                                    memory.tags.map(tag => `<span style="background:#fff3e0; padding:2px 6px; border-radius:8px; margin:2px; display:inline-block;">🏷️ ${tag}</span>`).join('') :
                                    '<span style="color:#999">No tags</span>'
                                }
                            </td>
                            <td style="font-size:10px; max-width:250px; color:#666;">
                                ${memory.media && memory.media.length > 0 ? 
                                    memory.media.map(path => `<div style="margin:2px 0; word-break:break-all;">📎 ${path}</div>`).join('') :
                                    '<span style="color:#999">No media</span>'
                                }
                            </td>
                            <td style="font-size:11px">${memory.createdAt ? new Date(memory.createdAt).toLocaleDateString() : (memory.created_at ? new Date(memory.created_at).toLocaleDateString() : '-')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`
        }

        <h2>🎤 Custom Voice Clones</h2>
        
        ${voices.length === 0 ? 
            '<div class="empty">📭 No custom voices yet!</div>' :
            `<table>
                <thead>
                    <tr>
                        <th>Voice Name</th>
                        <th>Voice ID</th>
                        <th>Sample File</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    ${voices.map(voice => `
                        <tr>
                            <td><strong>🎙️ ${voice.voice_name}</strong></td>
                            <td><code style="font-size:10px">${voice.voice_id}</code></td>
                            <td style="font-size:11px; color:#666;">
                                ${voice.sample_file_path || '-'}
                            </td>
                            <td style="font-size:11px">${(voice.createdAt || voice.created_at) ? new Date(voice.createdAt || voice.created_at).toLocaleDateString() : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`
        }

        <h2>🔊 Generated Audio (Recent 20)</h2>
        
        ${generatedAudio.length === 0 ? 
            '<div class="empty">📭 No generated audio yet!</div>' :
            `<table>
                <thead>
                    <tr>
                        <th>Text</th>
                        <th>Voice</th>
                        <th>Audio File</th>
                        <th>Duration</th>
                        <th>Size</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    ${generatedAudio.map(audio => `
                        <tr>
                            <td style="max-width:300px; font-size:12px">${audio.text.substring(0, 100)}...</td>
                            <td style="font-size:11px">🎙️ ${audio.voice_name || 'Unknown'}</td>
                            <td style="font-size:10px; color:#666;">
                                <a href="${audio.audio_file_path}" target="_blank" style="color:#1976d2;">
                                    📎 ${audio.audio_file_path.split('/').pop()}
                                </a>
                            </td>
                            <td style="font-size:11px; text-align:center;">
                                ${audio.duration_seconds ? audio.duration_seconds.toFixed(1) + 's' : '-'}
                            </td>
                            <td style="font-size:11px; text-align:center;">
                                ${audio.file_size_bytes ? (audio.file_size_bytes / 1024).toFixed(0) + ' KB' : '-'}
                            </td>
                            <td style="font-size:11px">${(audio.createdAt || audio.created_at) ? new Date(audio.createdAt || audio.created_at).toLocaleDateString() : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`
        }

        <h2>🎭 User Avatars</h2>
        
        ${avatars.length === 0 ? 
            '<div class="empty">📭 No avatars yet!</div>' :
            `<table>
                <thead>
                    <tr>
                        <th>Avatar Name</th>
                        <th>User ID</th>
                        <th>Model URL</th>
                        <th>Description</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    ${avatars.map(avatar => `
                        <tr>
                            <td><strong>🎭 ${avatar.name}</strong></td>
                            <td><code style="font-size:10px">${avatar.user_id ? avatar.user_id.substring(0, 8) + '...' : '-'}</code></td>
                            <td style="font-size:11px; color:#666;">
                                <a href="${avatar.model_url}" target="_blank" style="color:#1976d2;">
                                    📎 ${avatar.model_url ? avatar.model_url.split('/').pop() : '-'}
                                </a>
                            </td>
                            <td style="font-size:11px; max-width:200px;">${avatar.description || '-'}</td>
                            <td style="font-size:11px">${(avatar.createdAt || avatar.created_at) ? new Date(avatar.createdAt || avatar.created_at).toLocaleDateString() : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`
        }

        <h2>🎬 Avatar Animations (Recent 20)</h2>
        
        ${animations.length === 0 ? 
            '<div class="empty">📭 No animations yet!</div>' :
            `<table>
                <thead>
                    <tr>
                        <th>Avatar ID</th>
                        <th>Audio</th>
                        <th>Lipsync</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    ${animations.map(anim => `
                        <tr>
                            <td><code style="font-size:10px">${anim.avatar_id ? anim.avatar_id.substring(0, 12) + '...' : '-'}</code></td>
                            <td style="font-size:11px; color:#666;">
                                ${anim.audio_url ? `<a href="${anim.audio_url}" target="_blank" style="color:#1976d2;">📎 Audio</a>` : '-'}
                            </td>
                            <td style="font-size:11px; color:#666;">
                                ${anim.lipsync_url ? `<a href="${anim.lipsync_url}" target="_blank" style="color:#1976d2;">📎 Lipsync</a>` : '-'}
                            </td>
                            <td style="font-size:11px; text-align:center;">
                                ${anim.duration_seconds ? anim.duration_seconds.toFixed(1) + 's' : '-'}
                            </td>
                            <td style="font-size:11px;">
                                <span style="padding:2px 6px; border-radius:4px; background:${
                                    anim.status === 'completed' ? '#d4edda' : 
                                    anim.status === 'processing' ? '#fff3cd' : 
                                    anim.status === 'failed' ? '#f8d7da' : '#e2e3e5'
                                }; color:${
                                    anim.status === 'completed' ? '#155724' : 
                                    anim.status === 'processing' ? '#856404' : 
                                    anim.status === 'failed' ? '#721c24' : '#383d41'
                                };">
                                    ${anim.status || 'unknown'}
                                </span>
                            </td>
                            <td style="font-size:11px">${(anim.createdAt || anim.created_at) ? new Date(anim.createdAt || anim.created_at).toLocaleDateString() : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`
        }

        <h2>📁 Multimedia Files (Recent 50)</h2>
        
        ${multimediaFiles.length === 0 ? 
            '<div class="empty">📭 No multimedia files yet!</div>' :
            `<table>
                <thead>
                    <tr>
                        <th>Filename</th>
                        <th>Type</th>
                        <th>Size</th>
                        <th>MIME Type</th>
                        <th>File URL</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    ${multimediaFiles.map(file => `
                        <tr>
                            <td><strong>📁 ${file.filename}</strong></td>
                            <td style="font-size:11px;">
                                <span style="padding:2px 6px; border-radius:4px; background:${
                                    file.file_type === 'image' ? '#dbeafe' : 
                                    file.file_type === 'video' ? '#fce7f3' : 
                                    file.file_type === 'audio' ? '#fef3c7' : '#e5e7eb'
                                }; color:${
                                    file.file_type === 'image' ? '#1e40af' : 
                                    file.file_type === 'video' ? '#9f1239' : 
                                    file.file_type === 'audio' ? '#92400e' : '#374151'
                                };">
                                    ${file.file_type}
                                </span>
                            </td>
                            <td style="font-size:11px; text-align:center;">
                                ${file.file_size ? (file.file_size / 1024).toFixed(0) + ' KB' : '-'}
                            </td>
                            <td style="font-size:10px; color:#666;">${file.mime_type}</td>
                            <td style="font-size:11px; color:#666;">
                                <a href="${file.file_url}" target="_blank" style="color:#1976d2;">
                                    📎 ${file.file_url ? file.file_url.split('/').pop() : '-'}
                                </a>
                            </td>
                            <td style="font-size:11px">${(file.createdAt || file.created_at) ? new Date(file.createdAt || file.created_at).toLocaleDateString() : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`
        }

        <h2>📁 Multimedia Memory Nodes (Recent 50)</h2>
        
        ${multimediaNodes.length === 0 ? 
            '<div class="empty">📭 No memory nodes yet!</div>' :
            `<table>
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th>Location</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    ${multimediaNodes.map(node => `
                        <tr>
                            <td><strong>🧠 ${node.title || 'Untitled'}</strong></td>
                            <td style="font-size:11px;">
                                <span style="padding:2px 6px; border-radius:4px; background:${
                                    node.type === 'event' ? '#dbeafe' : 
                                    node.type === 'person' ? '#d1fae5' : 
                                    node.type === 'timeline' ? '#fce7f3' : '#e5e7eb'
                                }; color:${
                                    node.type === 'event' ? '#1e40af' : 
                                    node.type === 'person' ? '#065f46' : 
                                    node.type === 'timeline' ? '#9f1239' : '#374151'
                                };">
                                    ${node.type || 'event'}
                                </span>
                            </td>
                            <td style="font-size:11px; max-width:300px; color:#666;">
                                ${node.description ? (node.description.length > 100 ? node.description.substring(0, 100) + '...' : node.description) : '-'}
                            </td>
                            <td style="font-size:11px; color:#666;">
                                ${node.metadata && node.metadata.location ? '📍 ' + node.metadata.location : '-'}
                            </td>
                            <td style="font-size:11px">${(node.createdAt || node.created_at) ? new Date(node.createdAt || node.created_at).toLocaleDateString() : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`
        }

        <h2>🔗 Multimedia Links (Recent 50)</h2>
        
        ${multimediaLinks.length === 0 ? 
            '<div class="empty">📭 No multimedia links yet!</div>' :
            `<table>
                <thead>
                    <tr>
                        <th>Media → Node</th>
                        <th>Relationship</th>
                        <th>Link Type</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    ${multimediaLinks.map(link => `
                        <tr>
                            <td style="font-size:10px;">
                                <div style="margin-bottom:4px;">
                                    <strong>📁 Media:</strong> <code>${link.media_id ? link.media_id.substring(0, 8) + '...' : '-'}</code>
                                </div>
                                <div>
                                    <strong>🧠 Node:</strong> <code>${link.node_id ? link.node_id.substring(0, 8) + '...' : '-'}</code>
                                </div>
                            </td>
                            <td style="font-size:11px;">
                                <span style="padding:2px 6px; border-radius:4px; background:${
                                    link.relationship === 'primary' ? '#d1fae5' : 
                                    link.relationship === 'associated' ? '#dbeafe' : 
                                    link.relationship === 'reference' ? '#fef3c7' : '#e5e7eb'
                                }; color:${
                                    link.relationship === 'primary' ? '#065f46' : 
                                    link.relationship === 'associated' ? '#1e40af' : 
                                    link.relationship === 'reference' ? '#92400e' : '#374151'
                                };">
                                    ${link.relationship || 'associated'}
                                </span>
                            </td>
                            <td style="font-size:11px; color:#666;">${link.link_type || 'general'}</td>
                            <td style="font-size:11px">${(link.createdAt || link.created_at) ? new Date(link.createdAt || link.created_at).toLocaleDateString() : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`
        }
    </div>

    <script>
        function viewInterview(sessionId) {
            console.log('Interview session:', sessionId);
        }
        
        async function addTestUser() {
            try {
                const response = await fetch('/add-test-user', { method: 'POST' });
                if (response.ok) {
                    alert('✅ Test user added successfully!');
                    location.reload();
                } else {
                    alert('❌ Error adding test user');
                }
            } catch (error) {
                alert('❌ Error: ' + error.message);
            }
        }
    </script>
</body>
</html>
`;

// Routes
app.get('/', async (req, res) => {
  try {
    // Get all users
    const users = await User.findAll({
      attributes: [
        'id', 'email', 'username', 'firstName', 'lastName', 
        'avatar', 'createdAt'
      ],
      order: [['createdAt', 'DESC']]
    });

    // Get interviews
    const interviews = await Interview.findAll({
      order: [['created_at', 'DESC']],
      limit: 50
    });

    // Get memory nodes
    const memories = await MemoryNode.findAll({
      order: [['created_at', 'DESC']],
      limit: 50
    });

    // Get voice clones
    const voices = await UserVoice.findAll({
      order: [['created_at', 'DESC']],
      limit: 50,
      raw: true
    });

    // Get generated audio
    const generatedAudio = await GeneratedAudio.findAll({
      order: [['created_at', 'DESC']],
      limit: 20,
      raw: true
    });

    // Get avatars
    const avatars = await UserAvatar.findAll({
      order: [['created_at', 'DESC']],
      limit: 50,
      raw: true
    });

    // Get avatar animations
    const animations = await AvatarAnimation.findAll({
      order: [['created_at', 'DESC']],
      limit: 20,
      raw: true
    });

    // Get multimedia files
    const multimediaFiles = await MultimediaFile.findAll({
      order: [['created_at', 'DESC']],
      limit: 50,
      raw: true
    });

    // Get multimedia memory nodes
    const multimediaNodes = await MultimediaMemoryNode.findAll({
      order: [['created_at', 'DESC']],
      limit: 50,
      raw: true
    });

    // Get multimedia links
    const multimediaLinks = await MultimediaLink.findAll({
      order: [['created_at', 'DESC']],
      limit: 50,
      raw: true
    });

    // Get statistics
    const totalUsers = await User.count();
    const totalInterviews = await Interview.count();
    const totalCompleted = await Interview.count({ where: { status: 'completed' } });
    const totalMemories = await MemoryNode.count();
    const totalVoices = await UserVoice.count();
    const totalGeneratedAudio = await GeneratedAudio.count();
    const totalAvatars = await UserAvatar.count();
    const totalAnimations = await AvatarAnimation.count();
    const totalMultimediaFiles = await MultimediaFile.count();
    const totalMultimediaNodes = await MultimediaMemoryNode.count();
    const totalMultimediaLinks = await MultimediaLink.count();

    const stats = {
      totalUsers,
      totalInterviews,
      totalCompleted,
      totalMemories,
      totalVoices,
      totalGeneratedAudio,
      totalAvatars,
      totalAnimations,
      totalMultimediaFiles,
      totalMultimediaNodes,
      totalMultimediaLinks
    };

    console.log('DB Stats:', stats);
    console.log('Custom voices count:', voices.length);
    console.log('Generated audio count:', generatedAudio.length);
    console.log('Avatars count:', avatars.length);
    console.log('Animations count:', animations.length);
    console.log('Multimedia files count:', multimediaFiles.length);
    console.log('Multimedia nodes count:', multimediaNodes.length);
    console.log('Multimedia links count:', multimediaLinks.length);

    res.send(htmlTemplate(users, interviews, memories, voices, generatedAudio, avatars, animations, multimediaFiles, multimediaNodes, multimediaLinks, stats));
  } catch (error) {
    res.status(500).send(`<h1>❌ Error: ${error.message}</h1><pre>${error.stack}</pre>`);
  }
});

app.post('/add-test-user', async (req, res) => {
  try {
    // Check if test user already exists
    const existingUser = await User.findOne({
      where: { email: 'test@example.com' }
    });

    if (existingUser) {
      return res.json({ message: 'Test user already exists' });
    }

    // Create test user
    const testUser = await User.create({
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      isActive: true,
      isVerified: true
    });

    res.json({ message: 'Test user created successfully', user: testUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Simple Database Viewer started!');
  console.log(`📊 Open your browser and go to: http://localhost:${PORT}`);
  console.log('👀 You can now see your database data in a simple, clean interface!');
  console.log('➕ Click "Add Test User" to add sample data');
  console.log('🔄 Click "Refresh" to reload the data');
});
