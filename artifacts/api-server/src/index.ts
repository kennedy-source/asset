import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(baseDir, "../.env");
dotenv.config({ path: envPath });

import fs from "fs";
import { logger } from "./lib/logger";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

const rawPort = process.env["PORT"] || "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "pajoy_salt_2024").digest("hex");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const enterpriseInventoryStructure = [
  {
    name: "School Uniforms",
    description: "Primary, secondary, college, university, kindergarten, prefect, sports, lab, and graduation uniforms.",
    subcategories: [
      "Primary School Uniforms",
      "Secondary School Uniforms",
      "College Uniforms",
      "University Uniforms",
      "Kindergarten Uniforms",
      "Prefect Uniforms",
      "Sports Uniforms",
      "Lab Uniforms",
      "Graduation Wear",
    ],
    products: [
      "Boys Shorts",
      "Boys Trousers",
      "Girls Skirts",
      "Girls Dresses",
      "Tunics",
      "Shirts",
      "Blouses",
      "Sweaters",
      "Cardigans",
      "Hoodies",
      "Tracksuits",
      "PE Kits",
      "Socks",
      "School Ties",
      "Belts",
      "Blazers",
      "Pullovers",
      "School Caps",
      "Scarves",
    ],
  },
  {
    name: "Corporate Wear",
    description: "Office, executive, staff, and promotional apparel.",
    subcategories: ["Office Wear", "Executive Wear", "Staff Uniforms", "Promotional Apparel"],
    products: ["Office Shirts", "Corporate Blouses", "Suits", "Blazers", "Waistcoats", "Trousers", "Pencil Skirts", "Polo Shirts", "Branded T-Shirts", "Company Jackets", "Hoodies"],
  },
  {
    name: "Industrial & Workwear",
    description: "Construction, factory, workshop, reflective, and engineering workwear.",
    subcategories: ["Construction Wear", "Factory Wear", "Workshop Wear", "Reflective Wear", "Engineering Wear"],
    products: ["Overalls", "Dust Coats", "Boiler Suits", "Reflective Jackets", "Reflective Vests", "Safety Trousers", "Welding Aprons", "Safety Gloves", "Gumboots", "Hard Hats", "Raincoats"],
  },
  {
    name: "Medical Apparel",
    description: "Hospital, nursing, surgical, and laboratory uniforms.",
    subcategories: ["Hospital Wear", "Nursing Uniforms", "Surgical Wear", "Laboratory Wear"],
    products: ["Scrubs", "Lab Coats", "Theatre Gowns", "Nurse Dresses", "Doctor Coats", "Surgical Caps", "Medical Aprons", "Patient Gowns", "Face Masks"],
  },
  {
    name: "Sportswear",
    description: "Team kits, athletics wear, gym wear, and sports apparel.",
    subcategories: ["Football Kits", "Basketball Kits", "Athletics Wear", "Gym Wear", "Team Jerseys"],
    products: ["Jerseys", "Sports Shorts", "Tracksuits", "Training Bibs", "Compression Wear", "Sports Socks", "Gym Wear", "Swimwear"],
  },
  {
    name: "Fashion & Casual Wear",
    description: "Men, women, kids, and streetwear collections.",
    subcategories: ["Men Fashion", "Women Fashion", "Kids Wear", "Streetwear"],
    products: ["T-Shirts", "Hoodies", "Jeans", "Jackets", "Dresses", "Tops", "Leggings", "Jumpsuits", "Shorts", "Cardigans", "Casual Shirts"],
  },
  {
    name: "Hospitality & Service Uniforms",
    description: "Hotel, restaurant, spa, and housekeeping uniforms.",
    subcategories: ["Hotel Wear", "Restaurant Wear", "Spa Uniforms", "Housekeeping Uniforms"],
    products: ["Chef Coats", "Aprons", "Waiter Uniforms", "Reception Uniforms", "Housekeeping Dresses", "Kitchen Wear"],
  },
  {
    name: "Security Uniforms",
    description: "Guard, tactical, and patrol uniforms.",
    subcategories: ["Guard Uniforms", "Tactical Wear", "Patrol Wear"],
    products: ["Combat Trousers", "Security Shirts", "Security Sweaters", "Berets", "Patrol Jackets", "Rain Gear"],
  },
  {
    name: "Religious Clothing",
    description: "Religious, choir, and clergy clothing.",
    subcategories: [],
    products: ["Choir Robes", "Church Uniforms", "Kanzu", "Hijabs", "Nun Dresses", "Clergy Wear", "Muslim Caps"],
  },
  {
    name: "Accessories",
    description: "Clothing, school, and safety accessories.",
    subcategories: ["Clothing Accessories", "School Accessories", "Safety Accessories"],
    products: ["Ties", "Bow Ties", "Belts", "Socks", "Gloves", "Scarves", "School Bags", "Backpacks", "Lunch Bags", "Name Tags", "ID Holders", "Safety Glasses"],
  },
  {
    name: "Footwear",
    description: "School, work, casual, and sports footwear.",
    subcategories: ["School Footwear", "Work Footwear", "Casual Footwear", "Sports Footwear"],
    products: ["School Shoes", "Canvas Shoes", "Safety Boots", "Gumboots", "Sneakers", "Sandals", "Slippers", "Formal Shoes"],
  },
  {
    name: "Fabrics & Tailoring Materials",
    description: "Fabrics, fasteners, threads, labels, and embroidery materials.",
    subcategories: [],
    products: ["Cotton Fabric", "Polyester Fabric", "Khaki Fabric", "Denim", "Fleece", "Buttons", "Zippers", "Threads", "Elastic Bands", "Velcro", "Labels", "Embroidery Backing"],
  },
  {
    name: "Printing & Embroidery Services",
    description: "Branding, printing, digitizing, and embroidery services.",
    subcategories: [],
    products: ["Embroidery", "Screen Printing", "Heat Press", "Vinyl Printing", "DTF Printing", "Sublimation", "Logo Digitizing", "Badge Embroidery"],
  },
  {
    name: "Seasonal Wear",
    description: "Rain, cold weather, and seasonal clothing.",
    subcategories: [],
    products: ["Winter Jackets", "Thermal Wear", "Raincoats", "Beanies", "Scarves", "Umbrellas"],
  },
  {
    name: "Special Clothing",
    description: "Plus size, maternity, adaptive, eco-friendly, luxury, and graduation clothing.",
    subcategories: [],
    products: ["Plus Size Clothing", "Maternity Wear", "Adaptive Clothing", "Eco-Friendly Apparel", "Luxury Uniforms", "Graduation Gowns"],
  },
];

