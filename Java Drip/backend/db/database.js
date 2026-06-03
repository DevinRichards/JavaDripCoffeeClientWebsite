const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { ensureBootstrapAdmin } = require('../services/adminAuth');

const DEFAULT_DB_PATH = path.join(__dirname, '../data/javadrip.db');
const DB_PATH = process.env.SQLITE_DB_PATH
  ? path.resolve(process.env.SQLITE_DB_PATH)
  : DEFAULT_DB_PATH;
const dataDir = path.dirname(DB_PATH);

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

let db;

const PRESENTATION_IMAGE_FALLBACKS = {
  'Macro Muffin': 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=900&q=80&fit=crop',
  'Keto Brownie': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900&q=80&fit=crop',
  'Almond Croissant': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=900&q=80&fit=crop',
  'Energy Balls': 'https://images.unsplash.com/photo-1571748982800-fa51082c2224?w=900&q=80&fit=crop',
  "The Hustler's Box": 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=80&fit=crop',
};

function inferMenuItemDescription(categoryId, categorySubtitle, itemName) {
  const sizeMatch = String(itemName).match(/^(Small|Medium|Large)\s+(.+)$/i);
  const size = sizeMatch ? sizeMatch[1].toLowerCase() : null;
  const baseName = sizeMatch ? sizeMatch[2] : itemName;
  const sizeLabel = size ? `${size} ` : '';

  switch (categoryId) {
    case 'refreshers':
      return `A ${sizeLabel}fruit-forward refresher served iced with a bright, energizing finish.`;
    case 'lattes':
      return `A ${sizeLabel}espresso latte with steamed milk and a smooth cafe finish.`;
    case 'roadrunner':
      return `A ${sizeLabel}Roadrunner specialty drink with Java Drip Coffee's extra-charge energy profile.`;
    case 'chai':
      return `A ${sizeLabel}spiced chai drink with warming flavor and a smooth finish.`;
    case 'lemonades':
      return `A ${sizeLabel}citrus-forward lemonade built for a crisp all-day lift.`;
    case 'teas':
      return `A ${sizeLabel}tea pour prepared for a simple, comforting cafe break.`;
    case 'matcha':
      return `A ${sizeLabel}matcha drink with layered sweetness and an earthy finish.`;
    case 'reg-coffee':
      return `A ${sizeLabel}house coffee poured fresh for the daily Gallup routine.`;
    case 'cake-pops':
      return 'A sweet grab-and-go cake pop for a quick coffee pairing.';
    case 'add-ons':
      if (/espresso/i.test(baseName)) {
        return 'Add an extra espresso shot for a stronger coffee kick.';
      }
      if (/redbull/i.test(baseName)) {
        return 'Add a Red Bull boost for more energy in the cup.';
      }
      if (/lotus/i.test(baseName)) {
        return 'Add Lotus energy for a brighter, fruit-forward lift.';
      }
      if (/boba/i.test(baseName)) {
        return 'Add boba pearls for extra texture and sweetness.';
      }
      if (/coldfoam/i.test(baseName)) {
        return 'Top the drink with cold foam for a richer finish.';
      }
      if (/dirty/i.test(baseName)) {
        return 'Make it dirty with an added espresso-style coffee edge.';
      }
      if (/cream|whip/i.test(baseName)) {
        return 'Finish the drink with cream or whip for added richness.';
      }
      return `Add ${baseName} to customize the drink for pickup.`;
    case 'milk-options':
      return `${baseName} is available as an alternative milk upgrade for pickup drinks.`;
    case 'uncategorized':
      if (/italian/i.test(baseName)) {
        return `A ${sizeLabel}Italian soda with bright flavor and a crisp sparkling finish.`;
      }
      if (/fog/i.test(baseName)) {
        return `A ${sizeLabel}London fog-style drink with tea, sweetness, and a smooth milk finish.`;
      }
      return categorySubtitle || `${itemName} from the Java Drip Coffee menu.`;
    default:
      return categorySubtitle || `${itemName} from the Java Drip Coffee menu.`;
  }
}

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function createPublicViewToken() {
  return crypto.randomBytes(24).toString('hex');
}

