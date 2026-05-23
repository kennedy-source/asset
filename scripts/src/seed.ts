import {
  db,
  usersTable, branchesTable,
  categoriesTable, suppliersTable, productsTable, stockMovementsTable,
  customersTable,
  salesTable, saleItemsTable,
  invoicesTable, invoiceItemsTable,
  embroideryJobsTable, printingJobsTable,
  expensesTable, expenseCategoriesTable,
  settingsTable, notificationsTable,
} from "@workspace/db";
import { createHash } from "crypto";

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "pajoy_salt_2024").digest("hex");
}

async function seed() {
  console.log("Seeding PAJOY database...");

  // Settings
  const defaultSettings = [
    { key: "business_name", value: "PAJOY Enterprise", category: "business" },
    { key: "business_address", value: "Tom Mboya Street, Nairobi CBD", category: "business" },
    { key: "business_phone", value: "+254 712 345 678", category: "business" },
    { key: "business_email", value: "info@pajoy.co.ke", category: "business" },
    { key: "business_kra_pin", value: "P051234567M", category: "business" },
    { key: "business_vat_number", value: "VAT/001/2020", category: "business" },
    { key: "currency", value: "KSh", category: "general" },
    { key: "vat_rate", value: "16", category: "general" },
    { key: "receipt_footer", value: "Thank you for shopping at PAJOY! Visit us again.", category: "general" },
    { key: "invoice_terms", value: "Payment is due within 30 days of invoice date.", category: "general" },
    { key: "low_stock_alert_threshold", value: "5", category: "inventory" },
  ];
  for (const s of defaultSettings) {
    try { await db.insert(settingsTable).values(s).onConflictDoNothing(); } catch {}
  }

  // Branch
  const [branch] = await db.insert(branchesTable).values({
    name: "Nairobi Main Branch", address: "Tom Mboya Street, Nairobi CBD",
    phone: "+254 712 345 678", email: "info@pajoy.co.ke",
  }).returning().catch(() => [{ id: 1 }]);

  // Users
  const adminHash = hashPassword("admin123");
  const cashierHash = hashPassword("cashier123");
  const [admin] = await db.insert(usersTable).values({
    name: "Admin User", email: "admin@pajoy.co.ke",
    passwordHash: adminHash, role: "super_admin", branchId: branch.id, isActive: true,
  }).returning().catch(async () => {
    const existing = await db.select().from(usersTable).limit(1);
    return existing;
  });

  await db.insert(usersTable).values([
    { name: "Jane Wanjiku", email: "jane@pajoy.co.ke", passwordHash: cashierHash, role: "cashier", branchId: branch.id },
    { name: "Peter Kamau", email: "peter@pajoy.co.ke", passwordHash: cashierHash, role: "production_staff", branchId: branch.id },
    { name: "Mary Achieng", email: "mary@pajoy.co.ke", passwordHash: cashierHash, role: "manager", branchId: branch.id },
  ]).onConflictDoNothing();

  // Expense Categories
  const expCats = await db.insert(expenseCategoriesTable).values([
    { name: "Rent", description: "Monthly rent and utilities" },
    { name: "Salaries", description: "Staff salaries and wages" },
    { name: "Raw Materials", description: "Thread, fabric, inks, blanks" },
    { name: "Transport", description: "Delivery and transport costs" },
    { name: "Utilities", description: "Electricity, water, internet" },
    { name: "Equipment", description: "Machine maintenance and repairs" },
    { name: "Marketing", description: "Advertising and promotions" },
    { name: "Miscellaneous", description: "Other business expenses" },
  ]).returning().catch(() => []);

  // Suppliers
  const [supplier1, supplier2] = await db.insert(suppliersTable).values([
    { name: "Kariuki Fabrics Ltd", contactPerson: "John Kariuki", phone: "+254 721 001 002", email: "john@kariukifabrics.co.ke", address: "Biashara St, Nairobi", city: "Nairobi", paymentTerms: "30 days", creditLimit: "50000" },
    { name: "East Africa Textiles", contactPerson: "Amina Hassan", phone: "+254 733 002 003", email: "amina@eatextiles.co.ke", address: "Industrial Area, Nairobi", city: "Nairobi", paymentTerms: "COD" },
  ]).returning().catch(() => [{ id: 1 }, { id: 2 }]);

  // Categories
  const [catUniforms, catEmbroidery, catClothing, catPrinting] = await db.insert(categoriesTable).values([
    { name: "School Uniforms", slug: "school-uniforms", description: "Complete school uniform sets and separates", sortOrder: 1 },
    { name: "Embroidery Supplies", slug: "embroidery-supplies", description: "Threads, stabilizers, and materials", sortOrder: 2 },
    { name: "Clothing", slug: "clothing", description: "Ready-to-wear clothing items", sortOrder: 3 },
    { name: "Printing Blanks", slug: "printing-blanks", description: "T-shirts, caps, bags for printing", sortOrder: 4 },
  ]).returning().catch(() => [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);

  // Products
  const products = await db.insert(productsTable).values([
    { name: "School Shirt (White) Size 6", sku: "SHT-WHT-S6", categoryId: catUniforms.id, price: "450", costPrice: "280", stockQuantity: 120, lowStockThreshold: 20, unit: "piece", isActive: true, taxRate: "16", supplierId: supplier1.id },
    { name: "School Shorts (Grey) Size 6", sku: "SHT-GRY-S6", categoryId: catUniforms.id, price: "380", costPrice: "220", stockQuantity: 95, lowStockThreshold: 20, unit: "piece", isActive: true, taxRate: "16", supplierId: supplier1.id },
    { name: "School Sweater (Navy) Size 10", sku: "SWT-NVY-S10", categoryId: catUniforms.id, price: "850", costPrice: "520", stockQuantity: 45, lowStockThreshold: 10, unit: "piece", isActive: true, taxRate: "16", supplierId: supplier1.id },
    { name: "School Dress (Blue Check) Size 8", sku: "DRS-BLC-S8", categoryId: catUniforms.id, price: "750", costPrice: "450", stockQuantity: 60, lowStockThreshold: 15, unit: "piece", isActive: true, taxRate: "16" },
    { name: "School Skirt (Grey) Size 10", sku: "SKT-GRY-S10", categoryId: catUniforms.id, price: "420", costPrice: "250", stockQuantity: 8, lowStockThreshold: 15, unit: "piece", isActive: true, taxRate: "16" },
    { name: "Plain T-Shirt (White) M", sku: "TSH-WHT-M", categoryId: catPrinting.id, price: "350", costPrice: "180", stockQuantity: 200, lowStockThreshold: 30, unit: "piece", isActive: true, taxRate: "16", supplierId: supplier2.id },
    { name: "Plain T-Shirt (Black) L", sku: "TSH-BLK-L", categoryId: catPrinting.id, price: "350", costPrice: "180", stockQuantity: 150, lowStockThreshold: 30, unit: "piece", isActive: true, taxRate: "16", supplierId: supplier2.id },
    { name: "Baseball Cap (White)", sku: "CAP-WHT", categoryId: catPrinting.id, price: "280", costPrice: "150", stockQuantity: 3, lowStockThreshold: 20, unit: "piece", isActive: true, taxRate: "16" },
    { name: "Tote Bag (Natural)", sku: "BAG-NAT", categoryId: catPrinting.id, price: "320", costPrice: "170", stockQuantity: 80, lowStockThreshold: 20, unit: "piece", isActive: true, taxRate: "16" },
    { name: "Embroidery Thread (Red)", sku: "THR-RED", categoryId: catEmbroidery.id, price: "120", costPrice: "60", stockQuantity: 50, lowStockThreshold: 10, unit: "spool", isActive: true, taxRate: "16" },
    { name: "Embroidery Thread (Blue)", sku: "THR-BLU", categoryId: catEmbroidery.id, price: "120", costPrice: "60", stockQuantity: 2, lowStockThreshold: 10, unit: "spool", isActive: true, taxRate: "16" },
    { name: "Ladies Blouse (Floral) M", sku: "BLS-FLR-M", categoryId: catClothing.id, price: "1200", costPrice: "700", stockQuantity: 25, lowStockThreshold: 5, unit: "piece", isActive: true, isFeatured: true, taxRate: "16" },
    { name: "Men's Polo Shirt (Navy) L", sku: "PLO-NVY-L", categoryId: catClothing.id, price: "950", costPrice: "550", stockQuantity: 30, lowStockThreshold: 5, unit: "piece", isActive: true, isFeatured: true, taxRate: "16" },
  ]).returning().catch(() => []);

  // Customers
  const [cust1, cust2, cust3] = await db.insert(customersTable).values([
    { name: "Nairobi Primary School", email: "admin@nairobiprimary.ac.ke", phone: "0722100200", customerType: "corporate", creditLimit: "100000", loyaltyPoints: 500, city: "Nairobi" },
    { name: "Grace Muthoni", phone: "0712345678", email: "grace@gmail.com", customerType: "retail", loyaltyPoints: 120, city: "Nairobi" },
    { name: "Westlands Corporate Services", phone: "0733456789", email: "orders@westlandscorp.co.ke", customerType: "corporate", creditLimit: "50000", city: "Westlands" },
    { name: "John Omondi", phone: "0745678901", customerType: "retail", loyaltyPoints: 50, city: "Kisumu" },
    { name: "St. Mary's School", phone: "0720001122", email: "bursar@stmarys.ac.ke", customerType: "corporate", creditLimit: "200000", city: "Nairobi" },
  ]).returning().catch(() => [{ id: 1 }, { id: 2 }, { id: 3 }]);

  // Sales
  if (products.length > 0) {
    const [sale1] = await db.insert(salesTable).values({
      saleNumber: "SALE-0001", customerId: cust2?.id,
      subtotal: "1650", discountAmount: "0", taxAmount: "0", total: "1650",
      amountPaid: "2000", changeGiven: "350",
      paymentMethod: "cash", paymentStatus: "paid", voided: false,
    }).returning().catch(() => [{ id: 1 }]);

    if (sale1?.id && products[0]) {
      await db.insert(saleItemsTable).values([
        { saleId: sale1.id, productId: products[0].id, productName: products[0].name, sku: products[0].sku, quantity: 2, unitPrice: "450", discount: "0", total: "900" },
        { saleId: sale1.id, productId: products[1]?.id, productName: products[1]?.name ?? "School Shorts", sku: products[1]?.sku ?? "SHT-GRY-S6", quantity: 2, unitPrice: "380", discount: "30", total: "730" },
      ]).catch(() => {});

    }

    // Another sale with M-Pesa
    const [sale2] = await db.insert(salesTable).values({
      saleNumber: "SALE-0002", customerId: cust1?.id,
      subtotal: "5400", discountAmount: "400", taxAmount: "0", total: "5000",
      amountPaid: "5000", changeGiven: "0",
      paymentMethod: "mpesa", paymentStatus: "paid", voided: false,
    }).returning().catch(() => [{ id: 2 }]);

    if (sale2?.id && products.length >= 3) {
      await db.insert(saleItemsTable).values([
        { saleId: sale2.id, productId: products[0].id, productName: products[0].name, sku: products[0].sku, quantity: 12, unitPrice: "450", discount: "400", total: "5000" },
      ]).catch(() => {});
    }
  }

  // Invoice
  const [inv1] = await db.insert(invoicesTable).values({
    invoiceNumber: "INV-0001", customerId: cust1?.id,
    subtotal: "45000", discountAmount: "0", taxAmount: "7200", total: "52200",
    amountPaid: "20000", balanceDue: "32200", paymentStatus: "partial",
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    notes: "School uniform order for Term 2 2026", terms: "Payment within 30 days",
  }).returning().catch(() => [{ id: 1 }]);

  if (inv1?.id) {
    await db.insert(invoiceItemsTable).values([
      { invoiceId: inv1.id, description: "School Shirts (White) Size 6 - 100 pcs", quantity: "100", unitPrice: "450", discount: "0", taxRate: "16", total: "45000" },
    ]).catch(() => {});
  }

  // Embroidery Jobs
  await db.insert(embroideryJobsTable).values([
    {
      jobNumber: "EMB-0001", customerId: cust1?.id,
      schoolName: "Nairobi Primary School",
      badgeDescription: "School crest on left chest, navy thread on white background",
      garmentType: "School Shirt", garmentColor: "White", threadColors: "Navy Blue, Gold",
      placement: "Left Chest", widthCm: "8", heightCm: "6",
      quantity: 100, unitPrice: "150", total: "15000", depositPaid: "7500", balance: "7500",
      status: "in_progress", priority: "high",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      jobNumber: "EMB-0002", customerId: cust3?.id,
      companyName: "Westlands Corporate Services",
      badgeDescription: "Company logo embroidery on polo shirts",
      garmentType: "Polo Shirt", garmentColor: "Navy", threadColors: "White, Gold",
      placement: "Left Chest", widthCm: "7", heightCm: "5",
      quantity: 25, unitPrice: "200", total: "5000", depositPaid: "2500", balance: "2500",
      status: "confirmed", priority: "normal",
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    {
      jobNumber: "EMB-0003",
      schoolName: "St. Andrew's School",
      badgeDescription: "New badge design - pending approval",
      garmentType: "Blazer", garmentColor: "Navy", threadColors: "Gold",
      placement: "Breast Pocket", widthCm: "6", heightCm: "6",
      quantity: 50, unitPrice: "300", total: "15000", depositPaid: "0", balance: "15000",
      status: "pending", priority: "low",
      dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    },
  ]).catch(() => {});

  // Printing Jobs
  await db.insert(printingJobsTable).values([
    {
      jobNumber: "PRT-0001", customerId: cust3?.id,
      designDescription: "Company branded T-shirts for team building event",
      printType: "digital", garmentType: "T-Shirt", garmentColor: "White",
      printColor: "Full Color", printSize: "A4 (Front)",
      placement: "Front Center", quantity: 50, unitPrice: "350", total: "17500",
      depositPaid: "10000", balance: "7500", status: "quality_check", priority: "urgent",
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
    {
      jobNumber: "PRT-0002",
      designDescription: "Event caps with logo",
      printType: "cap_printing", garmentType: "Baseball Cap", garmentColor: "Black",
      printColor: "White + Gold", printSize: "Standard",
      placement: "Front Panel", quantity: 100, unitPrice: "180", total: "18000",
      depositPaid: "9000", balance: "9000", status: "in_progress", priority: "high",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  ]).catch(() => {});

  // Expenses
  await db.insert(expensesTable).values([
    { title: "Monthly Rent - May 2026", amount: "45000", category: "Rent", paymentMethod: "bank", expenseDate: new Date("2026-05-01"), description: "Shop rent for Tom Mboya Street" },
    { title: "Salaries - April 2026", amount: "180000", category: "Salaries", paymentMethod: "mpesa", expenseDate: new Date("2026-04-30"), description: "Monthly staff salaries" },
    { title: "Embroidery Thread Stock", amount: "12500", category: "Raw Materials", paymentMethod: "cash", expenseDate: new Date("2026-05-10"), supplierId: supplier1?.id },
    { title: "Electricity Bill", amount: "8500", category: "Utilities", paymentMethod: "mpesa", expenseDate: new Date("2026-05-15") },
    { title: "Machine Service", amount: "5000", category: "Equipment", paymentMethod: "cash", expenseDate: new Date("2026-05-18"), description: "Embroidery machine servicing" },
    { title: "Transport - Delivery", amount: "2500", category: "Transport", paymentMethod: "cash", expenseDate: new Date() },
  ]).catch(() => {});

  // Notifications
  await db.insert(notificationsTable).values([
    { title: "Low Stock Alert", message: "School Skirt (Grey) Size 10 is running low — only 8 units left.", type: "warning", link: "/inventory" },
    { title: "Low Stock Alert", message: "Embroidery Thread (Blue) is critically low — only 2 spools left.", type: "warning", link: "/inventory" },
    { title: "Job Due Soon", message: "Printing job PRT-0001 is due in 2 days and is currently in Quality Check.", type: "info", link: "/printing" },
    { title: "Payment Received", message: "Invoice INV-0001 received partial payment of KSh 20,000.", type: "success", link: "/invoices/1" },
    { title: "New Order", message: "Embroidery job EMB-0003 received from St. Andrew's School.", type: "info", link: "/embroidery" },
  ]).catch(() => {});

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
