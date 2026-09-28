require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');

const seedData = async () => {
  try {
    await connectDB();

    console.log('[Seeder] Cleaning existing database records...');
    await User.deleteMany({});
    await Product.deleteMany({});

    console.log('[Seeder] Creating demo users...');
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('Password@123', salt);

    const demoUser = await User.create({
      name: 'Alex Mercer',
      email: 'demo@example.com',
      password: hashedPassword,
      role: 'user'
    });

    const adminUser = await User.create({
      name: 'Admin Sarah',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin'
    });

    console.log('[Seeder] Creating sample products...');
    const products = [
      {
        title: 'Sony WH-1000XM5 Wireless Headphones',
        description: 'Industry-leading noise cancellation with two processors and 8 microphones for unprecedented quiet. Exceptional sound quality with Hi-Res Audio wireless.',
        price: 399.99,
        category: 'Audio',
        stock: 24,
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
        rating: 4.9,
        createdBy: adminUser._id
      },
      {
        title: 'Apple Watch Ultra 2 Titanium',
        description: 'The most rugged and capable Apple Watch. Engineered for outdoor endurance, water sports, and high-altitude training with precision dual-frequency GPS.',
        price: 799.00,
        category: 'Wearables',
        stock: 15,
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
        rating: 4.8,
        createdBy: adminUser._id
      },
      {
        title: 'MacBook Pro 16-inch M3 Max',
        description: 'Blazing-fast unified memory and extraordinary battery life. Liquid Retina XDR display with 1600 nits peak brightness and pro connectivity ports.',
        price: 2499.00,
        category: 'Computers',
        stock: 8,
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
        rating: 5.0,
        createdBy: adminUser._id
      },
      {
        title: 'Fujifilm X-T5 Mirrorless Camera',
        description: 'Fifth-generation 40.2-megapixel sensor in a compact, classic body. 5-axis in-body image stabilization and renowned film simulation modes.',
        price: 1699.95,
        category: 'Cameras',
        stock: 12,
        imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80',
        rating: 4.7,
        createdBy: demoUser._id
      },
      {
        title: 'Keychron Q1 Pro Mechanical Keyboard',
        description: 'Full CNC aluminum custom mechanical keyboard with wireless Bluetooth 5.1 & Type-C connection, hot-swappable switches, and programmable QMK/VIA.',
        price: 199.50,
        category: 'Accessories',
        stock: 35,
        imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',
        rating: 4.6,
        createdBy: demoUser._id
      },
      {
        title: 'Logitech MX Master 3S Wireless Mouse',
        description: 'Quiet Click technology with 8,000 DPI sensor on glass tracking and MagSpeed electromagnetic scrolling for supreme precision and tactile feedback.',
        price: 99.99,
        category: 'Accessories',
        stock: 42,
        imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&q=80',
        rating: 4.9,
        createdBy: adminUser._id
      },
      {
        title: 'Marshall Stanmore III Bluetooth Speaker',
        description: 'Re-engineered home audio system with a wider soundstage and room-shaking sound. Classic vintage aesthetic with analog control knobs.',
        price: 379.99,
        category: 'Audio',
        stock: 18,
        imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80',
        rating: 4.8,
        createdBy: demoUser._id
      },
      {
        title: 'Bose QuietComfort Ultra Earbuds',
        description: 'World-class noise cancellation, breakthrough spatialized audio, and CustomTune technology that customizes sound specifically to your ear shape.',
        price: 299.00,
        category: 'Audio',
        stock: 28,
        imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80',
        rating: 4.7,
        createdBy: adminUser._id
      }
    ];

    await Product.insertMany(products);

    console.log('\n===============================================');
    console.log('✅ Seeding complete!');
    console.log(`👤 Users seeded:`);
    console.log(`   - Demo User:  demo@example.com  / Password@123`);
    console.log(`   - Admin User: admin@example.com / Password@123`);
    console.log(`📦 Products seeded: ${products.length} products`);
    console.log('===============================================\n');

    process.exit(0);
  } catch (error) {
    console.error(`[Seeder Error] Failed to seed database: ${error.message}`);
    process.exit(1);
  }
};

seedData();