async function seedDefaultCategories(db: any, categoriesTable: any) {
  const defaultCategories = [
    { name: "General", slug: "general", description: "Default product category." },
    { name: "Apparel", slug: "apparel", description: "Clothing and textiles." },
    { name: "Office Supplies", slug: "office-supplies", description: "Office and stationery items." },
    { name: "Electronics", slug: "electronics", description: "Electronics and accessories." },
    { name: "School Shirts", slug: "school-shirts", description: "Primary and secondary school shirts." },
    { name: "School Trousers", slug: "school-trousers", description: "School trousers and shorts." },
    { name: "School Skirts and Dresses", slug: "school-skirts-dresses", description: "School skirts, pinafores, and dresses." },
    { name: "Sweaters and Cardigans", slug: "sweaters-cardigans", description: "School sweaters, cardigans, and pullovers." },
    { name: "Blazers and Jackets", slug: "blazers-jackets", description: "School blazers, jackets, and coats." },
    { name: "Tracksuits and Games Kits", slug: "tracksuits-games-kits", description: "Sports uniforms, tracksuits, and PE kits." },
    { name: "Ties, Socks and Belts", slug: "ties-socks-belts", description: "Uniform accessories." },
    { name: "Embroidery and Badges", slug: "embroidery-badges", description: "School badges, logo embroidery, and name tags." },
    { name: "Corporate Wear", slug: "corporate-wear", description: "Branded shirts, polos, coats, and staff uniforms." },
    { name: "Fabrics and Materials", slug: "fabrics-materials", description: "Fabric, lining, thread, buttons, zips, and other materials." },
  ];

  for (const category of defaultCategories) {
    const [existing] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, category.slug))
      .limit(1);

    if (!existing) {
      await db.insert(categoriesTable).values(category);
    }
  }
}

