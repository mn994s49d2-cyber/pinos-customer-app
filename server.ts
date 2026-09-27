import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';
import { enrichItemsForKitchenDispatch, getMealDealKitchenBreakdown } from './src/utils/mealDealKitchenExpander';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Enable CORS for all incoming requests (specifically allowing POS origin and custom domains)
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json());

// Target POS API URL:
// 1. Check environment variable POS_API_URL
// 2. Default to the live POS app backend: https://roastup-pos.olivertalbot09.co.uk
let posApiUrl = (process.env.POS_API_URL || 'https://roastup-pos.olivertalbot09.co.uk').replace(/\/$/, '');

console.log(`[PIZZA PINO] Target POS API URL configured as: ${posApiUrl}`);

// In-memory order cache
interface StoredOrder {
  id: string;
  orderNumber: number;
  ticketNumber: string;
  type: 'takeaway' | 'dine_in';
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  tableNumber?: string;
  pickupTime: string;
  isScheduled: boolean;
  scheduledTime?: string;
  dueTime?: string;
  dueAt?: string;
  timeOfDay?: 'lunch' | 'afternoon' | 'dinner' | 'asap';
  isPreOrder?: boolean;
  items: any[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: 'paid' | 'pending' | 'refunded';
  paymentRef: string;
  cardBrand?: string;
  cardLast4?: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  kitchenBumped: boolean;
  fohBumped: boolean;
  timestamp: string;
  preparedAt?: string;
  readyAt?: string;
  completedAt?: string;
  estimatedMinutesRemaining: number;
  pointsEarned: number;
  pointsRedeemed?: number;
  pointsRedeemedRewardName?: string;
  pointsBalanceAfterOrder?: number;
  memberId?: string;
  customerTier?: string;
  notes?: string;
  source: 'customer_app' | 'pos';
}

let cachedOrders: StoredOrder[] = [];
let lastSyncTimestamp: string = new Date().toISOString();
let posOnlineStatus: boolean = false;

// Active SSE Clients for real-time order notifications
type SSEClient = {
  id: string;
  res: Response;
  type: 'customer' | 'pos';
};
let sseClients: SSEClient[] = [];

function broadcastOrderEvent(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch {
      // client disconnected
    }
  });
}

