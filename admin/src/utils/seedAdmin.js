/**
 * Seed Admin Script
 * Creates the initial Super Admin user for the system
 * Run with: npm run seed
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const AdminUser = require('../models/AdminUser');

const SUPER_ADMIN = {
  name: 'Super Admin',
  email: 'admin@fafaligroup.org',
  password: 'SuperAdmin@123!',
  role: 'Super Admin'
};

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/fafali_admin';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const existingAdmin = await AdminUser.findByEmail(SUPER_ADMIN.email);

    if (existingAdmin) {
      console.log('Super Admin already exists:', existingAdmin.email);
      process.exit(0);
    }

    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(SUPER_ADMIN.password, rounds);

    const admin = new AdminUser({
      name: SUPER_ADMIN.name,
      email: SUPER_ADMIN.email.toLowerCase(),
      passwordHash: hashedPassword,
      role: SUPER_ADMIN.role,
      isActive: true
    });

    await admin.save();

    console.log('✅ Super Admin created successfully!');
    console.log('Email:', SUPER_ADMIN.email);
    console.log('Password:', SUPER_ADMIN.password);
    console.log('\n⚠️  IMPORTANT: Change the password immediately after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
