import React, { useEffect, useState } from 'react';
import {
  X,
  Receipt,
  Mail,
  Send,
  Check,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import QRCode from 'qrcode';
import { CustomerUser, Order, POSTillScanResult } from '../types';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: Order | null;
  tillScanResult?: POSTillScanResult | null;
  currentUser?: CustomerUser | null;
}

// RFC 5322 compliant practical email regex validator
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  return EMAIL_REGEX.test(trimmed);
};

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  order,
  tillScanResult,
  currentUser,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [emailInput, setEmailInput] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);

  const isCustomerView = Boolean(order) || !tillScanResult;

  useEffect(() => {
    if (!isOpen) {
      setEmailError(null);
      setEmailSentTo(null);
      setEmailPreviewUrl(null);
      setEmailTouched(false);
      return;
    }

    const knownEmail =
      order?.customerEmail ||
      currentUser?.email ||
      (tillScanResult?.customer ? `${tillScanResult.customer.memberId.toLowerCase()}@pizzapino.co.uk` : '');
    
    if (knownEmail) {
      setEmailInput(knownEmail);
      setEmailError(null);
    } else {
      setEmailInput('');
      setEmailError(null);
    }
    setEmailSentTo(null);
    setEmailTouched(false);

    const payload = order
      ? `PINO:RECEIPT:${order.ticketNumber}:${order.id}:${order.total}`
      : tillScanResult?.redemption
      ? `PINO:TILLSLIP:${tillScanResult.redemption.receiptCode}:${tillScanResult.customer?.memberId}`
      : 'PINO:RECEIPT';

    QRCode.toDataURL(payload, {
      margin: 1,
      width: 140,
      color: {
        dark: '#991b1b',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate receipt QR code:', err));
  }, [isOpen, order, tillScanResult, currentUser]);

  if (!isOpen) return null;

  const isOrder = Boolean(order);
  const ticketNumber = order?.ticketNumber || (tillScanResult?.redemption ? `TILL-${tillScanResult.redemption.receiptCode.slice(-4)}` : '101');
  const customerName = order?.customerName || tillScanResult?.customer?.name || currentUser?.name || 'Customer';
  const memberId = order?.memberId || tillScanResult?.customer?.memberId || currentUser?.memberId || 'PP-GUEST';
  const customerTier = order?.customerTier || tillScanResult?.customer?.loyalty?.tier || currentUser?.loyalty?.tier || 'Bronze Slice';
  const pointsEarned = order?.pointsEarned || 0;
  const pointsRedeemed = order?.pointsRedeemed || tillScanResult?.redemption?.pointsDeducted || 0;
  const pointsRedeemedTitle = order?.pointsRedeemedRewardName || tillScanResult?.redemption?.rewardTitle;
  const pointsBalance = order?.pointsBalanceAfterOrder ?? (currentUser?.loyalty?.points ?? tillScanResult?.customer?.loyalty?.points);
  const orderType = order?.type === 'dine_in' ? 'DINE IN' : 'TAKEAWAY';
  const tableNum = order?.tableNumber;

  const placedDate = order?.timestamp ? new Date(order.timestamp) : new Date();
  const placedFormatted = placedDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const dueFormatted = order?.dueTime || order?.pickupTime || 'ASAP (~15 mins)';

  const handleSendEmailReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = emailInput.trim();

    if (!isValidEmail(targetEmail)) {
      setEmailError('Please enter a valid email address (e.g. name@example.com)');
      return;
    }

    setSendingEmail(true);
    setEmailError(null);

    try {
      const res = await fetch('/api/receipt/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          orderId: order?.id,
          ticketNumber,
          customerName,
          total: order ? order.total : tillScanResult?.redemption?.discountValue || 0,
          subtotal: order ? order.subtotal : 0,
          tax: order ? order.tax : 0,
          orderType,
          pickupTime: dueFormatted,
          items: order?.items || [],
          loyaltyPoints: pointsEarned,
          memberId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEmailSentTo(targetEmail);
        setEmailPreviewUrl(data.viewUrl || `/api/receipts/view/${ticketNumber}`);
      } else {
        setEmailError(data.error || 'Failed to dispatch email. Please verify your address.');
      }
    } catch {
      setEmailError('Network error while requesting digital receipt dispatch.');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div
        id="printable-receipt"
        className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
      >
        {/* Modal Top Bar */}
        <div className="p-4 sm:px-6 border-b border-stone-800 flex items-center justify-between bg-stone-900 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍕</span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white">
                Pizza Pino Digital Receipt
              </h2>
              <p className="text-[11px] font-mono text-stone-400">
                Ticket #{ticketNumber} • {orderType}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 bg-stone-950/40">
          {/* Email Receipt Widget */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-stone-900 to-stone-950 border border-stone-800 shadow-md space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0 mt-0.5">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>Send a Copy to Your Email</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-red-600 text-white rounded">
                    Instant
                  </span>
                </h3>
                <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">
                  Get an itemized copy with your Pino Points balance delivered straight to your inbox.
                </p>
              </div>
            </div>

            {emailSentTo ? (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs flex flex-col gap-2.5 animate-in fade-in">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Receipt confirmed for <strong>{emailSentTo}</strong>!
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmailSentTo(null)}
                    className="text-[10px] text-emerald-300 hover:text-white underline cursor-pointer shrink-0"
                  >
                    Send another
                  </button>
                </div>
                {emailPreviewUrl && (
                  <div className="text-[11px] text-emerald-300/90 pt-1.5 border-t border-emerald-900/60 flex flex-wrap items-center justify-between gap-2">
                    <a
                      href={emailPreviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-red-400 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>View Online Receipt</span>
                    </a>

                    <a
                      href={`mailto:${emailSentTo}?subject=${encodeURIComponent(`🍕 Pizza Pino Receipt - Ticket #${ticketNumber}`)}&body=${encodeURIComponent(`Hi ${customerName},\n\nHere is your official Pizza Pino receipt for Ticket #${ticketNumber}.\nTotal: £${order?.total ? order.total.toFixed(2) : '0.00'}\nPickup: ${dueFormatted}\n\nView online copy: ${window.location.origin}${emailPreviewUrl}`)}`}
                      className="inline-flex items-center gap-1 font-semibold text-emerald-300 hover:text-white hover:underline"
                    >
                      <Mail className="w-3 h-3" />
                      <span>Open in Mail Client</span>
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSendEmailReceipt} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEmailInput(val);
                        if (emailTouched && val.trim()) {
                          if (!isValidEmail(val.trim())) {
                            setEmailError('Please enter a valid email address (e.g. name@example.com)');
                          } else {
                            setEmailError(null);
                          }
                        } else if (!val.trim()) {
                          setEmailError(null);
                        }
                      }}
                      onBlur={() => {
                        setEmailTouched(true);
                        if (emailInput.trim() && !isValidEmail(emailInput.trim())) {
                          setEmailError('Please enter a valid email format (e.g. name@example.com)');
                        }
                      }}
                      placeholder="Enter your email (e.g. name@example.com)"
                      required
                      className={`w-full bg-stone-950 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-stone-500 outline-hidden transition-all ${
                        emailError
                          ? 'border-rose-500 focus:border-rose-400 bg-rose-950/20'
                          : emailTouched && emailInput && isValidEmail(emailInput)
                          ? 'border-emerald-500 focus:border-emerald-400'
                          : 'border-stone-700 focus:border-red-500'
                      }`}
                    />
                    {emailTouched && emailInput && isValidEmail(emailInput) && !emailError && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={sendingEmail}
                    className="px-3.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {sendingEmail ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{sendingEmail ? 'Sending...' : 'Email Receipt'}</span>
                  </button>
                </div>

                {emailError && (
                  <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-[11px] flex items-center gap-2 animate-in fade-in duration-150">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="font-medium">{emailError}</span>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Digital Receipt Card */}
          <div className="flex justify-center">
            <div
              id="digital-receipt-slip"
              className="w-full bg-white text-stone-950 p-5 sm:p-6 shadow-xl rounded-2xl font-mono text-xs border border-stone-200 relative"
            >
              {/* Store Header */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-stone-300">
                <h1 className="text-xl font-black tracking-widest uppercase text-red-600">
                  PIZZA PINO
                </h1>
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-700">
                  Fresh Stone-Baked Pizzas, Calzones, Burgers & Shakes
                </p>
                <p className="text-[10px] text-stone-500">
                  12 High Street, United Kingdom • Tel: 0161 794 8820
                </p>
                <p className="text-[10px] text-stone-500">
                  VAT Registration: GB 982 411 029
                </p>
              </div>

              {/* Receipt Metadata */}
              <div className="py-3 border-b border-dashed border-stone-300 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500">ORDER TICKET:</span>
                  <span className="font-black text-red-600 text-sm">#{ticketNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">ORDER PLACED:</span>
                  <span className="font-semibold text-stone-900">{placedFormatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">TARGET PICKUP:</span>
                  <span className="font-bold text-red-700">{dueFormatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">DINING OPTION:</span>
                  <span className="font-bold text-stone-900">
                    {orderType} {tableNum ? `(TABLE ${tableNum})` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">CUSTOMER:</span>
                  <span className="font-bold text-stone-900">{customerName}</span>
                </div>
              </div>

              {/* Line Items */}
              {isOrder && order?.items && order.items.length > 0 && (
                <div className="py-3 border-b border-dashed border-stone-300">
                  <div className="flex justify-between font-bold text-[10px] uppercase pb-1.5 text-stone-500">
                    <span>ITEM</span>
                    <span>AMOUNT</span>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    {order.items.map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between font-bold text-stone-950">
                          <span>
                            {item.quantity}x {item.name}
                          </span>
                          <span>£{item.totalPrice.toFixed(2)}</span>
                        </div>
                        <div className="text-[10px] text-stone-500 pl-3">
                          {item.variation.name}
                          {item.selectedModifiers?.length > 0 && ` • ${item.selectedModifiers.map(m => m.optionName).join(', ')}`}
                          {item.specialAdditions?.length > 0 && ` • Extras: ${item.specialAdditions.join(', ')}`}
                          {item.specialRemovals?.length > 0 && ` • Hold: ${item.specialRemovals.join(', ')}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial Breakdown */}
              <div className="py-3 border-b border-dashed border-stone-300 text-[11px] space-y-1">
                {isOrder && order && (
                  <>
                    <div className="flex justify-between text-stone-600">
                      <span>SUBTOTAL:</span>
                      <span>£{order.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-stone-500 text-[10px]">
                      <span>VAT (20% INCLUDED):</span>
                      <span>£{order.tax.toFixed(2)}</span>
                    </div>
                  </>
                )}

                {/* Discount Line */}
                {(pointsRedeemed > 0 || (order && order.discount > 0)) && (
                  <div className="flex justify-between font-bold text-red-900 bg-red-50 px-1.5 py-0.5 rounded">
                    <span>PINO REWARD DISCOUNT:</span>
                    <span>
                      -£
                      {order
                        ? order.discount.toFixed(2)
                        : (tillScanResult?.redemption?.discountValue || 1.25).toFixed(2)}
                    </span>
                  </div>
                )}

                {isOrder && order ? (
                  <div className="flex justify-between text-base font-black pt-1.5 border-t border-stone-300 text-stone-950">
                    <span>TOTAL PAID:</span>
                    <span>£{order.total.toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm font-black pt-1 text-stone-950">
                    <span>TILL REDEMPTION SLIP:</span>
                    <span>VALIDATED</span>
                  </div>
                )}

                <div className="flex justify-between text-[10px] text-stone-500 pt-1">
                  <span>PAYMENT METHOD:</span>
                  <span className="uppercase font-semibold">
                    {order?.paymentMethod || 'CARD / CONTACTLESS'} (AUTHORIZED)
                  </span>
                </div>
              </div>

              {/* PINO CLUB REWARDS */}
              <div className="my-3 p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] space-y-1.5">
                <div className="text-center pb-1 border-b border-red-200">
                  <span className="font-black text-red-900 uppercase tracking-widest text-[11px] block">
                    ★ PIZZA PINO CLUB REWARDS ★
                  </span>
                  <span className="text-[10px] text-red-800 font-bold">
                    MEMBER ID: {memberId}
                  </span>
                </div>

                <div className="flex justify-between text-stone-800">
                  <span>LOYALTY TIER:</span>
                  <span className="font-black text-red-900 uppercase">
                    {customerTier}
                  </span>
                </div>

                {pointsEarned > 0 && (
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>POINTS EARNED TODAY:</span>
                    <span className="font-black">+{pointsEarned} PTS</span>
                  </div>
                )}

                {pointsRedeemed > 0 && (
                  <div className="flex justify-between text-rose-800 font-bold">
                    <span>POINTS REDEEMED:</span>
                    <span className="font-black">-{pointsRedeemed} PTS</span>
                  </div>
                )}

                {pointsRedeemedTitle && (
                  <div className="text-[10px] text-stone-600 pl-2 italic">
                    Reward: {pointsRedeemedTitle}
                  </div>
                )}

                {pointsBalance !== undefined && (
                  <div className="flex justify-between text-stone-950 font-black pt-1 border-t border-red-200 text-xs">
                    <span>NEW PINO POINTS BALANCE:</span>
                    <span className="text-red-700 font-mono font-black">
                      {pointsBalance} PTS
                    </span>
                  </div>
                )}

                <div className="text-center text-[9px] text-stone-600 pt-0.5">
                  Earn 10 points per £1 spent towards free stone-baked pizzas, sides and dips!
                </div>
              </div>

              {/* Verification QR Code */}
              <div className="pt-2 border-t border-dashed border-stone-300 text-center space-y-1.5">
                <div className="flex justify-center">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Digital Receipt Verification QR Code"
                      className="w-20 h-20 border border-stone-200 p-1 rounded-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-stone-100 flex items-center justify-center text-[10px] text-stone-400">
                      Generating...
                    </div>
                  )}
                </div>

                <p className="text-[10px] font-mono tracking-wider text-stone-600 font-bold">
                  MEMBER: {memberId} • TICKET: #{ticketNumber}
                </p>

                <p className="text-[10px] font-bold text-stone-800 pt-0.5">
                  Thank you for choosing Pizza Pino!
                </p>
                <p className="text-[9px] text-stone-500">
                  Scan this QR code with any camera to verify this order or redeem Pino Points.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-stone-400">
            A digital copy is saved in your Pizza Pino order history.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs transition-all cursor-pointer shadow-xs ml-auto"
            >
              Done & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