// -------------------------------------------------------------
// POS SYNC WORKER
// Continuously fetches live orders from the POS server,
// detects kitchen bumps and status changes, and notifies customer app
// -------------------------------------------------------------
async function syncFromPosBackend() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${posApiUrl}/api/orders`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ROASTUP-Customer-App-Sync-Engine/1.0',
      },
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      posOnlineStatus = true;
      lastSyncTimestamp = new Date().toISOString();
      const posOrders: any[] = await res.json();

      // Check for updates to existing orders (e.g. kitchen bump on POS)
      posOrders.forEach((remoteOrder) => {
        const localIdx = cachedOrders.findIndex((o) => o.id === remoteOrder.id || o.orderNumber === remoteOrder.orderNumber);

        const normalizedOrder: StoredOrder = {
          id: remoteOrder.id || `ord-${remoteOrder.orderNumber}`,
          orderNumber: remoteOrder.orderNumber || 100,
          ticketNumber: `${remoteOrder.type === 'dine_in' ? 'D' : 'A'}-${remoteOrder.orderNumber || '100'}`,
          type: remoteOrder.type || 'takeaway',
          customerName: remoteOrder.customerName || 'Customer',
          customerPhone: remoteOrder.customerPhone || '',
          tableNumber: remoteOrder.tableNumber || '',
          pickupTime: remoteOrder.pickupTime || (remoteOrder.type === 'dine_in' ? 'Dine In' : 'Ready ASAP (~15 mins)'),
          isScheduled: Boolean(remoteOrder.isScheduled || remoteOrder.isPreOrder),
          scheduledTime: remoteOrder.scheduledTime || remoteOrder.dueTime || '',
          dueTime: remoteOrder.dueTime || remoteOrder.pickupTime,
          dueAt: remoteOrder.dueAt,
          timeOfDay: remoteOrder.timeOfDay,
          isPreOrder: Boolean(remoteOrder.isPreOrder || remoteOrder.isScheduled),
          items: remoteOrder.items || [],
          subtotal: Number(remoteOrder.subtotal || 0),
          tax: Number(remoteOrder.tax || 0),
          discount: Number(remoteOrder.discount || 0),
          total: Number(remoteOrder.total || 0),
          paymentMethod: remoteOrder.paymentMethod || 'contactless',
          paymentStatus: remoteOrder.paymentStatus || 'paid',
          paymentRef: remoteOrder.paymentRef || 'TXN-POS',
          cardBrand: remoteOrder.cardBrand || 'Card',
          cardLast4: remoteOrder.cardLast4 || '4242',
          status: remoteOrder.status || (remoteOrder.kitchenBumped ? 'ready' : 'pending'),
          kitchenBumped: Boolean(remoteOrder.kitchenBumped),
          fohBumped: Boolean(remoteOrder.fohBumped),
          timestamp: remoteOrder.timestamp || new Date().toISOString(),
          preparedAt: remoteOrder.preparedAt,
          readyAt: remoteOrder.preparedAt || remoteOrder.readyAt,
          completedAt: remoteOrder.completedAt,
          estimatedMinutesRemaining: remoteOrder.status === 'ready' || remoteOrder.status === 'completed' ? 0 : 8,
          pointsEarned: Math.floor(Number(remoteOrder.total || 0) * 10),
          notes: remoteOrder.notes || '',
          source: remoteOrder.source || 'pos',
        };

        if (localIdx > -1) {
          const currentLocal = cachedOrders[localIdx];
          const hasChanged =
            currentLocal.status !== normalizedOrder.status ||
            currentLocal.kitchenBumped !== normalizedOrder.kitchenBumped ||
            currentLocal.fohBumped !== normalizedOrder.fohBumped;

          cachedOrders[localIdx] = {
            ...currentLocal,
            ...normalizedOrder,
          };

          if (hasChanged) {
            console.log(`[ROASTUP SYNC] Order ${normalizedOrder.ticketNumber} updated from POS: status=${normalizedOrder.status}, kitchenBumped=${normalizedOrder.kitchenBumped}`);
            broadcastOrderEvent('order:status_changed', {
              orderId: normalizedOrder.id,
              ticketNumber: normalizedOrder.ticketNumber,
              status: normalizedOrder.status,
              order: cachedOrders[localIdx],
            });
            broadcastOrderEvent('order:updated', cachedOrders[localIdx]);
          }
        } else {
          // Brand new order placed on POS directly
          cachedOrders.unshift(normalizedOrder);
          broadcastOrderEvent('order:created', normalizedOrder);
        }
      });
    } else {
      posOnlineStatus = false;
    }
  } catch (err: any) {
    posOnlineStatus = false;
    // silent catch to keep sync daemon running smoothly
  }
}

// Start continuous sync every 1.5 seconds
setInterval(syncFromPosBackend, 1500);
// Initial run
syncFromPosBackend();

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// Customization proxy from POS (ticker text, category order, store branding)
const PIZZA_PINO_DEFAULT_CUSTOMIZATION = {
  categoryOrder: [
    'Pizzas',
    'Calzones',
    'Garlic Bread',
    'Burgers',
    'Wraps',
    'Meal Deals',
    'Sides',
    'Milkshakes & Drinks',
  ],
  digitalSignage: {
    tickerText: '🍕 100% FRESH HAND-STRETCHED DOUGH STONE-BAKED DAILY • ★ PIZZA PINO STONE-BAKED PIZZAS, CALZONES, BURGERS & SHAKES • 🔥 CRISPY CRUST & BUBBLING CHEESE • ⚡ FAST FRESH COLLECTION',
    featuredItemId: 'pino-piz-margherita',
    mealDealTitle: 'Pizza Pino Deal',
    mealDealPrice: 'FROM £12.99',
    mealDealDesc: 'Any 12" Stone-Baked Pizza + Garlic Bread + Choice of Dip + Cold Drink',
  },
};

let cachedPosCustomization: any = { ...PIZZA_PINO_DEFAULT_CUSTOMIZATION };

async function syncCustomizationFromPos() {
  try {
    const res = await fetch(`${posApiUrl}/api/customization`);
    if (res.ok) {
      const data = await res.json();
      const ticker = String(data?.digitalSignage?.tickerText || '');
      const hasPotatoData =
        /potato|roastup|roast\b|maris piper|spud/i.test(ticker) ||
        JSON.stringify(data?.categoryOrder || []).toLowerCase().includes('roast');

      if (!hasPotatoData && data?.digitalSignage?.tickerText) {
        cachedPosCustomization = data;
        return;
      }
    }
  } catch {
    // POS might not be ready yet
  }
  cachedPosCustomization = { ...PIZZA_PINO_DEFAULT_CUSTOMIZATION };
}
setInterval(syncCustomizationFromPos, 15000);
syncCustomizationFromPos();

app.get('/api/customization', async (req: Request, res: Response) => {
  if (cachedPosCustomization) {
    // Double-check to ensure no potato ticker ever leaks
    const ticker = String(cachedPosCustomization?.digitalSignage?.tickerText || '');
    if (!/potato|roastup|roast\b|maris piper|spud/i.test(ticker) && ticker.length > 5) {
      return res.json(cachedPosCustomization);
    }
  }
  res.json(PIZZA_PINO_DEFAULT_CUSTOMIZATION);
});

// Health & POS connection status
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'Pizza Pino Customer Ordering Server',
    posApiUrl,
    posOnline: posOnlineStatus,
    activeOrders: cachedOrders.length,
    activeSseConnections: sseClients.length,
    lastSyncTimestamp,
    timestamp: new Date().toISOString(),
  });
});

// POS Configuration endpoint (view and update target POS URL)
app.get('/api/pos-config', (req: Request, res: Response) => {
  res.json({
    posApiUrl,
    posOnline: posOnlineStatus,
    lastSyncTimestamp,
    totalCachedOrders: cachedOrders.length,
  });
});

app.post('/api/pos-config', (req: Request, res: Response) => {
  const { newPosUrl } = req.body;
  if (typeof newPosUrl === 'string' && newPosUrl.trim()) {
    posApiUrl = newPosUrl.trim().replace(/\/$/, '');
    console.log(`[ROASTUP] Updated POS API target to: ${posApiUrl}`);
    syncFromPosBackend();
    return res.json({ success: true, posApiUrl, message: 'POS API URL updated successfully' });
  }
  res.status(400).json({ error: 'Invalid URL provided' });
});

// -------------------------------------------------------------
// CUSTOMER AUTH & LOYALTY PERSISTENCE
// -------------------------------------------------------------
export interface CustomerAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  memberId: string;
  createdAt: string;
  loyalty: {
    customerName: string;
    points: number;
    lifetimePoints: number;
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Bronze Slice' | 'Silver Crust' | 'Gold Supreme' | 'Bronze Spud' | 'Golden Russet' | 'Royal Roastmaster';
    tierProgress: number;
    memberId: string;
    unlockedRewards: string[];
    history: {
      id: string;
      desc: string;
      points: number;
      date: string;
      type: 'earn' | 'redeem';
    }[];
  };
}

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}
const customersFilePath = path.join(dataDir, 'customers.json');

function calculateCustomerTier(points: number): {
  tier: 'Bronze Slice' | 'Silver Crust' | 'Gold Supreme';
  tierProgress: number;
} {
  if (points >= 500) {
    return { tier: 'Gold Supreme', tierProgress: 100 };
  } else if (points >= 200) {
    const progress = Math.min(100, Math.round(((points - 200) / 300) * 100));
    return { tier: 'Silver Crust', tierProgress: progress };
  } else {
    const progress = Math.min(100, Math.round((points / 200) * 100));
    return { tier: 'Bronze Slice', tierProgress: progress };
  }
}

const DEFAULT_CUSTOMERS: CustomerAccount[] = [
  {
    id: 'cust-oliver-talbot',
    name: 'Oliver T.',
    email: 'oliver.talbot2406@gmail.com',
    phone: '07700 900123',
    passwordHash: 'password123',
    memberId: 'PINO-88392',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    loyalty: {
      customerName: 'Oliver T.',
      points: 180,
      lifetimePoints: 280,
      tier: 'Silver Crust',
      tierProgress: 45,
      memberId: 'PINO-88392',
      unlockedRewards: ['reward-dip'],
      history: [
        {
          id: 'hist-1',
          desc: '🎉 Welcome to Pizza Pino Club (+100 Bonus Pino Points)',
          points: 100,
          date: '1 week ago',
          type: 'earn',
        },
        {
          id: 'hist-2',
          desc: 'Stone-Baked 12" Margherita & Garlic Bread Order #A-98',
          points: 80,
          date: 'Yesterday',
          type: 'earn',
        },
      ],
    },
  },
];

let customers: CustomerAccount[] = [];

function loadCustomers(): CustomerAccount[] {
  try {
    if (fs.existsSync(customersFilePath)) {
      const raw = fs.readFileSync(customersFilePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read customers.json, initializing defaults:', err);
  }
  saveCustomers(DEFAULT_CUSTOMERS);
  return DEFAULT_CUSTOMERS;
}

function saveCustomers(data: CustomerAccount[]) {
  try {
    fs.writeFileSync(customersFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write customers.json:', err);
  }
}

customers = loadCustomers();

function sanitizeCustomer(cust: CustomerAccount) {
  const { passwordHash, ...safe } = cust;
  return safe;
}

// POST /api/auth/register
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, phone, password } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Please enter your full name' });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  if (!password || typeof password !== 'string' || password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = customers.find((c) => c.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists. Please sign in instead.' });
  }

  const memberId = `PINO-${Math.floor(10000 + Math.random() * 90000)}`;
  const { tier, tierProgress } = calculateCustomerTier(100);

  const newCustomer: CustomerAccount = {
    id: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: name.trim(),
    email: normalizedEmail,
    phone: (phone || '').trim(),
    passwordHash: password.trim(),
    memberId,
    createdAt: new Date().toISOString(),
    loyalty: {
      customerName: name.trim(),
      points: 100, // Instant 100 Welcome Points!
      lifetimePoints: 100,
      tier,
      tierProgress,
      memberId,
      unlockedRewards: ['reward-dip'],
      history: [
        {
          id: `hist-${Date.now()}`,
          desc: '🎉 Welcome to Pizza Pino Club (+100 Free Welcome Pino Points)',
          points: 100,
          date: 'Just now',
          type: 'earn',
        },
      ],
    },
  };

  customers.push(newCustomer);
  saveCustomers(customers);
  console.log(`[PIZZA PINO AUTH] New customer registered: ${newCustomer.name} (${newCustomer.email}) with 100 welcome bonus points!`);

  res.status(201).json({
    success: true,
    message: 'Welcome to Pizza Pino! 100 free Pizza Club Points have been added to your account.',
    user: sanitizeCustomer(newCustomer),
    token: newCustomer.id,
  });
});

// POST /api/auth/login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const emailOrPhone = req.body.emailOrPhone || req.body.email || req.body.phone;
  const { password } = req.body;

  if (!emailOrPhone || typeof emailOrPhone !== 'string') {
    return res.status(400).json({ error: 'Please enter your email or phone number' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Please enter your password' });
  }

  const normalized = emailOrPhone.trim().toLowerCase();
  const cleanPhone = emailOrPhone.replace(/[\s\-()]/g, '');

  const customer = customers.find(
    (c) =>
      c.email.toLowerCase() === normalized ||
      (c.phone && c.phone.replace(/[\s\-()]/g, '') === cleanPhone)
  );

  if (!customer || customer.passwordHash !== password.trim()) {
    return res.status(401).json({ error: 'Incorrect email/phone or password. Please try again.' });
  }

  res.json({
    success: true,
    message: `Welcome back, ${customer.name}!`,
    user: sanitizeCustomer(customer),
    token: customer.id,
  });
});

// GET /api/auth/me
app.get('/api/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '') || (req.query.token as string);

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const customer = customers.find((c) => c.id === token);
  if (!customer) {
    return res.status(401).json({ error: 'Session expired or customer not found' });
  }

  res.json({
    success: true,
    user: sanitizeCustomer(customer),
  });
});

// POST /api/auth/update-loyalty
app.post('/api/auth/update-loyalty', (req: Request, res: Response) => {
  const { customerId, pointsDelta, description, type } = req.body;
  if (!customerId) {
    return res.status(400).json({ error: 'Customer ID is required' });
  }

  const customer = customers.find((c) => c.id === customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const delta = Number(pointsDelta || 0);
  customer.loyalty.points = Math.max(0, customer.loyalty.points + delta);
  if (delta > 0) {
    customer.loyalty.lifetimePoints = (customer.loyalty.lifetimePoints || 0) + delta;
  }
  const { tier, tierProgress } = calculateCustomerTier(customer.loyalty.points);
  customer.loyalty.tier = tier;
  customer.loyalty.tierProgress = tierProgress;

  customer.loyalty.history.unshift({
    id: `hist-${Date.now()}`,
    desc: description || (delta > 0 ? `Points added (+${delta})` : `Points redeemed (${delta})`),
    points: delta,
    date: 'Just now',
    type: type || (delta > 0 ? 'earn' : 'redeem'),
  });

  saveCustomers(customers);
  res.json({ success: true, user: sanitizeCustomer(customer) });
});

// GET /api/pos/customers - Retrieve customer directory for POS till lookup
app.get('/api/pos/customers', (_req: Request, res: Response) => {
  const current = loadCustomers();
  res.json({
    success: true,
    customers: current.map(sanitizeCustomer),
  });
});

// Helper: Find customer by scanned barcode/QR or manual input
function findCustomerByScannedCode(rawCode: string): CustomerAccount | undefined {
  if (!rawCode || typeof rawCode !== 'string') return undefined;
  const clean = rawCode.trim();

  // 1. Direct match on id, email, phone, or memberId
  let match = customers.find(
    (c) =>
      c.id.toLowerCase() === clean.toLowerCase() ||
      c.email.toLowerCase() === clean.toLowerCase() ||
      c.memberId.toLowerCase() === clean.toLowerCase() ||
      c.phone.replace(/\s+/g, '') === clean.replace(/\s+/g, '')
  );
  if (match) return match;

  // 2. Prefix format: "PINO:MEMBER:PINO-88392", "PIZZAPINO:...", or "ROASTUP:..."
  if (
    clean.toUpperCase().startsWith('PINO:') ||
    clean.toUpperCase().startsWith('PIZZAPINO:') ||
    clean.toUpperCase().startsWith('ROASTUP:')
  ) {
    const parts = clean.split(':');
    const targetMemberId = parts[2];
    if (targetMemberId) {
      match = customers.find((c) => c.memberId.toLowerCase() === targetMemberId.toLowerCase());
      if (match) return match;
    }
  }

  // 3. Regex match for PINO-XXXXX or RP-XXXXX
  const pinoMatch = clean.match(/(PINO|RP)-\d+/i);
  if (pinoMatch) {
    match = customers.find((c) => c.memberId.toLowerCase() === pinoMatch[0].toLowerCase());
    if (match) return match;
  }

  return undefined;
}

// POST /api/pos/scan-loyalty & /api/till/scan - Scan QR/Barcode at POS Till to look up customer or redeem points
app.post(['/api/pos/scan-loyalty', '/api/till/scan'], (req: Request, res: Response) => {
  const code = req.body.code || req.body.barcode;
  const { action = 'lookup', rewardId, rewardTitle, pointsCost, discountValue, tillId = 'POS Till #1' } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, error: 'Please scan or enter a loyalty code or Member ID' });
  }

  const customer = findCustomerByScannedCode(code);
  if (!customer) {
    return res.status(404).json({
      success: false,
      error: `No customer found for code "${code}". Please check Member ID or register a new customer.`,
    });
  }

  // Check if scanned code is a specific single-use voucher code
  // Format: PINO:VOUCHER:memberId:rewardId:pointsCost:rewardTitle:discountValue
  let isVoucherScan = false;
  let voucherRewardTitle = rewardTitle;
  let voucherPointsCost = Number(pointsCost || 0);
  let voucherDiscountValue = Number(discountValue || 0);
  let voucherRewardId = rewardId;

  if (
    code.toUpperCase().startsWith('PINO:VOUCHER:') ||
    code.toUpperCase().startsWith('PIZZAPINO:VOUCHER:') ||
    code.toUpperCase().startsWith('ROASTUP:VOUCHER:')
  ) {
    isVoucherScan = true;
    const parts = code.split(':');
    if (parts[3]) voucherRewardId = parts[3];
    if (parts[4]) voucherPointsCost = Number(parts[4]) || 50;
    if (parts[5]) voucherRewardTitle = decodeURIComponent(parts[5]);
    if (parts[6]) voucherDiscountValue = Number(parts[6]) || 0;
  }

  // If action is lookup and not an explicit voucher scan
  if (action === 'lookup' && !isVoucherScan) {
    return res.json({
      success: true,
      message: `Found customer: ${customer.name}`,
      customer: sanitizeCustomer(customer),
      availablePoints: customer.loyalty.points,
      tier: customer.loyalty.tier,
    });
  }

  // Redemption flow
  const pointsToDeduct = isVoucherScan ? voucherPointsCost : Number(pointsCost || 50);
  const finalRewardTitle = voucherRewardTitle || 'Spud Club Reward';
  const finalDiscountValue = voucherDiscountValue || (pointsToDeduct >= 100 ? 2.0 : 1.25);

  if (customer.loyalty.points < pointsToDeduct) {
    return res.status(400).json({
      success: false,
      error: `Insufficient Spud Points. ${customer.name} has ${customer.loyalty.points} pts, but ${pointsToDeduct} pts are required for "${finalRewardTitle}".`,
      availablePoints: customer.loyalty.points,
    });
  }

  const previousBalance = customer.loyalty.points;
  customer.loyalty.points = Math.max(0, customer.loyalty.points - pointsToDeduct);
  const { tier, tierProgress } = calculateCustomerTier(customer.loyalty.points);
  customer.loyalty.tier = tier;
  customer.loyalty.tierProgress = tierProgress;

  const receiptSlipCode = `TILL-SLIP-${Math.floor(100000 + Math.random() * 900000)}`;
  const timestamp = new Date().toISOString();

  customer.loyalty.history.unshift({
    id: `hist-till-${Date.now()}`,
    desc: `Redeemed at ${tillId}: ${finalRewardTitle} (-${pointsToDeduct} pts)`,
    points: -pointsToDeduct,
    date: 'Just now',
    type: 'redeem',
  });

  saveCustomers(customers);

  const redemptionReceipt = {
    receiptCode: receiptSlipCode,
    customerName: customer.name,
    memberId: customer.memberId,
    phone: customer.phone,
    email: customer.email,
    rewardId: voucherRewardId,
    rewardTitle: finalRewardTitle,
    pointsDeducted: pointsToDeduct,
    discountValue: finalDiscountValue,
    previousBalance,
    newBalance: customer.loyalty.points,
    tier: customer.loyalty.tier,
    tillId,
    timestamp,
  };

  console.log(`[POS TILL SCAN REDEEM] ${customer.name} (${customer.memberId}) redeemed ${pointsToDeduct} pts for "${finalRewardTitle}" at ${tillId}. Balance: ${customer.loyalty.points} pts`);

  return res.json({
    success: true,
    message: `Successfully redeemed ${pointsToDeduct} pts for "${finalRewardTitle}" at ${tillId}!`,
    customer: sanitizeCustomer(customer),
    redemption: redemptionReceipt,
  });
});

// GET /api/orders - Returns orders (synchronous from cache & fresh POS sync)
app.get(['/api/orders', '/api/pos/orders'], (req: Request, res: Response) => {
  const { status, limit } = req.query;
  let filtered = [...cachedOrders];

  if (status && typeof status === 'string') {
    const statuses = status.split(',');
    filtered = filtered.filter((o) => statuses.includes(o.status));
  }

  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (limit) {
    filtered = filtered.slice(0, parseInt(limit as string, 10));
  }

  res.json(filtered);
});

// GET /api/orders/:id
app.get('/api/orders/:id', (req: Request, res: Response) => {
  const order = cachedOrders.find((o) => o.id === req.params.id || o.ticketNumber === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

// POST /api/orders - Place customer order and FORWARD DIRECTLY to the POS backend!
app.post(['/api/orders', '/api/pos/orders'], async (req: Request, res: Response) => {
  const body = req.body;

  const subtotal = Number(body.subtotal || 0);
  const discount = Number(body.discount || 0);
  const total = Math.max(0, Number(body.total || subtotal - discount));
  const tax = Number((total * 0.2).toFixed(2));
  const pointsEarned = Math.floor(total * 10);

  // Current timestamp for the customer order
  const orderDate = new Date();
  const orderTimestamp = orderDate.toISOString();

  // Determine scheduling, due time, and time-of-day for the kitchen POS
  const isPreOrder = Boolean(body.isPreOrder || body.isScheduled || (body.pickupTime && !body.pickupTime.includes('ASAP')));
  
  let dueTime = body.dueTime;
  let dueAt = body.dueAt;

  // Validate dueAt is strictly in the future (minimum 15 mins for ASAP)
  if (dueAt) {
    const parsedDue = new Date(dueAt);
    if (isNaN(parsedDue.getTime()) || parsedDue.getTime() <= orderDate.getTime()) {
      const asapDate = new Date(orderDate.getTime() + 15 * 60 * 1000);
      dueAt = asapDate.toISOString();
    }
  } else {
    const asapDate = new Date(orderDate.getTime() + 15 * 60 * 1000);
    dueAt = asapDate.toISOString();
  }

  // Format due time string for POS ticket
  const dueDateObj = new Date(dueAt);
  const ukDueTime = dueDateObj.toLocaleTimeString('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (!dueTime || dueTime.includes('ASAP')) {
    dueTime = isPreOrder ? ukDueTime : `ASAP (~15 mins • ${ukDueTime})`;
  }

  const timeOfDay: 'lunch' | 'afternoon' | 'dinner' | 'asap' = body.timeOfDay || (
    !isPreOrder ? 'asap' : (() => {
      const hour = dueTime ? parseInt(dueTime.split(':')[0], 10) : 12;
      if (hour < 15) return 'lunch';
      if (hour < 17.5) return 'afternoon';
      return 'dinner';
    })()
  );

  // Payload formatted specifically for the POS API with kitchen due time
  const posPayload = {
    type: body.type || 'takeaway',
    customerName: body.customerName || 'Customer',
    customerPhone: body.customerPhone || '',
    tableNumber: body.tableNumber || '',
    items: body.items || [],
    subtotal: Number(subtotal.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    total: Number(total.toFixed(2)),
    paymentMethod: body.paymentMethod || 'apple_pay',
    paymentStatus: body.paymentStatus || 'paid',
    paymentRef: body.paymentRef || `ONLINE-${Math.floor(Math.random() * 900000 + 100000)}`,
    cardBrand: body.cardBrand || (body.paymentMethod === 'apple_pay' ? 'Apple Pay' : 'Online Card'),
    cardLast4: body.cardLast4 || '4242',
    status: 'pending',
    kitchenBumped: false,
    fohBumped: false,
    // POS Scheduling & Due Time parameters
    dueTime,
    dueAt,
    pickupTime: body.pickupTime || dueTime,
    isScheduled: isPreOrder,
    scheduledTime: body.scheduledTime || dueTime,
    isPreOrder,
    timeOfDay,
    notes: isPreOrder
      ? `[PRE-ORDER DUE: ${dueTime} (${timeOfDay.toUpperCase()})] ${body.notes || ''}`.trim()
      : (body.notes || ''),
  };

  let remoteCreatedOrder: any = null;

  // 1. Directly forward order to the live POS API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const posRes = await fetch(`${posApiUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(posPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (posRes.ok) {
      remoteCreatedOrder = await posRes.json();
      console.log(`[ROASTUP ORDER DISPATCH] Order dispatched to POS successfully! Order #${remoteCreatedOrder.orderNumber}, ID: ${remoteCreatedOrder.id}`);
    } else {
      console.warn(`[ROASTUP ORDER DISPATCH] POS returned status ${posRes.status}`);
    }
  } catch (err: any) {
    console.warn(`[ROASTUP ORDER DISPATCH] Could not reach POS directly (${err.message}). Using local queue.`);
  }

  // 2. Build canonical order object
  const num = remoteCreatedOrder?.orderNumber || cachedOrders.length + 101;
  const prefix = body.type === 'dine_in' ? 'D' : 'A';
  const ticketNumber = `${prefix}-${num}`;
  const orderId = remoteCreatedOrder?.id || `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newOrder: StoredOrder = {
    id: orderId,
    orderNumber: num,
    ticketNumber,
    type: body.type || 'takeaway',
    customerId: body.customerId,
    customerName: body.customerName || 'Customer',
    customerPhone: body.customerPhone || '',
    customerEmail: body.customerEmail || '',
    tableNumber: body.tableNumber || '',
    pickupTime: body.pickupTime || 'Ready ASAP (~15 mins)',
    isScheduled: isPreOrder,
    scheduledTime: body.scheduledTime || dueTime,
    dueTime,
    dueAt,
    timeOfDay,
    isPreOrder,
    items: body.items || [],
    subtotal,
    discount,
    tax,
    total,
    paymentMethod: body.paymentMethod || 'apple_pay',
    paymentStatus: body.paymentStatus || 'paid',
    paymentRef: posPayload.paymentRef,
    cardBrand: posPayload.cardBrand,
    cardLast4: posPayload.cardLast4,
    status: 'pending',
    kitchenBumped: false,
    fohBumped: false,
    timestamp: orderTimestamp,
    estimatedMinutesRemaining: 15,
    pointsEarned,
    notes: body.notes || '',
    source: 'customer_app',
  };

  // 3. Update customer loyalty if order was placed by authenticated customer or member ID
  let updatedCustomerLoyalty: any = null;
  if (body.customerId || body.customerEmail || body.memberId) {
    const customer = customers.find(
      (c) =>
        (body.customerId && c.id === body.customerId) ||
        (body.customerEmail && c.email.toLowerCase() === body.customerEmail.toLowerCase()) ||
        (body.memberId && c.memberId.toLowerCase() === String(body.memberId).toLowerCase())
    );
    if (customer) {
      const earned = Math.floor(total * 10);
      const redeemed = Number(body.pointsRedeemed || 0);
      customer.loyalty.points = Math.max(0, customer.loyalty.points - redeemed + earned);
      customer.loyalty.lifetimePoints = (customer.loyalty.lifetimePoints || 0) + earned;
      const { tier, tierProgress } = calculateCustomerTier(customer.loyalty.points);
      customer.loyalty.tier = tier;
      customer.loyalty.tierProgress = tierProgress;

      // Assign to order for receipt printing
      newOrder.memberId = customer.memberId;
      newOrder.customerTier = customer.loyalty.tier;
      newOrder.pointsBalanceAfterOrder = customer.loyalty.points;
      newOrder.pointsRedeemed = redeemed;
      newOrder.pointsRedeemedRewardName = body.pointsRedeemedRewardName || (redeemed > 0 ? 'Pizza Pino Club Reward' : undefined);

      if (redeemed > 0) {
        customer.loyalty.history.unshift({
          id: `hist-red-${Date.now()}`,
          desc: `Reward discount applied to Order #${ticketNumber}`,
          points: -redeemed,
          date: 'Just now',
          type: 'redeem',
        });
      }
      if (earned > 0) {
        customer.loyalty.history.unshift({
          id: `hist-earn-${Date.now()}`,
          desc: `Order #${ticketNumber} (+10 pts per £1 spent)`,
          points: earned,
          date: 'Just now',
          type: 'earn',
        });
      }
      saveCustomers(customers);
      updatedCustomerLoyalty = customer.loyalty;
      console.log(`[PIZZA PINO LOYALTY] Updated ${customer.name}: +${earned} earned, -${redeemed} redeemed, new balance=${customer.loyalty.points}`);
    }
  }

  cachedOrders.unshift(newOrder);

  // Broadcast to customer app and any connected listeners
  broadcastOrderEvent('order:created', newOrder);
  broadcastOrderEvent('order:updated', newOrder);

  res.status(201).json({
    ...newOrder,
    updatedCustomerLoyalty,
  });
});

