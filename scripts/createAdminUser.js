#!/usr/bin/env node

/**
 * Script to create admin user
 * Run: node scripts/createAdminUser.js
 */

require('dotenv').config();
const { sequelize } = require('../common/database');
const User = require('../common/models/User');

const createAdminUser = async () => {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    const email = 'admin@legacyai.com';
    const password = 'admin123';
    const username = 'admin';

    // Check if admin user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      console.log('⚠️  Admin user already exists. Updating password and role...');
      existingUser.password = password;
      existingUser.role = 'admin';
      await existingUser.save();
      console.log('✅ Admin user updated successfully');
      console.log(`   Email: ${email}`);
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${password}`);
      console.log(`   Role: admin`);
      process.exit(0);
    }

    // Create new admin user
    console.log('👤 Creating admin user...');
    const adminUser = await User.create({
      email: email,
      username: username,
      password: password,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
      isVerified: true
    });

    console.log('✅ Admin user created successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: admin`);
    console.log(`   ID: ${adminUser.id}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();

