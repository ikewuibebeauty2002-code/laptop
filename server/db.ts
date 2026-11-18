import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const db = new Database(path.join(dataDir, 'zurivolt.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      phone TEXT DEFAULT '',
      whatsapp_number TEXT DEFAULT '',
      reset_token TEXT,
      reset_expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('customer', 'admin', 'super_admin')) DEFAULT 'customer',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, role)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      sku TEXT NOT NULL UNIQUE,
      brand TEXT NOT NULL DEFAULT 'ZuriVolt',
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      subcategory_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      short_description TEXT DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      specifications TEXT NOT NULL DEFAULT '{}',
      price_ngn REAL NOT NULL CHECK (price_ngn >= 0),
      compare_at_price_ngn REAL,
      available_colors TEXT NOT NULL DEFAULT '[]',
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_best_seller INTEGER NOT NULL DEFAULT 0,
      is_trending INTEGER NOT NULL DEFAULT 0,
      is_recommended INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      rating_avg REAL NOT NULL DEFAULT 0,
      rating_count INTEGER NOT NULL DEFAULT 0,
      sales_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      alt_text TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT DEFAULT '',
      price_ngn REAL NOT NULL CHECK (price_ngn >= 0),
      sku TEXT NOT NULL UNIQUE,
      stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
      quantity_available INTEGER NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
      quantity_reserved INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
      low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS carts (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id TEXT PRIMARY KEY,
      cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
      selected_color TEXT DEFAULT '',
      selected_variant_name TEXT DEFAULT '',
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      label TEXT NOT NULL DEFAULT 'Home',
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      whatsapp_number TEXT NOT NULL,
      street_address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      additional_info TEXT DEFAULT '',
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_whatsapp TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      delivery_city TEXT NOT NULL,
      delivery_state TEXT NOT NULL,
      delivery_notes TEXT DEFAULT '',
      coupon_code TEXT,
      subtotal_ngn REAL NOT NULL,
      delivery_fee_ngn REAL NOT NULL DEFAULT 0,
      discount_ngn REAL NOT NULL DEFAULT 0,
      total_ngn REAL NOT NULL,
      payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid', 'failed', 'abandoned', 'refunded')) DEFAULT 'pending',
      order_status TEXT NOT NULL CHECK (order_status IN ('pending_payment', 'paid', 'processing', 'ready_for_delivery', 'shipped', 'delivered', 'cancelled', 'refunded')) DEFAULT 'pending_payment',
      paystack_reference TEXT UNIQUE,
      stock_deducted INTEGER NOT NULL DEFAULT 0,
      stock_restored INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
      variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      product_image TEXT DEFAULT '',
      selected_color TEXT DEFAULT '',
      selected_variant TEXT DEFAULT '',
      unit_price_ngn REAL NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      line_total_ngn REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      paystack_reference TEXT NOT NULL UNIQUE,
      amount_kobo INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'NGN',
      status TEXT NOT NULL CHECK (status IN ('initialized', 'success', 'failed', 'abandoned', 'refunded')) DEFAULT 'initialized',
      channel TEXT DEFAULT 'card',
      gateway_response TEXT DEFAULT '',
      sandbox_outcome TEXT DEFAULT 'pending',
      raw_payload TEXT DEFAULT '{}',
      verified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
      author_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      title TEXT DEFAULT '',
      comment TEXT NOT NULL,
      is_verified_purchase INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'approved',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')) DEFAULT 'percent',
      discount_value REAL NOT NULL CHECK (discount_value > 0),
      min_order_ngn REAL NOT NULL DEFAULT 0,
      max_discount_ngn REAL,
      usage_limit INTEGER,
      used_count INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS delivery_records (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
      courier_name TEXT DEFAULT 'ZuriVolt Express Dispatch',
      tracking_number TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      estimated_delivery_date TEXT,
      notes TEXT DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_activity_logs (
      id TEXT PRIMARY KEY,
      admin_user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wishlists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS store_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  seedInitialData();
}

function seedInitialData(): void {
  const existingSettings = db.prepare('SELECT COUNT(*) as count FROM store_settings').get() as { count: number };
  if (existingSettings.count === 0) {
    const insertSetting = db.prepare('INSERT OR IGNORE INTO store_settings (key, value) VALUES (?, ?)');
    insertSetting.run('storeName', process.env.VITE_STORE_NAME || 'ZuriVolt Gadgets');
    insertSetting.run('whatsappNumber', process.env.VITE_WHATSAPP_NUMBER || '2348091234567');
    insertSetting.run('supportEmail', process.env.VITE_SUPPORT_EMAIL || 'support@zurivolt.ng');
    insertSetting.run('supportPhone', '+234 809 123 4567');
    insertSetting.run('storeAddress', process.env.VITE_STORE_ADDRESS || '14 Admiralty Way, Lekki Phase 1, Lagos, Nigeria');
    insertSetting.run('instagramUrl', 'https://instagram.com/zurivoltgadgets');
    insertSetting.run('twitterUrl', 'https://x.com/zurivoltgadgets');
    insertSetting.run('facebookUrl', 'https://facebook.com/zurivoltgadgets');
    insertSetting.run('freeDeliveryThresholdNgn', '350000');
    insertSetting.run('lagosDeliveryFeeNgn', '3500');
    insertSetting.run('nationwideDeliveryFeeNgn', '6500');
    insertSetting.run('paystackPublicKey', 'pk_live_b866f4059b1a5d1b031eebd95a66cc9bfefe3853');
  } else {
    db.prepare('INSERT OR IGNORE INTO store_settings (key, value) VALUES (?, ?)').run(
      'paystackPublicKey',
      'pk_live_b866f4059b1a5d1b031eebd95a66cc9bfefe3853'
    );
  }

  // Seed default Admin and Demo Customer if no users exist
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM profiles').get() as { count: number }).count;
  if (userCount === 0) {
    const adminId = crypto.randomUUID();
    const customerId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO profiles (id, full_name, email, password_hash, phone, whatsapp_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      adminId,
      'Adebayo Ogunleye',
      'admin@zurivolt.ng',
      bcrypt.hashSync('Admin@1234', 10),
      '+234 809 123 4567',
      '+234 809 123 4567'
    );
    db.prepare('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)').run(
      crypto.randomUUID(),
      adminId,
      'admin'
    );

    db.prepare(`
      INSERT INTO profiles (id, full_name, email, password_hash, phone, whatsapp_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      customerId,
      'Chidinma Okafor',
      'chidinma@example.ng',
      bcrypt.hashSync('Customer@123', 10),
      '+234 803 555 0192',
      '+234 803 555 0192'
    );
    db.prepare('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)').run(
      crypto.randomUUID(),
      customerId,
      'customer'
    );

    db.prepare(`
      INSERT INTO addresses (id, user_id, label, full_name, phone, whatsapp_number, street_address, city, state, additional_info, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      customerId,
      'Office',
      'Chidinma Okafor',
      '+234 803 555 0192',
      '+234 803 555 0192',
      '22 Adeola Odeku Street, Victoria Island',
      'Victoria Island',
      'Lagos',
      'Call reception on arrival',
      1
    );
  }

  const catCount = (db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }).count;
  if (catCount > 0) return;

  const IMG = {
    phones: '/src/assets/images/cat_smartphones_1794983289053.jpg',
    laptops: '/src/assets/images/cat_laptops_1794983289786.jpg',
    tablets: '/src/assets/images/cat_tablets_ipads_1794983289786.jpg',
    audio: '/src/assets/images/cat_audio_airpods_1794983288924.jpg',
    power: '/src/assets/images/cat_power_banks_1794983289457.jpg',
    watches: '/src/assets/images/cat_smartwatches_1794983290592.jpg',
    tripods: '/src/assets/images/cat_tripods_speakers_1794983291055.jpg',
    hero: '/src/assets/images/hero_gadgets_showcase_1794983287261.jpg',
  };

  // Main Categories
  const mainCats = [
    { id: 'cat-smartphones', name: 'Smartphones', slug: 'smartphones', desc: 'Official warranty flagship iPhones, Samsung Galaxy, and Google Pixel smartphones.', img: IMG.phones, order: 1 },
    { id: 'cat-laptops', name: 'Laptops', slug: 'laptops', desc: 'High-performance MacBooks, Dell XPS, HP Spectre, and creator workstations.', img: IMG.laptops, order: 2 },
    { id: 'cat-tablets', name: 'Tablets', slug: 'tablets', desc: 'Portable productivity tablets for sketching, study, and mobile work.', img: IMG.tablets, order: 3 },
    { id: 'cat-ipads', name: 'iPads', slug: 'ipads', desc: 'Apple iPad Pro, iPad Air, and iPad Mini with M-series silicon.', img: IMG.tablets, order: 4 },
    { id: 'cat-new-arrivals', name: 'New Arrivals', slug: 'new-arrivals', desc: 'Freshly stocked electronics and next-generation tech releases in Nigeria.', img: IMG.hero, order: 5 },
    { id: 'cat-accessories', name: 'Accessories', slug: 'accessories', desc: 'Essential power banks, audio gear, chargers, smartwatches, and workstation tools.', img: IMG.power, order: 6 },
  ];

  const insertCat = db.prepare(`
    INSERT INTO categories (id, name, slug, description, image_url, parent_id, display_order, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);

  for (const c of mainCats) {
    insertCat.run(c.id, c.name, c.slug, c.desc, c.img, null, c.order);
  }

  // Subcategories under Accessories
  const subCats = [
    { id: 'sub-tripods', name: 'Tripods', slug: 'tripods', desc: 'Aluminum studio tripods, MagSafe mounts, and creator stabilizers.', img: IMG.tripods, order: 1 },
    { id: 'sub-earpieces', name: 'Earpieces', slug: 'earpieces', desc: 'True wireless earpieces and crystal-clear call headsets.', img: IMG.audio, order: 2 },
    { id: 'sub-airpods', name: 'AirPods', slug: 'airpods', desc: 'Apple AirPods Pro and spatial audio wireless earbuds.', img: IMG.audio, order: 3 },
    { id: 'sub-headphones', name: 'Headphones', slug: 'headphones', desc: 'Studio active noise-cancelling over-ear headphones.', img: IMG.audio, order: 4 },
    { id: 'sub-chargers', name: 'Chargers', slug: 'chargers', desc: 'Fast GaN USB-C wall adapters, MagSafe pads, and braided cables.', img: IMG.power, order: 5 },
    { id: 'sub-power-banks', name: 'Power Banks', slug: 'power-banks', desc: 'High-capacity fast-charging power banks built for uninterrupted backup.', img: IMG.power, order: 6 },
    { id: 'sub-smartwatches', name: 'Smartwatches', slug: 'smartwatches', desc: 'Health, fitness, and cellular smartwatches for iOS and Android.', img: IMG.watches, order: 7 },
    { id: 'sub-bluetooth-speakers', name: 'Bluetooth Speakers', slug: 'bluetooth-speakers', desc: 'Waterproof portable speakers with deep bass and 24-hour battery.', img: IMG.tripods, order: 8 },
    { id: 'sub-phone-accessories', name: 'Phone Accessories', slug: 'phone-accessories', desc: 'MagSafe cases, tempered glass shields, and magnetic car mounts.', img: IMG.phones, order: 9 },
    { id: 'sub-computer-accessories', name: 'Computer Accessories', slug: 'computer-accessories', desc: 'USB-C hubs, mechanical keyboards, wireless mice, and laptop stands.', img: IMG.laptops, order: 10 },
    { id: 'sub-itel-powergo', name: 'ITEL PowerGo', slug: 'itel-powergo', desc: 'Genuine ITEL PowerGo portable power stations and rugged high-capacity banks.', img: IMG.power, order: 11 },
    { id: 'sub-other-gadgets', name: 'Other Electronic Gadgets', slug: 'other-electronic-gadgets', desc: 'Smart home hubs, ring lights, SSD drives, and everyday tech essentials.', img: IMG.hero, order: 12 },
  ];

  for (const s of subCats) {
    insertCat.run(s.id, s.name, s.slug, s.desc, s.img, 'cat-accessories', s.order);
  }

  // Seed Authentic Catalog Products
  const seedProducts = [
    {
      id: 'prod-iphone-16-pro',
      name: 'iPhone 16 Pro Max 256GB',
      slug: 'iphone-16-pro-max-256gb',
      sku: 'ZV-PHN-001',
      brand: 'Apple',
      categoryId: 'cat-smartphones',
      subcategoryId: null,
      shortDesc: 'Grade 5 titanium design, A18 Pro chip, 4K 120fps Dolby Vision camera.',
      desc: 'Factory unlocked iPhone 16 Pro Max engineered in aerospace-grade titanium with a 6.9-inch Super Retina XDR ProMotion display, Camera Control, and full Nigerian 5G network compatibility.',
      specs: { Display: '6.9-inch LTPO Super Retina XDR 120Hz', Processor: 'Apple A18 Pro (3nm)', Camera: '48MP Fusion + 48MP Ultra Wide + 5x Telephoto', Battery: '4,685 mAh · USB-C Fast Charge', Warranty: '1 Year Official Apple Warranty' },
      price: 1890000,
      compareAt: 2050000,
      colors: ['Natural Titanium', 'Desert Titanium', 'Black Titanium', 'White Titanium'],
      featured: 1,
      bestSeller: 1,
      trending: 1,
      recommended: 1,
      ratingAvg: 4.9,
      ratingCount: 18,
      salesCount: 42,
      stock: 14,
      img: IMG.phones,
      variants: [
        { name: '256GB Storage', color: 'Natural Titanium', price: 1890000, sku: 'ZV-PHN-001-256', stock: 8 },
        { name: '512GB Storage', color: 'Desert Titanium', price: 2240000, sku: 'ZV-PHN-001-512', stock: 6 },
      ],
    },
    {
      id: 'prod-s24-ultra',
      name: 'Samsung Galaxy S24 Ultra 5G',
      slug: 'samsung-galaxy-s24-ultra-5g',
      sku: 'ZV-PHN-002',
      brand: 'Samsung',
      categoryId: 'cat-smartphones',
      subcategoryId: null,
      shortDesc: 'Built-in S Pen, 200MP Quad Telephoto camera, Galaxy AI productivity suite.',
      desc: 'Samsung Galaxy S24 Ultra with Corning Gorilla Armor anti-reflective display, Snapdragon 8 Gen 3 for Galaxy, 5,000 mAh all-day battery, and Nigerian dual-SIM + eSIM support.',
      specs: { Display: '6.8-inch Dynamic AMOLED 2X QHD+ 120Hz', Processor: 'Snapdragon 8 Gen 3', Camera: '200MP Wide + 50MP 5x Periscope', Battery: '5,000 mAh · 45W Super Fast Charge', S_Pen: 'Integrated Bluetooth S Pen' },
      price: 1620000,
      compareAt: 1780000,
      colors: ['Titanium Gray', 'Titanium Black', 'Titanium Violet'],
      featured: 1,
      bestSeller: 1,
      trending: 1,
      recommended: 0,
      ratingAvg: 4.8,
      ratingCount: 14,
      salesCount: 31,
      stock: 11,
      img: IMG.phones,
      variants: [
        { name: '12GB / 256GB', color: 'Titanium Gray', price: 1620000, sku: 'ZV-PHN-002-256', stock: 7 },
        { name: '12GB / 512GB', color: 'Titanium Black', price: 1840000, sku: 'ZV-PHN-002-512', stock: 4 },
      ],
    },
    {
      id: 'prod-macbook-pro-m3',
      name: 'Apple MacBook Pro 14-inch M3 Pro',
      slug: 'apple-macbook-pro-14-m3-pro',
      sku: 'ZV-LPT-001',
      brand: 'Apple',
      categoryId: 'cat-laptops',
      subcategoryId: null,
      shortDesc: '18GB unified memory, 512GB SSD, Liquid Retina XDR display, 18-hour battery.',
      desc: 'Built for Nigerian software engineers, video editors, and creative studios. Features silent thermal efficiency, three Thunderbolt 4 ports, HDMI, MagSafe 3, and Liquid Retina XDR brilliance.',
      specs: { Chip: 'Apple M3 Pro (11-Core CPU, 14-Core GPU)', Memory: '18GB Unified Memory', Storage: '512GB NVMe SSD', Display: '14.2-inch Liquid Retina XDR 120Hz', Battery: 'Up to 18 Hours' },
      price: 2950000,
      compareAt: 3180000,
      colors: ['Space Black', 'Silver'],
      featured: 1,
      bestSeller: 1,
      trending: 0,
      recommended: 1,
      ratingAvg: 5.0,
      ratingCount: 9,
      salesCount: 19,
      stock: 7,
      img: IMG.laptops,
      variants: [
        { name: '18GB RAM / 512GB SSD', color: 'Space Black', price: 2950000, sku: 'ZV-LPT-001-512', stock: 5 },
        { name: '36GB RAM / 1TB SSD', color: 'Silver', price: 3650000, sku: 'ZV-LPT-001-1TB', stock: 2 },
      ],
    },
    {
      id: 'prod-hp-spectre-x360',
      name: 'HP Spectre x360 14 OLED Touch',
      slug: 'hp-spectre-x360-14-oled',
      sku: 'ZV-LPT-002',
      brand: 'HP',
      categoryId: 'cat-laptops',
      subcategoryId: null,
      shortDesc: 'Intel Core Ultra 7, 16GB RAM, 1TB SSD, 2.8K 120Hz OLED touchscreen.',
      desc: 'Convertible 2-in-1 executive ultrabook featuring a 9MP AI webcam, Bang & Olufsen quad speakers, included rechargeable tilt pen, and precision CNC aluminum chassis.',
      specs: { Processor: 'Intel Core Ultra 7 155H', Memory: '16GB LPDDR5x', Storage: '1TB PCIe Gen4 SSD', Display: '14-inch 2.8K OLED Touch 120Hz', Weight: '1.44 kg' },
      price: 2150000,
      compareAt: 2320000,
      colors: ['Nightfall Black', 'Slate Blue'],
      featured: 0,
      bestSeller: 0,
      trending: 1,
      recommended: 1,
      ratingAvg: 4.7,
      ratingCount: 7,
      salesCount: 12,
      stock: 9,
      img: IMG.laptops,
      variants: [],
    },
    {
      id: 'prod-ipad-pro-m4',
      name: 'Apple iPad Pro 11-inch M4',
      slug: 'apple-ipad-pro-11-m4',
      sku: 'ZV-IPD-001',
      brand: 'Apple',
      categoryId: 'cat-ipads',
      subcategoryId: null,
      shortDesc: 'Ultra Retina XDR Tandem OLED, 5.3mm ultra-thin aluminum unibody.',
      desc: 'The thinnest Apple device ever built, powered by the M4 chip with hardware-accelerated ray tracing and Apple Pencil Pro compatibility for architects and digital artists.',
      specs: { Display: '11-inch Ultra Retina XDR Tandem OLED', Chip: 'Apple M4', Storage: '256GB', Connectivity: 'Wi-Fi 6E + USB-C Thunderbolt', Thickness: '5.3 mm' },
      price: 1580000,
      compareAt: 1690000,
      colors: ['Space Black', 'Silver'],
      featured: 1,
      bestSeller: 0,
      trending: 1,
      recommended: 1,
      ratingAvg: 4.9,
      ratingCount: 6,
      salesCount: 15,
      stock: 10,
      img: IMG.tablets,
      variants: [
        { name: '256GB Wi-Fi', color: 'Space Black', price: 1580000, sku: 'ZV-IPD-001-256', stock: 6 },
        { name: '512GB Wi-Fi + Cellular', color: 'Silver', price: 1920000, sku: 'ZV-IPD-001-512', stock: 4 },
      ],
    },
    {
      id: 'prod-galaxy-tab-s9',
      name: 'Samsung Galaxy Tab S9 FE+ 12.4"',
      slug: 'samsung-galaxy-tab-s9-fe-plus',
      sku: 'ZV-TAB-001',
      brand: 'Samsung',
      categoryId: 'cat-tablets',
      subcategoryId: null,
      shortDesc: 'IP68 water-resistant tablet with S Pen included in the box.',
      desc: 'Crisp 12.4-inch 90Hz display, 10,090 mAh battery, microSD expandable storage, and DeX desktop mode for effortless remote productivity across Nigeria.',
      specs: { Display: '12.4-inch WQXGA 90Hz', Memory: '8GB RAM / 128GB Storage', Durability: 'IP68 Water & Dust Resistant', Battery: '10,090 mAh', Included: 'S Pen Stylus' },
      price: 765000,
      compareAt: 840000,
      colors: ['Mint', 'Silver', 'Gray'],
      featured: 0,
      bestSeller: 1,
      trending: 0,
      recommended: 1,
      ratingAvg: 4.6,
      ratingCount: 11,
      salesCount: 22,
      stock: 15,
      img: IMG.tablets,
      variants: [],
    },
    {
      id: 'prod-airpods-pro-2',
      name: 'Apple AirPods Pro (2nd Gen USB-C)',
      slug: 'apple-airpods-pro-2-usbc',
      sku: 'ZV-ACC-001',
      brand: 'Apple',
      categoryId: 'cat-accessories',
      subcategoryId: 'sub-airpods',
      shortDesc: '2x Active Noise Cancellation, Adaptive Audio, MagSafe USB-C charging case.',
      desc: 'H2-powered acoustic clarity with Conversation Awareness, personalized spatial audio, and Precision Finding built into the IP54 dust and sweat resistant charging case.',
      specs: { Chip: 'Apple H2 Headphone Chip', Audio: 'Active Noise Cancellation + Transparency', Battery: 'Up to 30 Hours with Case', Charging: 'USB-C, MagSafe & Apple Watch Charger' },
      price: 385000,
      compareAt: 420000,
      colors: ['White'],
      featured: 1,
      bestSeller: 1,
      trending: 1,
      recommended: 1,
      ratingAvg: 4.9,
      ratingCount: 29,
      salesCount: 68,
      stock: 24,
      img: IMG.audio,
      variants: [],
    },
    {
      id: 'prod-sony-wh1000xm5',
      name: 'Sony WH-1000XM5 Wireless ANC Headphones',
      slug: 'sony-wh-1000xm5-anc-headphones',
      sku: 'ZV-ACC-002',
      brand: 'Sony',
      categoryId: 'cat-accessories',
      subcategoryId: 'sub-headphones',
      shortDesc: 'Industry-leading 8-mic noise cancellation, 30-hour battery, multipoint Bluetooth.',
      desc: 'Engineered with two processors controlling eight microphones for unmatched noise isolation in busy Lagos offices or flights, with soft-fit leather earcups.',
      specs: { Driver: '30mm Precision Carbon Fiber', Battery: '30 Hours (ANC On) · 3 min = 3 hrs', Microphones: '8-Mic AI Beamforming Calls', Connectivity: 'Bluetooth 5.2 Multipoint' },
      price: 545000,
      compareAt: 610000,
      colors: ['Platinum Silver', 'Midnight Black'],
      featured: 1,
      bestSeller: 0,
      trending: 1,
      recommended: 1,
      ratingAvg: 4.8,
      ratingCount: 16,
      salesCount: 27,
      stock: 12,
      img: IMG.audio,
      variants: [],
    },
    {
      id: 'prod-itel-powergo-27000',
      name: 'ITEL PowerGo 27,000mAh 65W Laptop Power Bank',
      slug: 'itel-powergo-27000mah-65w',
      sku: 'ZV-PWR-001',
      brand: 'ITEL',
      categoryId: 'cat-accessories',
      subcategoryId: 'sub-itel-powergo',
      shortDesc: 'Charges laptops, iPads & phones at 65W PD with live digital wattage readout.',
      desc: 'Built specifically for heavy power backup needs in Nigeria. Features dual USB-C 65W Power Delivery ports, USB-A fast charge, rugged shockproof casing, and LED percentage display.',
      specs: { Capacity: '27,000mAh / 99.9Wh', Output: '65W USB-C Power Delivery (Laptop Ready)', Ports: '2x USB-C + 2x USB-A', Display: 'Smart Digital Percentage & Wattage Screen' },
      price: 68500,
      compareAt: 82000,
      colors: ['Matte Black / Orange'],
      featured: 1,
      bestSeller: 1,
      trending: 1,
      recommended: 1,
      ratingAvg: 4.8,
      ratingCount: 37,
      salesCount: 94,
      stock: 35,
      img: IMG.power,
      variants: [],
    },
    {
      id: 'prod-anker-65w-gan',
      name: 'Anker 735 GaNPrime 65W 3-Port Fast Charger',
      slug: 'anker-735-ganprime-65w-charger',
      sku: 'ZV-CHG-001',
      brand: 'Anker',
      categoryId: 'cat-accessories',
      subcategoryId: 'sub-chargers',
      shortDesc: 'Charge a MacBook, iPhone, and AirPods simultaneously with ActiveShield 2.0.',
      desc: 'Compact UK/Nigeria 3-pin compatible GaN wall adapter with intelligent power allocation across two USB-C ports and one USB-A port, plus surge and temperature protection.',
      specs: { Power: '65W Total Max Output', Ports: '2x USB-C + 1x USB-A', Technology: 'GaNPrime + ActiveShield 2.0', Cable: 'Includes 1.5m 100W Braided USB-C Cable' },
      price: 52000,
      compareAt: 62000,
      colors: ['Obsidian Black'],
      featured: 0,
      bestSeller: 1,
      trending: 0,
      recommended: 1,
      ratingAvg: 4.9,
      ratingCount: 21,
      salesCount: 53,
      stock: 40,
      img: IMG.power,
      variants: [],
    },
    {
      id: 'prod-watch-ultra-2',
      name: 'Apple Watch Ultra 2 Titanium 49mm',
      slug: 'apple-watch-ultra-2-titanium-49mm',
      sku: 'ZV-WTC-001',
      brand: 'Apple',
      categoryId: 'cat-accessories',
      subcategoryId: 'sub-smartwatches',
      shortDesc: 'Aerospace titanium case, 3000-nit sapphire display, GPS + Cellular.',
      desc: 'Precision dual-frequency GPS, up to 72 hours in Low Power Mode, ECG & blood oxygen sensors, and 100m water resistance paired with a rugged fluoroelastomer band.',
      specs: { Case: '49mm Aerospace-Grade Titanium', Display: '3,000-nit Always-On Retina Sapphire', Battery: '36 Hours Normal / 72 Hours Low Power', WaterResistance: '100m EN13319 Certified' },
      price: 1290000,
      compareAt: 1380000,
      colors: ['Natural Titanium / Blue Band', 'Black Titanium'],
      featured: 1,
      bestSeller: 0,
      trending: 1,
      recommended: 0,
      ratingAvg: 4.9,
      ratingCount: 8,
      salesCount: 16,
      stock: 8,
      img: IMG.watches,
      variants: [],
    },
    {
      id: 'prod-jbl-flip-6-tripod-bundle',
      name: 'JBL Flip 6 Waterproof Bluetooth Speaker',
      slug: 'jbl-flip-6-waterproof-speaker',
      sku: 'ZV-SPK-001',
      brand: 'JBL',
      categoryId: 'cat-accessories',
      subcategoryId: 'sub-bluetooth-speakers',
      shortDesc: 'IP67 waterproof & dustproof, 12-hour playtime, PartyBoost stereo pairing.',
      desc: 'Bold JBL Original Pro Sound engineered with a racetrack-shaped woofer, separate tweeter, and dual passive radiators for rich outdoor and indoor audio.',
      specs: { Power: '30W RMS (20W Woofer + 10W Tweeter)', Battery: '12 Hours Continuous Play', Durability: 'IP67 Waterproof & Dustproof', Bluetooth: 'v5.1 + PartyBoost' },
      price: 185000,
      compareAt: 215000,
      colors: ['Squad Black', 'Cobalt Blue'],
      featured: 0,
      bestSeller: 1,
      trending: 1,
      recommended: 1,
      ratingAvg: 4.8,
      ratingCount: 19,
      salesCount: 44,
      stock: 18,
      img: IMG.tripods,
      variants: [],
    },
    {
      id: 'prod-ulanzi-mag-tripod',
      name: 'Ulanzi MT-44 MagSafe Aluminum Creator Tripod',
      slug: 'ulanzi-mt44-magsafe-aluminum-tripod',
      sku: 'ZV-TRP-001',
      brand: 'Ulanzi',
      categoryId: 'cat-accessories',
      subcategoryId: 'sub-tripods',
      shortDesc: 'Extendable 1.5m aluminum tripod with 360-degree magnetic phone & camera mount.',
      desc: 'Built for Nigerian content creators, livestreamers, and mobile photographers. Includes a strong N52 MagSafe ring mount, cold-shoe mic slot, and Bluetooth shutter remote.',
      specs: { Material: 'CNC Anodized Aluminum Alloy', Height: '32cm Folded to 150cm Extended', Mount: 'MagSafe Ring + 1/4" Universal Camera Screw', Weight: '410g' },
      price: 44500,
      compareAt: 54000,
      colors: ['Space Gray'],
      featured: 0,
      bestSeller: 0,
      trending: 1,
      recommended: 1,
      ratingAvg: 4.7,
      ratingCount: 12,
      salesCount: 28,
      stock: 22,
      img: IMG.tripods,
      variants: [],
    },
    {
      id: 'prod-oraimo-freepods-4',
      name: 'Oraimo FreePods 4 ANC Wireless Earpieces',
      slug: 'oraimo-freepods-4-anc-earpieces',
      sku: 'ZV-EAR-001',
      brand: 'Oraimo',
      categoryId: 'cat-accessories',
      subcategoryId: 'sub-earpieces',
      shortDesc: '30dB Active Noise Cancellation, HavyBass tuning, 35.5-hour total playtime.',
      desc: 'Engineered for crisp Lagos street calls with 4-mic ENC noise cancellation, fast AniFast charging (10 mins = 170 mins playtime), and custom EQ via the Oraimo Sound app.',
      specs: { ANC: '30dB Active Noise Cancellation', Playtime: '8.5 Hrs + 27 Hrs Case', Charging: 'USB-C AniFast', WaterResistance: 'IPX5 Splash Proof' },
      price: 42000,
      compareAt: 49500,
      colors: ['Obsidian Black', 'Glacier White'],
      featured: 0,
      bestSeller: 1,
      trending: 0,
      recommended: 1,
      ratingAvg: 4.6,
      ratingCount: 33,
      salesCount: 79,
      stock: 30,
      img: IMG.audio,
      variants: [],
    },
    {
      id: 'prod-baseus-powerbank-20k',
      name: 'Baseus Bipow Pro 20,000mAh 22.5W Power Bank',
      slug: 'baseus-bipow-pro-20000mah-power-bank',
      sku: 'ZV-PWR-002',
      brand: 'Baseus',
      categoryId: 'cat-accessories',
      subcategoryId: 'sub-power-banks',
      shortDesc: 'Slim pocket-ready 20,000mAh fast charging pack with digital LED readout.',
      desc: 'Supports Huawei SCP 22.5W and Apple PD 20W fast charging with three output ports so you can top up three devices simultaneously.',
      specs: { Capacity: '20,000mAh / 74Wh', Output: '22.5W Max Fast Charge', Ports: '1x USB-C + 2x USB-A', Display: 'LED Digital Percentage' },
      price: 39500,
      compareAt: 46000,
      colors: ['Matte Black', 'Sky Blue'],
      featured: 0,
      bestSeller: 1,
      trending: 1,
      recommended: 0,
      ratingAvg: 4.7,
      ratingCount: 24,
      salesCount: 61,
      stock: 4,
      img: IMG.power,
      variants: [],
    },
    {
      id: 'prod-ugreen-usbc-hub',
      name: 'Ugreen Revodok Pro 9-in-1 USB-C Docking Hub',
      slug: 'ugreen-revodok-9in1-usbc-hub',
      sku: 'ZV-CMP-001',
      brand: 'Ugreen',
      categoryId: 'cat-accessories',
      subcategoryId: 'sub-computer-accessories',
      shortDesc: 'Dual 4K 60Hz HDMI, 100W PD pass-through, Gigabit Ethernet & SD/TF reader.',
      desc: 'Expand any MacBook, Dell XPS, or iPad Pro into a full workstation with 10Gbps USB-A/USB-C data ports and stable wired Ethernet.',
      specs: { Video: '4K @ 60Hz HDMI', Power: '100W USB-C PD Pass-Through', Network: '1000Mbps RJ45 Gigabit Ethernet', Body: 'Brushed Aluminum Heat-Dissipating Shell' },
      price: 78000,
      compareAt: 92000,
      colors: ['Space Gray'],
      featured: 0,
      bestSeller: 0,
      trending: 0,
      recommended: 1,
      ratingAvg: 4.8,
      ratingCount: 10,
      salesCount: 18,
      stock: 16,
      img: IMG.laptops,
      variants: [],
    },
    {
      id: 'prod-magsafe-armor-kit',
      name: 'ZuriVolt MagSafe Aramid Case & Sapphire Guard Kit',
      slug: 'zurivolt-magsafe-aramid-case-kit',
      sku: 'ZV-PAC-001',
      brand: 'ZuriVolt',
      categoryId: 'cat-accessories',
      subcategoryId: 'sub-phone-accessories',
      shortDesc: 'Drop-tested 3m MagSafe case bundled with edge-to-edge tempered glass.',
      desc: 'Precision-molded MagSafe N52 magnetic ring for instant wireless charging alignment and tactile aluminum buttons.',
      specs: { Protection: '3-Meter Military Drop Tested', Magnet: 'N52 MagSafe Array', Included: 'Case + 9H Anti-Fingerprint Glass + Alignment Tray' },
      price: 24500,
      compareAt: 31000,
      colors: ['Cobalt Blue', 'Matte Black'],
      featured: 0,
      bestSeller: 0,
      trending: 0,
      recommended: 1,
      ratingAvg: 4.7,
      ratingCount: 15,
      salesCount: 38,
      stock: 45,
      img: IMG.phones,
      variants: [],
    },
    {
      id: 'prod-sandisk-ssd-1tb',
      name: 'SanDisk Extreme 1TB Portable NVMe SSD',
      slug: 'sandisk-extreme-1tb-portable-ssd',
      sku: 'ZV-OTH-001',
      brand: 'SanDisk',
      categoryId: 'cat-accessories',
      subcategoryId: 'sub-other-gadgets',
      shortDesc: '1,050MB/s read speed, IP65 water & dust resistance, USB-C 3.2 Gen 2.',
      desc: 'Rugged pocket SSD built for backing up 4K ProRes video shoots, photography archives, and project files with 256-bit AES hardware encryption.',
      specs: { Capacity: '1TB NVMe Solid State', Speed: 'Up to 1,050MB/s Read · 1,000MB/s Write', Durability: 'IP65 + 3-Meter Drop Protection', Interface: 'USB-C 3.2 Gen 2' },
      price: 175000,
      compareAt: 198000,
      colors: ['Monterey Black / Orange'],
      featured: 0,
      bestSeller: 0,
      trending: 1,
      recommended: 1,
      ratingAvg: 4.9,
      ratingCount: 13,
      salesCount: 25,
      stock: 13,
      img: IMG.power,
      variants: [],
    },
  ];

  const insertProd = db.prepare(`
    INSERT INTO products (
      id, name, slug, sku, brand, category_id, subcategory_id,
      short_description, description, specifications, price_ngn, compare_at_price_ngn,
      available_colors, is_featured, is_best_seller, is_trending, is_recommended,
      is_published, rating_avg, rating_count, sales_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `);
  const insertImg = db.prepare(`
    INSERT INTO product_images (id, product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertVariant = db.prepare(`
    INSERT INTO product_variants (id, product_id, name, color, price_ngn, sku, stock_qty)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertInv = db.prepare(`
    INSERT INTO inventory (id, product_id, quantity_available, quantity_reserved, low_stock_threshold)
    VALUES (?, ?, ?, 0, 5)
  `);

  for (const p of seedProducts) {
    insertProd.run(
      p.id,
      p.name,
      p.slug,
      p.sku,
      p.brand,
      p.categoryId,
      p.subcategoryId,
      p.shortDesc,
      p.desc,
      JSON.stringify(p.specs),
      p.price,
      p.compareAt,
      JSON.stringify(p.colors),
      p.featured,
      p.bestSeller,
      p.trending,
      p.recommended,
      p.ratingAvg,
      p.ratingCount,
      p.salesCount
    );
    insertImg.run(crypto.randomUUID(), p.id, p.img, p.name, 0, 1);
    insertImg.run(crypto.randomUUID(), p.id, IMG.hero, `${p.name} studio setup`, 1, 0);
    insertInv.run(crypto.randomUUID(), p.id, p.stock);
    for (const v of p.variants) {
      insertVariant.run(crypto.randomUUID(), p.id, v.name, v.color, v.price, v.sku, v.stock);
    }
  }

  // Seed active coupons
  const insertCoupon = db.prepare(`
    INSERT INTO coupons (id, code, discount_type, discount_value, min_order_ngn, max_discount_ngn, usage_limit, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);
  insertCoupon.run(crypto.randomUUID(), 'ZURIVOLT5', 'percent', 5, 50000, 50000, 500);
  insertCoupon.run(crypto.randomUUID(), 'WELCOME10K', 'fixed', 10000, 150000, 10000, 200);

  // Seed verified customer order & reviews so customer review section & order tracking are immediately rich
  const cust = db.prepare('SELECT id, full_name, email FROM profiles WHERE email = ?').get('chidinma@example.ng') as { id: string; full_name: string; email: string } | undefined;
  if (cust) {
    const sampleOrderId = 'ord-seed-1001';
    db.prepare(`
      INSERT INTO orders (
        id, order_number, user_id, customer_name, customer_email, customer_phone, customer_whatsapp,
        delivery_address, delivery_city, delivery_state, delivery_notes, subtotal_ngn, delivery_fee_ngn,
        discount_ngn, total_ngn, payment_status, order_status, paystack_reference, stock_deducted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'delivered', ?, 1)
    `).run(
      sampleOrderId,
      'ZV-2026-1001',
      cust.id,
      cust.full_name,
      cust.email,
      '+234 803 555 0192',
      '+234 803 555 0192',
      '22 Adeola Odeku Street, Victoria Island',
      'Victoria Island',
      'Lagos',
      'Call on arrival',
      453500,
      0,
      0,
      453500,
      'PAY-ZV-2026-1001'
    );
    db.prepare(`
      INSERT INTO order_items (id, order_id, product_id, product_name, product_image, selected_color, selected_variant, unit_price_ngn, quantity, line_total_ngn)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      sampleOrderId,
      'prod-airpods-pro-2',
      'Apple AirPods Pro (2nd Gen USB-C)',
      IMG.audio,
      'White',
      '',
      385000,
      1,
      385000
    );
    db.prepare(`
      INSERT INTO order_items (id, order_id, product_id, product_name, product_image, selected_color, selected_variant, unit_price_ngn, quantity, line_total_ngn)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      sampleOrderId,
      'prod-itel-powergo-27000',
      'ITEL PowerGo 27,000mAh 65W Laptop Power Bank',
      IMG.power,
      'Matte Black / Orange',
      '',
      68500,
      1,
      68500
    );
    db.prepare(`
      INSERT INTO payments (id, order_id, paystack_reference, amount_kobo, currency, status, channel, gateway_response, verified_at)
      VALUES (?, ?, ?, ?, 'NGN', 'success', 'card', 'Successful', datetime('now', '-2 days'))
    `).run(crypto.randomUUID(), sampleOrderId, 'PAY-ZV-2026-1001', 45350000);

    db.prepare(`
      INSERT INTO reviews (id, product_id, user_id, order_id, author_name, rating, title, comment, is_verified_purchase, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'approved')
    `).run(
      crypto.randomUUID(),
      'prod-airpods-pro-2',
      cust.id,
      sampleOrderId,
      'Chidinma Okafor',
      5,
      'Sealed original Apple unit & same-day VI delivery',
      'Verified serial number directly on Apple Check Coverage before opening. Paystack checkout was seamless and dispatch reached Victoria Island within 3 hours.',
    );

    db.prepare(`
      INSERT INTO reviews (id, product_id, user_id, order_id, author_name, rating, title, comment, is_verified_purchase, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'approved')
    `).run(
      crypto.randomUUID(),
      'prod-itel-powergo-27000',
      cust.id,
      sampleOrderId,
      'Chidinma Okafor',
      5,
      'Charges my MacBook without blinking',
      'The 65W USB-C output keeps my laptop running through full power outages. Build feels sturdy and the digital wattage screen is super helpful.',
    );
  }
}