function initializeDatabase() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS menu_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subtitle TEXT,
      sort_order INTEGER DEFAULT 0,
      clover_category_id TEXT
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image_url TEXT,
      badge TEXT,
      active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      clover_item_id TEXT,
      FOREIGN KEY (category_id) REFERENCES menu_categories(id)
    );

    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      hours_weekday TEXT,
      hours_weekend TEXT,
      hours_saturday TEXT,
      hours_sunday TEXT,
      status TEXT DEFAULT 'open',
      close_time TEXT,
      lat REAL,
      lng REAL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      public_view_token TEXT,
      customer_clerk_id TEXT,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      order_type TEXT DEFAULT 'pickup',
      pickup_time TEXT,
      confirmation_pickup_time TEXT,
      location_id INTEGER,
      status TEXT DEFAULT 'pending_confirmation',
      payment_status TEXT DEFAULT 'unpaid',
      payment_method TEXT DEFAULT 'pay_at_pickup',
      payment_provider TEXT,
      square_payment_link_id TEXT,
      square_payment_url TEXT,
      square_order_id TEXT,
      square_payment_id TEXT,
      paid_at TEXT,
      subtotal REAL NOT NULL,
      tax REAL NOT NULL,
      fees REAL DEFAULT 0,
      total REAL NOT NULL,
      notes TEXT,
      admin_notes TEXT,
      confirmed_at TEXT,
      customer_notified_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      item_id INTEGER,
      item_name TEXT NOT NULL,
      item_price REAL NOT NULL,
      quantity INTEGER DEFAULT 1,
      addons_json TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS contact_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'manager',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customer_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clerk_user_id TEXT UNIQUE,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT,
      reward_points INTEGER DEFAULT 0,
      tier TEXT DEFAULT 'Pulse Member',
      favorite_order TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clover_oauth_tokens (
      merchant_id TEXT PRIMARY KEY,
      access_token TEXT NOT NULL,
      access_token_expiration INTEGER,
      refresh_token TEXT,
      refresh_token_expiration INTEGER,
      employee_id TEXT,
      merchant_name TEXT,
      installed_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clover_oauth_states (
      state TEXT PRIMARY KEY,
      merchant_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Safe migrations — add Clover columns if they don't exist yet (idempotent)
  const categoryColumns = db.pragma('table_info(menu_categories)').map(c => c.name);
  if (!categoryColumns.includes('clover_category_id')) {
    db.exec('ALTER TABLE menu_categories ADD COLUMN clover_category_id TEXT');
  }
  const itemColumns = db.pragma('table_info(menu_items)').map(c => c.name);
  if (!itemColumns.includes('clover_item_id')) {
    db.exec('ALTER TABLE menu_items ADD COLUMN clover_item_id TEXT');
  }
  const orderColumns = db.pragma('table_info(orders)').map(c => c.name);
  if (!orderColumns.includes('confirmation_pickup_time')) {
    db.exec('ALTER TABLE orders ADD COLUMN confirmation_pickup_time TEXT');
  }
  if (!orderColumns.includes('customer_clerk_id')) {
    db.exec('ALTER TABLE orders ADD COLUMN customer_clerk_id TEXT');
  }
  if (!orderColumns.includes('public_view_token')) {
    db.exec('ALTER TABLE orders ADD COLUMN public_view_token TEXT');
  }
  if (!orderColumns.includes('payment_status')) {
    db.exec("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'unpaid'");
  }
  if (!orderColumns.includes('payment_method')) {
    db.exec("ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'pay_at_pickup'");
  }
  if (!orderColumns.includes('payment_provider')) {
    db.exec('ALTER TABLE orders ADD COLUMN payment_provider TEXT');
  }
  if (!orderColumns.includes('square_payment_link_id')) {
    db.exec('ALTER TABLE orders ADD COLUMN square_payment_link_id TEXT');
  }
  if (!orderColumns.includes('square_payment_url')) {
    db.exec('ALTER TABLE orders ADD COLUMN square_payment_url TEXT');
  }
  if (!orderColumns.includes('square_order_id')) {
    db.exec('ALTER TABLE orders ADD COLUMN square_order_id TEXT');
  }
  if (!orderColumns.includes('square_payment_id')) {
    db.exec('ALTER TABLE orders ADD COLUMN square_payment_id TEXT');
  }
  if (!orderColumns.includes('paid_at')) {
    db.exec('ALTER TABLE orders ADD COLUMN paid_at TEXT');
  }
  if (!orderColumns.includes('fees')) {
    db.exec('ALTER TABLE orders ADD COLUMN fees REAL DEFAULT 0');
  }
  if (!orderColumns.includes('admin_notes')) {
    db.exec('ALTER TABLE orders ADD COLUMN admin_notes TEXT');
  }
  if (!orderColumns.includes('confirmed_at')) {
    db.exec('ALTER TABLE orders ADD COLUMN confirmed_at TEXT');
  }
  if (!orderColumns.includes('customer_notified_at')) {
    db.exec('ALTER TABLE orders ADD COLUMN customer_notified_at TEXT');
  }
  const ordersMissingPublicTokens = db.prepare(`
    SELECT id
    FROM orders
    WHERE public_view_token IS NULL OR trim(public_view_token) = ''
  `).all();
  if (ordersMissingPublicTokens.length > 0) {
    const backfillOrderToken = db.prepare('UPDATE orders SET public_view_token = ? WHERE id = ?');
    const backfillMissingTokens = db.transaction((rows) => {
      for (const row of rows) {
        backfillOrderToken.run(createPublicViewToken(), row.id);
      }
    });
    backfillMissingTokens(ordersMissingPublicTokens);
  }
  const orderItemColumns = db.pragma('table_info(order_items)').map(c => c.name);
  if (!orderItemColumns.includes('addons_json')) {
    db.exec('ALTER TABLE order_items ADD COLUMN addons_json TEXT');
  }

  const locationColumns = db.pragma('table_info(locations)').map(c => c.name);
  if (!locationColumns.includes('hours_saturday')) {
    db.exec('ALTER TABLE locations ADD COLUMN hours_saturday TEXT');
  }
  if (!locationColumns.includes('hours_sunday')) {
    db.exec('ALTER TABLE locations ADD COLUMN hours_sunday TEXT');
  }

  const count = db.prepare('SELECT COUNT(*) as count FROM menu_categories').get();
  if (count.count === 0) seedDatabase(db);

  ensureLocationDetails(db);
  ensurePresentationImages(db);
  ensureNormalizedMenuLabels(db);
  ensureMenuDescriptions(db);
  ensureBootstrapAdmin(db);

  console.log('✅ Database initialized');
}

function ensureLocationDetails(db) {
  db.prepare(`
    UPDATE locations
    SET hours_weekday = 'Mon – Fri: 6:00 AM – 7:00 PM',
        hours_weekend = 'Sat: 7:00 AM – 6:00 PM',
        hours_saturday = 'Sat: 7:00 AM – 6:00 PM',
        hours_sunday = 'Sun: 8:00 AM – 3:00 PM',
        close_time = '7:00 PM'
    WHERE name LIKE 'Java Drip Coffee%'
       OR address = '1307 E Historic Highway 66'
  `).run();
}

function ensurePresentationImages(db) {
  const updateImage = db.prepare(`
    UPDATE menu_items
    SET image_url = ?
    WHERE name = ? AND (image_url IS NULL OR trim(image_url) = '')
  `);

  const applyFallbacks = db.transaction(() => {
    for (const [name, imageUrl] of Object.entries(PRESENTATION_IMAGE_FALLBACKS)) {
      updateImage.run(imageUrl, name);
    }
  });

  applyFallbacks();
}

function ensureMenuDescriptions(db) {
  const missingDescriptions = db.prepare(`
    SELECT i.id, i.name, i.category_id, c.subtitle
    FROM menu_items i
    JOIN menu_categories c ON c.id = i.category_id
    WHERE i.description IS NULL OR trim(i.description) = ''
  `).all();

  if (missingDescriptions.length === 0) {
    return;
  }

  const updateDescription = db.prepare('UPDATE menu_items SET description = ? WHERE id = ?');
  const backfillDescriptions = db.transaction((rows) => {
    for (const row of rows) {
      updateDescription.run(
        inferMenuItemDescription(row.category_id, row.subtitle, row.name),
        row.id
      );
    }
  });

  backfillDescriptions(missingDescriptions);
}

function ensureNormalizedMenuLabels(db) {
  db.prepare(`
    UPDATE menu_categories
    SET subtitle = 'House specialties, Italian sodas, and featured extras.'
    WHERE id = 'uncategorized'
      AND (subtitle IS NULL OR subtitle LIKE '%Imported from Clover%')
  `).run();

  db.prepare(`
    UPDATE menu_items
    SET name = 'Espresso'
    WHERE lower(trim(name)) = 'esspresso'
  `).run();

  db.prepare(`
    UPDATE menu_items
    SET description = 'Add an extra espresso shot for a stronger coffee kick.'
    WHERE name = 'Espresso'
      AND (description IS NULL OR description LIKE '%Esspresso%' OR description LIKE '%espresso shot%')
  `).run();
}

function seedDatabase(db) {
  const insertCategory = db.prepare(
    'INSERT INTO menu_categories (id, name, subtitle, sort_order) VALUES (?, ?, ?, ?)'
  );
  const insertItem = db.prepare(`
    INSERT INTO menu_items (category_id, name, description, price, image_url, badge, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertLocation = db.prepare(`
    INSERT INTO locations (name, address, city, hours_weekday, hours_weekend, hours_saturday, hours_sunday, status, close_time, lat, lng)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedAll = db.transaction(() => {
    // Categories
    insertCategory.run('hustle-brews', 'Hustle Brews', 'High Caffeine / High Performance', 1);
    insertCategory.run('urban-lattes', 'Urban Lattes', 'Sophisticated Infusions & Crafted Profiles', 2);
    insertCategory.run('seasonal', 'Fuel the Drift', 'The Spring Collection', 3);
    insertCategory.run('power-snacks', 'Power Snacks', 'Fuel for the Grind', 4);

    // Hustle Brews
    insertItem.run('hustle-brews', 'Triple-Jet Nitro',
      'Infused with extra nitrogen and a triple-shot concentration for maximum kinetic energy.',
      6.50,
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCrXw05HgkFlW3SP69rqee72xcjnIYblUMsNU_E2-SlOzOcUXokd_vsv7yPo-T--5UW65BXxYNkgEIiBayJ_TWmBxKQoFOlZcX9_yKb2IZOYjVqtrfMVAHY0m6nQaiTvyODrqkovu0n2-bbkS0zeftEDh3e_jzQ3T7oXpHbl_xBroRKf1JaDPZbgxuKn7-FUO9oyFXQ3jPEhQc5kbgQ0ajL90Rn690LKKQRt7Q_oztraK0_IeojgqHIQ8pZky_i5h77nsF7yjvEnZI',
      null, 1);
    insertItem.run('hustle-brews', 'The Deadline Black',
      'Our darkest roast, extracted at high pressure for zero-acid, maximum-clarity focus.',
      4.25,
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAZQgHDiP_BQRTD2ZPVIjUoTx6L5KVbIipe4oYa_x6z2VAB37dnaMIRi5RF-XTFnLs_VhdMO4rO9mWRG20WQOdke3PDERdICg3Mo2pDdd0LMOkVjnpJkOO3C3fG_b-bRO8uVUV9WfWVOj_TMYAJ3l3Es_wgEBw6IksUETohLKn00d33mT_V5o1y3AP8Fg-Zp4iQCkQOpE6JilCTRjAWUl9orLyodTgYb3hvI1_G1vJ1xc5_nTFnC0JMTR1VGBQP2TUa5b2qxvmZgD4',
      null, 2);
    insertItem.run('hustle-brews', 'Velocity Cortado',
      'A 1:1 ratio of intense espresso and silky microfoam. Pure efficiency in a cup.',
      4.75,
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBg6MGwGMTFoEY4T5JW5q-BVRXKM1easGHvIBPAKggxlzqORyQ21Kt5OCSBGQpnBXSAGaNteUsGJQEDoj_Nk4YALtKMT8pUr4mKXhZ1M2zMMUe0MwMSfXLbN9OsbdZy-6aZRpVIqpsJ3pbxbRJwJtnAZzqKFCVwMzcsQk4NW7a2WFRl8jq5u1LB1MkjWg89zKVfiWV4O6ARFhDtw2hgiLi6eMsrTztrVr6t_yXRrp3c8FulXV5U_87Q7Ms4ZyHa3kgbTJvN4L2DiW0',
      null, 3);

    // Urban Lattes
    insertItem.run('urban-lattes', 'Neon Rose Latte',
      'A botanical infusion of organic rose water, beet extract, and creamy oat milk over a double ristretto shot.',
      7.25,
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCWeXdblvkQqRwZtc5pi1cwLdnSHzPzbwGOqqiACT93b3mpESUVhaAJf_Pjnv8Vksi3L4hZlmgt_Qo-WPAz1VTZuZAGLlQ5eoYoCZmU_T5MW-pzkkqgdlXG5z-HuHDyu2ep3Yu49UXtArKoBQgt65D3QMVvOvNrhG4bKrE_y70fQbKtMouN0fzy8ZbrJQJKk6mwu2gEzb7oeE-q18vDiFvjMdXr5cT6RPTVj52SRkMnER3fCwOJrR9zHsw21Am5bRFWXWMcoi1Stwg',
      'Bestseller', 1);
    insertItem.run('urban-lattes', 'Concrete Jungle',
      'Activated charcoal, smoked sea salt, and Madagascar vanilla bean blended with our signature urban espresso.',
      7.50,
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB2pba6IxH69BqyUDAInY4RPw3m2qGoFTSRXd3hMC9RMrYBpdsberNhjMb2ln7Vcu8IfrRtIcFdEV3JjiAE7Ua8_0rLQLDa8n1bE_AS7DCw_phjSXjTsoKTKMfHwOFnqQef-GSOX3LjoOoEi3UJAly_ft6Wtx4_V-2sv-x9bqSxMRRDR1KhqFzQ1J4qUdb18woJdtaljDYrPiOcYqE6AbkJsH1sPZtnSMgm8J4gkmlBVgokvVT9ZVBAbELD9UeraD-ntAQ4wolvFY0',
      'Artisan', 2);
    insertItem.run('urban-lattes', 'Metropolitan Latte',
      'Silky micro-foam, double shot pulse. The city in a cup.',
      5.50,
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAIm6ASFK3QSxhrJ4OuImskzpPlx1RgCQIBu_TKyxdF_hrbbCkoVnkPsOSXbi-oo4nF1vdmj79HKTdfMf7LdjDb5zST-4pOblelCWJjruRZJhMAbWHG_bfdzAFomqFmWq-5sPCTnEJT_Q4A7-IOXFO_g_jXOr4flNqsLc2_U13egSMqH0aa5-REbZqGn1hRnHWE5wePmag9T0GIwNCHVHnDOe3lbCXX_04TNjWxe2Bw46Bacicjvxl2_qTsr-Noacsz1Ehc2ZkvHJc',
      'Hot', 3);

    // Seasonal
    insertItem.run('seasonal', 'Cold Fusion Brew',
      '24-hour steep, nitro finish. Cold energy meets urban craft.',
      6.25,
      'https://lh3.googleusercontent.com/aida-public/AB6AXuALY3jVqn6hWmaxtnY4gWqxxzbacxq9x80DqJEeKgcOUrLK5TjiTbkknJlw4B6a41KrkbUWNBvC1MV9yqsoPMRcUAl6ffq1Cr3_77cM9fLe0BOty5E5Fl7fAR4bVMeDZXmcuG6p47O57b4jLJRUJ9axY37JGHmQN6cxvrQHDpodgVQ-2I-04rRkCrtPalsNN3W4k_SNBm9V9X0xL2-2Ov0Oslj63QTkD0iy_qKPa2fsznE2J9NhohxEvY3DrOpiv3krTGa5S0XTsEs',
      'New', 1);
    insertItem.run('seasonal', 'Kinetic Drip',
      'Single origin, seasonal rotation. From farm to cup at full velocity.',
      4.75,
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAm_Y-aU3O4c1BWAfr6XtCDezyYkRJcfG0D6zsSJXgHEpSuiZvFF6gcsr2UEbr-sTM74jgOLvZUpaUwechorhT6CKzXukhnuc8H9deFmPIYMrAw-jdvop1bAfGJy9BTMcfGVFuqnWt6285XrqdUivE_ZCY5w-DA8ZTFjcV13lzAPvIco1nhA18elMey8ULtxLr-LIUY0ogsfeTGwjqNONXFhksDgoGsmKTzNtHeaCmOqXAlJ5NAMZ0cCKuQCXQmtaUL0YzzWJJjzMk',
      null, 2);
    insertItem.run('seasonal', 'Neon Glow Latte',
      'Natural pitaya, coconut milk base. Vivid, vibrant, utterly kinetic.',
      7.00,
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCDNUfsi27YF5vClKPZjwTHz3ibG4Md2gox-jFDbnRiegWed07wSdK1f7tJ2S7DgmrdsKt6Qs15nBZRqbsSEyheWnHB-b-MANrdgY7HzCIctiG3O_A4yR3d_2_zTrVsSsTUOO4Pgq_CBspWf4jWqEkspT-z_ELOTD8tKf8ftV-BijQC8Xdrtyj2gM6-vyKyJyrtB-UdJtYA1OK-dofvvJwl5sLHLiQ1IAVKlXaYrETf5tgLI_hzjRaiDxpj-KNUT_3UB1zIq-ctAD_g',
      null, 3);
    insertItem.run('seasonal', 'Neon Roast',
      'A bright, citrus-forward blend that cuts through the morning fog. Roasted light for maximum kinetic energy.',
      5.75,
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCKzmfeWXZLHyQLaVgR64LsOJMD5IwMpvxG03AE-SbWznxcnP-o5Te0LLJSbZhyUXrS2SM81JOnkrRUrfv2NM7fQUulzDqhDMENZwGiiSZEU-nfCOTIGjL_KeVJUSrc3BTENEa1dh-T4-R3iM_tc_9ev9esQlK0bgwCi7ypJwvsCBy2Y89AjfV_xXSZn1iHPopSouydpgO1udis3bGMp2wsPXXsBXEnspRcdo8Lgg2AJu9fBcSjGWjUUEAH2HiI2sN0XjIYYCtKkj4',
      'Limited', 4);

    // Power Snacks
    insertItem.run('power-snacks', 'Avocado Pulse Toast',
      'Sourdough, smashed avocado, chili flakes, and micro-greens. Fuel your hustle.',
      12.00,
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAVrFaclCqj-otp5Wj9b5TRirbJIhFcm9VjFKJdbWrJ4B7smybC8wmmYMDy9ofN07FAZP_zdVqnFQVYTHX8OhL7bvpxiRjk2bzGANmWTwcqV8rQpAoR_9s0x76IfKyr8XcThqHNNz13Io0hv8gUBYOjMtftZluNah7FM5fIUwHudDMoLtfKdKTP0w-IVLV8OQ8m0i1dxE07imlirtF5eng2t1AjD9nJgs7NSC21RJYQwqww8hU1GUgEeAbvtt3dqMGO1jPrLvgztXo',
      null, 1);
    insertItem.run('power-snacks', 'Macro Muffin', 'Blueberry & protein-packed. Macro-friendly fuel for the long grind.', 4.50, 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400&q=80&fit=crop', null, 2);
    insertItem.run('power-snacks', 'Keto Brownie', 'Sugar-free dark cocoa. Indulge without compromising the mission.', 5.00, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&q=80&fit=crop', null, 3);
    insertItem.run('power-snacks', 'Almond Croissant', 'Twice-baked, flaky perfection. Buttery layers meet urban intensity.', 5.50, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80&fit=crop', null, 4);
    insertItem.run('power-snacks', 'Energy Balls', 'Dates, nuts, and espresso. Pocket-sized power for the metropolitan pace.', 3.00, 'https://images.unsplash.com/photo-1571748982800-fa51082c2224?w=400&q=80&fit=crop', null, 5);
    insertItem.run('power-snacks', "The Hustler's Box", '1× Double Espresso, 1× Protein Bar, 1× Mixed Nuts. The ultimate fuel bundle.', 15.00, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80&fit=crop', 'Bundle', 6);

    // Locations — real Java Drip Coffee location
    insertLocation.run(
      'Java Drip Coffee – Gallup',
      '1307 E Historic Highway 66',
      'Gallup, NM 87301',
      'Mon – Fri: 6:00 AM – 7:00 PM',
      'Sat: 7:00 AM – 6:00 PM',
      'Sat: 7:00 AM – 6:00 PM',
      'Sun: 8:00 AM – 3:00 PM',
      'open',
      '7:00 PM',
      35.5247,
      -108.7315
    );
  });

  seedAll();
  console.log('🌱 Database seeded');
}

module.exports = { getDb, initializeDatabase };
