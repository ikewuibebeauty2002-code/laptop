import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import { db } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'zurivolt-dev-secret-change-in-production';

interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

interface AuthedRequest extends Request {
  auth?: AuthPayload;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(process.cwd(), 'public', 'uploads'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `zv-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function getAuthFromRequest(req: Request): AuthPayload | null {
  const cookieToken = req.cookies?.zv_token;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = cookieToken || bearerToken;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  req.auth = auth;
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    res.status(401).json({ error: 'Admin authentication required' });
    return;
  }
  const roleRow = db
    .prepare("SELECT role FROM user_roles WHERE user_id = ? AND role IN ('admin', 'super_admin')")
    .get(auth.userId) as { role: string } | undefined;

  if (!roleRow) {
    res.status(403).json({ error: 'Forbidden: Administrator role required' });
    return;
  }
  req.auth = { ...auth, role: roleRow.role };
  next();
}

function getStoreSettingsMap(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM store_settings').all() as Array<{ key: string; value: string }>;
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

function formatProductRow(row: Record<string, unknown>) {
  const images = db
    .prepare('SELECT id, product_id as productId, image_url as imageUrl, alt_text as altText, sort_order as sortOrder, is_primary as isPrimary FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC')
    .all(row.id) as Array<Record<string, unknown>>;

  const variants = db
    .prepare('SELECT id, product_id as productId, name, color, price_ngn as priceNgn, sku, stock_qty as stockQty FROM product_variants WHERE product_id = ? ORDER BY price_ngn ASC')
    .all(row.id) as Array<Record<string, unknown>>;

  const inv = db
    .prepare('SELECT quantity_available, low_stock_threshold FROM inventory WHERE product_id = ?')
    .get(row.id) as { quantity_available: number; low_stock_threshold: number } | undefined;

  let specs: Record<string, string> = {};
  try {
    specs = JSON.parse((row.specifications as string) || '{}');
  } catch {
    specs = {};
  }

  let colors: string[] = [];
  try {
    colors = JSON.parse((row.available_colors as string) || '[]');
  } catch {
    colors = [];
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    brand: row.brand,
    categoryId: row.category_id,
    categoryName: row.category_name || '',
    categorySlug: row.category_slug || '',
    subcategoryId: row.subcategory_id,
    subcategoryName: row.subcategory_name || '',
    subcategorySlug: row.subcategory_slug || '',
    shortDescription: row.short_description,
    description: row.description,
    specifications: specs,
    priceNgn: Number(row.price_ngn),
    compareAtPriceNgn: row.compare_at_price_ngn ? Number(row.compare_at_price_ngn) : null,
    availableColors: colors,
    isFeatured: Boolean(row.is_featured),
    isBestSeller: Boolean(row.is_best_seller),
    isTrending: Boolean(row.is_trending),
    isRecommended: Boolean(row.is_recommended),
    isPublished: Boolean(row.is_published),
    ratingAvg: Number(row.rating_avg || 0),
    ratingCount: Number(row.rating_count || 0),
    salesCount: Number(row.sales_count || 0),
    stockAvailable: inv ? inv.quantity_available : 0,
    lowStockThreshold: inv ? inv.low_stock_threshold : 5,
    images: images.map((im) => ({ ...im, isPrimary: Boolean(im.isPrimary) })),
    variants,
    createdAt: row.created_at,
  };
}

function formatOrderRow(row: Record<string, unknown>) {
  const items = db
    .prepare(
      'SELECT id, order_id as orderId, product_id as productId, variant_id as variantId, product_name as productName, product_image as productImage, selected_color as selectedColor, selected_variant as selectedVariant, unit_price_ngn as unitPriceNgn, quantity, line_total_ngn as lineTotalNgn FROM order_items WHERE order_id = ?'
    )
    .all(row.id);

  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    customerWhatsapp: row.customer_whatsapp,
    deliveryAddress: row.delivery_address,
    deliveryCity: row.delivery_city,
    deliveryState: row.delivery_state,
    deliveryNotes: row.delivery_notes,
    couponCode: row.coupon_code,
    subtotalNgn: Number(row.subtotal_ngn),
    deliveryFeeNgn: Number(row.delivery_fee_ngn),
    discountNgn: Number(row.discount_ngn),
    totalNgn: Number(row.total_ngn),
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    paystackReference: row.paystack_reference,
    stockDeducted: Boolean(row.stock_deducted),
    stockRestored: Boolean(row.stock_restored),
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function logAdminAction(adminUserId: string, action: string, entityType: string, entityId: string, details: unknown = {}): void {
  db.prepare(
    'INSERT INTO admin_activity_logs (id, admin_user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(crypto.randomUUID(), adminUserId, action, entityType, entityId, JSON.stringify(details));
}

// Atomic payment verification & stock deduction
function confirmOrderPaidAtomic(orderId: string, reference: string, channel = 'card', gatewayResponse = 'Approved', rawPayload: unknown = {}): { ok: boolean; error?: string } {
  const tx = db.transaction(() => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as Record<string, unknown> | undefined;
    if (!order) return { ok: false, error: 'Order not found' };
    if (order.stock_deducted) {
      return { ok: true };
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId) as Array<Record<string, unknown>>;
    for (const item of items) {
      if (item.product_id) {
        const inv = db
          .prepare('SELECT quantity_available FROM inventory WHERE product_id = ?')
          .get(item.product_id) as { quantity_available: number } | undefined;

        const qty = Number(item.quantity);
        if (!inv || inv.quantity_available < qty) {
          throw new Error(`Insufficient stock for ${item.product_name}`);
        }

        db.prepare('UPDATE inventory SET quantity_available = quantity_available - ?, updated_at = datetime(\'now\') WHERE product_id = ?').run(
          qty,
          item.product_id
        );
        db.prepare('UPDATE products SET sales_count = sales_count + ?, updated_at = datetime(\'now\') WHERE id = ?').run(
          qty,
          item.product_id
        );

        if (item.variant_id) {
          db.prepare('UPDATE product_variants SET stock_qty = MAX(0, stock_qty - ?) WHERE id = ?').run(qty, item.variant_id);
        }
      }
    }

    if (order.coupon_code) {
      db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE code = ?').run(order.coupon_code);
    }

    db.prepare(`
      UPDATE orders
      SET payment_status = 'paid',
          order_status = 'paid',
          paystack_reference = ?,
          stock_deducted = 1,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(reference, orderId);

    db.prepare(`
      UPDATE payments
      SET status = 'success',
          channel = ?,
          gateway_response = ?,
          raw_payload = ?,
          verified_at = datetime('now')
      WHERE paystack_reference = ?
    `).run(channel, gatewayResponse, JSON.stringify(rawPayload), reference);

    // Ensure delivery record exists
    db.prepare(`
      INSERT OR IGNORE INTO delivery_records (id, order_id, status)
      VALUES (?, ?, 'awaiting_dispatch')
    `).run(crypto.randomUUID(), orderId);

    // Clear user's persisted cart after payment is verified
    if (order.user_id) {
      const cart = db.prepare('SELECT id FROM carts WHERE user_id = ?').get(order.user_id) as { id: string } | undefined;
      if (cart) {
        db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.id);
      }
    }

