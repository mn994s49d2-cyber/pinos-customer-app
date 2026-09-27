import React, { useState, useEffect } from 'react';
import {
  X,
  Award,
  Sparkles,
  Check,
  Gift,
  QrCode,
  ArrowUpRight,
  Shield,
  LogOut,
  User,
  History,
  Phone,
  Mail,
  ChevronRight,
  Scan,
  Receipt,
  Barcode,
  ExternalLink,
  ShoppingBag,
  RotateCcw,
  Flame,
  Calendar,
} from 'lucide-react';
import QRCode from 'qrcode';
import { CartItem, CustomerUser, LoyaltyProfile, LoyaltyReward, Order } from '../types';

interface LoyaltyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CustomerUser | null;
  profile: LoyaltyProfile;
  rewards: LoyaltyReward[];
  orders?: Order[];
  onRedeemReward: (reward: LoyaltyReward) => void;
  onSelectRewardToRedeem?: (reward: LoyaltyReward) => void;
  onOpenAuth: (mode?: 'signin' | 'register') => void;
  onLogout: () => void;
  onOpenReceipt?: () => void;
  onOpenSpecificReceipt?: (order: Order) => void;
  onSelectOrderToTrack?: (order: Order) => void;
  onReorder?: (items: CartItem[]) => void;
  initialTab?: 'rewards' | 'my_qr' | 'orders' | 'history';
}