async function seedDefaultSettings(db: any, settingsTable: any) {
  const defaultSettings = [
    { key: "business_name", value: "PAJOY Smart Business", category: "general", description: "Shop name displayed in the system." },
    { key: "business_phone", value: "+254700000000", category: "general", description: "Primary business contact number." },
    { key: "business_email", value: "kennedy@pajoy.co.ke", category: "general", description: "Primary business email address." },
    { key: "business_address", value: "Nairobi, Kenya", category: "general", description: "Business postal address." },
    { key: "system_currency", value: "KES", category: "general", description: "Default currency for transactions." },
  ];

  for (const setting of defaultSettings) {
    const [existing] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, setting.key))
      .limit(1);

    if (!existing) {
      await db.insert(settingsTable).values(setting as any);
    }
  }
}

async function seedAdminIfEmpty(db: any, usersTable: any) {
  const [existingUser] = await db.select().from(usersTable).limit(1);
  if (!existingUser) {
    const passwordHash = hashPassword("Admin@1234");
    await db.insert(usersTable).values({
      name: "Admin",
      email: "admin@pajoy.co.ke",
      passwordHash,
      role: "super_admin",
      isActive: true,
    });
    logger.info("Default admin created: admin@pajoy.co.ke / Admin@1234");
  }
}

