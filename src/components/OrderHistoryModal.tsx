import React, { useState } from 'react';
import {
  X,
  ShoppingBag,
  Receipt,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Flame,
  ChevronRight,
  User,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { CartItem, CustomerUser, Order } from '../types';

interface OrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  currentUser: CustomerUser | null;
  onOpenReceipt: (order: Order) => void;
  onSelectOrderToTrack: (order: Order) => void;
  onReorder: (items: CartItem[]) => void;
  onOpenAuth?: () => void;
}

export const OrderHistoryModal: React.FC<OrderHistoryModalProps> = ({
  isOpen,
  onClose,
  orders,
  currentUser,
  onOpenReceipt,
  onSelectOrderToTrack,
  onReorder,
  onOpenAuth,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [reorderedId, setReorderedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredOrders = orders.filter((order) => {
    const isActive = order.status !== 'completed';
    if (filter === 'active') return isActive;
    if (filter === 'completed') return !isActive;
    return true;
  });

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'ready':
        return {
          label: 'Ready for Collection',
          className:
            'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
          dot: 'bg-emerald-500 animate-ping',
        };
      case 'preparing':
        return {
          label: 'Stone-Baking in Oven',
          className:
            'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800',
          dot: 'bg-red-500 animate-pulse',
        };
      case 'pending':
        return {
          label: 'Order Placed',
          className:
            'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700',
          dot: 'bg-stone-400',
        };
      case 'completed':
        return {
          label: 'Completed',
          className:
            'bg-stone-100 dark:bg-stone-800/80 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800',
          dot: 'bg-stone-400',
        };
      default:
        return {
          label: status,
          className: 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300',
          dot: 'bg-stone-400',
        };
    }
  };

  const handleReorderClick = (order: Order) => {
    onReorder(order.items);
    setReorderedId(order.id);
    setTimeout(() => {
      setReorderedId(null);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="order-history-dialog"
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-stone-950 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center font-black shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight font-sans">
                  Pizza Pino Order History
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-stone-800 text-red-400 text-[11px] font-mono font-bold">
                  {orders.length} {orders.length === 1 ? 'order' : 'orders'}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                {currentUser
                  ? `Signed in as ${currentUser.name} (${currentUser.email})`
                  : 'Orders placed on this device'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar & Guest Sync Notice */}
        <div className="p-3 sm:px-6 bg-stone-50 dark:bg-stone-900/60 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'active'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
              }`}
            >
              Active ({orders.filter((o) => o.status !== 'completed').length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'completed'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
              }`}
            >
              Completed ({orders.filter((o) => o.status === 'completed').length})
            </button>
          </div>

          {!currentUser && onOpenAuth && (
            <button
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign in to sync account orders</span>
            </button>
          )}
        </div>

        {/* Orders List */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 divide-y divide-stone-100 dark:divide-stone-800 space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto text-2xl">
                🍕
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {filter === 'active'
                  ? 'No active orders in progress'
                  : filter === 'completed'
                  ? 'No completed orders yet'
                  : 'No orders found'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
                {filter === 'all'
                  ? 'Ready to order? Choose your favorite pizzas, calzones and sides to get started!'
                  : 'Check the other filters to view all orders.'}
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-colors cursor-pointer shadow-xs"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const statusInfo = getStatusBadge(order.status);
              const isExpanded = expandedOrderId === order.id;
              const formattedDate = new Date(order.timestamp).toLocaleString('en-GB', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={order.id}
                  className="pt-4 first:pt-0 pb-2 space-y-3 transition-colors"
                >
                  {/* Order Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-black text-base sm:text-lg text-stone-900 dark:text-white">
                        #{order.ticketNumber}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${statusInfo.className}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                        <span>{statusInfo.label}</span>
                      </span>
                      <span className="text-xs font-semibold text-stone-400">
                        • {order.type === 'dine_in' ? '🍽️ Dine In' : '🛍️ Takeaway'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  {/* Summary of Items */}
                  <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-stone-700 dark:text-stone-300 font-bold">
                      <span>
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)}{' '}
                        {order.items.reduce((sum, item) => sum + item.quantity, 0) === 1
                          ? 'item'
                          : 'items'}:{' '}
                        {order.items
                          .slice(0, 2)
                          .map((i) => `${i.quantity}x ${i.name}`)
                          .join(', ')}
                        {order.items.length > 2 ? ` + ${order.items.length - 2} more` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedOrderId(isExpanded ? null : order.id)
                        }
                        className="text-[11px] text-red-600 dark:text-red-400 hover:underline font-semibold cursor-pointer shrink-0 ml-2"
                      >
                        {isExpanded ? 'Hide details' : 'View items'}
                      </button>
                    </div>

                    {/* Expanded Items List */}
                    {isExpanded && (
                      <div className="mt-2 pt-2 border-t border-stone-200 dark:border-stone-700/60 space-y-1 text-[11px]">
                        {order.items.map((item, idx) => (
                          <div
                            key={item.cartItemId || idx}
                            className="flex items-center justify-between text-stone-600 dark:text-stone-400 py-0.5"
                          >
                            <span className="truncate pr-2">
                              <strong className="text-stone-900 dark:text-stone-200">
                                {item.quantity}x
                              </strong>{' '}
                              {item.name} {item.variation?.name ? `(${item.variation.name})` : ''}
                            </span>
                            <span className="font-mono font-bold shrink-0">
                              £{item.totalPrice.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-1.5 flex items-center justify-between border-t border-stone-200 dark:border-stone-700/40 text-xs font-black">
                      <span className="text-stone-600 dark:text-stone-400">Total Paid</span>
                      <div className="flex items-center gap-2">
                        {order.pointsEarned > 0 && (
                          <span className="text-[10px] text-red-600 dark:text-red-400 font-mono font-bold flex items-center gap-0.5">
                            <Sparkles className="w-3 h-3" />
                            +{order.pointsEarned} pts
                          </span>
                        )}
                        <span className="font-mono text-stone-950 dark:text-white text-sm">
                          £{order.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions (Receipt, Track, Reorder) */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      {order.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectOrderToTrack(order);
                            onClose();
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-colors cursor-pointer shadow-2xs"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          <span>Track Live</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          onOpenReceipt(order);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs transition-colors cursor-pointer border border-stone-200 dark:border-stone-700"
                      >
                        <Receipt className="w-3.5 h-3.5 text-stone-500" />
                        <span>View Receipt</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleReorderClick(order)}
                      disabled={reorderedId === order.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-950 hover:bg-stone-800 dark:hover:bg-white font-bold text-xs transition-colors cursor-pointer shadow-2xs shrink-0"
                      title="Reorder these items"
                    >
                      <RotateCcw
                        className={`w-3.5 h-3.5 ${
                          reorderedId === order.id ? 'animate-spin' : ''
                        }`}
                      />
                      <span>
                        {reorderedId === order.id ? 'Added to Cart!' : 'Reorder'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-stone-400">
            Orders are automatically synchronized with the Pizza Pino kitchen.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-all cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
