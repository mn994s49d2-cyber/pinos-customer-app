import React from 'react';
import { ShoppingBag, Bell, Moon, Sun, SlidersHorizontal, Clock, User, Receipt } from 'lucide-react';
import { CustomerUser, Order, OrderType } from '../types';

interface HeaderProps {
  orderType: OrderType;
  onSelectOrderType: (type: OrderType) => void;
  pickupTime: string;
  onOpenPickupModal: () => void;
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  onOpenLoyalty: () => void;
  onOpenSettings: () => void;
  onOpenTracking: () => void;
  onOpenOrderHistory: () => void;
  orderCount?: number;
  currentUser: CustomerUser | null;
  onOpenAuth: (mode?: 'signin' | 'register') => void;
  activeOrder: Order | null;
  loyaltyPoints: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  pushEnabled: boolean;
  onTogglePush: () => void;
  isCartAnimating?: boolean;
  tickerText?: string;
}

export const Header: React.FC<HeaderProps> = ({
  orderType,
  onSelectOrderType,
  pickupTime,
  onOpenPickupModal,
  cartCount,
  cartTotal,
  onOpenCart,
  onOpenLoyalty,
  onOpenSettings,
  onOpenTracking,
  onOpenOrderHistory,
  orderCount = 0,
  currentUser,
  onOpenAuth,
  activeOrder,
  loyaltyPoints,
  theme,
  onToggleTheme,
  pushEnabled,
  onTogglePush,
  isCartAnimating,
  tickerText,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 transition-colors w-full shadow-2xs">
      {/* Integrated Kitchen Announcement Ticker */}
      {tickerText && (
        <div className="bg-red-600 text-white px-3 sm:px-6 py-1.5 border-b border-red-700">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider bg-black/30 text-white px-1.5 py-0.5 rounded shrink-0">
                Fresh From The Oven
              </span>
              <span className="font-bold truncate">{tickerText}</span>
            </div>
            <span className="text-[10px] opacity-80 font-mono shrink-0 hidden sm:inline">PIZZA PINO Kitchen</span>
          </div>
        </div>
      )}

      {/* Primary Header Row */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 w-full">
        {/* Left: Pizza Pino Brand Identity */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="relative group flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-red-600 p-0.5 shadow-xs overflow-hidden ring-2 ring-red-500/40 flex items-center justify-center shrink-0 text-white font-black">
              <span className="text-xl sm:text-2xl select-none">🍕</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black tracking-tight text-base sm:text-lg text-stone-900 dark:text-white uppercase font-sans truncate">
                  PIZZA <span className="text-red-600">PINO</span>
                </span>
                <span className="hidden xs:inline-block text-[10px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800">
                  Takeaway
                </span>
              </div>
              <p className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 hidden xl:block truncate">
                Authentic Stone-Baked Pizzas, Calzones, Burgers & Shakes
              </p>
            </div>
          </div>
        </div>

        {/* Center: Dine In vs Takeaway & Pickup Time (Desktop lg+) */}
        <div className="hidden lg:flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800/90 p-1 rounded-2xl border border-stone-200 dark:border-stone-700 shrink-0">
          <button
            id="header-tab-takeaway"
            onClick={() => onSelectOrderType('takeaway')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              orderType === 'takeaway'
                ? 'bg-white dark:bg-stone-900 text-stone-950 dark:text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <span>🛍️ Takeaway</span>
          </button>
          <button
            id="header-tab-dinein"
            onClick={() => onSelectOrderType('dine_in')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              orderType === 'dine_in'
                ? 'bg-white dark:bg-stone-900 text-stone-950 dark:text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <span>🍽️ Dine In</span>
          </button>

          {orderType === 'takeaway' && (
            <button
              onClick={onOpenPickupModal}
              title="Change pickup time"
              className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/80 transition-colors border border-red-200 dark:border-red-800 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              <span className="truncate max-w-[170px]">{pickupTime}</span>
            </button>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Active Order Tracking Button */}
          {activeOrder && (
            <button
              id="active-order-pill"
              onClick={onOpenTracking}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none shrink-0 ${
                activeOrder.status === 'ready'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md ring-2 ring-emerald-400/50 live-pulse-ready'
                  : activeOrder.status === 'preparing'
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-md ring-2 ring-red-400/50 live-pulse-preparing'
                  : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 shadow-2xs'
              }`}
              title={`Track Order #${activeOrder.ticketNumber} (${activeOrder.status.toUpperCase()})`}
            >
              {activeOrder.status === 'ready' ? (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
              ) : activeOrder.status === 'preparing' ? (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
              )}

              <span className="hidden sm:inline">
                {activeOrder.status === 'ready' ? 'Ready' : activeOrder.status === 'preparing' ? 'In Oven' : 'Order'}
              </span>
              <span className="font-mono">#{activeOrder.ticketNumber}</span>
              {activeOrder.status === 'ready' && <span className="text-[10px] hidden xs:inline">🎉</span>}
              {activeOrder.status === 'preparing' && <span className="text-[10px] hidden xs:inline">🔥</span>}
            </button>
          )}

          {/* Order History Button */}
          <button
            id="header-order-history-btn"
            onClick={onOpenOrderHistory}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800/90 hover:bg-stone-200 dark:hover:bg-stone-700/80 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-800 dark:text-stone-200 transition-all cursor-pointer shadow-2xs shrink-0"
            title="View order history and past receipts"
          >
            <Receipt className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
            <span className="hidden sm:inline">Orders</span>
            {orderCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-mono font-black text-[10px] leading-tight">
                {orderCount}
              </span>
            )}
          </button>

          {/* User Account / Sign In */}
          {currentUser ? (
            <button
              id="user-account-btn"
              onClick={onOpenLoyalty}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800 text-xs font-bold text-stone-900 dark:text-red-200 transition-all cursor-pointer shadow-2xs shrink-0"
              title="Pizza Pino Member Card & Rewards"
            >
              <div className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-[10px] shrink-0">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:inline font-black max-w-[80px] truncate">
                {currentUser.name.split(' ')[0]}
              </span>
              <span className="text-red-600 dark:text-red-400 font-mono font-black flex items-center gap-0.5">
                <span>🍕</span>
                <span>{currentUser.loyalty?.points ?? loyaltyPoints}</span>
              </span>
            </button>
          ) : (
            <button
              id="auth-signin-btn"
              onClick={() => onOpenAuth('signin')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 hover:bg-stone-800 dark:hover:bg-stone-100 text-xs font-black transition-all cursor-pointer shadow-2xs shrink-0"
              title="Sign in or register"
            >
              <User className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span>Sign In</span>
            </button>
          )}

          {/* Desktop Utility Icons */}
          <div className="hidden md:flex items-center gap-1 shrink-0">
            <button
              id="notification-bell-btn"
              onClick={onTogglePush}
              title={pushEnabled ? 'Notifications enabled' : 'Turn on notifications'}
              className={`p-2 rounded-xl border transition-colors cursor-pointer relative flex items-center justify-center ${
                pushEnabled
                  ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-300 border-red-200 dark:border-red-800'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              {pushEnabled && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full"></span>
              )}
            </button>

            <button
              id="theme-toggle-btn"
              onClick={onToggleTheme}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer flex items-center justify-center"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-stone-600" />}
            </button>

            <button
              id="settings-btn"
              onClick={onOpenSettings}
              title="Preferences & Info"
              className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer flex items-center justify-center"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Cart Bag Button */}
          <button
            id="cart-trigger-btn"
            onClick={onOpenCart}
            className={`flex items-center gap-1.5 sm:gap-2 py-1.5 px-2.5 sm:px-3.5 rounded-xl font-black text-xs sm:text-sm transition-all shadow-xs cursor-pointer shrink-0 ${
              isCartAnimating
                ? 'bg-red-500 text-white scale-105 ring-4 ring-red-500/50 shadow-lg'
                : 'bg-red-600 hover:bg-red-700 active:scale-95 text-white'
            }`}
          >
            <ShoppingBag
              className={`w-4 h-4 transition-transform duration-300 ${
                isCartAnimating ? 'scale-125 -rotate-12 animate-bounce' : ''
              }`}
            />
            <span className="hidden sm:inline">Bag</span>
            {cartCount > 0 ? (
              <span className="flex items-center gap-1">
                <span className="w-5 h-5 rounded-full bg-white text-red-600 text-[10px] font-mono font-black flex items-center justify-center">
                  {cartCount}
                </span>
                <span className="font-mono text-xs font-bold">
                  £{cartTotal.toFixed(2)}
                </span>
              </span>
            ) : (
              <span className="font-bold opacity-90 text-xs">£0.00</span>
            )}
          </button>
        </div>
      </div>

      {/* Secondary Mobile Row */}
      <div className="lg:hidden px-3 sm:px-6 py-1.5 bg-stone-50 dark:bg-stone-950/80 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 text-xs w-full">
        <div className="flex items-center gap-0.5 bg-stone-200 dark:bg-stone-800 p-0.5 rounded-xl shrink-0">
          <button
            onClick={() => onSelectOrderType('takeaway')}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              orderType === 'takeaway'
                ? 'bg-white dark:bg-stone-900 text-stone-950 dark:text-white shadow-2xs'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            🛍️ Takeaway
          </button>
          <button
            onClick={() => onSelectOrderType('dine_in')}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              orderType === 'dine_in'
                ? 'bg-white dark:bg-stone-900 text-stone-950 dark:text-white shadow-2xs'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            🍽️ Dine In
          </button>
        </div>

        <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-center">
          {orderType === 'takeaway' ? (
            <button
              onClick={onOpenPickupModal}
              className="flex items-center gap-1 text-[11px] font-bold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 px-2 py-1 rounded-lg border border-red-200 dark:border-red-800 truncate cursor-pointer hover:bg-red-100 transition-colors"
              title="Change pickup window"
            >
              <Clock className="w-3 h-3 shrink-0 text-red-600 dark:text-red-400" />
              <span className="truncate">{pickupTime}</span>
            </button>
          ) : (
            <span className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold truncate">
              Table service
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            id="mobile-theme-toggle-btn"
            onClick={onToggleTheme}
            title="Toggle theme"
            className="p-1.5 rounded-lg bg-stone-200/80 dark:bg-stone-800 text-stone-600 dark:text-stone-300 cursor-pointer hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-stone-600" />}
          </button>
          <button
            id="mobile-settings-btn"
            onClick={onOpenSettings}
            title="Settings & Info"
            className="p-1.5 rounded-lg bg-stone-200/80 dark:bg-stone-800 text-stone-600 dark:text-stone-300 cursor-pointer hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
