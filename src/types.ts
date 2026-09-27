export type OrderType = 'takeaway' | 'dine_in';

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export type PaymentMethod = 'card' | 'apple_pay' | 'google_pay' | 'counter' | 'points';

export interface Variation {
  id?: string;
  name: string; // '10"' | '12"' | '5oz Single' | '10oz Double' | '6 pieces' | '10 pieces' | 'Slice' | '16oz' | 'Standard'
  price: number;
  sku?: string;
}

export interface ModifierOption {
  id: string;
  name: string;
  priceDelta: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: ModifierOption[];
}

export type MenuCategory =
  | 'Pizzas'
  | 'Garlic Bread'
  | 'Calzones'
  | 'Burgers'
  | 'Wraps'
  | 'Sides'
  | 'Meal Deals'
  | 'Desserts'
  | 'Drinks';

export interface MenuItem {
  id: string;
  sku: string;
  name: string;
  category: MenuCategory;
  subcategory?: string;
  description: string;
  priceRange: string;
  basePrice: number;
  variations: Variation[];
  image: string;
  badge?: 'Signature' | 'Veg' | 'Spicy';
  modifierGroups?: ModifierGroup[];
  popular?: boolean;
  availableToppings?: string[];
  availableBases?: string[];
  availableCrusts?: string[];
  allowRemoveToppings?: boolean;
  removableIngredients?: string[];
}

export interface SelectedModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
}

export interface CartItem {
  cartItemId: string;
  menuItemId: string;
  sku: string;
  name: string;
  category: string;
  variation: Variation;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedModifiers: SelectedModifier[];
  specialRemovals: string[];
  specialAdditions: string[];
  notes?: string;
  image?: string;
  isRewardItem?: boolean;
  rewardTitle?: string;
  rewardPointsCost?: number;
}

export interface Order {
  id: string;
  orderNumber: number;
  ticketNumber: string;
  type: OrderType;
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
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'paid' | 'pending' | 'refunded';
  paymentRef: string;
  cardBrand?: string;
  cardLast4?: string;
  status: OrderStatus;
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
  updatedCustomerLoyalty?: LoyaltyProfile;
  notes?: string;
  source: 'customer_app' | 'pos';
}

export interface POSTillScanResult {
  success: boolean;
  message?: string;
  error?: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    memberId: string;
    loyalty: LoyaltyProfile;
  };
  redemption?: {
    rewardId?: string;
    rewardTitle: string;
    pointsDeducted: number;
    discountValue: number;
    previousBalance: number;
    newBalance: number;
    receiptCode: string;
    timestamp: string;
  };
}

export interface ReceiptSlipData {
  orderNumber: number;
  ticketNumber: string;
  type: OrderType;
  tableNumber?: string;
  customerName: string;
  customerPhone?: string;
  memberId?: string;
  customerTier?: string;
  timestamp: string;
  pickupTime?: string;
  dueTime?: string;
  isPreOrder?: boolean;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentRef: string;
  pointsEarned: number;
  pointsRedeemed?: number;
  pointsRedeemedRewardName?: string;
  pointsBalance?: number;
  posTillId?: string;
}

export interface LoyaltyReward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  icon: string;
  discountType: 'free_item' | 'percent_off' | 'fixed_off';
  discountValue: number;
  applicableCategory?: string;
  discountPercent?: number;
  freeItemId?: string;
}

export interface LoyaltyProfile {
  customerName: string;
  points: number;
  lifetimePoints?: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Bronze Slice' | 'Silver Crust' | 'Gold Supreme' | 'Bronze Spud' | 'Golden Russet' | 'Royal Roastmaster';
  tierProgress?: number; // 0 to 100
  memberId: string; // e.g. "PP-88392"
  unlockedRewards?: string[];
  history: {
    id?: string;
    desc?: string;
    description?: string;
    points: number;
    date: string;
    type?: 'earn' | 'redeem';
  }[];
}

export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  memberId: string;
  createdAt: string;
  loyalty: LoyaltyProfile;
  token?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: CustomerUser;
  token?: string;
}
