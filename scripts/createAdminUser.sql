-- SQL Script to Create/Update Admin User
-- Run this in your PostgreSQL database
-- NOTE: It's recommended to use the Node.js script instead: node scripts/createAdminUser.js
-- The Node.js script handles password hashing automatically

-- Option 1: Update existing user to admin (RECOMMENDED)
-- Replace 'admin@legacyai.com' with the email of the user you want to make admin

UPDATE users 
SET 
  role = 'admin',
  "isActive" = true,
  "isVerified" = true,
  "updatedAt" = NOW()
WHERE email = 'admin@legacyai.com';

-- Option 2: Create new admin user with hashed password
-- Password: admin123 (hashed with bcrypt, salt rounds: 12)
-- WARNING: If you change the password, you need to hash it first using bcrypt

INSERT INTO users (id, email, username, password, "firstName", "lastName", role, "isActive", "isVerified", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  'admin@legacyai.com',
  'admin',
  '$2b$12$scbCyiPHHvY5JZo9J3/UmeKJpuceyYy7pXUUZzO69TUi8tiSpcxjO', -- 'admin123' hashed
  'Admin',
  'User',
  'admin',
  true,
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'admin@legacyai.com'
);

-- Option 2: Update existing user to admin
-- Replace 'admin@legacyai.com' with the email of the user you want to make admin

UPDATE users 
SET 
  role = 'admin',
  "isActive" = true,
  "isVerified" = true,
  "updatedAt" = NOW()
WHERE email = 'admin@legacyai.com';

-- Verify admin user was created/updated
SELECT id, email, username, role, "isActive", "isVerified" 
FROM users 
WHERE role = 'admin';

