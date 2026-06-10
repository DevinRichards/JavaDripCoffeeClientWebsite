const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { ensureBootstrapAdmin } = require('../services/adminAuth');
const { SEED_MENU_CATEGORIES, SEED_MENU_ITEMS } = require('./seedMenuData');

const DEFAULT_DB_PATH = path.join(__dirname, '../data/javadrip.db');
const DB_PATH = process.env.SQLITE_DB_PATH
  ? path.resolve(process.env.SQLITE_DB_PATH)
  : DEFAULT_DB_PATH;
const dataDir = path.dirname(DB_PATH);

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

let db;

const PRESENTATION_IMAGE_FALLBACKS = {
  'Small Latte': 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=900&q=80&fit=crop',
  'Small Coffee': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=80&fit=crop',
  'Small Lemonade': 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=900&q=80&fit=crop',
  'Cake Pop': 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=900&q=80&fit=crop',
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
      payment_method TEXT DEFAULT 'online',
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

    CREATE TABLE IF NOT EXISTS gallery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'Photos',
      media_type TEXT DEFAULT 'photo',
      image_url TEXT NOT NULL,
      caption TEXT,
      active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gallery_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0,
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
    db.exec("ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'online'");
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

  const galleryColumns = db.pragma('table_info(gallery_items)').map(c => c.name);
  if (!galleryColumns.includes('updated_at')) {
    db.exec("ALTER TABLE gallery_items ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))");
  }
  ensureGalleryCategories(db);

  const count = db.prepare('SELECT COUNT(*) as count FROM menu_categories').get();
  if (count.count === 0) seedDatabase(db);
  replacePlaceholderMenuIfPresent(db);

  ensureLocationDetails(db);
  ensurePresentationImages(db);
  ensureNormalizedMenuLabels(db);
  ensureFlavorAddons(db);
  ensureMenuDescriptions(db);
  ensureBootstrapAdmin(db);

  console.log('✅ Database initialized');
}

function ensureGalleryCategories(db) {
  const defaultCategories = ['Photos', 'Videos', 'Store + Team'];
  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO gallery_categories (name, sort_order)
    VALUES (?, ?)
  `);

  const ensureDefaults = db.transaction(() => {
    defaultCategories.forEach((category, index) => {
      insertCategory.run(category, (index + 1) * 10);
    });

    const itemCategories = db.prepare(`
      SELECT DISTINCT category
      FROM gallery_items
      WHERE category IS NOT NULL AND trim(category) <> ''
    `).all();

    for (const row of itemCategories) {
      insertCategory.run(row.category, 1000);
    }
  });

  ensureDefaults();
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

function ensureFlavorAddons(db) {
  const flavorItems = SEED_MENU_ITEMS.filter((item) => item[0] === 'flavors');
  if (flavorItems.length === 0) return;

  const upsertFlavorCategory = db.prepare(`
    INSERT INTO menu_categories (id, name, subtitle, sort_order, clover_category_id)
    VALUES ('flavors', 'Flavors', 'Free syrup and fruit flavor options for pickup drinks', 25, NULL)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      subtitle = excluded.subtitle,
      sort_order = excluded.sort_order
  `);
  const findExistingFlavor = db.prepare(`
    SELECT id
    FROM menu_items
    WHERE category_id = 'flavors' AND lower(trim(name)) = lower(trim(?))
  `);
  const insertFlavor = db.prepare(`
    INSERT INTO menu_items (category_id, name, description, price, image_url, badge, active, sort_order, clover_item_id)
    VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?)
  `);
  const updateFlavor = db.prepare(`
    UPDATE menu_items
    SET description = ?,
        price = 0,
        active = 1,
        sort_order = ?
    WHERE id = ?
  `);

  const upsertFlavors = db.transaction(() => {
    upsertFlavorCategory.run();

    for (const flavor of flavorItems) {
      const [, name, description, price, active, sortOrder, cloverItemId] = flavor;
      const existing = findExistingFlavor.get(name);

      if (existing) {
        updateFlavor.run(description, sortOrder, existing.id);
      } else {
        insertFlavor.run('flavors', name, description, price, active, sortOrder, cloverItemId);
      }
    }
  });

  upsertFlavors();
}

function ensureNormalizedMenuLabels(db) {
  db.prepare(`
    UPDATE menu_categories
    SET name = 'Other',
        subtitle = 'House specialties, Italian sodas, and featured extras.'
    WHERE id = 'uncategorized'
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

function replacePlaceholderMenuIfPresent(db) {
  const placeholderMenu = db.prepare(`
    SELECT COUNT(*) AS count
    FROM menu_items
    WHERE name IN ('Triple-Jet Nitro', 'The Deadline Black', 'Neon Rose Latte', 'Concrete Jungle')
  `).get();

  const placeholderCategories = db.prepare(`
    SELECT COUNT(*) AS count
    FROM menu_categories
    WHERE id IN ('hustle-brews', 'urban-lattes', 'seasonal', 'power-snacks')
  `).get();

  if (placeholderMenu.count === 0 && placeholderCategories.count === 0) {
    return;
  }

  const replaceMenu = db.transaction(() => {
    db.prepare('DELETE FROM menu_items').run();
    db.prepare('DELETE FROM menu_categories').run();
    seedImportedMenuDatabase(db);
  });

  replaceMenu();
  console.log('🔁 Replaced temporary concept menu with imported Java Drip Coffee inventory');
}

function seedImportedMenuDatabase(db) {
  const insertCategory = db.prepare(
    'INSERT INTO menu_categories (id, name, subtitle, sort_order, clover_category_id) VALUES (?, ?, ?, ?, NULL)'
  );
  const insertItem = db.prepare(`
    INSERT INTO menu_items (
      category_id, name, description, price, image_url, badge, active, sort_order, clover_item_id
    )
    VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?)
  `);
  const insertLocation = db.prepare(`
    INSERT INTO locations (name, address, city, hours_weekday, hours_weekend, hours_saturday, hours_sunday, status, close_time, lat, lng)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedAll = db.transaction(() => {
    for (const category of SEED_MENU_CATEGORIES) {
      insertCategory.run(...category);
    }

    for (const item of SEED_MENU_ITEMS) {
      insertItem.run(...item);
    }

    const locationExists = db.prepare('SELECT 1 FROM locations WHERE address = ?').get('1307 E Historic Highway 66');
    if (!locationExists) {
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
    }
  });

  seedAll();
  console.log('🌱 Database seeded from imported Java Drip Coffee inventory');
}

function seedDatabase(db) {
  seedImportedMenuDatabase(db);
}
module.exports = { getDb, initializeDatabase };
