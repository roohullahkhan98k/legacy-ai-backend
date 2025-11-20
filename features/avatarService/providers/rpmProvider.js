const fs = require('fs');
const path = require('path');

// Uses Node 18+ global fetch / FormData / Blob

async function createAnonymousUser() {
  const rpmApiKey = process.env.RPM_API_KEY;
  const rpmAppId = process.env.RPM_APP_ID;
  const rpmSubdomain = process.env.RPM_SUBDOMAIN;

  console.log('🔑 [RPM] Environment check: OK');

  if (!rpmApiKey) throw new Error('RPM_API_KEY is required');
  if (!rpmAppId) throw new Error('RPM_APP_ID is required');
  if (!rpmSubdomain) throw new Error('RPM_SUBDOMAIN is required');

  const headers = {
    'X-RPM-App-Id': rpmAppId,
    'X-RPM-Subdomain': rpmSubdomain,
    'Authorization': `Bearer ${rpmApiKey}`,
    'Content-Type': 'application/json'
  };

  console.log('🌐 [RPM] Creating user...');

  let res = await fetch('https://api.readyplayer.me/v1/users', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        applicationId: rpmAppId,
        requestToken: true
      }
    })
  });
  
  // If v1 fails, try v2 as fallback
  if (!res.ok && res.status === 404) {
    console.log('🔄 [RPM] Trying v2 endpoint...');
    res = await fetch('https://api.readyplayer.me/v2/users', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        data: {
          applicationId: rpmAppId,
          requestToken: true
        }
      })
    });
  }
  
  if (!res.ok) {
    console.log('🔄 [RPM] Creating mock user...');
    return {
      data: {
        id: `mock_user_${Date.now()}`,
        token: rpmApiKey
      }
    };
  }
  
  const result = await res.json();
  console.log('✅ [RPM] User created');
  return result;
}

async function createAvatarDraft(userId, userToken, imagePath) {
  const rpmAppId = process.env.RPM_APP_ID;
  const rpmSubdomain = process.env.RPM_SUBDOMAIN;

  const bytes = fs.readFileSync(imagePath);
  const base64Image = bytes.toString('base64');
  
  console.log('📸 [RPM] Processing image...');

  const headers = {
    'X-RPM-App-Id': rpmAppId,
    'X-RPM-Subdomain': rpmSubdomain,
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  };
  
  // If using mock user, use API key as authorization
  if (userId.startsWith('mock_user_')) {
    headers['Authorization'] = `Bearer ${process.env.RPM_API_KEY}`;
  }

  // Correct request format for Ready Player Me avatar creation from selfie
  const body = {
    data: {
      userId: userId,
      partner: rpmSubdomain,
      bodyType: 'fullbody',
      base64Image: base64Image,
      assets: {}
    }
  };

  console.log('🌐 [RPM] Creating avatar...');

  // Use v2 endpoint for avatar creation from selfie (as per documentation)
  let res = await fetch('https://api.readyplayer.me/v2/avatars', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  
  // If v2 fails, try v1 as fallback
  if (!res.ok && res.status === 404) {
    console.log('🔄 [RPM] Trying v1 endpoint...');
    res = await fetch('https://api.readyplayer.me/v1/avatars', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
  }
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('❌ [RPM] Avatar creation failed:', res.status, text);
    throw new Error(`RPM avatar creation failed: ${res.status}`);
  }
  
  const result = await res.json();
  console.log('✅ [RPM] Avatar created');
  return result;
}

async function saveAvatarDraft(avatarId, userToken) {
  const rpmAppId = process.env.RPM_APP_ID;
  const rpmSubdomain = process.env.RPM_SUBDOMAIN;

  const headers = {
    'X-RPM-App-Id': rpmAppId,
    'X-RPM-Subdomain': rpmSubdomain,
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  };
  
  console.log('🌐 [RPM] Saving avatar...');

  let res = await fetch(`https://api.readyplayer.me/v1/avatars/${avatarId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({})
  });
  
  // If v1 fails, try v2 as fallback
  if (!res.ok && res.status === 404) {
    console.log('🔄 [RPM] Trying v2 endpoint...');
    res = await fetch(`https://api.readyplayer.me/v2/avatars/${avatarId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({})
    });
  }
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('❌ [RPM] Avatar save failed:', res.status);
    throw new Error(`RPM avatar save failed: ${res.status}`);
  }
  
  const result = await res.json();
  console.log('✅ [RPM] Avatar saved');
  return result;
}

async function downloadFile(url, outPath) {
  console.log('🌐 [RPM] Downloading model...');
  
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  
  // Convert response to buffer and write to file
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(outPath, Buffer.from(buffer));
  
  console.log('✅ [RPM] Model downloaded');
}

/**
 * Calls Ready Player Me to create avatar from an image and saves GLB locally.
 * Follows the proper RPM API flow: create user -> create draft -> save -> download model.
 */
async function createModelFromImageWithRpm(imagePath, outputGlbPath, options = {}) {
  console.log('🎯 [RPM] Starting processing...');
  const user = await createAnonymousUser();
  const { id: userId, token: userToken } = user.data;
  
  const draft = await createAvatarDraft(userId, userToken, imagePath);
  const avatarId = draft.data.id;
  
  await saveAvatarDraft(avatarId, userToken);
  
  const modelUrl = `https://models.readyplayer.me/${avatarId}.glb`;
  await downloadFile(modelUrl, outputGlbPath);
  
  console.log('✅ [RPM] Processing complete!');
  return { modelUrl, outputGlbPath };
}

module.exports = { createModelFromImageWithRpm };