    return { ok: true };
  });

  try {
    return tx();
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export function createApiRouter(): express.Router {
  const router = express.Router();

  // ================= STORE SETTINGS =================
  router.get('/store/settings', (_req, res) => {
    const map = getStoreSettingsMap();
    const psSecret = String(process.env.PAYSTACK_SECRET_KEY || '').trim();
    const psPub = String(map.paystackPublicKey || process.env.VITE_PAYSTACK_PUBLIC_KEY || '').trim();
    const mode = psSecret.startsWith('sk_live_')
      ? 'live'
      : psSecret.startsWith('sk_test_')
        ? 'test_live_keys'
        : 'sandbox';

    res.json({
      storeName: map.storeName || 'ZuriVolt Gadgets',
      whatsappNumber: map.whatsappNumber || '2348091234567',
      supportEmail: map.supportEmail || 'support@zurivolt.ng',
      supportPhone: map.supportPhone || '+234 809 123 4567',
      storeAddress: map.storeAddress || '14 Admiralty Way, Lekki Phase 1, Lagos, Nigeria',
      instagramUrl: map.instagramUrl || '',
      twitterUrl: map.twitterUrl || '',
      facebookUrl: map.facebookUrl || '',
      freeDeliveryThresholdNgn: Number(map.freeDeliveryThresholdNgn || 350000),
      lagosDeliveryFeeNgn: Number(map.lagosDeliveryFeeNgn || 3500),
      nationwideDeliveryFeeNgn: Number(map.nationwideDeliveryFeeNgn || 6500),
      paystackMode: mode,
      paystackPublicKey: psPub,
      paystackPublicKeyConfigured: Boolean(psPub),
    });
  });

  // ================= AUTHENTICATION =================
  router.post('/auth/register', (req, res) => {
    try {
      const { fullName, email, password, phone = '', whatsappNumber = '' } = req.body;
      if (!fullName?.trim() || !email?.trim() || !password || password.length < 6) {
        res.status(400).json({ error: 'Full name, valid email, and password (min 6 chars) are required' });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existing = db.prepare('SELECT id FROM profiles WHERE email = ?').get(normalizedEmail);
      if (existing) {
        res.status(409).json({ error: 'An account with this email already exists' });
        return;
      }

      const id = crypto.randomUUID();
      const hash = bcrypt.hashSync(password, 10);

      db.prepare(
        'INSERT INTO profiles (id, full_name, email, password_hash, phone, whatsapp_number) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, fullName.trim(), normalizedEmail, hash, phone.trim(), (whatsappNumber || phone).trim());

      db.prepare('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)').run(crypto.randomUUID(), id, 'customer');

      const token = signToken({ userId: id, email: normalizedEmail, role: 'customer' });
      res.cookie('zv_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 });
      res.status(201).json({
        user: {
          id,
          fullName: fullName.trim(),
          email: normalizedEmail,
          phone: phone.trim(),
          whatsappNumber: (whatsappNumber || phone).trim(),
          role: 'customer',
          createdAt: new Date().toISOString(),
        },
        token,
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = db.prepare('SELECT * FROM profiles WHERE email = ?').get(email.trim().toLowerCase()) as Record<string, unknown> | undefined;
    if (!user || !bcrypt.compareSync(password, user.password_hash as string)) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const roleRow = db.prepare('SELECT role FROM user_roles WHERE user_id = ? ORDER BY CASE WHEN role = \'super_admin\' THEN 1 WHEN role = \'admin\' THEN 2 ELSE 3 END LIMIT 1').get(user.id) as { role: string } | undefined;
    const role = roleRow?.role || 'customer';

    const token = signToken({ userId: user.id as string, email: user.email as string, role });
    res.cookie('zv_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 });
    res.json({
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        whatsappNumber: user.whatsapp_number,
        role,
        createdAt: user.created_at,
      },
      token,
    });
  });

  router.post('/auth/logout', (_req, res) => {
    res.clearCookie('zv_token');
    res.json({ success: true });
  });

  router.get('/auth/me', (req, res) => {
    const auth = getAuthFromRequest(req);
    if (!auth) {
      res.json({ user: null });
      return;
    }
    const user = db.prepare('SELECT id, full_name, email, phone, whatsapp_number, created_at FROM profiles WHERE id = ?').get(auth.userId) as Record<string, unknown> | undefined;
    if (!user) {
      res.json({ user: null });
      return;
    }
    const roleRow = db.prepare('SELECT role FROM user_roles WHERE user_id = ? ORDER BY CASE WHEN role = \'super_admin\' THEN 1 WHEN role = \'admin\' THEN 2 ELSE 3 END LIMIT 1').get(user.id) as { role: string } | undefined;
    res.json({
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        whatsappNumber: user.whatsapp_number,
        role: roleRow?.role || 'customer',
        createdAt: user.created_at,
      },
    });
  });

  router.put('/auth/profile', requireAuth, (req: AuthedRequest, res) => {
    const { fullName, phone, whatsappNumber } = req.body;
    if (!fullName?.trim()) {
      res.status(400).json({ error: 'Full name is required' });
      return;
    }
    db.prepare('UPDATE profiles SET full_name = ?, phone = ?, whatsapp_number = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
      fullName.trim(),
      (phone || '').trim(),
      (whatsappNumber || '').trim(),
      req.auth!.userId
    );
    res.json({ success: true });
  });

  router.post('/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email?.trim()) {
      res.status(400).json({ error: 'Email address is required' });
      return;
    }
    const normalized = email.trim().toLowerCase();
    const user = db.prepare('SELECT id FROM profiles WHERE email = ?').get(normalized) as { id: string } | undefined;
    if (!user) {
      // Do not leak user existence in production, return helpful demo note if needed
      res.json({ message: 'If an account exists for that email, a password reset link has been issued.' });
      return;
    }
    const resetToken = crypto.randomBytes(20).toString('hex');
    db.prepare('UPDATE profiles SET reset_token = ?, reset_expires_at = datetime(\'now\', \'+1 hour\') WHERE id = ?').run(
      resetToken,
      user.id
    );
    res.json({
      message: 'Password reset token generated. Use the link below to set a new password.',
      resetToken,
    });
  });

  router.post('/auth/reset-password', (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Valid reset token and password (min 6 characters) are required' });
      return;
    }
    const user = db
      .prepare('SELECT id FROM profiles WHERE reset_token = ? AND reset_expires_at > datetime(\'now\')')
      .get(token) as { id: string } | undefined;
    if (!user) {
      res.status(400).json({ error: 'Reset link is invalid or has expired' });
      return;
    }
    db.prepare('UPDATE profiles SET password_hash = ?, reset_token = NULL, reset_expires_at = NULL, updated_at = datetime(\'now\') WHERE id = ?').run(
      bcrypt.hashSync(newPassword, 10),
      user.id
    );
    res.json({ success: true });
  });

  // ================= ADDRESSES =================
  router.get('/addresses', requireAuth, (req: AuthedRequest, res) => {
    const rows = db
      .prepare('SELECT id, user_id as userId, label, full_name as fullName, phone, whatsapp_number as whatsappNumber, street_address as streetAddress, city, state, additional_info as additionalInfo, is_default as isDefault FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC')
      .all(req.auth!.userId) as Array<Record<string, unknown>>;
    res.json(rows.map((r) => ({ ...r, isDefault: Boolean(r.isDefault) })));
  });

  router.post('/addresses', requireAuth, (req: AuthedRequest, res) => {
    const { label = 'Home', fullName, phone, whatsappNumber, streetAddress, city, state, additionalInfo = '', isDefault = false } = req.body;
    if (!fullName || !phone || !streetAddress || !city || !state) {
      res.status(400).json({ error: 'All required address fields must be filled' });
      return;
    }
    if (isDefault) {
      db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.auth!.userId);
    }
    const id = crypto.randomUUID();
    db.prepare(
      'INSERT INTO addresses (id, user_id, label, full_name, phone, whatsapp_number, street_address, city, state, additional_info, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, req.auth!.userId, label, fullName, phone, whatsappNumber || phone, streetAddress, city, state, additionalInfo, isDefault ? 1 : 0);
    res.status(201).json({ id });
  });

  router.delete('/addresses/:id', requireAuth, (req: AuthedRequest, res) => {
    db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(req.params.id, req.auth!.userId);
    res.json({ success: true });
  });

  // ================= CATEGORIES =================
  router.get('/categories', (_req, res) => {
    const rows = db
      .prepare(`
        SELECT c.id, c.name, c.slug, c.description, c.image_url as imageUrl, c.parent_id as parentId,
               c.display_order as displayOrder, c.is_active as isActive,
               (SELECT COUNT(*) FROM products p WHERE p.is_published = 1 AND (p.category_id = c.id OR p.subcategory_id = c.id)) as productCount
        FROM categories c
        WHERE c.is_active = 1
        ORDER BY c.display_order ASC, c.name ASC
      `)
      .all() as Array<Record<string, unknown>>;
    res.json(rows.map((r) => ({ ...r, isActive: Boolean(r.isActive) })));
  });

  // ================= PRODUCTS & SEARCH =================
  router.get('/products', (req, res) => {
    const {
      category,
      section,
      search,
      brand,
      minPrice,
      maxPrice,
      inStock,
      sort = 'newest',
      page = '1',
      limit = '12',
    } = req.query as Record<string, string>;

    const where: string[] = ['p.is_published = 1'];
    const params: unknown[] = [];

    if (category && category !== 'all' && category !== 'new-arrivals') {
      where.push('(c.slug = ? OR sc.slug = ? OR p.category_id = ? OR p.subcategory_id = ?)');
      params.push(category, category, category, category);
    }

    if (section === 'featured') where.push('p.is_featured = 1');
    if (section === 'best_sellers') where.push('p.is_best_seller = 1');
    if (section === 'trending') where.push('p.is_trending = 1');
    if (section === 'recommended') where.push('p.is_recommended = 1');
    if (section === 'deals') where.push('p.compare_at_price_ngn IS NOT NULL AND p.compare_at_price_ngn > p.price_ngn');

    if (brand && brand !== 'all') {
      where.push('LOWER(p.brand) = LOWER(?)');
      params.push(brand);
    }
    if (minPrice) {
      where.push('p.price_ngn >= ?');
      params.push(Number(minPrice));
    }
    if (maxPrice) {
      where.push('p.price_ngn <= ?');
      params.push(Number(maxPrice));
    }
    if (inStock === 'true') {
      where.push('COALESCE(inv.quantity_available, 0) > 0');
    }
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where.push(
        '(p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ? OR p.short_description LIKE ? OR p.specifications LIKE ? OR c.name LIKE ? OR sc.name LIKE ?)'
      );
      params.push(q, q, q, q, q, q, q);
    }

    let orderBy = 'p.created_at DESC';
    if (sort === 'price_asc') orderBy = 'p.price_ngn ASC';
    else if (sort === 'price_desc') orderBy = 'p.price_ngn DESC';
    else if (sort === 'best_selling') orderBy = 'p.sales_count DESC, p.rating_avg DESC';
    else if (sort === 'popular') orderBy = 'p.rating_avg DESC, p.sales_count DESC';

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(48, Math.max(1, parseInt(limit, 10) || 12));
    const offset = (pageNum - 1) * limitNum;

    const baseJoin = `
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN categories sc ON p.subcategory_id = sc.id
      LEFT JOIN inventory inv ON p.id = inv.product_id
      WHERE ${where.join(' AND ')}
    `;

    const totalRow = db.prepare(`SELECT COUNT(*) as total ${baseJoin}`).get(...params) as { total: number };
    const rows = db
      .prepare(`
        SELECT p.*, c.name as category_name, c.slug as category_slug,
               sc.name as subcategory_name, sc.slug as subcategory_slug
        ${baseJoin}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `)
      .all(...params, limitNum, offset) as Array<Record<string, unknown>>;

    const brands = db
      .prepare('SELECT DISTINCT brand FROM products WHERE is_published = 1 ORDER BY brand ASC')
      .all() as Array<{ brand: string }>;

    res.json({
      items: rows.map(formatProductRow),
      total: totalRow.total,
      page: pageNum,
      totalPages: Math.max(1, Math.ceil(totalRow.total / limitNum)),
      brands: brands.map((b) => b.brand),
    });
  });

  router.get('/products/:slug', (req, res) => {
    const row = db
      .prepare(`
        SELECT p.*, c.name as category_name, c.slug as category_slug,
               sc.name as subcategory_name, sc.slug as subcategory_slug
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN categories sc ON p.subcategory_id = sc.id
        WHERE (p.slug = ? OR p.id = ?) AND p.is_published = 1
      `)
      .get(req.params.slug, req.params.slug) as Record<string, unknown> | undefined;

    if (!row) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const product = formatProductRow(row);
    const reviews = db
      .prepare(`
        SELECT id, product_id as productId, user_id as userId, order_id as orderId, author_name as authorName,
               rating, title, comment, is_verified_purchase as isVerifiedPurchase, status, created_at as createdAt
        FROM reviews
        WHERE product_id = ? AND status = 'approved'
        ORDER BY created_at DESC
      `)
      .all(product.id) as Array<Record<string, unknown>>;

    const relatedRows = db
      .prepare(`
        SELECT p.*, c.name as category_name, c.slug as category_slug,
               sc.name as subcategory_name, sc.slug as subcategory_slug
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN categories sc ON p.subcategory_id = sc.id
        WHERE p.is_published = 1 AND p.id != ? AND (p.category_id = ? OR p.subcategory_id = ?)
        ORDER BY p.sales_count DESC
        LIMIT 4
      `)
      .all(product.id, row.category_id, row.subcategory_id) as Array<Record<string, unknown>>;

    res.json({
      product,
      reviews: reviews.map((r) => ({ ...r, isVerifiedPurchase: Boolean(r.isVerifiedPurchase) })),
      related: relatedRows.map(formatProductRow),
    });
  });

  // ================= REVIEWS (Verified Purchase Enforcement) =================
  router.get('/reviews/recent', (_req, res) => {
    const rows = db
      .prepare(`
        SELECT r.id, r.product_id as productId, p.name as productName, r.author_name as authorName,
               r.rating, r.title, r.comment, r.is_verified_purchase as isVerifiedPurchase, r.created_at as createdAt
        FROM reviews r
        JOIN products p ON r.product_id = p.id
        WHERE r.status = 'approved'
        ORDER BY r.created_at DESC
        LIMIT 6
      `)
      .all() as Array<Record<string, unknown>>;
    res.json(rows.map((r) => ({ ...r, isVerifiedPurchase: Boolean(r.isVerifiedPurchase) })));
  });

  router.post('/reviews', requireAuth, (req: AuthedRequest, res) => {
    const { productId, rating, title = '', comment } = req.body;
    if (!productId || !rating || rating < 1 || rating > 5 || !comment?.trim()) {
      res.status(400).json({ error: 'Rating (1-5) and review comment are required' });
      return;
    }

    // Verify customer actually purchased this product in a PAID order
    const verifiedOrder = db
      .prepare(`
        SELECT o.id
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.user_id = ? AND o.payment_status = 'paid' AND oi.product_id = ?
        LIMIT 1
      `)
      .get(req.auth!.userId, productId) as { id: string } | undefined;

    if (!verifiedOrder) {
      res.status(403).json({
        error: 'Only verified customers who have purchased this gadget may submit a verified-purchase review.',
      });
      return;
    }

    const user = db.prepare('SELECT full_name FROM profiles WHERE id = ?').get(req.auth!.userId) as { full_name: string };
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO reviews (id, product_id, user_id, order_id, author_name, rating, title, comment, is_verified_purchase, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'approved')
    `).run(id, productId, req.auth!.userId, verifiedOrder.id, user.full_name, Number(rating), title.trim(), comment.trim());

    const stats = db
      .prepare("SELECT AVG(rating) as avgRating, COUNT(*) as cnt FROM reviews WHERE product_id = ? AND status = 'approved'")
      .get(productId) as { avgRating: number; cnt: number };

    db.prepare('UPDATE products SET rating_avg = ?, rating_count = ? WHERE id = ?').run(
      Math.round((stats.avgRating || 0) * 10) / 10,
      stats.cnt,
      productId
    );

    res.status(201).json({ id, isVerifiedPurchase: true });
  });

  // ================= WISHLIST =================
  router.get('/wishlist', requireAuth, (req: AuthedRequest, res) => {
    const rows = db
      .prepare(`
        SELECT p.*, c.name as category_name, c.slug as category_slug,
               sc.name as subcategory_name, sc.slug as subcategory_slug
        FROM wishlists w
        JOIN products p ON w.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN categories sc ON p.subcategory_id = sc.id
        WHERE w.user_id = ? AND p.is_published = 1
      `)
      .all(req.auth!.userId) as Array<Record<string, unknown>>;
    res.json(rows.map(formatProductRow));
  });

  router.post('/wishlist/:productId', requireAuth, (req: AuthedRequest, res) => {
    const existing = db
      .prepare('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?')
      .get(req.auth!.userId, req.params.productId) as { id: string } | undefined;

    if (existing) {
      db.prepare('DELETE FROM wishlists WHERE id = ?').run(existing.id);
      res.json({ wishlisted: false });
    } else {
      db.prepare('INSERT INTO wishlists (id, user_id, product_id) VALUES (?, ?, ?)').run(
        crypto.randomUUID(),
        req.auth!.userId,
        req.params.productId
      );
      res.json({ wishlisted: true });
    }
  });

  // ================= PERSISTENT DB CART FOR AUTHENTICATED CUSTOMERS =================
  router.get('/cart', requireAuth, (req: AuthedRequest, res) => {
    const cart = db.prepare('SELECT id FROM carts WHERE user_id = ?').get(req.auth!.userId) as { id: string } | undefined;
    if (!cart) {
      res.json([]);
      return;
    }
    const items = db
      .prepare(`
        SELECT ci.id, ci.product_id as productId, ci.variant_id as variantId,
               ci.selected_color as selectedColor, ci.selected_variant_name as selectedVariantName,
               ci.quantity, p.name as productName, p.slug as productSlug, p.brand,
               p.price_ngn as basePrice, p.compare_at_price_ngn as compareAtPriceNgn,
               pv.price_ngn as variantPrice,
               COALESCE(inv.quantity_available, 0) as stockAvailable,
               (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) as productImage
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        LEFT JOIN product_variants pv ON ci.variant_id = pv.id
        LEFT JOIN inventory inv ON p.id = inv.product_id
        WHERE ci.cart_id = ? AND p.is_published = 1
      `)
      .all(cart.id) as Array<Record<string, unknown>>;

    res.json(
      items.map((it) => ({
        id: it.id,
        productId: it.productId,
        variantId: it.variantId,
        productName: it.productName,
        productSlug: it.productSlug,
        productImage: it.productImage || '',
        brand: it.brand,
        selectedColor: it.selectedColor,
        selectedVariantName: it.selectedVariantName,
        unitPriceNgn: Number(it.variantPrice || it.basePrice),
        compareAtPriceNgn: it.compareAtPriceNgn ? Number(it.compareAtPriceNgn) : null,
        quantity: it.quantity,
        stockAvailable: it.stockAvailable,
      }))
    );
  });

  router.put('/cart/sync', requireAuth, (req: AuthedRequest, res) => {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'Invalid cart payload' });
      return;
    }

    let cart = db.prepare('SELECT id FROM carts WHERE user_id = ?').get(req.auth!.userId) as { id: string } | undefined;
    if (!cart) {
      const cartId = crypto.randomUUID();
      db.prepare('INSERT INTO carts (id, user_id) VALUES (?, ?)').run(cartId, req.auth!.userId);
      cart = { id: cartId };
    }

    db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.id);
    const insertItem = db.prepare(`
      INSERT INTO cart_items (id, cart_id, product_id, variant_id, selected_color, selected_variant_name, quantity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const it of items) {
      const exists = db.prepare('SELECT id FROM products WHERE id = ? AND is_published = 1').get(it.productId);
      if (exists && Number(it.quantity) > 0) {
        insertItem.run(
          crypto.randomUUID(),
          cart.id,
          it.productId,
          it.variantId || null,
          it.selectedColor || '',
          it.selectedVariantName || '',
          Math.floor(Number(it.quantity))
        );
      }
    }
    res.json({ success: true });
  });

  // ================= COUPONS =================
  router.post('/coupons/validate', (req, res) => {
    const { code, subtotalNgn } = req.body;
    if (!code?.trim()) {
      res.status(400).json({ error: 'Please enter a coupon code' });
      return;
    }
    const coupon = db
      .prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1')
      .get(code.trim().toUpperCase()) as Record<string, unknown> | undefined;

    if (!coupon) {
      res.status(404).json({ error: 'Coupon code is invalid or expired' });
      return;
    }
    if (coupon.usage_limit && Number(coupon.used_count) >= Number(coupon.usage_limit)) {
      res.status(400).json({ error: 'This coupon has reached its usage limit' });
      return;
    }
    const sub = Number(subtotalNgn || 0);
    if (sub < Number(coupon.min_order_ngn)) {
      res.status(400).json({ error: `Minimum order of ₦${Number(coupon.min_order_ngn).toLocaleString()} required` });
      return;
    }

    let discount =
      coupon.discount_type === 'percent'
        ? Math.round((sub * Number(coupon.discount_value)) / 100)
        : Number(coupon.discount_value);
    if (coupon.max_discount_ngn) {
      discount = Math.min(discount, Number(coupon.max_discount_ngn));
    }

    res.json({
      code: coupon.code,
      discountNgn: discount,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
    });
  });

  // ================= NEWSLETTER & CONTACT =================
  router.post('/newsletter', (req, res) => {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please provide a valid email address' });
      return;
    }
    db.prepare('INSERT OR IGNORE INTO newsletter_subscribers (id, email) VALUES (?, ?)').run(
      crypto.randomUUID(),
      email.trim().toLowerCase()
    );
    res.json({ success: true, message: 'Subscribed to ZuriVolt updates and exclusive gadget offers.' });
  });

  router.post('/contact', (req, res) => {
    const { fullName, email, phone = '', subject, message } = req.body;
    if (!fullName?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      res.status(400).json({ error: 'Full name, email, subject, and message are required' });
      return;
    }
    db.prepare(
      'INSERT INTO contact_messages (id, full_name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(crypto.randomUUID(), fullName.trim(), email.trim(), phone.trim(), subject.trim(), message.trim());
    res.status(201).json({ success: true, message: 'Your inquiry has been received. Our Lagos support team will reply shortly.' });
  });

  // ================= CHECKOUT & PAYSTACK INITIALIZATION =================
  router.post('/checkout/initialize', async (req, res) => {
    try {
      const auth = getAuthFromRequest(req);
      const { items, customer, couponCode, callbackUrl } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'Your cart is empty' });
        return;
      }

      if (
        !customer?.fullName?.trim() ||
        !customer?.email?.trim() ||
        !customer?.phone?.trim() ||
        !customer?.whatsappNumber?.trim() ||
        !customer?.address?.trim() ||
        !customer?.city?.trim() ||
        !customer?.state?.trim()
      ) {
        res.status(400).json({ error: 'Please complete all compulsory delivery and contact fields' });
        return;
      }

      // 1. Validate every item's price, variant, and stock directly against DB
      let subtotalNgn = 0;
      const verifiedItems: Array<{
        productId: string;
        variantId: string | null;
        productName: string;
        productImage: string;
        selectedColor: string;
        selectedVariant: string;
        unitPriceNgn: number;
        quantity: number;
        lineTotalNgn: number;
      }> = [];

      for (const item of items) {
        const product = db
          .prepare('SELECT id, name, price_ngn, is_published FROM products WHERE id = ?')
          .get(item.productId) as Record<string, unknown> | undefined;

        if (!product || !product.is_published) {
          res.status(400).json({ error: 'One or more products in your cart are no longer available' });
          return;
        }

        const inv = db
          .prepare('SELECT quantity_available FROM inventory WHERE product_id = ?')
          .get(product.id) as { quantity_available: number } | undefined;
        const available = inv ? inv.quantity_available : 0;
        const qty = Math.floor(Number(item.quantity));

        if (qty <= 0 || qty > available) {
          res.status(400).json({ error: `Only ${available} unit(s) left in stock for ${product.name}` });
          return;
        }

        let unitPrice = Number(product.price_ngn);
        let variantName = '';
        let resolvedVariantId: string | null = null;
        if (item.variantId) {
          const variant = db
            .prepare('SELECT id, name, price_ngn, stock_qty FROM product_variants WHERE id = ? AND product_id = ?')
            .get(item.variantId, product.id) as { id: string; name: string; price_ngn: number; stock_qty: number } | undefined;
          if (variant) {
            if (qty > variant.stock_qty) {
              res.status(400).json({ error: `Insufficient stock for ${product.name} (${variant.name})` });
              return;
            }
            unitPrice = Number(variant.price_ngn);
            variantName = variant.name;
            resolvedVariantId = variant.id;
          }
        }

        const imgRow = db
          .prepare('SELECT image_url FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC LIMIT 1')
          .get(product.id) as { image_url: string } | undefined;

        const lineTotal = unitPrice * qty;
        subtotalNgn += lineTotal;
        verifiedItems.push({
          productId: product.id as string,
          variantId: resolvedVariantId,
          productName: product.name as string,
          productImage: imgRow?.image_url || '',
          selectedColor: item.selectedColor || '',
          selectedVariant: variantName || item.selectedVariantName || '',
          unitPriceNgn: unitPrice,
          quantity: qty,
          lineTotalNgn: lineTotal,
        });
      }

      // 2. Server-calculated delivery fee
      const settings = getStoreSettingsMap();
      const freeThreshold = Number(settings.freeDeliveryThresholdNgn || 350000);
      const lagosFee = Number(settings.lagosDeliveryFeeNgn || 3500);
      const nationwideFee = Number(settings.nationwideDeliveryFeeNgn || 6500);
      const deliveryFeeNgn =
        subtotalNgn >= freeThreshold ? 0 : customer.state.toLowerCase().includes('lagos') ? lagosFee : nationwideFee;

      // 3. Server-validated coupon
      let discountNgn = 0;
      let appliedCoupon: string | null = null;
      if (couponCode?.trim()) {
        const coupon = db
          .prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1')
          .get(couponCode.trim().toUpperCase()) as Record<string, unknown> | undefined;
        if (coupon && subtotalNgn >= Number(coupon.min_order_ngn)) {
          if (!coupon.usage_limit || Number(coupon.used_count) < Number(coupon.usage_limit)) {
            let discount =
              coupon.discount_type === 'percent'
                ? Math.round((subtotalNgn * Number(coupon.discount_value)) / 100)
                : Number(coupon.discount_value);
            if (coupon.max_discount_ngn) {
              discount = Math.min(discount, Number(coupon.max_discount_ngn));
            }
            discountNgn = discount;
            appliedCoupon = coupon.code as string;
          }
        }
      }

      const totalNgn = Math.max(0, subtotalNgn + deliveryFeeNgn - discountNgn);
      const amountKobo = Math.round(totalNgn * 100);
      const orderId = crypto.randomUUID();
      const orderNumber = `ZV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const reference = `PAY-${orderNumber}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      db.prepare(`
        INSERT INTO orders (
          id, order_number, user_id, customer_name, customer_email, customer_phone, customer_whatsapp,
          delivery_address, delivery_city, delivery_state, delivery_notes, coupon_code,
          subtotal_ngn, delivery_fee_ngn, discount_ngn, total_ngn, payment_status, order_status, paystack_reference
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending_payment', ?)
      `).run(
        orderId,
        orderNumber,
        auth?.userId || null,
        customer.fullName.trim(),
        customer.email.trim().toLowerCase(),
        customer.phone.trim(),
        customer.whatsappNumber.trim(),
        customer.address.trim(),
        customer.city.trim(),
        customer.state.trim(),
        (customer.additionalInfo || '').trim(),
        appliedCoupon,
        subtotalNgn,
        deliveryFeeNgn,
        discountNgn,
        totalNgn,
        reference
      );

      const insertOrderItem = db.prepare(`
        INSERT INTO order_items (
          id, order_id, product_id, variant_id, product_name, product_image,
          selected_color, selected_variant, unit_price_ngn, quantity, line_total_ngn
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const vi of verifiedItems) {
        insertOrderItem.run(
          crypto.randomUUID(),
          orderId,
          vi.productId,
          vi.variantId,
          vi.productName,
          vi.productImage,
          vi.selectedColor,
          vi.selectedVariant,
          vi.unitPriceNgn,
          vi.quantity,
          vi.lineTotalNgn
        );
      }

      const paystackSecret = String(process.env.PAYSTACK_SECRET_KEY || '').trim();
      const resolvedCallback = callbackUrl || `${req.protocol}://${req.get('host')}/checkout/callback`;

      db.prepare(`
        INSERT INTO payments (id, order_id, paystack_reference, amount_kobo, currency, status)
        VALUES (?, ?, ?, ?, 'NGN', 'initialized')
      `).run(crypto.randomUUID(), orderId, reference, amountKobo);

      if (paystackSecret.startsWith('sk_')) {
        // Real Paystack API Initialization
        const psRes = await fetch('https://api.paystack.co/transaction/initialize', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${paystackSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: customer.email.trim().toLowerCase(),
            amount: amountKobo,
            currency: 'NGN',
            reference,
            callback_url: resolvedCallback,
            metadata: {
              order_id: orderId,
              order_number: orderNumber,
              customer_name: customer.fullName.trim(),
            },
          }),
        });
        const psText = await psRes.text();
        let psJson: {
          status?: boolean;
          message?: string;
          data?: { authorization_url?: string; access_code?: string; reference?: string };
        } = {};
        try {
          psJson = JSON.parse(psText);
        } catch {
          psJson = {};
        }

        if (!psRes.ok || !psJson.status || !psJson.data?.authorization_url) {
          res.status(502).json({
            error: psJson.message || 'Unable to initialize Paystack checkout',
          });
          return;
        }
        res.json({
          mode: paystackSecret.startsWith('sk_live_') ? 'live' : 'test_live_keys',
          orderId,
          orderNumber,
          reference,
          accessCode: psJson.data.access_code || '',
          authorizationUrl: psJson.data.authorization_url,
          totalNgn,
        });
        return;
      }

      // Paystack Test Sandbox Mode (when PAYSTACK_SECRET_KEY is not yet configured in .env)
      res.json({
        mode: 'sandbox',
        orderId,
        orderNumber,
        reference,
        authorizationUrl: `/paystack-sandbox?reference=${encodeURIComponent(reference)}`,
        totalNgn,
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Sandbox outcome endpoint (strictly server-side for Paystack Test Sandbox when secret key is absent)
  router.get('/paystack/sandbox-order/:reference', (req, res) => {
    const order = db.prepare('SELECT * FROM orders WHERE paystack_reference = ?').get(req.params.reference) as Record<string, unknown> | undefined;
    if (!order) {
      res.status(404).json({ error: 'Transaction reference not found' });
      return;
    }
    res.json(formatOrderRow(order));
  });

  router.post('/paystack/sandbox-complete', (req, res) => {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY || '';
    if (paystackSecret.startsWith('sk_')) {
      res.status(403).json({ error: 'Sandbox disabled while real Paystack secret key is active' });
      return;
    }
    const { reference, outcome, channel = 'card' } = req.body;
    const payment = db.prepare('SELECT * FROM payments WHERE paystack_reference = ?').get(reference) as Record<string, unknown> | undefined;
    if (!payment) {
      res.status(404).json({ error: 'Payment record not found' });
      return;
    }
    if (!['success', 'failed', 'abandoned'].includes(outcome)) {
      res.status(400).json({ error: 'Invalid sandbox outcome' });
      return;
    }
    db.prepare('UPDATE payments SET sandbox_outcome = ?, channel = ? WHERE paystack_reference = ?').run(
      outcome,
      channel,
      reference
    );
    res.json({ ok: true, callbackUrl: `/checkout/callback?reference=${encodeURIComponent(reference)}` });
  });

  // Official Paystack Verification Endpoint (Backend-only truth)
  router.post('/paystack/verify', async (req, res) => {
    try {
      const { reference } = req.body;
      if (!reference) {
        res.status(400).json({ error: 'Missing transaction reference' });
        return;
      }

      const order = db.prepare('SELECT * FROM orders WHERE paystack_reference = ?').get(reference) as Record<string, unknown> | undefined;
      if (!order) {
        res.status(404).json({ error: 'Order matching this reference was not found' });
        return;
      }

      // Idempotency: Already verified and paid
      if (order.payment_status === 'paid') {
        res.json({ verified: true, order: formatOrderRow(order) });
        return;
      }

      const paystackSecret = process.env.PAYSTACK_SECRET_KEY || '';
      const expectedKobo = Math.round(Number(order.total_ngn) * 100);

      if (paystackSecret.startsWith('sk_')) {
        const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
          headers: { Authorization: `Bearer ${paystackSecret}` },
        });
        const verifyJson = (await verifyRes.json()) as {
          status: boolean;
          data?: {
            reference: string;
            amount: number;
            currency: string;
            status: string;
            channel: string;
            gateway_response: string;
          };
        };

        if (!verifyJson.status || !verifyJson.data) {
          res.status(400).json({ verified: false, error: 'Unable to verify transaction with Paystack' });
          return;
        }

        const tx = verifyJson.data;
        if (
          tx.reference !== reference ||
          tx.currency !== 'NGN' ||
          Number(tx.amount) !== expectedKobo ||
          tx.status !== 'success'
        ) {
          const mapped = tx.status === 'abandoned' ? 'abandoned' : 'failed';
          db.prepare('UPDATE orders SET payment_status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(mapped, order.id);
          db.prepare('UPDATE payments SET status = ?, gateway_response = ?, raw_payload = ? WHERE paystack_reference = ?').run(
            mapped,
            tx.gateway_response || tx.status,
            JSON.stringify(tx),
            reference
          );
          const refreshed = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id) as Record<string, unknown>;
          res.json({ verified: false, status: mapped, order: formatOrderRow(refreshed) });
          return;
        }

        const result = confirmOrderPaidAtomic(order.id as string, reference, tx.channel || 'card', tx.gateway_response || 'Approved', tx);
        if (!result.ok) {
          res.status(409).json({ verified: false, error: result.error });
          return;
        }
      } else {
        // Server-side Sandbox verification
        const payment = db.prepare('SELECT * FROM payments WHERE paystack_reference = ?').get(reference) as Record<string, unknown>;
        if (payment.sandbox_outcome !== 'success') {
          const mapped = payment.sandbox_outcome === 'abandoned' ? 'abandoned' : payment.sandbox_outcome === 'failed' ? 'failed' : 'pending';
          if (mapped !== 'pending') {
            db.prepare('UPDATE orders SET payment_status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(mapped, order.id);
            db.prepare('UPDATE payments SET status = ?, gateway_response = ? WHERE paystack_reference = ?').run(
              mapped,
              mapped === 'abandoned' ? 'Customer cancelled checkout' : 'Declined by issuer (Test)',
              reference
            );
          }
          const refreshed = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id) as Record<string, unknown>;
          res.json({ verified: false, status: mapped, order: formatOrderRow(refreshed) });
          return;
        }

        const result = confirmOrderPaidAtomic(
          order.id as string,
          reference,
          (payment.channel as string) || 'card',
          'Approved (Paystack Test Sandbox)',
          { sandbox: true, reference, amount: expectedKobo, currency: 'NGN' }
        );
        if (!result.ok) {
          res.status(409).json({ verified: false, error: result.error });
          return;
        }
      }

      const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id) as Record<string, unknown>;
      res.json({ verified: true, order: formatOrderRow(updated) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Paystack Webhook with HMAC-SHA512 Verification
  router.post('/paystack/webhook', (req, res) => {
    const paystackSecret = String(process.env.PAYSTACK_SECRET_KEY || '').trim();
    if (!paystackSecret) {
      res.status(400).send('Webhook secret not configured');
      return;
    }
    const sig = req.headers['x-paystack-signature'] as string;
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString('utf8')
      : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body);
    const hash = crypto.createHmac('sha512', paystackSecret).update(rawBody).digest('hex');

    if (!sig || hash !== sig) {
      res.status(401).send('Invalid signature');
      return;
    }

    const event = JSON.parse(rawBody);
    if (event.event === 'charge.success') {
      const tx = event.data;
      const order = db.prepare('SELECT * FROM orders WHERE paystack_reference = ?').get(tx.reference) as Record<string, unknown> | undefined;
      if (order && order.payment_status !== 'paid') {
        const expectedKobo = Math.round(Number(order.total_ngn) * 100);
        if (tx.currency === 'NGN' && Number(tx.amount) === expectedKobo) {
          confirmOrderPaidAtomic(order.id as string, tx.reference, tx.channel || 'card', tx.gateway_response || 'Webhook Approved', tx);
        }
      }
    }
    res.sendStatus(200);
  });

  // ================= CUSTOMER & PUBLIC ORDER TRACKING =================
  router.get('/orders/my', requireAuth, (req: AuthedRequest, res) => {
    const rows = db
      .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC')
      .all(req.auth!.userId) as Array<Record<string, unknown>>;
    res.json(rows.map(formatOrderRow));
  });

  router.get('/orders/track', (req, res) => {
    const { orderNumber, email } = req.query as { orderNumber?: string; email?: string };
    if (!orderNumber?.trim() || !email?.trim()) {
      res.status(400).json({ error: 'Order number and email address are required' });
      return;
    }
    const row = db
      .prepare('SELECT * FROM orders WHERE UPPER(order_number) = UPPER(?) AND LOWER(customer_email) = LOWER(?)')
      .get(orderNumber.trim(), email.trim()) as Record<string, unknown> | undefined;
    if (!row) {
      res.status(404).json({ error: 'No matching order found. Please check your Order Number and Email.' });
      return;
    }
    res.json(formatOrderRow(row));
  });

  // ================= ADMIN DASHBOARD API (STRICT SERVER-SIDE ROLE CHECK) =================
  router.get('/admin/overview', requireAdmin, (_req, res) => {
    const totalSalesRow = db
      .prepare("SELECT COALESCE(SUM(total_ngn), 0) as total FROM orders WHERE payment_status = 'paid'")
      .get() as { total: number };
    const totalOrdersRow = db.prepare('SELECT COUNT(*) as total FROM orders').get() as { total: number };
    const pendingOrdersRow = db
      .prepare("SELECT COUNT(*) as total FROM orders WHERE order_status IN ('pending_payment', 'paid', 'processing', 'ready_for_delivery')")
      .get() as { total: number };
    const completedOrdersRow = db
      .prepare("SELECT COUNT(*) as total FROM orders WHERE order_status = 'delivered'")
      .get() as { total: number };
    const totalCustomersRow = db
      .prepare("SELECT COUNT(*) as total FROM user_roles WHERE role = 'customer'")
      .get() as { total: number };
    const totalProductsRow = db.prepare('SELECT COUNT(*) as total FROM products').get() as { total: number };
    const lowStockRow = db
      .prepare('SELECT COUNT(*) as total FROM inventory WHERE quantity_available > 0 AND quantity_available <= low_stock_threshold')
      .get() as { total: number };
    const outOfStockRow = db
      .prepare('SELECT COUNT(*) as total FROM inventory WHERE quantity_available = 0')
      .get() as { total: number };

    const recentOrders = db
      .prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 8')
      .all() as Array<Record<string, unknown>>;

    const salesByCategory = db
      .prepare(`
        SELECT c.name as category, COALESCE(SUM(oi.line_total_ngn), 0) as revenue, COALESCE(SUM(oi.quantity), 0) as units
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        WHERE o.payment_status = 'paid'
        GROUP BY c.id
        ORDER BY revenue DESC
      `)
      .all();

    const topProducts = db
      .prepare(`
        SELECT p.id, p.name, p.sku, p.price_ngn as priceNgn, p.sales_count as salesCount,
               COALESCE(inv.quantity_available, 0) as stockAvailable
        FROM products p
        LEFT JOIN inventory inv ON p.id = inv.product_id
        ORDER BY p.sales_count DESC
        LIMIT 6
      `)
      .all();

    const dailySales = db
      .prepare(`
        SELECT substr(created_at, 1, 10) as date, COALESCE(SUM(total_ngn), 0) as revenue, COUNT(*) as orders
        FROM orders
        WHERE payment_status = 'paid'
        GROUP BY substr(created_at, 1, 10)
        ORDER BY date DESC
        LIMIT 14
      `)
      .all();

    res.json({
      stats: {
        totalSalesNgn: totalSalesRow.total,
        totalOrders: totalOrdersRow.total,
        pendingOrders: pendingOrdersRow.total,
        completedOrders: completedOrdersRow.total,
        totalCustomers: totalCustomersRow.total,
        totalProducts: totalProductsRow.total,
        lowStockProducts: lowStockRow.total,
        outOfStockProducts: outOfStockRow.total,
      },
      recentOrders: recentOrders.map(formatOrderRow),
      salesByCategory,
      topProducts,
      dailySales,
    });
  });

  // Upload image to local /public/uploads (or Supabase Storage when configured)
  router.post('/admin/upload', requireAdmin, upload.single('image'), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  // Admin Products CRUD
  router.get('/admin/products', requireAdmin, (_req, res) => {
    const rows = db
      .prepare(`
        SELECT p.*, c.name as category_name, c.slug as category_slug,
               sc.name as subcategory_name, sc.slug as subcategory_slug
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN categories sc ON p.subcategory_id = sc.id
        ORDER BY p.created_at DESC
      `)
      .all() as Array<Record<string, unknown>>;
    res.json(rows.map(formatProductRow));
  });

  router.post('/admin/products', requireAdmin, (req: AuthedRequest, res) => {
    try {
      const b = req.body;
      if (!b.name?.trim() || b.priceNgn === undefined) {
        res.status(400).json({ error: 'Product name and selling price are required' });
        return;
      }

      const id = crypto.randomUUID();
      const baseSlug = slugify(b.name);
      const existingSlug = db.prepare('SELECT id FROM products WHERE slug = ?').get(baseSlug);
      const slug = existingSlug ? `${baseSlug}-${crypto.randomBytes(2).toString('hex')}` : baseSlug;
      const sku = b.sku?.trim() || `ZV-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      db.prepare(`
        INSERT INTO products (
          id, name, slug, sku, brand, category_id, subcategory_id, short_description, description,
          specifications, price_ngn, compare_at_price_ngn, available_colors,
          is_featured, is_best_seller, is_trending, is_recommended, is_published
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        b.name.trim(),
        slug,
        sku,
        b.brand?.trim() || 'ZuriVolt',
        b.categoryId || null,
        b.subcategoryId || null,
        b.shortDescription || '',
        b.description || '',
        JSON.stringify(b.specifications || {}),
        Number(b.priceNgn),
        b.compareAtPriceNgn ? Number(b.compareAtPriceNgn) : null,
        JSON.stringify(Array.isArray(b.availableColors) ? b.availableColors : []),
        b.isFeatured ? 1 : 0,
        b.isBestSeller ? 1 : 0,
        b.isTrending ? 1 : 0,
        b.isRecommended ? 1 : 0,
        b.isPublished !== false ? 1 : 0
      );

      db.prepare('INSERT INTO inventory (id, product_id, quantity_available, low_stock_threshold) VALUES (?, ?, ?, ?)').run(
        crypto.randomUUID(),
        id,
        Math.max(0, Number(b.stockAvailable ?? 10)),
        Math.max(0, Number(b.lowStockThreshold ?? 5))
      );

      if (Array.isArray(b.images)) {
        const insImg = db.prepare('INSERT INTO product_images (id, product_id, image_url, alt_text, sort_order, is_primary) VALUES (?, ?, ?, ?, ?, ?)');
        b.images.forEach((url: string, idx: number) => {
          if (url?.trim()) insImg.run(crypto.randomUUID(), id, url.trim(), b.name.trim(), idx, idx === 0 ? 1 : 0);
        });
      }

      if (Array.isArray(b.variants)) {
        const insVar = db.prepare('INSERT INTO product_variants (id, product_id, name, color, price_ngn, sku, stock_qty) VALUES (?, ?, ?, ?, ?, ?, ?)');
        b.variants.forEach((v: { name: string; color?: string; priceNgn: number; stockQty?: number }, idx: number) => {
          if (v.name?.trim()) {
            insVar.run(
              crypto.randomUUID(),
              id,
              v.name.trim(),
              v.color || '',
              Number(v.priceNgn || b.priceNgn),
              `${sku}-V${idx + 1}`,
              Math.max(0, Number(v.stockQty ?? b.stockAvailable ?? 5))
            );
          }
        });
      }

      logAdminAction(req.auth!.userId, 'CREATE_PRODUCT', 'product', id, { name: b.name });
      res.status(201).json({ id, slug });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.put('/admin/products/:id', requireAdmin, (req: AuthedRequest, res) => {
    try {
      const b = req.body;
      const productId = req.params.id as string;
      const existing = db.prepare('SELECT id, sku FROM products WHERE id = ?').get(productId) as { id: string; sku: string } | undefined;
      if (!existing) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      db.prepare(`
        UPDATE products SET
          name = ?, brand = ?, category_id = ?, subcategory_id = ?,
          short_description = ?, description = ?, specifications = ?,
          price_ngn = ?, compare_at_price_ngn = ?, available_colors = ?,
          is_featured = ?, is_best_seller = ?, is_trending = ?, is_recommended = ?, is_published = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        b.name.trim(),
        b.brand?.trim() || 'ZuriVolt',
        b.categoryId || null,
        b.subcategoryId || null,
        b.shortDescription || '',
        b.description || '',
        JSON.stringify(b.specifications || {}),
        Number(b.priceNgn),
        b.compareAtPriceNgn ? Number(b.compareAtPriceNgn) : null,
        JSON.stringify(Array.isArray(b.availableColors) ? b.availableColors : []),
        b.isFeatured ? 1 : 0,
        b.isBestSeller ? 1 : 0,
        b.isTrending ? 1 : 0,
        b.isRecommended ? 1 : 0,
        b.isPublished !== false ? 1 : 0,
        productId
      );

      db.prepare(`
        INSERT INTO inventory (id, product_id, quantity_available, low_stock_threshold)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(product_id) DO UPDATE SET
          quantity_available = excluded.quantity_available,
          low_stock_threshold = excluded.low_stock_threshold,
          updated_at = datetime('now')
      `).run(
        crypto.randomUUID(),
        productId,
        Math.max(0, Number(b.stockAvailable ?? 0)),
        Math.max(0, Number(b.lowStockThreshold ?? 5))
      );

      if (Array.isArray(b.images)) {
        db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
        const insImg = db.prepare('INSERT INTO product_images (id, product_id, image_url, alt_text, sort_order, is_primary) VALUES (?, ?, ?, ?, ?, ?)');
        b.images.forEach((url: string, idx: number) => {
          if (url?.trim()) insImg.run(crypto.randomUUID(), productId, url.trim(), b.name.trim(), idx, idx === 0 ? 1 : 0);
        });
      }

      if (Array.isArray(b.variants)) {
        db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(productId);
        const insVar = db.prepare('INSERT INTO product_variants (id, product_id, name, color, price_ngn, sku, stock_qty) VALUES (?, ?, ?, ?, ?, ?, ?)');
        b.variants.forEach((v: { name: string; color?: string; priceNgn: number; stockQty?: number }, idx: number) => {
          if (v.name?.trim()) {
            insVar.run(
              crypto.randomUUID(),
              productId,
              v.name.trim(),
              v.color || '',
              Number(v.priceNgn || b.priceNgn),
              `${existing.sku}-V${idx + 1}-${crypto.randomBytes(1).toString('hex').toUpperCase()}`,
              Math.max(0, Number(v.stockQty ?? 5))
            );
          }
        });
      }

      logAdminAction(req.auth!.userId, 'UPDATE_PRODUCT', 'product', productId, { name: b.name });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.delete('/admin/products/:id', requireAdmin, (req: AuthedRequest, res) => {
    const productId = req.params.id as string;
    db.prepare('DELETE FROM products WHERE id = ?').run(productId);
    logAdminAction(req.auth!.userId, 'DELETE_PRODUCT', 'product', productId);
    res.json({ success: true });
  });

  // Admin Categories CRUD
  router.get('/admin/categories', requireAdmin, (_req, res) => {
    const rows = db
      .prepare(`
        SELECT c.id, c.name, c.slug, c.description, c.image_url as imageUrl, c.parent_id as parentId,
               c.display_order as displayOrder, c.is_active as isActive,
               (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id OR p.subcategory_id = c.id) as productCount
        FROM categories c
        ORDER BY c.parent_id NULLS FIRST, c.display_order ASC, c.name ASC
      `)
      .all() as Array<Record<string, unknown>>;
    res.json(rows.map((r) => ({ ...r, isActive: Boolean(r.isActive) })));
  });

  router.post('/admin/categories', requireAdmin, (req: AuthedRequest, res) => {
    const { name, description = '', imageUrl = '', parentId = null, displayOrder = 0 } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ error: 'Category name is required' });
      return;
    }
    const id = crypto.randomUUID();
    const baseSlug = slugify(name);
    const exists = db.prepare('SELECT id FROM categories WHERE slug = ?').get(baseSlug);
    const slug = exists ? `${baseSlug}-${crypto.randomBytes(2).toString('hex')}` : baseSlug;

    db.prepare(
      'INSERT INTO categories (id, name, slug, description, image_url, parent_id, display_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
    ).run(id, name.trim(), slug, description, imageUrl, parentId || null, Number(displayOrder));

    logAdminAction(req.auth!.userId, 'CREATE_CATEGORY', 'category', id, { name });
    res.status(201).json({ id, slug });
  });

  router.put('/admin/categories/:id', requireAdmin, (req: AuthedRequest, res) => {
    const { name, description = '', imageUrl = '', parentId = null, isActive = true } = req.body;
    const categoryId = req.params.id as string;
    db.prepare(
      'UPDATE categories SET name = ?, description = ?, image_url = ?, parent_id = ?, is_active = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(name.trim(), description, imageUrl, parentId || null, isActive ? 1 : 0, categoryId);
    logAdminAction(req.auth!.userId, 'UPDATE_CATEGORY', 'category', categoryId, { name });
    res.json({ success: true });
  });

  router.delete('/admin/categories/:id', requireAdmin, (req: AuthedRequest, res) => {
    const categoryId = req.params.id as string;
    db.prepare('DELETE FROM categories WHERE id = ?').run(categoryId);
    logAdminAction(req.auth!.userId, 'DELETE_CATEGORY', 'category', categoryId);
    res.json({ success: true });
  });

  // Admin Orders & Fulfilment Management
  router.get('/admin/orders', requireAdmin, (_req, res) => {
    const rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all() as Array<Record<string, unknown>>;
    res.json(rows.map(formatOrderRow));
  });

  router.put('/admin/orders/:id/status', requireAdmin, (req: AuthedRequest, res) => {
    const { orderStatus } = req.body;
    const orderId = req.params.id as string;
    const allowed = ['pending_payment', 'paid', 'processing', 'ready_for_delivery', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!allowed.includes(orderStatus)) {
      res.status(400).json({ error: 'Invalid order status' });
      return;
    }

    const tx = db.transaction(() => {
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as Record<string, unknown> | undefined;
      if (!order) throw new Error('Order not found');

      // Guard: Never restore stock twice!
      if ((orderStatus === 'cancelled' || orderStatus === 'refunded') && order.stock_deducted && !order.stock_restored) {
        const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id) as Array<Record<string, unknown>>;
        for (const item of items) {
          if (item.product_id) {
            db.prepare('UPDATE inventory SET quantity_available = quantity_available + ?, updated_at = datetime(\'now\') WHERE product_id = ?').run(
              Number(item.quantity),
              item.product_id
            );
          }
        }
        db.prepare('UPDATE orders SET stock_restored = 1 WHERE id = ?').run(order.id);
      }

      const nextPaymentStatus = orderStatus === 'refunded' ? 'refunded' : order.payment_status;
      db.prepare('UPDATE orders SET order_status = ?, payment_status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
        orderStatus,
        nextPaymentStatus,
        order.id
      );

      db.prepare('UPDATE delivery_records SET status = ?, updated_at = datetime(\'now\') WHERE order_id = ?').run(orderStatus, order.id);
    });

    try {
      tx();
      logAdminAction(req.auth!.userId, 'UPDATE_ORDER_STATUS', 'order', orderId, { orderStatus });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Admin Payments
  router.get('/admin/payments', requireAdmin, (_req, res) => {
    const rows = db
      .prepare(`
        SELECT py.id, py.order_id as orderId, o.order_number as orderNumber, o.customer_name as customerName,
               o.customer_email as customerEmail, py.paystack_reference as paystackReference,
               py.amount_kobo as amountKobo, py.currency, py.status, py.channel,
               py.gateway_response as gatewayResponse, py.verified_at as verifiedAt, py.created_at as createdAt
        FROM payments py
        JOIN orders o ON py.order_id = o.id
        ORDER BY py.created_at DESC
      `)
      .all();
    res.json(rows);
  });

  // Admin Customers
  router.get('/admin/customers', requireAdmin, (_req, res) => {
    const rows = db
      .prepare(`
        SELECT p.id, p.full_name as fullName, p.email, p.phone, p.whatsapp_number as whatsappNumber,
               p.created_at as createdAt,
               COUNT(o.id) as orderCount,
               COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total_ngn ELSE 0 END), 0) as totalSpentNgn
        FROM profiles p
        JOIN user_roles ur ON p.id = ur.user_id AND ur.role = 'customer'
        LEFT JOIN orders o ON p.id = o.user_id
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `)
      .all();
    res.json(rows);
  });

  router.get('/admin/customers/:id/orders', requireAdmin, (req, res) => {
    const rows = db
      .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC')
      .all(req.params.id) as Array<Record<string, unknown>>;
    res.json(rows.map(formatOrderRow));
  });

  // Admin Reviews Moderation
  router.get('/admin/reviews', requireAdmin, (_req, res) => {
    const rows = db
      .prepare(`
        SELECT r.id, r.product_id as productId, p.name as productName, r.author_name as authorName,
               r.rating, r.title, r.comment, r.is_verified_purchase as isVerifiedPurchase, r.status, r.created_at as createdAt
        FROM reviews r
        JOIN products p ON r.product_id = p.id
        ORDER BY r.created_at DESC
      `)
      .all() as Array<Record<string, unknown>>;
    res.json(rows.map((r) => ({ ...r, isVerifiedPurchase: Boolean(r.isVerifiedPurchase) })));
  });

  router.put('/admin/reviews/:id', requireAdmin, (req: AuthedRequest, res) => {
    const { status } = req.body;
    const reviewId = req.params.id as string;
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }
    const rev = db.prepare('SELECT product_id FROM reviews WHERE id = ?').get(reviewId) as { product_id: string } | undefined;
    if (!rev) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }
    db.prepare('UPDATE reviews SET status = ? WHERE id = ?').run(status, reviewId);
    const stats = db
      .prepare("SELECT AVG(rating) as avgRating, COUNT(*) as cnt FROM reviews WHERE product_id = ? AND status = 'approved'")
      .get(rev.product_id) as { avgRating: number; cnt: number };
    db.prepare('UPDATE products SET rating_avg = ?, rating_count = ? WHERE id = ?').run(
      Math.round((stats.avgRating || 0) * 10) / 10,
      stats.cnt,
      rev.product_id
    );
    logAdminAction(req.auth!.userId, 'MODERATE_REVIEW', 'review', reviewId, { status });
    res.json({ success: true });
  });

  // Admin Coupons
  router.get('/admin/coupons', requireAdmin, (_req, res) => {
    const rows = db
      .prepare('SELECT id, code, discount_type as discountType, discount_value as discountValue, min_order_ngn as minOrderNgn, max_discount_ngn as maxDiscountNgn, usage_limit as usageLimit, used_count as usedCount, expires_at as expiresAt, is_active as isActive FROM coupons ORDER BY created_at DESC')
      .all() as Array<Record<string, unknown>>;
    res.json(rows.map((r) => ({ ...r, isActive: Boolean(r.isActive) })));
  });

  router.post('/admin/coupons', requireAdmin, (req: AuthedRequest, res) => {
    const { code, discountType = 'percent', discountValue, minOrderNgn = 0, maxDiscountNgn = null, usageLimit = null } = req.body;
    if (!code?.trim() || !discountValue) {
      res.status(400).json({ error: 'Coupon code and discount value are required' });
      return;
    }
    const id = crypto.randomUUID();
    db.prepare(
      'INSERT INTO coupons (id, code, discount_type, discount_value, min_order_ngn, max_discount_ngn, usage_limit, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
    ).run(id, code.trim().toUpperCase(), discountType, Number(discountValue), Number(minOrderNgn), maxDiscountNgn ? Number(maxDiscountNgn) : null, usageLimit ? Number(usageLimit) : null);
    logAdminAction(req.auth!.userId, 'CREATE_COUPON', 'coupon', id, { code });
    res.status(201).json({ id });
  });

  router.delete('/admin/coupons/:id', requireAdmin, (req: AuthedRequest, res) => {
    db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Admin Messages, Newsletter & Settings
  router.get('/admin/messages', requireAdmin, (_req, res) => {
    res.json(db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all());
  });

  router.get('/admin/newsletter', requireAdmin, (_req, res) => {
    res.json(db.prepare('SELECT * FROM newsletter_subscribers ORDER BY created_at DESC').all());
  });

  router.put('/admin/settings', requireAdmin, (req: AuthedRequest, res) => {
    const allowed = [
      'storeName',
      'whatsappNumber',
      'supportEmail',
      'supportPhone',
      'storeAddress',
      'instagramUrl',
      'twitterUrl',
      'facebookUrl',
      'freeDeliveryThresholdNgn',
      'lagosDeliveryFeeNgn',
      'nationwideDeliveryFeeNgn',
      'paystackPublicKey',
    ];
    if (req.body.paystackPublicKey && String(req.body.paystackPublicKey).trim().startsWith('sk_')) {
      res.status(400).json({ error: 'Never enter a Paystack secret key (sk_*) in the public key field.' });
      return;
    }
    const upsert = db.prepare('INSERT INTO store_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        upsert.run(key, String(req.body[key]).trim());
      }
    }
    logAdminAction(req.auth!.userId, 'UPDATE_SETTINGS', 'store_settings', 'global');
    res.json({ success: true });
  });

  return router;
}
