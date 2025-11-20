# 🔐 Authentication API - Frontend Integration

## 🚀 **Backend Ready - Just Hit These 2 Endpoints**

**Base URL:** `http://localhost:3000/api/auth`

---

## 📋 **API 1: Sign Up**

**URL:** `POST http://localhost:3000/api/auth/register`

**Send this:**
```javascript
const formData = new FormData();
formData.append('email', 'user@example.com');
formData.append('username', 'johndoe');
formData.append('password', 'password123');
formData.append('firstName', 'John'); // optional
formData.append('lastName', 'Doe'); // optional
formData.append('profilePicture', file); // optional - image file

fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  body: formData
});
```

**You get back:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "/uploads/users/profile-1642248600000-123456789.jpg"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "7d"
    }
  }
}
```

---

## 📋 **API 2: Login**

**URL:** `POST http://localhost:3000/api/auth/login`

**Send this:**
```javascript
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    identifier: 'user@example.com', // can be email or username
    password: 'password123'
  })
});
```

**You get back:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "/uploads/users/profile-1642248600000-123456789.jpg"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "7d"
    }
  }
}
```

---

## 🎯 **Complete Frontend Code**

### **Sign Up Function:**
```javascript
const signup = async (userData, profilePictureFile) => {
  try {
    const formData = new FormData();
    formData.append('email', userData.email);
    formData.append('username', userData.username);
    formData.append('password', userData.password);
    formData.append('firstName', userData.firstName || '');
    formData.append('lastName', userData.lastName || '');
    
    if (profilePictureFile) {
      formData.append('profilePicture', profilePictureFile);
    }

    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    
    if (data.success) {
      // Save token
      localStorage.setItem('token', data.data.tokens.accessToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      
      // Redirect
      window.location.href = '/dashboard';
    } else {
      alert('Signup failed: ' + data.message);
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
};
```

### **Login Function:**
```javascript
const login = async (identifier, password) => {
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ identifier, password })
    });

    const data = await response.json();
    
    if (data.success) {
      // Save token
      localStorage.setItem('token', data.data.tokens.accessToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      
      // Redirect
      window.location.href = '/dashboard';
    } else {
      alert('Login failed: ' + data.message);
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
};
```

### **Use Token for Protected Requests:**
```javascript
const token = localStorage.getItem('token');

fetch('http://localhost:3000/api/some-protected-endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## 🧪 **Quick Test**

**Test Sign Up:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -F "email=test@example.com" \
  -F "username=testuser" \
  -F "password=password123"
```

**Test Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "test@example.com", "password": "password123"}'
```

---

## ✅ **That's It!**

- ✅ **2 APIs only** - signup and login
- ✅ **JWT tokens** returned on both
- ✅ **Profile pictures** optional on signup
- ✅ **Copy the code** above and use it
- ✅ **Backend ready** - just hit the endpoints

**Ready for frontend integration!** 🚀