async function ensureDatabaseCompatibility(pool: any) {
  const statements = [
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS school_name text`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes text`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now()`,
    `ALTER TABLE categories ADD COLUMN IF NOT EXISTS kind text DEFAULT 'category' NOT NULL`,
    `ALTER TABLE categories ADD COLUMN IF NOT EXISTS level integer DEFAULT 0 NOT NULL`,
    `ALTER TABLE categories ADD COLUMN IF NOT EXISTS path text`,
    `ALTER TABLE categories ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb NOT NULL`,
    `CREATE INDEX IF NOT EXISTS categories_parent_id_idx ON categories(parent_id)`,
    `CREATE INDEX IF NOT EXISTS categories_kind_idx ON categories(kind)`,
    `CREATE INDEX IF NOT EXISTS categories_path_idx ON categories(path)`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS size text`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS color text`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS material text`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS gender text`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS school_name text`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode text`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS qr_code text`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS brand text`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS fabric_type text`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS age_group text`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS weight numeric`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS thumbnail_url text`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0 NOT NULL`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS tax numeric DEFAULT 0 NOT NULL`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS minimum_stock integer DEFAULT 0 NOT NULL`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id integer`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS organization_name text`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS embroidery_option boolean DEFAULT false NOT NULL`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS printing_option boolean DEFAULT false NOT NULL`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[] NOT NULL`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS availability_status text DEFAULT 'available' NOT NULL`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type_id integer`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS seasonal_collection text`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS buying_price numeric DEFAULT 0 NOT NULL`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price numeric DEFAULT 0 NOT NULL`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 0 NOT NULL`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_level integer DEFAULT 5 NOT NULL`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now()`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0 NOT NULL`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'CASH' NOT NULL`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'PENDING' NOT NULL`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0 NOT NULL`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax numeric DEFAULT 0 NOT NULL`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS balance numeric DEFAULT 0 NOT NULL`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now()`,
    `ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'paystack'`,
    `ALTER TABLE products ALTER COLUMN price SET DEFAULT 0`,
    `ALTER TABLE sale_items ALTER COLUMN product_name SET DEFAULT ''`,
    `ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reason text`,
    `ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reference text`,
    `ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS user_id integer`,
    `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now()`,
    `CREATE TABLE IF NOT EXISTS subcategories (
      id serial PRIMARY KEY,
      category_id integer NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name text NOT NULL,
      slug text NOT NULL UNIQUE,
      description text,
      sort_order integer NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS subcategories_category_id_idx ON subcategories(category_id)`,
    `CREATE TABLE IF NOT EXISTS product_types (
      id serial PRIMARY KEY,
      category_id integer REFERENCES categories(id) ON DELETE CASCADE,
      subcategory_id integer REFERENCES subcategories(id) ON DELETE CASCADE,
      name text NOT NULL,
      slug text NOT NULL UNIQUE,
      description text,
      sort_order integer NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS product_types_category_id_idx ON product_types(category_id)`,
    `CREATE INDEX IF NOT EXISTS product_types_subcategory_id_idx ON product_types(subcategory_id)`,
    `CREATE TABLE IF NOT EXISTS brands (
      id serial PRIMARY KEY,
      name text NOT NULL UNIQUE,
      slug text NOT NULL UNIQUE,
      description text,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS materials (
      id serial PRIMARY KEY,
      name text NOT NULL UNIQUE,
      slug text NOT NULL UNIQUE,
      fabric_type text,
      description text,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS product_sizes (
      id serial PRIMARY KEY,
      name text NOT NULL,
      code text NOT NULL UNIQUE,
      size_type text NOT NULL,
      measurement_json jsonb,
      sort_order integer NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true
    )`,
    `CREATE TABLE IF NOT EXISTS product_colors (
      id serial PRIMARY KEY,
      name text NOT NULL,
      slug text NOT NULL UNIQUE,
      hex_code text NOT NULL DEFAULT '#000000',
      is_active boolean NOT NULL DEFAULT true
    )`,
    `CREATE TABLE IF NOT EXISTS product_variants (
      id serial PRIMARY KEY,
      product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      product_type_id integer REFERENCES product_types(id) ON DELETE SET NULL,
      sku text NOT NULL UNIQUE,
      barcode text,
      qr_code text,
      size_id integer REFERENCES product_sizes(id) ON DELETE SET NULL,
      color_id integer REFERENCES product_colors(id) ON DELETE SET NULL,
      material_id integer REFERENCES materials(id) ON DELETE SET NULL,
      brand_id integer REFERENCES brands(id) ON DELETE SET NULL,
      gender text,
      age_group text,
      season text,
      buying_price numeric NOT NULL DEFAULT 0,
      selling_price numeric NOT NULL DEFAULT 0,
      discount numeric NOT NULL DEFAULT 0,
      tax numeric NOT NULL DEFAULT 0,
      stock_quantity integer NOT NULL DEFAULT 0,
      minimum_stock integer NOT NULL DEFAULT 0,
      availability_status text NOT NULL DEFAULT 'available',
      tags text[] DEFAULT '{}'::text[] NOT NULL,
      image_url text,
      thumbnail_url text,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON product_variants(product_id)`,
    `CREATE INDEX IF NOT EXISTS product_variants_product_type_id_idx ON product_variants(product_type_id)`,
    `CREATE INDEX IF NOT EXISTS product_variants_barcode_idx ON product_variants(barcode)`,
    `CREATE TABLE IF NOT EXISTS inventory (
      id serial PRIMARY KEY,
      product_id integer REFERENCES products(id) ON DELETE CASCADE,
      variant_id integer REFERENCES product_variants(id) ON DELETE CASCADE,
      supplier_id integer REFERENCES suppliers(id) ON DELETE SET NULL,
      branch_name text NOT NULL DEFAULT 'Main Branch',
      warehouse_name text NOT NULL DEFAULT 'Main Warehouse',
      batch_number text,
      quantity_on_hand integer NOT NULL DEFAULT 0,
      quantity_reserved integer NOT NULL DEFAULT 0,
      minimum_stock integer NOT NULL DEFAULT 0,
      reorder_point integer NOT NULL DEFAULT 0,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS inventory_product_id_idx ON inventory(product_id)`,
    `CREATE INDEX IF NOT EXISTS inventory_variant_id_idx ON inventory(variant_id)`,
    `CREATE INDEX IF NOT EXISTS inventory_branch_idx ON inventory(branch_name)`,
    `CREATE TABLE IF NOT EXISTS sequences (
      key text PRIMARY KEY,
      value integer NOT NULL DEFAULT 0,
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    )`,
    `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0 NOT NULL`,
    `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tax numeric DEFAULT 0 NOT NULL`,
    `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS created_by integer`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS quotation_id integer`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0 NOT NULL`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax numeric DEFAULT 0 NOT NULL`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance numeric DEFAULT 0 NOT NULL`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS status text DEFAULT 'unpaid' NOT NULL`,
    `ALTER TABLE invoices ALTER COLUMN balance_due SET DEFAULT 0`,
    `ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS item_name text`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS item_name text`,
    `CREATE TABLE IF NOT EXISTS production_orders (
      id serial PRIMARY KEY,
      order_number text NOT NULL UNIQUE,
      customer_id integer,
      type text NOT NULL,
      status text NOT NULL DEFAULT 'PENDING',
      priority text DEFAULT 'NORMAL',
      start_date text,
      due_date text,
      completed_date text,
      notes text,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id serial PRIMARY KEY,
      user_id integer,
      user_name text,
      action text NOT NULL,
      entity text NOT NULL,
      entity_id text,
      old_value text,
      new_value text,
      ip_address text,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    )`,
    `ALTER TABLE printing_jobs ADD COLUMN IF NOT EXISTS design_image_url text`,
    `ALTER TABLE printing_jobs ADD COLUMN IF NOT EXISTS position text`,
    `ALTER TABLE printing_jobs ADD COLUMN IF NOT EXISTS colors text`,
    `ALTER TABLE printing_jobs ADD COLUMN IF NOT EXISTS price_per_item numeric DEFAULT 0 NOT NULL`,
    `ALTER TABLE embroidery_jobs ADD COLUMN IF NOT EXISTS logo_image_url text`,
    `ALTER TABLE embroidery_jobs ADD COLUMN IF NOT EXISTS logo_position text`,
    `ALTER TABLE embroidery_jobs ADD COLUMN IF NOT EXISTS stitch_count integer`,
    `ALTER TABLE embroidery_jobs ADD COLUMN IF NOT EXISTS price_per_item numeric DEFAULT 0 NOT NULL`,
    `CREATE TABLE IF NOT EXISTS payments (
      id serial PRIMARY KEY,
      sale_id integer,
      invoice_id integer,
      customer_id integer,
      amount numeric NOT NULL,
      method text NOT NULL DEFAULT 'CASH',
      status text NOT NULL DEFAULT 'COMPLETED',
      reference text UNIQUE,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id serial PRIMARY KEY,
      sale_id integer,
      invoice_id integer,
      customer_id integer,
      amount numeric NOT NULL,
      currency text NOT NULL DEFAULT 'KES',
      method text NOT NULL DEFAULT 'PAYSTACK',
      status text NOT NULL DEFAULT 'PENDING',
      reference text UNIQUE NOT NULL,
      paystack_access_code text,
      paystack_authorization_url text,
      paystack_data text,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    )`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS status text DEFAULT 'COMPLETED' NOT NULL`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference text`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_id integer`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS order_id text`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_reference text`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS paystack_reference text`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS access_code text`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency text DEFAULT 'KES' NOT NULL`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method text`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_status text`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_response text`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now()`,
    `CREATE TABLE IF NOT EXISTS refunds (
      id serial PRIMARY KEY,
      payment_id integer REFERENCES payments(id) ON DELETE SET NULL,
      transaction_reference text,
      amount numeric NOT NULL,
      currency text NOT NULL DEFAULT 'KES',
      reason text,
      status text NOT NULL DEFAULT 'pending',
      gateway_response text,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS payment_logs (
      id serial PRIMARY KEY,
      payment_id integer REFERENCES payments(id) ON DELETE SET NULL,
      transaction_reference text,
      event_type text NOT NULL,
      message text,
      payload jsonb DEFAULT '{}'::jsonb NOT NULL,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS webhook_events (
      id serial PRIMARY KEY,
      provider text NOT NULL DEFAULT 'paystack',
      event_id text,
      event_type text NOT NULL,
      reference text,
      signature text,
      payload jsonb DEFAULT '{}'::jsonb NOT NULL,
      processed_at timestamp with time zone,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      UNIQUE(provider, event_id)
    )`,
    `CREATE INDEX IF NOT EXISTS webhook_events_reference_idx ON webhook_events(reference)`,
    `CREATE INDEX IF NOT EXISTS payment_logs_reference_idx ON payment_logs(transaction_reference)`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'price') THEN UPDATE products SET selling_price = price WHERE selling_price = 0 AND price IS NOT NULL; END IF; END $$`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'cost_price') THEN UPDATE products SET buying_price = cost_price WHERE buying_price = 0 AND cost_price IS NOT NULL; END IF; END $$`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'discount_value') THEN UPDATE sales SET discount = COALESCE(discount_value, 0) WHERE discount = 0; END IF; END $$`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'tax_amount') THEN UPDATE sales SET tax = COALESCE(tax_amount, 0) WHERE tax = 0; END IF; END $$`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'discount_amount') THEN UPDATE quotations SET discount = COALESCE(discount_amount, 0) WHERE discount = 0; END IF; END $$`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'tax_amount') THEN UPDATE quotations SET tax = COALESCE(tax_amount, 0) WHERE tax = 0; END IF; END $$`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'discount_amount') THEN UPDATE invoices SET discount = COALESCE(discount_amount, 0) WHERE discount = 0; END IF; END $$`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'tax_amount') THEN UPDATE invoices SET tax = COALESCE(tax_amount, 0) WHERE tax = 0; END IF; END $$`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'balance_due') THEN UPDATE invoices SET balance = COALESCE(balance_due, 0) WHERE balance = 0; END IF; END $$`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'payment_status') THEN UPDATE invoices SET status = payment_status::text WHERE status = 'unpaid'; END IF; END $$`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'printing_jobs' AND column_name = 'design_url') THEN UPDATE printing_jobs SET design_image_url = design_url WHERE design_image_url IS NULL; END IF; END $$`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'printing_jobs' AND column_name = 'placement') THEN UPDATE printing_jobs SET position = placement WHERE position IS NULL; END IF; END $$`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'printing_jobs' AND column_name = 'print_color') THEN UPDATE printing_jobs SET colors = print_color WHERE colors IS NULL; END IF; END $$`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'printing_jobs' AND column_name = 'unit_price') THEN UPDATE printing_jobs SET price_per_item = unit_price WHERE price_per_item = 0 AND unit_price IS NOT NULL; END IF; END $$`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'embroidery_jobs' AND column_name = 'badge_image_url') THEN UPDATE embroidery_jobs SET logo_image_url = badge_image_url WHERE logo_image_url IS NULL; END IF; END $$`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'embroidery_jobs' AND column_name = 'placement') THEN UPDATE embroidery_jobs SET logo_position = placement WHERE logo_position IS NULL; END IF; END $$`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'embroidery_jobs' AND column_name = 'unit_price') THEN UPDATE embroidery_jobs SET price_per_item = unit_price WHERE price_per_item = 0 AND unit_price IS NOT NULL; END IF; END $$`,
  ];

  for (const statement of statements) {
    await pool.query(statement);
  }
}

async function seedEnterpriseInventoryStructure(pool: any) {
  const sizeRows = [
    ["Kids 2", "K2", "kids", 1],
    ["Kids 4", "K4", "kids", 2],
    ["Kids 6", "K6", "kids", 3],
    ["Kids 8", "K8", "kids", 4],
    ["Kids 10", "K10", "kids", 5],
    ["Kids 12", "K12", "kids", 6],
    ["XS", "XS", "letter", 10],
    ["S", "S", "letter", 11],
    ["M", "M", "letter", 12],
    ["L", "L", "letter", 13],
    ["XL", "XL", "letter", 14],
    ["XXL", "XXL", "letter", 15],
    ["28", "28", "numeric", 28],
    ["30", "30", "numeric", 30],
    ["32", "32", "numeric", 32],
    ["34", "34", "numeric", 34],
    ["36", "36", "numeric", 36],
    ["Custom Tailor Measurements", "CUSTOM", "custom", 999],
  ];
  for (const row of sizeRows) {
    await pool.query(
      `INSERT INTO product_sizes (name, code, size_type, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, size_type = EXCLUDED.size_type, sort_order = EXCLUDED.sort_order`,
      row,
    );
  }

  const colors = [
    ["Navy Blue", "navy-blue", "#0B1F4D"],
    ["Black", "black", "#111827"],
    ["White", "white", "#FFFFFF"],
    ["Sky Blue", "sky-blue", "#38BDF8"],
    ["Royal Blue", "royal-blue", "#1D4ED8"],
    ["Grey", "grey", "#6B7280"],
    ["Maroon", "maroon", "#7F1D1D"],
    ["Bottle Green", "bottle-green", "#064E3B"],
    ["Red", "red", "#DC2626"],
    ["Khaki", "khaki", "#C3B091"],
    ["Yellow", "yellow", "#FACC15"],
  ];
  for (const row of colors) {
    await pool.query(
      `INSERT INTO product_colors (name, slug, hex_code)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, hex_code = EXCLUDED.hex_code`,
      row,
    );
  }

  const materials = [
    ["Cotton", "cotton", "woven"],
    ["Polyester", "polyester", "synthetic"],
    ["Polycotton", "polycotton", "blended"],
    ["Khaki", "khaki", "woven"],
    ["Denim", "denim", "woven"],
    ["Fleece", "fleece", "knit"],
    ["Drill", "drill", "woven"],
    ["Reflective Fabric", "reflective-fabric", "safety"],
    ["Embroidery Backing", "embroidery-backing", "stabilizer"],
  ];
  for (const row of materials) {
    await pool.query(
      `INSERT INTO materials (name, slug, fabric_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, fabric_type = EXCLUDED.fabric_type`,
      row,
    );
  }

  const brands = [
    ["PAJOY", "pajoy"],
    ["PAJOY School Uniforms", "pajoy-school-uniforms"],
    ["PAJOY Corporate Wear", "pajoy-corporate-wear"],
    ["Custom Client Brand", "custom-client-brand"],
  ];
  for (const row of brands) {
    await pool.query(
      `INSERT INTO brands (name, slug)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`,
      row,
    );
  }

  for (const [categoryIndex, category] of enterpriseInventoryStructure.entries()) {
    const categorySlug = slugify(category.name);
    const categoryResult = await pool.query(
      `INSERT INTO categories (name, slug, description, kind, level, path, sort_order)
       VALUES ($1, $2, $3, 'category', 0, $2, $4)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         kind = 'category',
         level = 0,
         path = EXCLUDED.path,
         sort_order = EXCLUDED.sort_order
       RETURNING id`,
      [category.name, categorySlug, category.description, categoryIndex + 1],
    );
    const categoryId = categoryResult.rows[0].id;

    for (const [subIndex, subcategoryName] of category.subcategories.entries()) {
      const subSlug = `${categorySlug}-${slugify(subcategoryName)}`;
      const subResult = await pool.query(
        `INSERT INTO subcategories (category_id, name, slug, sort_order)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id, name = EXCLUDED.name, sort_order = EXCLUDED.sort_order
         RETURNING id`,
        [categoryId, subcategoryName, subSlug, subIndex + 1],
      );
      const subcategoryId = subResult.rows[0].id;
      await pool.query(
        `INSERT INTO categories (name, slug, parent_id, kind, level, path, sort_order)
         VALUES ($1, $2, $3, 'subcategory', 1, $4, $5)
         ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id, kind = 'subcategory', level = 1, path = EXCLUDED.path, sort_order = EXCLUDED.sort_order`,
        [subcategoryName, subSlug, categoryId, `${categorySlug}/${subSlug}`, subIndex + 1],
      );

      for (const [typeIndex, productName] of category.products.entries()) {
        const typeSlug = `${subSlug}-${slugify(productName)}`;
        await pool.query(
          `INSERT INTO product_types (category_id, subcategory_id, name, slug, sort_order)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id, subcategory_id = EXCLUDED.subcategory_id, name = EXCLUDED.name, sort_order = EXCLUDED.sort_order`,
          [categoryId, subcategoryId, productName, typeSlug, typeIndex + 1],
        );
      }
    }

    if (category.subcategories.length === 0) {
      for (const [typeIndex, productName] of category.products.entries()) {
        const typeSlug = `${categorySlug}-${slugify(productName)}`;
        await pool.query(
          `INSERT INTO product_types (category_id, subcategory_id, name, slug, sort_order)
           VALUES ($1, NULL, $2, $3, $4)
           ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id, name = EXCLUDED.name, sort_order = EXCLUDED.sort_order`,
          [categoryId, productName, typeSlug, typeIndex + 1],
        );
      }
    }
  }
}

async function resolveMigrationsFolder(): Promise<string | null> {
  const explicitFolder = process.env.MIGRATIONS_FOLDER;
  const candidateFolders = [
    { name: "api-server local", folder: path.resolve(baseDir, "../drizzle/migrations") },
    { name: "monorepo db package", folder: path.resolve(baseDir, "../../..", "lib/db/drizzle/migrations") },
    { name: "monorepo root", folder: path.resolve(baseDir, "../../..", "drizzle/migrations") },
  ];

  if (explicitFolder) {
    const resolved = path.resolve(baseDir, explicitFolder);
    try {
      if ((await fs.promises.stat(resolved)).isDirectory()) {
        logger.info({ resolved, explicitFolder }, "Using migrations folder from MIGRATIONS_FOLDER");
        return resolved;
      }
    } catch {
      logger.warn({ resolved, explicitFolder }, "Configured migrations folder does not exist");
    }
  }

  for (const candidate of candidateFolders) {
    try {
      if ((await fs.promises.stat(candidate.folder)).isDirectory()) {
        logger.info({ migrationsFolder: candidate.folder, source: candidate.name }, "Found migrations folder");
        return candidate.folder;
      }
    } catch {
      // ignore missing candidate and continue searching
    }
  }

  return null;
}

async function bootstrap() {
  const { default: app } = await import("./app");
  const { db, pool, usersTable, categoriesTable, settingsTable } = await import("@workspace/db");
  const migrationsFolder = await resolveMigrationsFolder();

  if (migrationsFolder) {
    logger.info("Running database migrations...");
    await migrate(db, { migrationsFolder });
    logger.info("Migrations complete");
  } else {
    logger.warn("Migrations folder not found; skipping migrations. Ensure the repository contains the generated migration files and the application can resolve them.");
  }

  await ensureDatabaseCompatibility(pool);
  await seedDefaultCategories(db, categoriesTable);
  await seedEnterpriseInventoryStructure(pool);
  await seedDefaultSettings(db, settingsTable);
  await seedAdminIfEmpty(db, usersTable);

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