export const LoyaltyModal: React.FC<LoyaltyModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  profile,
  rewards,
  orders = [],
  onRedeemReward,
  onSelectRewardToRedeem,
  onOpenAuth,
  onLogout,
  onOpenReceipt,
  onOpenSpecificReceipt,
  onSelectOrderToTrack,
  onReorder,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<'rewards' | 'my_qr' | 'orders' | 'history'>(
    initialTab || 'rewards'
  );
  const [selectedVoucherReward, setSelectedVoucherReward] = useState<LoyaltyReward | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [reorderedId, setReorderedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const activeLoyalty = currentUser?.loyalty || profile;
  const displayName = currentUser?.name || activeLoyalty.customerName || 'Pino Club Member';
  const displayMemberId = currentUser?.memberId || activeLoyalty.memberId || 'PP-88392';
  const currentPoints = activeLoyalty.points;

  // Generate QR code for the member or selected till voucher
  useEffect(() => {
    if (!isOpen) return;

    let payload = `PINO:MEMBER:${displayMemberId}`;
    if (selectedVoucherReward) {
      payload = `PINO:VOUCHER:${displayMemberId}:${selectedVoucherReward.id}:${selectedVoucherReward.pointsCost}:${encodeURIComponent(
        selectedVoucherReward.title
      )}:${selectedVoucherReward.discountValue}`;
    }

    QRCode.toDataURL(payload, {
      margin: 1,
      width: 220,
      color: {
        dark: '#991b1b',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating loyalty QR:', err));
  }, [isOpen, displayMemberId, selectedVoucherReward]);

  if (!isOpen) return null;

  const nextTierPoints =
    activeLoyalty.tier === 'Bronze' || activeLoyalty.tier === 'Bronze Slice' || activeLoyalty.tier === 'Bronze Spud'
      ? 250
      : activeLoyalty.tier === 'Silver' || activeLoyalty.tier === 'Silver Crust' || activeLoyalty.tier === 'Golden Russet'
      ? 750
      : 1500;
  const progressPercent = Math.min(100, Math.round((currentPoints / nextTierPoints) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="loyalty-rewards-dialog"
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col"
      >
        {/* Digital Member Card */}
        <div className="p-5 sm:p-6 bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

          <div className="flex items-start justify-between relative z-10">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white inline-flex items-center gap-1 mb-2 backdrop-blur-xs">
                <Sparkles className="w-3 h-3 text-red-200" />
                Pizza Pino Club Member
              </span>
              <h2 className="text-xl sm:text-2xl font-black">{displayName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs font-mono font-bold opacity-90">ID: {displayMemberId}</p>
                {currentUser?.email && (
                  <span className="text-[11px] font-bold opacity-80 hidden sm:inline">
                    • {currentUser.email}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/20 hover:bg-black/30 transition-colors text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Points Display & Tier */}
          <div className="mt-4 grid grid-cols-2 gap-3 relative z-10">
            <div className="p-3 rounded-2xl bg-black/20 backdrop-blur-xs border border-white/10">
              <span className="text-[10px] font-extrabold uppercase opacity-80 block">
                Pino Points
              </span>
              <span className="font-mono text-2xl sm:text-3xl font-black">
                {currentPoints} <span className="text-sm font-sans font-bold">pts</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-black/20 backdrop-blur-xs border border-white/10">
              <span className="text-[10px] font-extrabold uppercase opacity-80 block">Tier Status</span>
              <span className="text-sm sm:text-base font-black block mt-0.5">
                {activeLoyalty.tier === 'Gold Supreme' || activeLoyalty.tier === 'Royal Roastmaster' || activeLoyalty.tier === 'Gold'
                  ? '👑 Gold Supreme'
                  : activeLoyalty.tier === 'Silver Crust' || activeLoyalty.tier === 'Golden Russet' || activeLoyalty.tier === 'Silver'
                  ? '🍕 Silver Crust'
                  : '🍕 Bronze Slice'}
              </span>
            </div>
          </div>

          {/* Progress to Next Tier */}
          <div className="mt-3 space-y-1.5 relative z-10">
            <div className="flex justify-between text-[11px] font-black text-red-100">
              <span>Progress to next tier</span>
              <span>
                {currentPoints} / {nextTierPoints} pts
              </span>
            </div>
            <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="mt-4 pt-3 border-t border-white/20 grid grid-cols-4 gap-1">
            <button
              onClick={() => setActiveTab('rewards')}
              className={`px-1.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1 text-center ${
                activeTab === 'rewards'
                  ? 'bg-white text-red-700 shadow-xs'
                  : 'bg-black/20 hover:bg-black/30 text-white'
              }`}
            >
              <Gift className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Rewards</span>
            </button>

            <button
              id="tab-my-qr-code"
              onClick={() => setActiveTab('my_qr')}
              className={`px-1.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1 text-center ${
                activeTab === 'my_qr'
                  ? 'bg-white text-red-700 shadow-xs'
                  : 'bg-black/20 hover:bg-black/30 text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">My QR</span>
            </button>

            <button
              id="tab-order-history-loyalty"
              onClick={() => setActiveTab('orders')}
              className={`px-1.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1 text-center ${
                activeTab === 'orders'
                  ? 'bg-white text-red-700 shadow-xs'
                  : 'bg-black/20 hover:bg-black/30 text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Orders</span>
              {orders.length > 0 && (
                <span className="ml-0.5 px-1 py-0.2 rounded-full bg-red-800 text-white text-[9px] font-mono font-black">
                  {orders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-1.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1 text-center ${
                activeTab === 'history'
                  ? 'bg-white text-red-700 shadow-xs'
                  : 'bg-black/20 hover:bg-black/30 text-white'
              }`}
            >
              <History className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Points</span>
            </button>
          </div>
        </div>

        {/* Guest prompt if not signed in */}
        {!currentUser && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/60 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black text-red-950 dark:text-red-200 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-red-600" />
                Get 100 free Pino Points!
              </span>
              <p className="text-[11px] text-red-800 dark:text-red-300">
                Sign in to save your member ID & redeem rewards across any device.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenAuth('register');
              }}
              className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-black shrink-0 hover:bg-red-700 transition-colors cursor-pointer"
            >
              Register (+100)
            </button>
          </div>
        )}

        {/* Tab Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[50vh] overflow-y-auto">
          {/* TAB 1: CUSTOMER LOYALTY QR CODE */}
          {activeTab === 'my_qr' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/80 px-2.5 py-0.5 rounded-full inline-block">
                  Pizza Pino Member QR Code
                </span>
                <h3 className="text-base font-black text-stone-900 dark:text-white">
                  Show at Counter to Earn & Redeem Points
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
                  Present this QR code to staff at the till when ordering or collecting your food to earn 10 points per £1 spent.
                </p>
              </div>

              {/* Scannable QR Code Display Card */}
              <div className="p-5 rounded-3xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex flex-col items-center justify-center text-center shadow-inner">
                <div className="p-3.5 bg-white rounded-2xl shadow-md border-2 border-red-100 dark:border-stone-600 inline-block">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Pizza Pino Member QR Code"
                      className="w-52 h-52 sm:w-56 sm:h-56 object-contain"
                    />
                  ) : (
                    <div className="w-52 h-52 flex items-center justify-center text-xs text-stone-400">
                      Generating QR Code...
                    </div>
                  )}
                </div>

                <div className="mt-3.5 px-3 py-1 rounded-xl bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 font-mono text-xs font-black tracking-wider flex items-center gap-2">
                  <span className="text-[10px] font-sans font-bold text-stone-500 dark:text-stone-400 uppercase">Member ID:</span>
                  <span>{displayMemberId}</span>
                </div>

                <div className="mt-2 text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Scannable by staff at any Pizza Pino register</span>
                </div>

                {selectedVoucherReward ? (
                  <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-black flex items-center gap-1.5 animate-pulse">
                    <span>⚡</span>
                    <span>
                      VOUCHER ATTACHED: {selectedVoucherReward.title} (-{selectedVoucherReward.pointsCost} pts)
                    </span>
                    <button
                      onClick={() => setSelectedVoucherReward(null)}
                      className="ml-1 text-white hover:opacity-75 underline text-[10px] cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                    Encodes your Pizza Pino membership for instant point accumulation at the till.
                  </p>
                )}
              </div>

              {/* Quick Reward Voucher Selector */}
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-stone-400 block">
                  Attach Reward Voucher to your QR Code (Optional):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {rewards.map((r) => {
                    const canAfford = currentPoints >= r.pointsCost;
                    const isSelected = selectedVoucherReward?.id === r.id;
                    return (
                      <button
                        key={r.id}
                        disabled={!canAfford}
                        onClick={() => setSelectedVoucherReward(isSelected ? null : r)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'border-red-600 bg-red-50 dark:bg-red-950/40 text-stone-900 dark:text-white ring-2 ring-red-500/40'
                            : canAfford
                            ? 'border-stone-200 dark:border-stone-700 hover:border-red-300 text-stone-700 dark:text-stone-300'
                            : 'border-stone-100 dark:border-stone-800 opacity-40 cursor-not-allowed text-stone-400'
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>{r.title}</span>
                          <span className="font-mono text-red-600 dark:text-red-400 font-extrabold">
                            {r.pointsCost} pts
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-500 dark:text-stone-400 block mt-0.5">
                          {isSelected ? '✓ Attached to QR code above' : 'Tap to attach to QR'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {onOpenReceipt && (
                <div className="pt-1 flex items-center justify-center">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenReceipt();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 font-black text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>View Latest Order Digital Receipt</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REWARDS CATALOG */}
          {activeTab === 'rewards' && (
            <div className="space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-stone-400">
                  Redeemable Rewards
                </h3>
                <span className="text-[11px] font-bold text-red-600 dark:text-red-400">
                  10 pts per £1 spent
                </span>
              </div>

              {rewards.map((reward) => {
                const canAfford = currentPoints >= reward.pointsCost;
                return (
                  <div
                    key={reward.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      canAfford
                        ? 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/80 hover:border-red-400'
                        : 'border-stone-100 dark:border-stone-800/40 bg-stone-50 dark:bg-stone-900/40 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950 flex items-center justify-center text-red-700 dark:text-red-300 shrink-0 text-base">
                        <Gift className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs sm:text-sm text-stone-900 dark:text-white">
                          {reward.title}
                        </h4>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400">
                          {reward.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-extrabold text-red-600 dark:text-red-400">
                        {reward.pointsCost} pts
                      </span>
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => {
                          if (onSelectRewardToRedeem) {
                            onSelectRewardToRedeem(reward);
                          } else {
                            onRedeemReward(reward);
                            onClose();
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          canAfford
                            ? 'bg-red-600 hover:bg-red-700 text-white active:scale-95 shadow-2xs'
                            : 'bg-stone-200 dark:bg-stone-700 text-stone-400 cursor-not-allowed'
                        }`}
                      >
                        {canAfford ? 'Redeem Item' : 'Locked'}
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('my_qr')}
                  className="w-full py-2.5 px-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-900 dark:text-red-200 text-xs font-black flex items-center justify-center gap-2 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                >
                  <Scan className="w-4 h-4 text-red-600" />
                  <span>Redeem at counter? Click to show your Universal Loyalty QR Code</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB: ORDER HISTORY */}
          {activeTab === 'orders' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-stone-400">
                <span>Your Order History</span>
                <span className="text-red-600 font-bold">
                  {orders.length} {orders.length === 1 ? 'order' : 'orders'}
                </span>
              </div>

              {orders.length === 0 ? (
                <div className="p-8 text-center space-y-2 bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-stone-200 dark:border-stone-800">
                  <span className="text-3xl block">🍕</span>
                  <p className="text-sm font-bold text-stone-800 dark:text-stone-200">
                    No orders placed yet
                  </p>
                  <p className="text-xs text-stone-400">
                    Order our stone-baked pizzas and calzones to build up your Pino points!
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-2 px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs cursor-pointer shadow-xs"
                  >
                    Start Order
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {orders.map((order) => {
                    const isCompleted = order.status === 'completed';
                    const orderDate = new Date(order.timestamp).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={order.id}
                        className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-stone-900 dark:text-white">
                              #{order.ticketNumber}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                order.status === 'ready'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                                  : order.status === 'preparing'
                                  ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300'
                                  : isCompleted
                                  ? 'bg-stone-100 dark:bg-stone-800 text-stone-500 border-stone-200 dark:border-stone-700'
                                  : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300'
                              }`}
                            >
                              {order.status === 'ready'
                                ? 'Ready'
                                : order.status === 'preparing'
                                ? 'In Oven'
                                : isCompleted
                                ? 'Completed'
                                : 'Placed'}
                            </span>
                            <span className="text-[11px] text-stone-400">
                              {order.type === 'dine_in' ? '🍽️ Dine In' : '🛍️ Takeaway'}
                            </span>
                          </div>

                          <span className="text-[11px] text-stone-400 font-medium">{orderDate}</span>
                        </div>

                        <div className="text-xs text-stone-600 dark:text-stone-300 font-medium">
                          {order.items
                            .map((i) => `${i.quantity}x ${i.name}`)
                            .join(', ')}
                        </div>

                        <div className="pt-2 border-t border-stone-200 dark:border-stone-700/50 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 font-bold">
                            <span className="font-mono text-stone-900 dark:text-white">
                              £{order.total.toFixed(2)}
                            </span>
                            {order.pointsEarned > 0 && (
                              <span className="text-[10px] text-red-600 dark:text-red-400 font-mono font-black">
                                +{order.pointsEarned} pts
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {!isCompleted && onSelectOrderToTrack && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectOrderToTrack(order);
                                  onClose();
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-black text-[11px] cursor-pointer"
                              >
                                <Flame className="w-3 h-3" />
                                <span>Track</span>
                              </button>
                            )}

                            {onOpenSpecificReceipt && (
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenSpecificReceipt(order);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-200/80 dark:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-[11px] hover:bg-stone-300 dark:hover:bg-stone-600 cursor-pointer"
                              >
                                <Receipt className="w-3 h-3 text-stone-500" />
                                <span>Receipt</span>
                              </button>
                            )}

                            {onReorder && (
                              <button
                                type="button"
                                onClick={() => {
                                  onReorder(order.items);
                                  setReorderedId(order.id);
                                  setTimeout(() => {
                                    setReorderedId(null);
                                    onClose();
                                  }, 600);
                                }}
                                disabled={reorderedId === order.id}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-950 font-bold text-[11px] hover:bg-stone-800 dark:hover:bg-white cursor-pointer"
                              >
                                <RotateCcw
                                  className={`w-3 h-3 ${
                                    reorderedId === order.id ? 'animate-spin' : ''
                                  }`}
                                />
                                <span>
                                  {reorderedId === order.id ? 'Added!' : 'Reorder'}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ACTIVITY HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-stone-400">
                <span>Recent Points History</span>
                <span className="text-red-600 font-bold">Total: {currentPoints} pts</span>
              </div>

              {activeLoyalty.history && activeLoyalty.history.length > 0 ? (
                <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 divide-y divide-stone-200 dark:divide-stone-800/60 overflow-hidden">
                  {activeLoyalty.history.map((h, i) => (
                    <div key={h.id || i} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-stone-900 dark:text-stone-200">
                          {h.desc || h.description || 'Pino Points activity'}
                        </p>
                        <p className="text-[10px] text-stone-400">{h.date}</p>
                      </div>
                      <span
                        className={`font-mono font-black ${
                          h.points >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {h.points >= 0 ? `+${h.points}` : h.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-stone-400">
                  No points activity recorded yet. Make an order or sign in to earn points!
                </div>
              )}
            </div>
          )}

          {/* Member Benefits */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-red-600" />
              Member Perks Included
            </span>
            <ul className="text-xs text-stone-600 dark:text-stone-400 space-y-1">
              <li>✓ Universal QR Code for instant counter redemption with any camera or scanner</li>
              <li>✓ Printed points summary on your receipts</li>
              <li>✓ 10 Pino Points earned per £1 spent across all orders</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex items-center justify-between gap-2">
          {currentUser ? (
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out ({currentUser.name.split(' ')[0]})</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onClose();
                onOpenAuth('signin');
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:underline p-2 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In / Switch Account</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