// POST or PATCH /api/orders/:id/notes - Add or update a kitchen message/note on active order
app.post(['/api/orders/:id/notes', '/api/orders/:id/message'], async (req: Request, res: Response) => {
  const { id } = req.params;
  const { message, notes } = req.body;

  const orderIdx = cachedOrders.findIndex((o) => o.id === id || o.ticketNumber === id);
  if (orderIdx === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const existingOrder = cachedOrders[orderIdx];
  const newText = (message || notes || '').trim();
  if (!newText) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const formattedMessage = `[Customer Note @ ${timeStr}]: ${newText}`;

  const updatedNotes = existingOrder.notes
    ? `${existingOrder.notes} • ${formattedMessage}`
    : formattedMessage;

  cachedOrders[orderIdx] = {
    ...existingOrder,
    notes: updatedNotes,
  };

  const updatedOrder = cachedOrders[orderIdx];
  console.log(`[ROASTUP KITCHEN NOTE] Order #${updatedOrder.ticketNumber} updated with customer message: "${newText}"`);

  // Forward to remote POS if connected
  try {
    fetch(`${posApiUrl}/api/orders/${existingOrder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notes: updatedNotes,
        latestCustomerMessage: newText,
        ticketNumber: existingOrder.ticketNumber,
        orderId: existingOrder.id,
        updatedAt: new Date().toISOString(),
      }),
    }).catch(() => {});
  } catch {}

  // Broadcast update via SSE
  broadcastOrderEvent('order:updated', updatedOrder);

  res.json({
    success: true,
    message: 'Message sent to kitchen staff successfully',
    order: updatedOrder,
    notes: updatedNotes,
  });
});

app.patch('/api/orders/:id/notes', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { message, notes } = req.body;

  const orderIdx = cachedOrders.findIndex((o) => o.id === id || o.ticketNumber === id);
  if (orderIdx === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const existingOrder = cachedOrders[orderIdx];
  const newText = (message || notes || '').trim();
  if (!newText) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const formattedMessage = `[Customer Note @ ${timeStr}]: ${newText}`;

  const updatedNotes = existingOrder.notes
    ? `${existingOrder.notes} • ${formattedMessage}`
    : formattedMessage;

  cachedOrders[orderIdx] = {
    ...existingOrder,
    notes: updatedNotes,
  };

  const updatedOrder = cachedOrders[orderIdx];
  console.log(`[ROASTUP KITCHEN NOTE] Order #${updatedOrder.ticketNumber} PATCH note: "${newText}"`);

  try {
    fetch(`${posApiUrl}/api/orders/${existingOrder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notes: updatedNotes,
        latestCustomerMessage: newText,
        ticketNumber: existingOrder.ticketNumber,
        orderId: existingOrder.id,
        updatedAt: new Date().toISOString(),
      }),
    }).catch(() => {});
  } catch {}

  broadcastOrderEvent('order:updated', updatedOrder);

  res.json({
    success: true,
    message: 'Message sent to kitchen staff successfully',
    order: updatedOrder,
    notes: updatedNotes,
  });
});

// GET /api/receipt/:orderId - Returns receipt details for an order
app.get('/api/receipt/:orderId', (req: Request, res: Response) => {
  const { orderId } = req.params;
  const order = cachedOrders.find((o) => o.id === orderId || o.ticketNumber === orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Find customer loyalty details if available
  const customers = loadCustomers();
  const customer = order.customerId
    ? customers.find((c) => c.id === order.customerId)
    : order.customerEmail
    ? customers.find((c) => c.email.toLowerCase() === order.customerEmail?.toLowerCase())
    : order.memberId
    ? customers.find((c) => c.memberId.toLowerCase() === order.memberId?.toLowerCase())
    : undefined;

  res.json({
    order,
    customer: customer ? {
      name: customer.name,
      memberId: customer.memberId,
      tier: customer.loyalty.tier,
      points: customer.loyalty.points,
    } : undefined,
  });
});

// Build responsive HTML receipt for customer emails
function generateReceiptHtml(params: {
  ticket: string;
  customerName: string;
  total: number;
  subtotal: number;
  tax: number;
  orderType: string;
  pickupTime: string;
  items: any[];
  loyaltyPoints: number;
  timestamp: string;
}) {
  const { ticket, customerName, total, subtotal, tax, orderType, pickupTime, items, loyaltyPoints, timestamp } = params;

  const itemsRows = (items || []).map((item: any) => {
    const itemName = item.name || 'Pizza Pino Food Item';
    const variation = item.variation?.name ? `(${item.variation.name})` : '';
    const qty = item.quantity || 1;
    const price = Number(item.totalPrice || item.unitPrice || 0).toFixed(2);
    const notes = item.notes ? `<div style="font-size: 11px; color: #78716c; margin-top: 2px;"><em>Note: ${item.notes}</em></div>` : '';
    const removals = item.specialRemovals?.length ? `<div style="font-size: 11px; color: #dc2626; margin-top: 2px;">Hold: ${item.specialRemovals.join(', ')}</div>` : '';
    const additions = item.specialAdditions?.length ? `<div style="font-size: 11px; color: #dc2626; margin-top: 2px;">Extras: ${item.specialAdditions.join(', ')}</div>` : '';

    return `
      <tr style="border-bottom: 1px solid #e7e5e4;">
        <td style="padding: 10px 0; font-size: 13px; color: #1c1917; vertical-align: top;">
          <strong>${qty}x ${itemName} ${variation}</strong>
          ${removals}
          ${additions}
          ${notes}
        </td>
        <td style="padding: 10px 0; font-size: 13px; color: #1c1917; text-align: right; vertical-align: top; font-family: monospace; font-weight: bold;">
          £${price}
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Pizza Pino Order Receipt #${ticket}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f4; margin: 0; padding: 24px; color: #1c1917;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.08); border: 1px solid #e7e5e4;">
    
    <!-- Brand Header -->
    <div style="background-color: #1c1917; color: #ffffff; padding: 24px; text-align: center;">
      <div style="font-size: 32px; line-height: 1; margin-bottom: 6px;">🍕</div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 0.5px; color: #ef4444;">PIZZA PINO</h1>
      <p style="margin: 4px 0 0; font-size: 12px; color: #a8a29e; text-transform: uppercase; letter-spacing: 1px;">Stone-Baked Pizzas, Calzones, Burgers & Shakes</p>
    </div>

    <!-- Collection Ticket Box -->
    <div style="background-color: #fef2f2; border-bottom: 2px dashed #ef4444; padding: 18px; text-align: center;">
      <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #991b1b; letter-spacing: 1px;">COLLECTION TICKET</div>
      <div style="font-size: 36px; font-weight: 900; color: #1c1917; font-family: monospace; margin: 4px 0;">#${ticket}</div>
      <div style="font-size: 12px; color: #7f1d1d; font-weight: 700;">${orderType.toUpperCase()} • ${pickupTime}</div>
    </div>

    <div style="padding: 24px;">
      <p style="margin-top: 0; font-size: 14px; color: #44403c;">
        Hi <strong>${customerName}</strong>,<br>
        Thank you for ordering from Pizza Pino! Here is your official digital receipt.
      </p>

      <!-- Order Metadata -->
      <table style="width: 100%; font-size: 12px; color: #78716c; margin-bottom: 16px; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0;"><strong>Date & Time:</strong></td>
          <td style="text-align: right; padding: 4px 0;">${timestamp}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><strong>Fulfillment / Target:</strong></td>
          <td style="text-align: right; padding: 4px 0;">${pickupTime}</td>
        </tr>
      </table>

      <!-- Items Breakdown -->
      <div style="border-top: 2px solid #1c1917; margin-top: 8px;">
        <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
          <thead>
            <tr style="border-bottom: 1px solid #d6d3d1; font-size: 11px; text-transform: uppercase; color: #78716c;">
              <th style="text-align: left; padding-bottom: 6px;">Order Items</th>
              <th style="text-align: right; padding-bottom: 6px;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows || '<tr><td colspan="2" style="padding: 10px 0; font-size: 12px; color: #78716c;">Pizza Pino Food Order</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Financial Totals -->
      <div style="border-top: 1px solid #d6d3d1; padding-top: 12px; margin-top: 8px;">
        <table style="width: 100%; font-size: 13px; color: #57534e;">
          <tr>
            <td style="padding: 2px 0;">Subtotal</td>
            <td style="text-align: right; font-family: monospace;">£${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 2px 0;">VAT (Included at 20%)</td>
            <td style="text-align: right; font-family: monospace;">£${tax.toFixed(2)}</td>
          </tr>
          <tr style="font-size: 16px; font-weight: 900; color: #1c1917;">
            <td style="padding: 8px 0 0;">Total Paid</td>
            <td style="text-align: right; padding: 8px 0 0; color: #dc2626; font-family: monospace;">£${total.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      ${loyaltyPoints > 0 ? `
        <div style="margin-top: 16px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 10px 14px; text-align: center;">
          <span style="font-size: 12px; font-weight: 800; color: #991b1b;">✨ +${loyaltyPoints} Pino Club Loyalty Points Earned!</span>
        </div>
      ` : ''}

      <!-- Collection Note -->
      <div style="margin-top: 20px; padding: 14px; background-color: #f5f5f4; border-radius: 10px; font-size: 12px; color: #57534e; text-align: center;">
        📢 When collecting at our counter, please quote ticket <strong>#${ticket}</strong> or present this receipt on your phone.
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f5f5f4; border-top: 1px solid #e7e5e4; padding: 16px; text-align: center; font-size: 11px; color: #a8a29e;">
      PIZZA PINO • Stone-Baked Pizzas, Calzones, Burgers, Wraps & Shakes<br>
      Thank you for your order!
    </div>
  </div>
</body>
</html>`;
}

interface DispatchedReceipt {
  ticketNumber: string;
  email: string;
  customerName: string;
  total: number;
  html: string;
  sentAt: string;
  deliveredVia: string;
}

const dispatchedReceipts: Map<string, DispatchedReceipt> = new Map();

// GET /api/receipts/view/:ticket - View the full branded digital receipt online
app.get(['/api/receipts/view/:ticket', '/api/receipt/view/:ticket'], (req: Request, res: Response) => {
  const { ticket } = req.params;
  const lowerTicket = ticket.toLowerCase();
  
  const savedReceipt = dispatchedReceipts.get(lowerTicket) ||
    Array.from(dispatchedReceipts.values()).find((r) => r.ticketNumber.toLowerCase() === lowerTicket);

  if (savedReceipt) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(savedReceipt.html);
  }

  // Fallback to cached order if present
  const order = cachedOrders.find(
    (o) => o.ticketNumber.toLowerCase() === lowerTicket || o.id.toLowerCase() === lowerTicket
  );

  if (order) {
    const html = generateReceiptHtml({
      ticket: order.ticketNumber,
      customerName: order.customerName,
      total: order.total,
      subtotal: order.subtotal,
      tax: order.tax,
      orderType: order.type,
      pickupTime: order.dueTime || order.pickupTime || 'Ready ASAP',
      items: order.items,
      loyaltyPoints: order.pointsEarned,
      timestamp: new Date(order.timestamp).toLocaleString('en-GB'),
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  return res.status(404).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>Receipt Not Found - Pizza Pino</title></head>
    <body style="font-family: sans-serif; background: #fafaf9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
      <div style="background: white; padding: 32px; border-radius: 16px; border: 1px solid #e7e5e4; text-align: center; max-width: 400px;">
        <div style="font-size: 32px; margin-bottom: 8px;">🍕</div>
        <h2 style="margin: 0 0 8px; color: #1c1917;">Receipt Not Found</h2>
        <p style="color: #78716c; font-size: 14px;">The digital receipt #${ticket} could not be located or has expired.</p>
        <a href="/" style="display: inline-block; margin-top: 16px; padding: 8px 16px; background: #dc2626; color: #ffffff; font-weight: bold; border-radius: 8px; text-decoration: none;">Return to Pizza Pino</a>
      </div>
    </body>
    </html>
  `);
});

// POST /api/receipt/email - Send digital receipt copy to customer email
app.post('/api/receipt/email', async (req: Request, res: Response) => {
  const { email, orderId, ticketNumber, customerName, total, items, loyaltyPoints } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const order = orderId ? cachedOrders.find((o) => o.id === orderId || o.ticketNumber === orderId) : undefined;
  const ticket = ticketNumber || order?.ticketNumber || 'PIZZA-RECEIPT';
  const name = customerName || order?.customerName || 'Valued Pizza Lover';
  const finalTotal = Number(total ?? order?.total ?? 0);
  const tax = Number(order?.tax ?? (finalTotal * 0.2) / 1.2);
  const subtotal = Number(order?.subtotal ?? (finalTotal - tax));
  const orderItems = items || order?.items || [];
  const points = loyaltyPoints ?? order?.pointsEarned ?? Math.floor(finalTotal * 10);
  const orderType = order?.type || 'takeaway';
  const pickupTime = order?.dueTime || order?.scheduledTime || order?.pickupTime || 'Ready ASAP (~15-20 mins)';
  const timestamp = order?.timestamp
    ? new Date(order.timestamp).toLocaleString('en-GB')
    : new Date().toLocaleString('en-GB');

  const html = generateReceiptHtml({
    ticket,
    customerName: name,
    total: finalTotal,
    subtotal,
    tax,
    orderType,
    pickupTime,
    items: orderItems,
    loyaltyPoints: points,
    timestamp,
  });

  const text = `Pizza Pino Order Receipt - Ticket #${ticket}\nCustomer: ${name}\nTotal: £${finalTotal.toFixed(2)}\nFulfillment: ${orderType.toUpperCase()} (${pickupTime})\n\nPlease quote ticket #${ticket} at the collection counter.\nThank you for choosing Pizza Pino!`;

  // Always store in dispatchedReceipts for instant web preview
  dispatchedReceipts.set(ticket.toLowerCase(), {
    ticketNumber: ticket,
    email: cleanEmail,
    customerName: name,
    total: finalTotal,
    html,
    sentAt: new Date().toISOString(),
    deliveredVia: 'outbox',
  });

  // Default web preview URL
  const previewUrl = `/api/receipts/view/${encodeURIComponent(ticket)}`;

  // SMTP Settings from Environment
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  const fromAddress = process.env.SMTP_FROM || (smtpUser ? `Pizza Pino <${smtpUser}>` : 'Pizza Pino Orders <no-reply@pizzapino.co.uk>');

  let emailSent = false;
  let providerUsed = 'digital_outbox';

  // 1. Try Configured SMTP if credentials exist (with short timeout so button never hangs)
  if (smtpHost || smtpUser) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost || 'smtp.gmail.com',
        port: smtpPort,
        secure: smtpSecure,
        auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
        tls: { rejectUnauthorized: false },
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 5000,
      });

      const info = await transporter.sendMail({
        from: fromAddress,
        to: cleanEmail,
        subject: `🍕 Your Pizza Pino Order Receipt - Ticket #${ticket}`,
        text,
        html,
      });

      console.log(`[PIZZA PINO E-RECEIPT] Successfully sent receipt via SMTP to ${cleanEmail}: ${info.messageId}`);
      emailSent = true;
      providerUsed = 'smtp';
    } catch (err: any) {
      console.warn(`[PIZZA PINO E-RECEIPT] SMTP sending failed:`, err.message);
    }
  }

  // 2. If SMTP not set or failed, try dispatching to the POS backend API with timeout
  if (!emailSent && posApiUrl) {
    try {
      const controller = new AbortController();
      const abortTimer = setTimeout(() => controller.abort(), 3000);
      const posRes = await fetch(`${posApiUrl}/api/receipt/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          ticketNumber: ticket,
          customerName: name,
          total: finalTotal,
          items: orderItems,
          pickupTime,
        }),
        signal: controller.signal,
      });
      clearTimeout(abortTimer);
      if (posRes.ok) {
        console.log(`[ROASTUP E-RECEIPT] Successfully dispatched receipt via POS backend at ${posApiUrl}`);
        emailSent = true;
        providerUsed = 'pos_backend';
      }
    } catch {
      // POS backend might not implement email endpoint or be unreachable
    }
  }

  const stored = dispatchedReceipts.get(ticket.toLowerCase());
  if (stored) {
    stored.deliveredVia = providerUsed;
  }

  // Always return HTTP 200 with clear success response so user is never blocked
  return res.json({
    success: true,
    message: emailSent
      ? `Digital receipt copy sent directly to ${cleanEmail}`
      : `Digital receipt generated & saved for ${cleanEmail}!`,
    email: cleanEmail,
    ticketNumber: ticket,
    previewUrl,
    provider: providerUsed,
    emailSent,
    configuredSmtp: Boolean(smtpHost || smtpUser),
    sentAt: new Date().toISOString(),
  });
});

// PATCH /api/orders/:id/bump - Forwards kitchen bump to POS backend & broadcasts
app.patch(['/api/orders/:id/bump', '/api/pos/orders/:id/bump'], async (req: Request, res: Response) => {
  const { id } = req.params;
  const { station, unbump } = req.body;

  let posBumpSuccess = false;

  // Forward bump to live POS backend
  try {
    const posRes = await fetch(`${posApiUrl}/api/orders/${id}/bump`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ station, unbump }),
    });
    if (posRes.ok) {
      posBumpSuccess = true;
    }
  } catch (err) {
    // POS might be offline, apply locally
  }

  // Update local cache
  const order = cachedOrders.find((o) => o.id === id);
  if (order) {
    const now = new Date().toISOString();
    if (station === 'kitchen') {
      order.kitchenBumped = !unbump;
      order.status = unbump ? 'preparing' : 'ready';
      if (!unbump) {
        order.readyAt = now;
        order.estimatedMinutesRemaining = 0;
      }
    } else if (station === 'foh') {
      order.fohBumped = true;
      order.status = 'completed';
      order.completedAt = now;
      order.estimatedMinutesRemaining = 0;
    }

    broadcastOrderEvent('order:bumped', { station, unbump, order });
    broadcastOrderEvent('order:status_changed', {
      orderId: order.id,
      ticketNumber: order.ticketNumber,
      status: order.status,
      order,
    });
    broadcastOrderEvent('order:updated', order);
  }

  res.json({ success: true, posBumpSuccess, order });
});

// SSE Stream for real-time live events
app.get(['/api/orders/stream', '/api/pos/stream'], (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = `client-${Date.now()}-${Math.random()}`;
  const clientType = req.path.includes('/pos') ? 'pos' : 'customer';
  const newClient: SSEClient = { id: clientId, res, type: clientType };
  sseClients.push(newClient);

  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, posOnline: posOnlineStatus, timestamp: new Date().toISOString() })}\n\n`);

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter((c) => c.id !== clientId);
  });
});

// -------------------------------------------------------------
// VITE / STATIC SERVING
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ROASTUP Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
