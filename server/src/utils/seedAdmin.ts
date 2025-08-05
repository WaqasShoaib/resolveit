// /server/src/utils/seedAdmin.ts
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models';
import dotenv from 'dotenv';

dotenv.config();

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123456', 12);

    // Create admin user
    const adminUser = new User({
      name: 'System Administrator',
      age: 30,
      gender: 'other',
      address: {
        street: 'Admin Street 123',
        city: 'Admin City',
        zipCode: '12345'
      },
      email: 'admin@resolveit.com',
      phone: '+1234567890',
      password: hashedPassword,
      role: 'admin',
      isEmailVerified: true,
      isPhoneVerified: true
    });

    await adminUser.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@resolveit.com');
    console.log('🔐 Password: admin123456');
    console.log('⚠️  Please change the password after first login');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedAdmin();
}

export default seedAdmin;