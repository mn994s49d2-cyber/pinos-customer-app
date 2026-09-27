import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, Clock, MapPin, Sparkles, CreditCard, ShieldCheck, User } from 'lucide-react';
import { CartItem, OrderType, PaymentMethod, LoyaltyReward, CustomerUser } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (cartItemId: string, delta: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  orderType: OrderType;
  onSelectOrderType: (type: OrderType) => void;
  pickupTime: string;
  onOpenPickupModal: () => void;
  loyaltyPoints: number;
  currentUser: CustomerUser | null;
  onOpenAuth: (mode?: 'signin' | 'register', promptReason?: string) => void;
  activeDiscount: { label: string; amount: number; rewardId?: string } | null;
  onApplyReward: (reward: LoyaltyReward) => void;
  onSelectRewardToRedeem?: (reward: LoyaltyReward) => void;
  onRemoveDiscount: () => void;
  availableRewards: LoyaltyReward[];
  onCheckout: (orderData: {
    customerName: string;
    customerPhone: string;
    tableNumber?: string;
    paymentMethod: PaymentMethod;
    notes?: string;
  }) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  orderType,
  onSelectOrderType,
  pickupTime,
  onOpenPickupModal,
  loyaltyPoints,
  currentUser,
  onOpenAuth,
  activeDiscount,
  onApplyReward,
  onSelectRewardToRedeem,
  onRemoveDiscount,
  availableRewards,
  onCheckout,
}) => {
  const [customerName, setCustomerName] = useState(currentUser?.name || 'Oliver');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '07700 900123');
  const [tableNumber, setTableNumber] = useState('12');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('apple_pay');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setCustomerName(currentUser.name);
      if (currentUser.phone) {
        setCustomerPhone(currentUser.phone);
      }
    }
  }, [currentUser]);

  if (!isOpen) return null;

  // Totals
  const subtotal = items.reduce((acc, item) => acc + item.totalPrice, 0);
  const discountAmount = activeDiscount ? activeDiscount.amount : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);
  const vatAmount = finalTotal * 0.2;
  const pointsToEarn = Math.floor(finalTotal * 10);

  const handlePlaceOrder = () => {
    if (items.length === 0) return;
    setIsSubmitting(true);

    setTimeout(() => {
      onCheckout({
        customerName: customerName.trim() || 'Customer',
        customerPhone: customerPhone.trim(),
        tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
        paymentMethod,
        notes: orderNotes.trim(),
      });
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity">
      <div
        id="cart-slide-drawer"
        className="w-full max-w-lg bg-white dark:bg-stone-900 h-full flex flex-col shadow-2xl border-l border-stone-200 dark:border-stone-800 animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-900">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛍️</span>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-stone-900 dark:text-white">
                Your Order Bag
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {items.length} {items.length === 1 ? 'item' : 'items'} selected
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={onClearCart}
                className="text-xs font-bold text-stone-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                title="Clear all"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* Order Type Switcher */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Dining Mode
            </label>
            <div className="grid grid-cols-2 p-1 bg-stone-100 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onClick={() => onSelectOrderType('takeaway')}
                className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  orderType === 'takeaway'
                    ? 'bg-white dark:bg-stone-900 text-stone-950 dark:text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                🛍️ Takeaway Box
              </button>
              <button
                type="button"
                onClick={() => onSelectOrderType('dine_in')}
                className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  orderType === 'dine_in'
                    ? 'bg-white dark:bg-stone-900 text-stone-950 dark:text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                🍽️ Dine In
              </button>
            </div>

            {orderType === 'takeaway' ? (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                  <div>
                    <span className="font-bold text-stone-900 dark:text-white block">
                      Pickup Window: {pickupTime}
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">
                      Freshly stone-baked for your collection
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenPickupModal}
                  className="px-2.5 py-1 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 cursor-pointer transition-colors shadow-2xs"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs">
                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                    Table Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 12"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                    Guest Name
                  </label>
                  <input
                    type="text"
                    placeholder="Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cart Item List */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Items in Bag
            </label>

            {items.length === 0 ? (
              <div className="py-12 text-center text-stone-400 space-y-2 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
                <span className="text-3xl block">🍕</span>
                <p className="font-bold text-sm text-stone-700 dark:text-stone-300">
                  Your bag is empty
                </p>
                <p className="text-xs text-stone-400">
                  Select a stone-baked pizza, calzone, burger or shake to start!
                </p>
              </div>
            ) : (
              items.map((cartItem) => (
                <div
                  key={cartItem.cartItemId}
                  className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700/80 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-sm text-stone-900 dark:text-white">
                          {cartItem.name}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                          {cartItem.variation.name}
                        </span>
                        {cartItem.isRewardItem && (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-red-600 text-white shadow-2xs">
                            🎁 Pino Reward
                          </span>
                        )}
                      </div>

                      {/* Removals */}
                      {cartItem.specialRemovals.length > 0 && (
                        <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                          NO: {cartItem.specialRemovals.join(', ')}
                        </p>
                      )}

                      {/* Additions */}
                      {cartItem.specialAdditions.length > 0 && (
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          EXTRA: {cartItem.specialAdditions.join(', ')}
                        </p>
                      )}

                      {/* Modifiers */}
                      {cartItem.selectedModifiers.length > 0 && (
                        <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                          {cartItem.selectedModifiers.map((m) => `+ ${m.optionName}`).join(', ')}
                        </p>
                      )}

                      {cartItem.notes && (
                        <p className="text-[10px] italic text-stone-400 mt-0.5">
                          "{cartItem.notes}"
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      {cartItem.isRewardItem ? (
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase">
                            FREE
                          </span>
                          <span className="text-[9px] font-mono text-stone-400 line-through">
                            £{cartItem.variation.price.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono font-extrabold text-sm text-stone-900 dark:text-white">
                          £{cartItem.totalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Stepper & Remove */}
                  <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 dark:border-stone-700/60 text-xs">
                    {cartItem.isRewardItem ? (
                      <span className="text-[11px] font-bold text-red-700 dark:text-red-400">
                        1 Free Reward Item
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onUpdateQuantity(cartItem.cartItemId, -1)}
                          className="w-6 h-6 rounded-lg bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 flex items-center justify-center font-bold hover:bg-stone-100 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-black w-4 text-center">
                          {cartItem.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(cartItem.cartItemId, 1)}
                          className="w-6 h-6 rounded-lg bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 flex items-center justify-center font-bold hover:bg-stone-100 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => onRemoveItem(cartItem.cartItemId)}
                      className="text-stone-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Loyalty Rewards Redemption Quick Section */}
          {items.length > 0 && (
            <div className="space-y-2 p-3.5 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-xs font-black text-stone-900 dark:text-white">
                    Redeem Pino Points
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-red-700 dark:text-red-300">
                  {loyaltyPoints} pts available
                </span>
              </div>

              {activeDiscount ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-xs">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200">
                    🎉 {activeDiscount.label} (-£{activeDiscount.amount.toFixed(2)})
                  </span>
                  <button
                    type="button"
                    onClick={onRemoveDiscount}
                    className="text-emerald-700 dark:text-emerald-300 hover:text-rose-600 font-bold ml-2 underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {availableRewards
                    .filter((r) => loyaltyPoints >= r.pointsCost)
                    .map((reward) => (
                      <button
                        key={reward.id}
                        type="button"
                        onClick={() => {
                          if (onSelectRewardToRedeem) {
                            onSelectRewardToRedeem(reward);
                          } else {
                            onApplyReward(reward);
                          }
                        }}
                        className="px-2.5 py-1 rounded-xl bg-white dark:bg-stone-800 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950 text-[11px] font-bold text-stone-900 dark:text-white transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>{reward.title}</span>
                        <span className="text-red-600 dark:text-red-400 font-mono">
                          ({reward.pointsCost}pts)
                        </span>
                      </button>
                    ))}
                  {availableRewards.filter((r) => loyaltyPoints >= r.pointsCost).length === 0 && (
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Earn 10 Pino points per £1. Reach 50 points to claim a free dip!
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Customer Account & Loyalty Callout */}
          {items.length > 0 && (
            currentUser ? (
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-black text-stone-900 dark:text-white">
                        {currentUser.name}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-red-800 dark:text-red-300 px-1 py-0.2 rounded bg-red-100 dark:bg-red-900/60">
                        {currentUser.memberId}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                      Pino Balance: <span className="font-bold text-red-600 dark:text-red-400">{currentUser.loyalty?.points ?? loyaltyPoints} pts</span>
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2 py-1 rounded-lg shrink-0">
                  +{pointsToEarn} pts
                </span>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-50 to-red-100/60 dark:from-red-950/40 dark:to-stone-900 border border-red-200 dark:border-red-800 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-red-950 dark:text-red-200">
                    <Sparkles className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    <span>Earn {pointsToEarn} Pino Points on this order</span>
                  </div>
                  <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
                    Sign in or register to automatically earn points and claim free pizzas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onOpenAuth('signin', `Sign in to earn ${pointsToEarn} Pino Points on this £${finalTotal.toFixed(2)} order!`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-stone-950 text-white dark:bg-white dark:text-stone-950 text-xs font-black shrink-0 hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
                >
                  Sign In
                </button>
              </div>
            )
          )}

          {/* Contact Details */}
          {items.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Contact & Status Alerts
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                    Mobile (SMS / Alert)
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Payment Method Selector */}
          {items.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('apple_pay')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    paymentMethod === 'apple_pay'
                      ? 'border-stone-900 bg-stone-950 text-white dark:border-white'
                      : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <span className="font-extrabold text-xs block"> Apple Pay</span>
                  <span className="text-[10px] opacity-75">Instant Touch ID</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('google_pay')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    paymentMethod === 'google_pay'
                      ? 'border-red-600 bg-red-50 dark:bg-red-950 text-stone-950 dark:text-white ring-2 ring-red-500/40'
                      : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <span className="font-extrabold text-xs block">Google Pay</span>
                  <span className="text-[10px] opacity-75">1-Tap Fast Checkout</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'border-red-600 bg-red-50 dark:bg-red-950 text-stone-950 dark:text-white ring-2 ring-red-500/40'
                      : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <span className="font-extrabold text-xs block">Credit / Debit Card</span>
                  <span className="text-[10px] opacity-75">Visa / Mastercard</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('counter')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    paymentMethod === 'counter'
                      ? 'border-red-600 bg-red-50 dark:bg-red-950 text-stone-950 dark:text-white ring-2 ring-red-500/40'
                      : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <span className="font-extrabold text-xs block">Pay at Collection</span>
                  <span className="text-[10px] opacity-75">Card or Cash at POS</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with totals and action button */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/90 space-y-3">
            {/* Price Calculations */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-500 dark:text-stone-400">
                <span>Subtotal</span>
                <span className="font-mono">£{subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>Loyalty Discount</span>
                  <span className="font-mono">-£{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-400 text-[11px]">
                <span>VAT (20% included)</span>
                <span className="font-mono">£{vatAmount.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex justify-between items-baseline font-black text-base text-stone-900 dark:text-white">
                <span>Total Due</span>
                <span className="font-mono text-xl text-stone-900 dark:text-white">
                  £{finalTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Pino Points Earned Preview */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-[11px] font-bold text-red-900 dark:text-red-300">
              <span>🍕 Pino Points you'll earn:</span>
              <span className="font-mono font-black">+{pointsToEarn} pts</span>
            </div>

            {/* Place Order CTA */}
            <button
              id="confirm-place-order-btn"
              type="button"
              disabled={isSubmitting}
              onClick={handlePlaceOrder}
              className="w-full py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sending to Pizza Pino Kitchen...</span>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Pay & Place Order</span>
                  </div>
                  <span className="font-mono">£{finalTotal.toFixed(2)}</span>
                </div>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
