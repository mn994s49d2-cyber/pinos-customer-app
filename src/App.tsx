import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Flame,
  Award,
  Clock,
  Sparkles,
  ShoppingBag,
  Bell,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Info,
  X,
  Pizza,
} from 'lucide-react';
import {
  MenuItem,
  MenuCategory,
  CartItem,
  Order,
  OrderType,
  PaymentMethod,
  LoyaltyProfile,
  LoyaltyReward,
  CustomerUser,
  Variation,
} from './types';
import { MENU_ITEMS, CATEGORIES, DEFAULT_LOYALTY_REWARDS } from './data/menu';
import { Header } from './components/Header';
import { MenuCard } from './components/MenuCard';
import { ItemModal } from './components/ItemModal';
import { PickupModal } from './components/PickupModal';
import { CartDrawer } from './components/CartDrawer';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { LoyaltyModal } from './components/LoyaltyModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { ReceiptModal } from './components/ReceiptModal';
import { OrderHistoryModal } from './components/OrderHistoryModal';
import { RewardRedeemModal } from './components/RewardRedeemModal';
import { playDing, playOrderReadySound, playPointsSound } from './utils/audio';
import { requestNotificationPermission, sendLocalNotification } from './utils/notifications';

export default function App() {
  // Customer Authentication state
  const [currentUser, setCurrentUser] = useState<CustomerUser | null>(() => {
    if (typeof window !== 'undefined') {
      const saved =
        localStorage.getItem('pizzapino_customer_session_v1') ||
        localStorage.getItem('roastup_customer_session_v1');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore corrupted json
        }
      }
    }
    return null;
  });

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'signin' | 'register'>('signin');
  const [authPromptReason, setAuthPromptReason] = useState<string | undefined>(undefined);

  // Theme state (synced with html.dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved =
        localStorage.getItem('pizzapino_theme') ||
        localStorage.getItem('roastup_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('pizzapino_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  };

  // Sound FX and Notification preferences
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);

  // Active Category & Search
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Dining Mode & Pickup Scheduling
  const [orderType, setOrderType] = useState<OrderType>('takeaway');
  const [pickupTime, setPickupTime] = useState('Ready ASAP (~15-20 mins)');
  const [selectedDueAt, setSelectedDueAt] = useState<string | null>(null);
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<'lunch' | 'afternoon' | 'dinner' | 'asap'>('asap');
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Modals & Panels
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [isLoyaltyOpen, setIsLoyaltyOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);
  const [loyaltyInitialTab, setLoyaltyInitialTab] = useState<'rewards' | 'my_qr' | 'orders' | 'history'>('rewards');
  const [selectedRewardToRedeem, setSelectedRewardToRedeem] = useState<LoyaltyReward | null>(null);
  const [isRewardRedeemModalOpen, setIsRewardRedeemModalOpen] = useState(false);

  // Active Toast Alert for Order Updates
  const [toastAlert, setToastAlert] = useState<{
    id: string;
    title: string;
    message: string;
    type: 'ready' | 'preparing' | 'loyalty';
  } | null>(null);

  // Cart animation state & floating notification
  const [isCartAnimating, setIsCartAnimating] = useState(false);
  const [addedItemNotification, setAddedItemNotification] = useState<{
    name: string;
    price: number;
    variationName: string;
  } | null>(null);

  // Orders State (loaded from backend & synchronized in real-time)
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Loyalty Profile (synced with logged-in user or local cache)
  const [loyaltyProfile, setLoyaltyProfile] = useState<LoyaltyProfile>(() => {
    if (currentUser?.loyalty) {
      return currentUser.loyalty;
    }
    const saved =
      localStorage.getItem('pizzapino_customer_loyalty_v1') ||
      localStorage.getItem('roastup_customer_loyalty_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      customerName: 'Guest Pizza Lover',
      memberId: 'PINO-NEW',
      points: 0,
      tier: 'Bronze Slice',
      history: [],
    };
  });

  // Verify and refresh session from backend on load
  useEffect(() => {
    if (currentUser?.id) {
      fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${currentUser.id}`,
        },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user) {
            setCurrentUser(data.user);
            if (data.user.loyalty) {
              setLoyaltyProfile(data.user.loyalty);
            }
            localStorage.setItem('pizzapino_customer_session_v1', JSON.stringify(data.user));
          }
        })
        .catch((err) => console.log('Auth check error:', err));
    }
  }, []);

  const handleOpenAuth = (mode: 'signin' | 'register' = 'signin', promptReason?: string) => {
    setAuthInitialMode(mode);
    setAuthPromptReason(promptReason);
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = (user: CustomerUser) => {
    setCurrentUser(user);
    if (user.loyalty) {
      setLoyaltyProfile(user.loyalty);
    }
    localStorage.setItem('pizzapino_customer_session_v1', JSON.stringify(user));
    triggerAlert(
      'loyalty',
      `👋 Welcome to Pizza Pino, ${user.name}!`,
      `You have ${user.loyalty?.points ?? 100} Pino Points ready to use.`
    );
    if (soundEnabled) playPointsSound();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveOrderId(null);
    setIsTrackingOpen(false);
    localStorage.removeItem('pizzapino_customer_session_v1');
    localStorage.removeItem('pizzapino_active_order_id');
    setLoyaltyProfile({
      customerName: 'Guest Pizza Lover',
      memberId: 'PINO-GUEST',
      points: 0,
      tier: 'Bronze Slice',
      history: [],
    });
    triggerAlert('loyalty', 'Signed Out', 'You have signed out of your Pizza Pino Club account.');
  };

  // Applied discount reward in cart
  const [activeDiscount, setActiveDiscount] = useState<{
    label: string;
    amount: number;
    rewardId?: string;
  } | null>(null);

  // POS Store Customizations (synced from POS server /api/customization)
  const [posCustomization, setPosCustomization] = useState<{
    categoryOrder?: string[];
    digitalSignage?: {
      tickerText?: string;
      featuredItemId?: string;
      mealDealTitle?: string;
      mealDealPrice?: string;
      mealDealDesc?: string;
    };
  } | null>(null);

  useEffect(() => {
    fetch('/api/customization')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setPosCustomization(data);
      })
      .catch(() => {});
  }, []);

  const PIZZA_PINO_DEFAULT_TICKER =
    '🍕 100% FRESH HAND-STRETCHED DOUGH STONE-BAKED DAILY • ★ PIZZA PINO STONE-BAKED PIZZAS, CALZONES, BURGERS & SHAKES • 🔥 CRISPY CRUST & BUBBLING CHEESE • ⚡ FAST FRESH COLLECTION';

  // Sanitize ticker text to ensure no legacy potato/roast text ever appears
  const sanitizedTickerText = useMemo(() => {
    const raw = posCustomization?.digitalSignage?.tickerText;
    if (!raw || /potato|roastup|roast\b|maris piper|spud/i.test(raw)) {
      return PIZZA_PINO_DEFAULT_TICKER;
    }
    return raw;
  }, [posCustomization]);

  // Compute category order dynamically from POS customization if set
  const displayCategories = useMemo(() => {
    const rawCategories = CATEGORIES.filter((c) => c !== 'All Items');
    if (
      posCustomization?.categoryOrder &&
      Array.isArray(posCustomization.categoryOrder) &&
      !JSON.stringify(posCustomization.categoryOrder).toLowerCase().includes('roast')
    ) {
      const orderMap = new Map(posCustomization.categoryOrder.map((cat, idx) => [cat, idx]));
      return [...rawCategories].sort((a, b) => {
        const orderA: number = orderMap.has(a) ? (orderMap.get(a) as number) : 999;
        const orderB: number = orderMap.has(b) ? (orderMap.get(b) as number) : 999;
        return orderA - orderB;
      });
    }
    return rawCategories;
  }, [posCustomization]);

  // Persist loyalty
  useEffect(() => {
    localStorage.setItem('pizzapino_customer_loyalty_v1', JSON.stringify(loyaltyProfile));
  }, [loyaltyProfile]);

  // Load orders from API on startup
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data: Order[] = await res.json();
        setOrders(data);
        if (currentUser && !activeOrderId && data.length > 0) {
          // Find first uncompleted order belonging to the signed-in customer
          const uncompleted = data.find(
            (o) =>
              o.status !== 'completed' &&
              (o.customerId === currentUser.id ||
                o.customerEmail?.toLowerCase() === currentUser.email?.toLowerCase() ||
                o.memberId === currentUser.memberId)
          );
          if (uncompleted) {
            setActiveOrderId(uncompleted.id);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load orders from backend:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Connect to SSE for real-time live events from POS
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/orders/stream');

      eventSource.addEventListener('order:status_changed', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          handleOrderStatusChanged(payload.order);
        } catch {
          // parse error
        }
      });

      eventSource.addEventListener('order:bumped', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          handleOrderStatusChanged(payload.order);
        } catch {
          // parse error
        }
      });

      eventSource.addEventListener('order:created', (e: MessageEvent) => {
        try {
          const newOrder = JSON.parse(e.data);
          setOrders((prev) => {
            if (prev.some((o) => o.id === newOrder.id)) return prev;
            return [newOrder, ...prev];
          });
        } catch {
          // parse error
        }
      });
    } catch {
      // SSE not available, fallback to 4-second polling
    }

    const pollInterval = setInterval(fetchOrders, 4000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(pollInterval);
    };
  }, []);

  // Handle incoming status change (from POS bump or server)
  const handleOrderStatusChanged = (updatedOrder: Order) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
    );

    // If it's our active order, trigger sounds and push alerts
    if (updatedOrder.id === activeOrderId || !activeOrderId) {
      if (updatedOrder.status === 'ready') {
        if (soundEnabled) playOrderReadySound();
        triggerAlert(
          'ready',
          `🍕 Pizza Pino: Order #${updatedOrder.ticketNumber} is Ready!`,
          'Fresh and blistered straight from the stone oven! Please collect at the counter.'
        );
      } else if (updatedOrder.status === 'preparing') {
        if (soundEnabled) playDing();
        triggerAlert(
          'preparing',
          `🔥 In the Oven: Order #${updatedOrder.ticketNumber}`,
          'Your pizza is topped, baking on the stone deck, and bubbling with cheese!'
        );
      }
    }
  };

  const triggerAlert = (type: 'ready' | 'preparing' | 'loyalty', title: string, message: string) => {
    setToastAlert({ id: `toast-${Date.now()}`, title, message, type });
    sendLocalNotification(title, { body: message });
    setTimeout(() => {
      setToastAlert((curr) => (curr?.title === title ? null : curr));
    }, 6000);
  };

  // Toggle Push Notifications
  const handleTogglePush = async () => {
    if (!pushEnabled) {
      const granted = await requestNotificationPermission();
      setPushEnabled(granted);
      if (granted) {
        triggerAlert(
          'ready',
          '🔔 Pizza Pino Notifications Enabled',
          'You will receive instant alerts when your pizza is baked & ready for collection!'
        );
      }
    } else {
      setPushEnabled(false);
    }
  };

  // Cart operations
  const handleAddToCart = (cartItem: CartItem) => {
    setCartItems((prev) => {
      // Check if identical item already exists in cart
      const existingIdx = prev.findIndex(
        (i) =>
          i.sku === cartItem.sku &&
          i.variation.name === cartItem.variation.name &&
          JSON.stringify(i.specialRemovals) === JSON.stringify(cartItem.specialRemovals) &&
          JSON.stringify(i.specialAdditions) === JSON.stringify(cartItem.specialAdditions) &&
          JSON.stringify(i.selectedModifiers) === JSON.stringify(cartItem.selectedModifiers) &&
          i.notes === cartItem.notes
      );

      if (existingIdx > -1) {
        const copy = [...prev];
        const updatedQty = copy[existingIdx].quantity + cartItem.quantity;
        copy[existingIdx] = {
          ...copy[existingIdx],
          quantity: updatedQty,
          totalPrice: copy[existingIdx].unitPrice * updatedQty,
        };
        return copy;
      }
      return [...prev, cartItem];
    });

    if (soundEnabled) playDing();

    // Animate cart icon & update price smoothly
    setIsCartAnimating(true);
    setTimeout(() => {
      setIsCartAnimating(false);
    }, 900);

    // Show sleek floating non-blocking indicator so customer can keep adding items seamlessly
    setAddedItemNotification({
      name: cartItem.name,
      price: cartItem.totalPrice,
      variationName: cartItem.variation.name,
    });
    setTimeout(() => {
      setAddedItemNotification((prev) => (prev?.name === cartItem.name ? null : prev));
    }, 3000);
  };

  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              totalPrice: item.unitPrice * newQty,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (cartItemId: string) => {
    const itemToRemove = cartItems.find((i) => i.cartItemId === cartItemId);
    if (itemToRemove?.isRewardItem && itemToRemove.rewardPointsCost) {
      const refundPoints = itemToRemove.rewardPointsCost;
      setLoyaltyProfile((prev) => ({
        ...prev,
        points: prev.points + refundPoints,
        history: [
          {
            id: `hist-refund-${Date.now()}`,
            date: 'Today',
            desc: `Refunded Pino Points: ${itemToRemove.rewardTitle || itemToRemove.name} (Removed from bag)`,
            points: refundPoints,
            type: 'earn',
          },
          ...prev.history,
        ],
      }));

      if (currentUser) {
        setCurrentUser((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            loyalty: {
              ...prev.loyalty,
              points: prev.loyalty.points + refundPoints,
              history: [
                {
                  id: `hist-refund-${Date.now()}`,
                  date: 'Today',
                  desc: `Refunded Pino Points: ${itemToRemove.rewardTitle || itemToRemove.name} (Removed from bag)`,
                  points: refundPoints,
                  type: 'earn',
                },
                ...prev.loyalty.history,
              ],
            },
          };
        });
      }
    }
    setCartItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const handleClearCart = () => {
    let totalRefund = 0;
    cartItems.forEach((item) => {
      if (item.isRewardItem && item.rewardPointsCost) {
        totalRefund += item.rewardPointsCost;
      }
    });

    if (totalRefund > 0) {
      setLoyaltyProfile((prev) => ({
        ...prev,
        points: prev.points + totalRefund,
        history: [
          {
            id: `hist-refund-${Date.now()}`,
            date: 'Today',
            desc: `Refunded Pino Points: Bag Cleared`,
            points: totalRefund,
            type: 'earn',
          },
          ...prev.history,
        ],
      }));

      if (currentUser) {
        setCurrentUser((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            loyalty: {
              ...prev.loyalty,
              points: prev.loyalty.points + totalRefund,
            },
          };
        });
      }
    }

    setCartItems([]);
    setActiveDiscount(null);
  };

  // Cart Totals
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cartItems.reduce((acc, item) => acc + item.totalPrice, 0);

  // Apply Reward (Discount)
  const handleApplyReward = (reward: LoyaltyReward) => {
    const currentPoints = currentUser?.loyalty?.points ?? loyaltyProfile.points;
    if (currentPoints < reward.pointsCost) return;

    if (reward.discountType === 'percent_off' || reward.discountPercent) {
      const pct = reward.discountPercent || (reward.discountValue <= 1 ? reward.discountValue * 100 : reward.discountValue);
      const discountVal = (cartTotal * pct) / 100;
      setActiveDiscount({
        label: reward.title,
        amount: discountVal,
        rewardId: reward.id,
      });
    } else if (reward.discountType === 'free_item' || reward.freeItemId) {
      const discountVal = reward.discountValue || 1.5;
      setActiveDiscount({
        label: reward.title,
        amount: discountVal,
        rewardId: reward.id,
      });
    } else {
      setActiveDiscount({
        label: reward.title,
        amount: reward.discountValue || 1.0,
        rewardId: reward.id,
      });
    }
    if (soundEnabled) playPointsSound();
  };

  const handleRemoveDiscount = () => {
    setActiveDiscount(null);
  };

  // Open reward selection modal
  const handleOpenRewardRedeem = (reward: LoyaltyReward) => {
    setSelectedRewardToRedeem(reward);
    setIsRewardRedeemModalOpen(true);
  };

  // Confirm claimed item from RewardRedeemModal
  const handleConfirmClaimRewardItem = (
    reward: LoyaltyReward,
    item: MenuItem,
    variation: Variation
  ) => {
    const currentPoints = currentUser?.loyalty?.points ?? loyaltyProfile.points;
    if (currentPoints < reward.pointsCost) return;

    // Deduct points
    setLoyaltyProfile((prev) => ({
      ...prev,
      points: Math.max(0, prev.points - reward.pointsCost),
      history: [
        {
          id: `hist-redeem-${Date.now()}`,
          date: 'Today',
          desc: `Redeemed: ${reward.title} (${item.name})`,
          points: -reward.pointsCost,
          type: 'redeem',
        },
        ...prev.history,
      ],
    }));

    if (currentUser) {
      setCurrentUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          loyalty: {
            ...prev.loyalty,
            points: Math.max(0, prev.loyalty.points - reward.pointsCost),
            history: [
              {
                id: `hist-redeem-${Date.now()}`,
                date: 'Today',
                desc: `Redeemed: ${reward.title} (${item.name})`,
                points: -reward.pointsCost,
                type: 'redeem',
              },
              ...prev.loyalty.history,
            ],
          },
        };
      });
    }

    // Add free CartItem with price 0
    const freeItem: CartItem = {
      cartItemId: `reward-${reward.id}-${Date.now()}`,
      menuItemId: item.id,
      sku: variation.sku || item.sku,
      name: item.name,
      category: item.category,
      variation: variation,
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      selectedModifiers: [],
      specialRemovals: [],
      specialAdditions: [],
      notes: `Pizza Pino Club Reward: ${reward.title}`,
      image: item.image,
      isRewardItem: true,
      rewardTitle: reward.title,
      rewardPointsCost: reward.pointsCost,
    };

    setCartItems((prev) => [...prev, freeItem]);

    if (soundEnabled) playPointsSound();

    setAddedItemNotification({
      name: `FREE ${item.name}`,
      price: 0,
      variationName: variation.name,
    });
    setTimeout(() => {
      setAddedItemNotification((prev) => (prev?.name.includes(item.name) ? null : prev));
    }, 4000);

    setIsRewardRedeemModalOpen(false);
    setIsLoyaltyOpen(false);
    setIsCartOpen(true);
  };

  // Confirm claimed discount from RewardRedeemModal
  const handleConfirmClaimRewardDiscount = (reward: LoyaltyReward) => {
    const currentPoints = currentUser?.loyalty?.points ?? loyaltyProfile.points;
    if (currentPoints < reward.pointsCost) return;

    setLoyaltyProfile((prev) => ({
      ...prev,
      points: Math.max(0, prev.points - reward.pointsCost),
      history: [
        {
          id: `hist-redeem-${Date.now()}`,
          date: 'Today',
          desc: `Redeemed: ${reward.title}`,
          points: -reward.pointsCost,
          type: 'redeem',
        },
        ...prev.history,
      ],
    }));

    if (currentUser) {
      setCurrentUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          loyalty: {
            ...prev.loyalty,
            points: Math.max(0, prev.loyalty.points - reward.pointsCost),
            history: [
              {
                id: `hist-redeem-${Date.now()}`,
                date: 'Today',
                desc: `Redeemed: ${reward.title}`,
                points: -reward.pointsCost,
                type: 'redeem',
              },
              ...prev.loyalty.history,
            ],
          },
        };
      });
    }

    handleApplyReward(reward);
    setIsRewardRedeemModalOpen(false);
    setIsLoyaltyOpen(false);
    setIsCartOpen(true);
  };

  // Redeem reward directly from loyalty modal
  const handleRedeemFromModal = (reward: LoyaltyReward) => {
    handleOpenRewardRedeem(reward);
  };

  // Checkout flow -> POST /api/orders (directly links with POS!)
  const handleCheckout = async (orderData: {
    customerName: string;
    customerPhone: string;
    tableNumber?: string;
    paymentMethod: PaymentMethod;
    notes?: string;
  }) => {
    const subtotal = cartTotal;
    const discount = activeDiscount ? activeDiscount.amount : 0;
    const total = Math.max(0, subtotal - discount);
    const pointsEarned = Math.floor(total * 10);

    const isScheduled = !pickupTime.includes('ASAP');
    const now = new Date();
    
    // Calculate guaranteed future dueAt and formatted dueTime
    let freshDueAt = selectedDueAt;
    let freshDueTime = pickupTime;

    if (!isScheduled || pickupTime.includes('ASAP')) {
      const asapDate = new Date(now.getTime() + 20 * 60 * 1000);
      freshDueAt = asapDate.toISOString();
      const timeStr = asapDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      freshDueTime = `ASAP (~20 mins • Due ${timeStr})`;
    } else {
      const timeMatch = pickupTime.match(/(\d{1,2}:\d{2})/);
      if (timeMatch) {
        freshDueTime = timeMatch[1];
      }
      if (freshDueAt && new Date(freshDueAt).getTime() <= now.getTime()) {
        const futureDate = new Date(now.getTime() + 25 * 60 * 1000);
        freshDueAt = futureDate.toISOString();
      }
    }

    const payload = {
      type: orderType,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      tableNumber: orderData.tableNumber,
      customerId: currentUser?.id,
      customerEmail: currentUser?.email,
      memberId: currentUser?.memberId || loyaltyProfile.memberId,
      pointsRedeemed:
        (activeDiscount ? (activeDiscount.amount >= 2 ? 100 : 50) : 0) +
        cartItems.filter((i) => i.isRewardItem).reduce((acc, i) => acc + (i.rewardPointsCost || 0), 0),
      pointsRedeemedRewardName:
        [
          activeDiscount?.label,
          ...cartItems.filter((i) => i.isRewardItem).map((r) => r.rewardTitle || r.name),
        ]
          .filter(Boolean)
          .join(', ') || undefined,
      pickupTime: freshDueTime,
      isScheduled,
      scheduledTime: isScheduled ? pickupTime : undefined,
      dueTime: freshDueTime,
      dueAt: freshDueAt || undefined,
      timeOfDay: selectedTimeOfDay,
      isPreOrder: isScheduled,
      items: cartItems,
      subtotal,
      discount,
      total,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: orderData.paymentMethod === 'counter' ? 'pending' : 'paid',
      notes: orderData.notes,
      source: 'customer_app',
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const createdOrder: Order = await res.json();
        setOrders((prev) => [createdOrder, ...prev]);
        setActiveOrderId(createdOrder.id);

        // Update customer loyalty from backend response or local calculation
        if (createdOrder.updatedCustomerLoyalty) {
          setLoyaltyProfile(createdOrder.updatedCustomerLoyalty);
          if (currentUser) {
            const updatedUser: CustomerUser = {
              ...currentUser,
              loyalty: createdOrder.updatedCustomerLoyalty,
            };
            setCurrentUser(updatedUser);
            localStorage.setItem('pizzapino_customer_session_v1', JSON.stringify(updatedUser));
          }
        } else {
          setLoyaltyProfile((prev) => {
            const newPts = prev.points + pointsEarned;
            const newTier = newPts >= 500 ? 'Gold Supreme' : newPts >= 200 ? 'Silver Crust' : 'Bronze Slice';
            return {
              ...prev,
              points: newPts,
              tier: newTier,
              history: [
                {
                  date: 'Just now',
                  desc: `Order #${createdOrder.ticketNumber}`,
                  points: pointsEarned,
                },
                ...prev.history,
              ],
            };
          });
        }

        // Reset cart and active discount
        setCartItems([]);
        setActiveDiscount(null);
        setIsCartOpen(false);

        // Save order ID to local storage so device remembers order history
        try {
          const stored: string[] = JSON.parse(
            localStorage.getItem('pizzapino_order_ids') ||
            localStorage.getItem('roastup_order_ids') ||
            '[]'
          );
          if (!stored.includes(createdOrder.id)) {
            const updated = [createdOrder.id, ...stored];
            localStorage.setItem('pizzapino_order_ids', JSON.stringify(updated));
            localStorage.setItem('roastup_order_ids', JSON.stringify(updated));
          }
        } catch {}

        // Sound chime
        if (soundEnabled) playDing();

        // Open live order tracking modal
        setIsTrackingOpen(true);

        triggerAlert(
          'preparing',
          `Order #${createdOrder.ticketNumber} Placed!`,
          `Your order has been sent to Pizza Pino's kitchen. Estimated collection: ${pickupTime}`
        );
      }
    } catch (err) {
      console.error('Failed to submit order:', err);
    }
  };

  // Sample order injection for testing POS syncing
  const handleTriggerTestOrder = async () => {
    const samplePayload = {
      type: 'takeaway',
      customerName: 'Alex P.',
      customerPhone: '07999 123456',
      pickupTime: 'Ready ASAP (~20 mins)',
      items: [
        {
          cartItemId: `c-test-${Date.now()}`,
          menuItemId: 'pizza-margherita',
          sku: 'PINO-PIZ-001-12',
          name: 'Margherita',
          category: 'Pizzas',
          variation: { name: '12" Pizza', price: 11.0 },
          quantity: 1,
          unitPrice: 11.0,
          totalPrice: 11.0,
          selectedModifiers: [],
          specialRemovals: [],
          specialAdditions: [],
        },
      ],
      subtotal: 11.0,
      discount: 0,
      total: 11.0,
      paymentMethod: 'apple_pay',
      paymentStatus: 'paid',
      source: 'customer_app',
    };

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(samplePayload),
    });
    if (res.ok) {
      const data = await res.json();
      setOrders((prev) => [data, ...prev]);
      setActiveOrderId(data.id);
      if (soundEnabled) playDing();
    }
  };

  // Active Order lookup - ONLY display when user is signed in
  const activeOrder = useMemo(() => {
    if (!currentUser || !activeOrderId) return null;
    return orders.find((o) => o.id === activeOrderId) || null;
  }, [currentUser, activeOrderId, orders]);

  // Customer Orders history (orders matching user ID, email, member ID, or placed on this device)
  const customerOrders = useMemo(() => {
    let savedLocalIds: string[] = [];
    try {
      savedLocalIds = JSON.parse(
        localStorage.getItem('pizzapino_order_ids') ||
        localStorage.getItem('roastup_order_ids') ||
        '[]'
      );
    } catch {
      savedLocalIds = [];
    }

    return orders.filter((o) => {
      if (currentUser) {
        if (o.customerId === currentUser.id) return true;
        if (
          o.customerEmail &&
          currentUser.email &&
          o.customerEmail.toLowerCase() === currentUser.email.toLowerCase()
        )
          return true;
        if (o.memberId && currentUser.memberId && o.memberId === currentUser.memberId) return true;
      }
      return savedLocalIds.includes(o.id);
    });
  }, [orders, currentUser]);

  const handleReorderItems = (itemsToReorder: CartItem[]) => {
    setCartItems((prev) => [...prev, ...itemsToReorder]);
    setIsOrderHistoryOpen(false);
    setIsCartOpen(true);
    triggerAlert('ready', 'Items added to bag!', 'Your Pizza Pino order has been recreated in your basket.');
    if (soundEnabled) playDing();
  };

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return MENU_ITEMS.filter((item) => {
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch =
        searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans transition-colors selection:bg-red-600 selection:text-white w-full">
      {/* Toast Alert Banner */}
      {toastAlert && (
        <div
          onClick={() => {
            if (!currentUser) {
              handleOpenAuth('signin', 'Sign in to your Pizza Pino account to view and track your live kitchen ticket.');
            } else {
              setIsTrackingOpen(true);
            }
          }}
          className="fixed top-24 sm:top-20 right-3 sm:right-6 z-50 max-w-[calc(100vw-24px)] sm:max-w-sm w-full p-4 rounded-2xl bg-red-600 text-white shadow-2xl border-2 border-red-700 cursor-pointer animate-in slide-in-from-top-4 duration-300 flex items-start gap-3"
        >
          <span className="text-2xl shrink-0">🍕</span>
          <div className="flex-1">
            <h4 className="font-black text-sm">{toastAlert.title}</h4>
            <p className="text-xs font-medium opacity-90 mt-0.5">{toastAlert.message}</p>
            <span className="text-[10px] font-black uppercase tracking-wider underline mt-1.5 inline-block">
              Tap to view live ticket →
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setToastAlert(null);
            }}
            className="p-1 hover:bg-black/20 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main App Header */}
      <Header
        orderType={orderType}
        onSelectOrderType={setOrderType}
        pickupTime={pickupTime}
        onOpenPickupModal={() => setIsPickupModalOpen(true)}
        cartCount={cartCount}
        cartTotal={cartTotal}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenLoyalty={() => setIsLoyaltyOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTracking={() => {
          if (!currentUser) {
            handleOpenAuth('signin', 'Sign in to your Pizza Pino account to view your live kitchen order ticket');
          } else {
            setIsTrackingOpen(true);
          }
        }}
        onOpenOrderHistory={() => setIsOrderHistoryOpen(true)}
        orderCount={customerOrders.length}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        activeOrder={activeOrder}
        loyaltyPoints={currentUser?.loyalty?.points ?? loyaltyProfile.points}
        theme={theme}
        onToggleTheme={toggleTheme}
        pushEnabled={pushEnabled}
        onTogglePush={handleTogglePush}
        isCartAnimating={isCartAnimating}
        tickerText={sanitizedTickerText}
      />

      {/* Hero / Quick Announcement Banner */}
      <section className="bg-stone-900 text-white border-b border-stone-800 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-red-600 text-white text-[11px] font-black uppercase tracking-wider shadow-2xs">
                Authentic Stone-Baked Pizzas
              </span>
              <span className="text-xs font-bold text-red-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-red-400" />
                Earn 10 Pino Points per £1
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white font-sans">
              Hand-Stretched. Freshly Stone-Baked.
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-xl">
              Authentic Italian dough, cheese-stuffed crusts, folded calzones, smash burgers, peri-peri chicken wraps, and artisan thick shakes.
            </p>
          </div>

          {/* Quick Pickup Selector & Order Status Card */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsPickupModalOpen(true)}
              className="flex-1 md:flex-initial flex items-center justify-between md:justify-start gap-3 px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700/80 border border-stone-700 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-500" />
                <div>
                  <span className="text-[10px] font-black uppercase text-stone-400 block">
                    {orderType === 'takeaway' ? 'Collection Window' : 'Table Dining'}
                  </span>
                  <span className="text-xs font-bold text-white block">
                    {orderType === 'takeaway' ? pickupTime : 'Dine In at Table'}
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold text-red-400">Change</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Menu Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Search & Category Navigation Bar */}
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Category Navigation Pills */}
            <div className="flex flex-wrap items-center gap-1.5 flex-1">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  selectedCategory === 'All'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-red-500'
                }`}
              >
                All ({MENU_ITEMS.length})
              </button>

              {displayCategories.map((cat) => {
                const count = MENU_ITEMS.filter((i) => i.category === cat).length;
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-red-500'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="text-[10px] opacity-70 font-mono">({count})</span>
                  </button>
                );
              })}

              {/* Order History Tab Pill */}
              <button
                id="tab-order-history-category-bar"
                onClick={() => setIsOrderHistoryOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-red-500 hover:text-red-600 dark:hover:text-red-400 shadow-2xs"
                title="View your past orders and receipts"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                <span>Order History</span>
                {customerOrders.length > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-red-600 text-white font-black">
                    {customerOrders.length}
                  </span>
                )}
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pizzas, calzones, burgers..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 font-medium focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Menu Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-8">
            <span className="text-4xl block mb-2">🍕</span>
            <h3 className="font-extrabold text-base text-stone-900 dark:text-white">
              No menu items found
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
              We couldn't find anything matching "{searchQuery}". Try searching for Margherita, Pepperoni, Calzone, Garlic Bread, or Burger.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              View Full Menu
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tight text-stone-900 dark:text-white flex items-center gap-2">
                <span>{selectedCategory === 'All' ? 'Our Stone-Baked Menu' : selectedCategory}</span>
                <span className="text-xs font-mono font-medium text-stone-400">
                  ({filteredItems.length} items)
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <MenuCard
                  key={item.id}
                  item={item}
                  onSelect={(selected) => setCustomizingItem(selected)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Non-intrusive Floating Item Added Notification */}
      {addedItemNotification && (
        <div
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 bg-stone-950 text-white border border-stone-800 rounded-2xl p-3 sm:p-3.5 shadow-2xl flex items-center gap-3 cursor-pointer animate-in fade-in slide-in-from-bottom-3 duration-200 hover:scale-102 transition-transform"
        >
          <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            ✓
          </div>
          <div>
            <p className="text-xs font-black flex items-center gap-1.5">
              <span>Added to Bag</span>
              <span className="text-red-400 font-mono font-bold">
                +£{addedItemNotification.price.toFixed(2)}
              </span>
            </p>
            <p className="text-[11px] text-stone-300 truncate max-w-[200px]">
              {addedItemNotification.name} ({addedItemNotification.variationName})
            </p>
          </div>
          <span className="text-[11px] font-bold text-red-400 ml-1.5 underline">
            View Bag →
          </span>
        </div>
      )}

      {/* Bottom Sticky Bag Banner (on mobile when items in cart) */}
      {cartCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-40 sm:hidden">
          <button
            onClick={() => setIsCartOpen(true)}
            className={`w-full py-3.5 px-5 rounded-2xl font-black text-sm shadow-xl flex items-center justify-between border-2 border-stone-950 cursor-pointer transition-all duration-200 ${
              isCartAnimating
                ? 'bg-red-500 scale-102 ring-4 ring-red-500/60 shadow-red-500/20 text-white'
                : 'bg-red-600 hover:bg-red-700 active:scale-98 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full bg-white text-stone-950 text-xs font-mono flex items-center justify-center transition-transform duration-200 ${
                  isCartAnimating ? 'scale-125 ring-2 ring-white/60' : ''
                }`}
              >
                {cartCount}
              </span>
              <span>View Order Bag</span>
            </div>
            <div className="flex items-center gap-1 font-mono">
              <span className={`transition-all duration-200 ${isCartAnimating ? 'scale-110 font-black' : ''}`}>
                £{cartTotal.toFixed(2)}
              </span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 mt-16 py-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500 dark:text-stone-400">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍕</span>
            <div>
              <p className="font-extrabold text-stone-800 dark:text-stone-200">
                PIZZA PINO
              </p>
              <p className="text-[11px]">Stone-Baked Pizzas, Calzones, Burgers, Wraps & Shakes</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <button
              onClick={() => setIsLoyaltyOpen(true)}
              className="hover:text-red-500 transition-colors cursor-pointer"
            >
              Pino Club Rewards
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-red-500 transition-colors cursor-pointer"
            >
              Preferences & POS
            </button>
            <span className="text-[11px] font-mono opacity-50">v2.0.0</span>
          </div>
        </div>
      </footer>

      {/* MODALS & DRAWERS */}

      {/* Item Customizer Modal */}
      <ItemModal
        item={customizingItem}
        onClose={() => setCustomizingItem(null)}
        onAddToCart={handleAddToCart}
      />

      {/* Pickup Time Selector Modal */}
      <PickupModal
        isOpen={isPickupModalOpen}
        onClose={() => setIsPickupModalOpen(false)}
        currentPickupTime={pickupTime}
        onSavePickupTime={(timeStr, isSched, dueIso, timePeriod) => {
          setPickupTime(timeStr);
          setSelectedDueAt(dueIso || null);
          setSelectedTimeOfDay(timePeriod || 'asap');
        }}
      />

      {/* Cart & Checkout Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        orderType={orderType}
        onSelectOrderType={setOrderType}
        pickupTime={pickupTime}
        onOpenPickupModal={() => setIsPickupModalOpen(true)}
        loyaltyPoints={currentUser?.loyalty?.points ?? loyaltyProfile.points}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        activeDiscount={activeDiscount}
        onApplyReward={handleApplyReward}
        onSelectRewardToRedeem={handleOpenRewardRedeem}
        onRemoveDiscount={handleRemoveDiscount}
        availableRewards={DEFAULT_LOYALTY_REWARDS}
        onCheckout={handleCheckout}
      />

      {/* Live Order Tracking Modal */}
      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
        order={activeOrder}
        onOpenReceipt={() => {
          setReceiptOrder(activeOrder);
          setIsReceiptOpen(true);
        }}
        onOpenAuth={handleOpenAuth}
        onOpenOrderHistory={() => setIsOrderHistoryOpen(true)}
        onUpdateOrderNotes={(orderId, newNotes) => {
          setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, notes: newNotes } : o))
          );
        }}
      />

      {/* Loyalty & Rewards Modal */}
      <LoyaltyModal
        isOpen={isLoyaltyOpen}
        onClose={() => setIsLoyaltyOpen(false)}
        currentUser={currentUser}
        profile={loyaltyProfile}
        rewards={DEFAULT_LOYALTY_REWARDS}
        orders={customerOrders}
        onRedeemReward={handleRedeemFromModal}
        onSelectRewardToRedeem={handleOpenRewardRedeem}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        onOpenReceipt={() => {
          setReceiptOrder(activeOrder);
          setIsReceiptOpen(true);
        }}
        onOpenSpecificReceipt={(order) => {
          setReceiptOrder(order);
          setIsReceiptOpen(true);
        }}
        onSelectOrderToTrack={(order) => {
          setActiveOrderId(order.id);
          setIsTrackingOpen(true);
        }}
        onReorder={handleReorderItems}
        initialTab={loyaltyInitialTab}
      />

      {/* Customer Authentication Modal (Sign In / Register) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authInitialMode}
        onAuthSuccess={handleAuthSuccess}
        promptReason={authPromptReason}
      />

      {/* Digital Order Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        order={receiptOrder || activeOrder}
        currentUser={currentUser}
      />

      {/* Dedicated Order History Modal */}
      <OrderHistoryModal
        isOpen={isOrderHistoryOpen}
        onClose={() => setIsOrderHistoryOpen(false)}
        orders={customerOrders}
        currentUser={currentUser}
        onOpenReceipt={(order) => {
          setReceiptOrder(order);
          setIsReceiptOpen(true);
        }}
        onSelectOrderToTrack={(order) => {
          setActiveOrderId(order.id);
          setIsTrackingOpen(true);
        }}
        onReorder={handleReorderItems}
        onOpenAuth={() =>
          handleOpenAuth(
            'signin',
            'Sign in to your account to sync past orders across devices'
          )
        }
      />

      {/* Customer Preferences & Info Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
        pushEnabled={pushEnabled}
        onTogglePush={handleTogglePush}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((s) => !s)}
      />

      {/* Pino Club Loyalty Reward Item Selection Modal */}
      <RewardRedeemModal
        isOpen={isRewardRedeemModalOpen}
        onClose={() => setIsRewardRedeemModalOpen(false)}
        reward={selectedRewardToRedeem}
        userPoints={currentUser?.loyalty?.points ?? loyaltyProfile.points}
        onClaimRewardItem={handleConfirmClaimRewardItem}
        onClaimRewardDiscount={handleConfirmClaimRewardDiscount}
      />
    </div>
  );
}
