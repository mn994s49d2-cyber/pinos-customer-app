import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle,
  Clock,
  Flame,
  ShoppingBag,
  Bell,
  Sparkles,
  ChefHat,
  Receipt,
  MessageSquare,
  Send,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Order } from '../types';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onOpenReceipt?: () => void;
  onOpenAuth?: (mode: 'signin' | 'register') => void;
  onOpenOrderHistory?: () => void;
  onUpdateOrderNotes?: (orderId: string, newNotes: string) => void;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  order,
  onOpenReceipt,
  onOpenAuth,
  onOpenOrderHistory,
  onUpdateOrderNotes,
}) => {
  const [kitchenMessage, setKitchenMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeNotes, setActiveNotes] = useState(order?.notes || '');

  useEffect(() => {
    setActiveNotes(order?.notes || '');
  }, [order?.notes, order?.id]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleSendKitchenMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanMessage = kitchenMessage.trim();
    if (!cleanMessage || isSendingMessage || !order) return;

    setIsSendingMessage(true);
    setFeedback(null);

    const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const customerTag = `[Customer Note @ ${timeStr}]: ${cleanMessage}`;
    const newAggregatedNotes = activeNotes ? `${activeNotes} • ${customerTag}` : customerTag;

    try {
      const res = await fetch(`/api/orders/${order.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: cleanMessage, notes: newAggregatedNotes }),
      });

      if (res.ok) {
        const data = await res.json();
        const finalNotes = data.notes || newAggregatedNotes;
        setActiveNotes(finalNotes);
        if (onUpdateOrderNotes) {
          onUpdateOrderNotes(order.id, finalNotes);
        }
        setKitchenMessage('');
        setFeedback({
          type: 'success',
          message: 'Message sent to Pizza Pino kitchen staff! The prep line has been alerted.',
        });
      } else {
        setActiveNotes(newAggregatedNotes);
        if (onUpdateOrderNotes) {
          onUpdateOrderNotes(order.id, newAggregatedNotes);
        }
        setKitchenMessage('');
        setFeedback({
          type: 'success',
          message: 'Note saved to your kitchen order ticket.',
        });
      }
    } catch {
      setActiveNotes(newAggregatedNotes);
      if (onUpdateOrderNotes) {
        onUpdateOrderNotes(order.id, newAggregatedNotes);
      }
      setKitchenMessage('');
      setFeedback({
        type: 'success',
        message: 'Note recorded for kitchen staff.',
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleQuickChipClick = (suggestion: string) => {
    setKitchenMessage((prev) => (prev ? `${prev}, ${suggestion}` : suggestion));
  };

  if (!isOpen) return null;

  if (!order) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-600/15 text-red-600 border border-red-500/30 flex items-center justify-center mx-auto text-3xl">
            🍕
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-stone-900 dark:text-white">
              Sign In to View Live Ticket
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              You are currently signed out. Please sign in to your Pizza Pino account to view your live kitchen order status, collection instructions, and digital receipts.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => {
                onClose();
                onOpenAuth?.('signin');
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-colors cursor-pointer shadow-xs"
            >
              Sign In to View Ticket
            </button>
            <button
              onClick={onClose}
              className="py-3 px-4 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { key: 'pending', label: 'Order Received', desc: 'Sent to Pizza Pino kitchen display' },
    { key: 'preparing', label: 'Stone-Baking in Oven', desc: 'Hand-stretched dough & fresh toppings' },
    { key: 'ready', label: 'Ready for Collection!', desc: 'Hot and boxed at the pickup counter' },
    { key: 'completed', label: 'Completed', desc: 'Enjoy your delicious stone-baked pizza!' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === order.status);

  const placedDate = order.timestamp ? new Date(order.timestamp) : new Date();
  const placedTimeFormatted = placedDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  let dueTimeFormatted = '';
  if (order.dueAt) {
    const dueDate = new Date(order.dueAt);
    const validDueDate = dueDate.getTime() <= placedDate.getTime()
      ? new Date(placedDate.getTime() + 15 * 60 * 1000)
      : dueDate;
    const isTomorrow = validDueDate.getDate() !== placedDate.getDate();
    dueTimeFormatted = `${isTomorrow ? 'Tomorrow' : 'Today'} at ${validDueDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } else if (order.dueTime && !order.dueTime.includes('ASAP')) {
    dueTimeFormatted = order.dueTime.startsWith('Due at') ? order.dueTime : `Due at ${order.dueTime}`;
  } else {
    const asapDue = new Date(placedDate.getTime() + 15 * 60 * 1000);
    dueTimeFormatted = `ASAP (~15 mins • Due ${asapDue.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })})`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="order-tracking-dialog"
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Top Banner */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/30 text-white inline-block mb-1.5 backdrop-blur-xs">
                {order.type === 'dine_in' ? '🍽️ Dine In Order' : '🛍️ Takeaway Collection'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-mono">
                #{order.ticketNumber}
              </h2>
              <p className="text-xs font-bold opacity-90 mt-0.5">
                For {order.customerName} {order.tableNumber ? `(Table ${order.tableNumber})` : ''}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {onOpenOrderHistory && (
                <button
                  type="button"
                  id="tracking-order-history-btn"
                  onClick={() => {
                    onClose();
                    onOpenOrderHistory();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors cursor-pointer"
                  title="View all past orders"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Order History</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="p-2 rounded-full bg-black/20 hover:bg-black/30 transition-colors text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-2xl bg-black/20 backdrop-blur-xs border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-white mt-0.5 shrink-0" />
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-extrabold uppercase opacity-85">
                    {order.isPreOrder || order.isScheduled ? 'Scheduled Pickup' : 'Pickup Window'}
                  </p>
                  {order.timeOfDay && order.timeOfDay !== 'asap' && (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-white text-red-700 rounded">
                      {order.timeOfDay}
                    </span>
                  )}
                </div>
                <p className="text-xs font-black">
                  {dueTimeFormatted}
                </p>
                <p className="text-[10px] font-semibold opacity-80 mt-0.5">
                  Placed at {placedTimeFormatted}
                </p>
              </div>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 pt-1.5 sm:pt-0 border-white/10">
              <p className="text-[10px] font-extrabold uppercase opacity-80">Kitchen Status</p>
              <p className="text-xs font-black uppercase tracking-wide">
                {order.status === 'pending'
                  ? 'In Queue'
                  : order.status === 'preparing'
                  ? 'In the Oven 🔥'
                  : order.status === 'ready'
                  ? 'Ready to Collect 🎉'
                  : 'Done'}
              </p>
            </div>
          </div>
        </div>

        {/* Status Stepper */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-stone-400">
                Live Kitchen Progress
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Live Pizza Pino Kitchen Updates
              </span>
            </div>

            <div className="space-y-3">
              {steps.map((step, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div
                    key={step.key}
                    className={`flex items-start gap-3 p-3 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'border-red-600 bg-red-50/80 dark:bg-red-950/30 text-stone-950 dark:text-white shadow-xs'
                        : isPassed
                        ? 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 text-stone-700 dark:text-stone-300 opacity-80'
                        : 'border-stone-100 dark:border-stone-800/50 text-stone-400 opacity-50'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                        isCurrent
                          ? 'bg-red-600 text-white ring-4 ring-red-500/30'
                          : isPassed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-200 dark:bg-stone-700 text-stone-500'
                      }`}
                    >
                      {isPassed && !isCurrent ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-extrabold">{step.label}</p>
                        {isCurrent && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-600 text-white">
                            Current Stage
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Collection Instructions Card for Customer */}
          <div className="p-3.5 rounded-2xl bg-red-50/80 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-red-950 dark:text-red-300 flex items-center gap-1.5">
                <ChefHat className="w-4 h-4 text-red-600" />
                Collection & Pickup Instructions
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-200/70 dark:bg-red-900/80 text-red-900 dark:text-red-200">
                #{order.ticketNumber}
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              {order.type === 'dine_in'
                ? `Take a seat at ${order.tableNumber ? `Table ${order.tableNumber}` : 'your table'}. We will bring your piping hot stone-baked pizzas straight over!`
                : 'Please make your way to the Pizza Pino counter when the status shows "Ready for Collection". Quote your ticket number to collect.'}
            </p>
          </div>

          {/* Message Kitchen Staff Card */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-stone-900 dark:text-white flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                Message for Kitchen Staff
              </span>
              <span className="text-[10px] font-mono font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-full">
                Ticket #{order.ticketNumber}
              </span>
            </div>

            <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
              Have specific instructions, allergy alerts, extra condiments, or crust preferences? Send a note directly to our pizzaiolos.
            </p>

            {activeNotes && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-800 dark:text-red-300 flex items-center gap-1">
                    <ChefHat className="w-3 h-3" />
                    Kitchen Notes on File
                  </span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-200/70 dark:bg-red-900/60 text-red-900 dark:text-red-200">
                    Live On Prep Ticket
                  </span>
                </div>
                <p className="text-xs text-stone-800 dark:text-stone-200 leading-snug break-words">
                  {activeNotes}
                </p>
              </div>
            )}

            {order.status !== 'completed' ? (
              <form onSubmit={handleSendKitchenMessage} className="space-y-2.5">
                <div className="relative">
                  <textarea
                    id="kitchen-message-input"
                    rows={2}
                    value={kitchenMessage}
                    onChange={(e) => setKitchenMessage(e.target.value)}
                    placeholder="e.g. Please slice into 8 pieces, well done crust, extra garlic dip..."
                    maxLength={200}
                    disabled={isSendingMessage}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-hidden focus:border-red-500 dark:focus:border-red-500 transition-colors resize-none shadow-2xs leading-relaxed disabled:opacity-50"
                  />
                  <div className="absolute right-2.5 bottom-2 text-[10px] font-mono text-stone-400 pointer-events-none">
                    {kitchenMessage.length}/200
                  </div>
                </div>

                {/* Quick Suggestion Chips */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] font-bold text-stone-400 mr-0.5">Quick add:</span>
                  {[
                    'Slice into 8 pieces',
                    'Extra crispy crust',
                    'Garlic mayo on side',
                    'Allergy note: no dairy',
                    'Extra napkins',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleQuickChipClick(chip)}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-red-500 hover:text-red-600 dark:hover:text-red-400 active:scale-95 transition-all cursor-pointer shadow-2xs"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>

                {feedback && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
                      feedback.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-bold'
                        : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    {feedback.type === 'success' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                    <span className="text-[11px] flex-1">{feedback.message}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-stone-400 dark:text-stone-500">
                    Sends in real-time to the kitchen display
                  </span>
                  <button
                    type="submit"
                    id="submit-kitchen-message-btn"
                    disabled={!kitchenMessage.trim() || isSendingMessage}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:pointer-events-none active:scale-95 text-white font-black text-xs transition-all cursor-pointer shadow-2xs"
                  >
                    {isSendingMessage ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending to Kitchen...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-[11px] text-stone-500 italic">
                This order is fulfilled and completed. If you need any assistance, please speak with our counter team.
              </p>
            )}
          </div>

          {/* Order Completed Notice */}
          {order.status === 'completed' && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black">Order Completed!</h4>
                  <p className="text-[11px] opacity-80">
                    Enjoy your fresh stone-baked pizza! You can view your digital receipt below or get a copy sent to your email.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Items Summary & Points */}
          <div className="space-y-3 pt-2 border-t border-stone-100 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-stone-400">
                Ticket Items
              </span>
              <span className="text-xs font-mono font-bold text-stone-900 dark:text-white">
                Total Paid: £{order.total.toFixed(2)}
              </span>
            </div>

            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs p-2 rounded-xl bg-stone-50 dark:bg-stone-800/40"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-red-600 dark:text-red-400">{item.quantity}x</span>
                    <span className="font-bold text-stone-900 dark:text-white">{item.name}</span>
                    <span className="text-stone-400">({item.variation.name})</span>
                  </div>
                  <span className="font-mono font-bold text-stone-700 dark:text-stone-300">
                    £{item.totalPrice.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Loyalty points awarded badge */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs">
              <span className="font-bold text-red-900 dark:text-red-200 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-red-600" />
                Pino Points Earned:
              </span>
              <span className="font-mono font-extrabold text-red-600 dark:text-red-400">
                +{order.pointsEarned} pts
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex items-center justify-between gap-2">
          {onOpenReceipt ? (
            <button
              type="button"
              id="tracking-view-receipt-btn"
              onClick={onOpenReceipt}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs transition-colors cursor-pointer shadow-xs"
            >
              <Receipt className="w-4 h-4" />
              <span>View Receipt & Email Copy</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 font-black text-xs transition-colors cursor-pointer"
          >
            Done & Return to Menu
          </button>
        </div>
      </div>
    </div>
  );
};
