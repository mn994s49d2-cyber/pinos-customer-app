import React, { useState, useMemo } from 'react';
import { X, Clock, Calendar, CheckCircle2, Sun, Sunset, Moon, Sparkles, AlertCircle } from 'lucide-react';

export type TimeOfDayPeriod = 'lunch' | 'afternoon' | 'dinner' | 'asap';

interface PickupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPickupTime: string;
  onSavePickupTime: (
    timeString: string,
    isScheduled: boolean,
    dueIsoString?: string,
    timeOfDay?: TimeOfDayPeriod
  ) => void;
}

interface SlotInfo {
  timeStr: string; // e.g. "13:30"
  period: 'lunch' | 'afternoon' | 'dinner';
  periodLabel: string;
  isToday: boolean;
  fullLabel: string; // e.g. "Today at 13:30 (Lunch)"
  dueIso: string;
}

export const PickupModal: React.FC<PickupModalProps> = ({
  isOpen,
  onClose,
  currentPickupTime,
  onSavePickupTime,
}) => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeVal = currentHour * 60 + currentMinute;

  // Pizza Pino Opening Hours: 11:30 AM to 23:00 PM
  const openingMinutes = 11 * 60 + 30; // 11:30
  const closingMinutes = 23 * 60; // 23:00
  const isCurrentlyOpen = currentTimeVal >= openingMinutes && currentTimeVal < closingMinutes;
  const isBeforeOpening = currentTimeVal < openingMinutes;
  const isPastClosing = currentTimeVal >= closingMinutes;

  const asapReadyDate = new Date(now.getTime() + 15 * 60 * 1000);
  const asapTimeFormatted = `${asapReadyDate.getHours().toString().padStart(2, '0')}:${asapReadyDate.getMinutes().toString().padStart(2, '0')}`;

  const [targetDay, setTargetDay] = useState<'today' | 'tomorrow'>(
    isPastClosing || currentPickupTime.includes('Tomorrow') ? 'tomorrow' : 'today'
  );

  const [activeFilter, setActiveFilter] = useState<'all' | 'lunch' | 'afternoon' | 'dinner'>('all');

  const [mode, setMode] = useState<'asap' | 'scheduled'>(
    currentPickupTime.includes('ASAP') && !isPastClosing ? 'asap' : 'scheduled'
  );

  const allSlots = useMemo<SlotInfo[]>(() => {
    const slots: SlotInfo[] = [];
    const isToday = targetDay === 'today';

    const getPeriod = (minutes: number): { period: 'lunch' | 'afternoon' | 'dinner'; label: string } => {
      if (minutes < 15 * 60) return { period: 'lunch', label: 'Lunch' };
      if (minutes < 17 * 60 + 30) return { period: 'afternoon', label: 'Afternoon' };
      return { period: 'dinner', label: 'Dinner' };
    };

    let earliestMinute = openingMinutes;
    if (isToday) {
      if (!isBeforeOpening) {
        const bufferTime = currentTimeVal + 20;
        const remainder = bufferTime % 15;
        earliestMinute = remainder === 0 ? bufferTime : bufferTime + (15 - remainder);
      }
    }

    for (let m = openingMinutes; m <= closingMinutes; m += 15) {
      if (isToday && m < earliestMinute) {
        continue;
      }

      const h = Math.floor(m / 60);
      const min = m % 60;
      const timeStr = `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      const { period, label } = getPeriod(m);

      const slotDate = new Date(now);
      if (!isToday) {
        slotDate.setDate(slotDate.getDate() + 1);
      }
      slotDate.setHours(h, min, 0, 0);

      const dayPrefix = isToday ? 'Today' : 'Tomorrow';
      const fullLabel = `${dayPrefix} at ${timeStr} (${label})`;

      slots.push({
        timeStr,
        period,
        periodLabel: label,
        isToday,
        fullLabel,
        dueIso: slotDate.toISOString(),
      });
    }

    return slots;
  }, [targetDay, currentTimeVal, isBeforeOpening, openingMinutes, closingMinutes]);

  const visibleSlots = useMemo(() => {
    if (activeFilter === 'all') return allSlots;
    return allSlots.filter((s) => s.period === activeFilter);
  }, [allSlots, activeFilter]);

  const [selectedSlot, setSelectedSlot] = useState<SlotInfo>(() => {
    const matched = allSlots.find((s) => currentPickupTime.includes(s.timeStr));
    return matched || allSlots[0] || {
      timeStr: '18:00',
      period: 'dinner',
      periodLabel: 'Dinner',
      isToday: targetDay === 'today',
      fullLabel: `${targetDay === 'today' ? 'Today' : 'Tomorrow'} at 18:00 (Dinner)`,
      dueIso: new Date().toISOString(),
    };
  });

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (mode === 'asap') {
      if (isBeforeOpening) {
        onSavePickupTime('Today at 11:45 (Lunch Opening)', true, new Date(now.setHours(11, 45, 0, 0)).toISOString(), 'lunch');
      } else {
        const asapIso = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
        onSavePickupTime('Ready ASAP (~15 mins)', false, asapIso, 'asap');
      }
    } else {
      if (selectedSlot) {
        onSavePickupTime(selectedSlot.fullLabel, true, selectedSlot.dueIso, selectedSlot.period);
      }
    }
    onClose();
  };

  const lunchCount = allSlots.filter((s) => s.period === 'lunch').length;
  const afternoonCount = allSlots.filter((s) => s.period === 'afternoon').length;
  const dinnerCount = allSlots.filter((s) => s.period === 'dinner').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-lg p-5 sm:p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-white">
                Pre-Order & Pickup Window
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Freshly stone-baked to order & synced to kitchen display
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Service Indicator */}
        <div className="p-3 rounded-2xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isCurrentlyOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <div>
              <span className="font-extrabold text-stone-900 dark:text-stone-100 block">
                {isBeforeOpening && 'Morning Prep • Ovens heat up at 11:30 AM'}
                {isCurrentlyOpen && currentTimeVal < 15 * 60 && 'Lunch Service Active (11:30 - 15:00)'}
                {isCurrentlyOpen && currentTimeVal >= 15 * 60 && currentTimeVal < 17 * 60 + 30 && 'Afternoon Service Active (15:00 - 17:30)'}
                {isCurrentlyOpen && currentTimeVal >= 17 * 60 + 30 && 'Evening Dinner Service Active (17:30 - 23:00)'}
                {isPastClosing && 'Kitchen Closed for Today (Hours: 11:30 - 23:00)'}
              </span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                {isPastClosing ? 'Pre-order ahead for tomorrow\'s pizza service' : 'Prep time: ~15-20 mins • Stone ovens fired up'}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold px-2 py-1 rounded-lg bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 shrink-0">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Mode Selector: ASAP vs Scheduled */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              if (!isPastClosing) setMode('asap');
            }}
            disabled={isPastClosing}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              isPastClosing
                ? 'opacity-40 cursor-not-allowed border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/30'
                : mode === 'asap'
                ? 'border-red-600 bg-red-50 dark:bg-red-950/40 ring-2 ring-red-500/40 text-stone-950 dark:text-white'
                : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 text-stone-600 dark:text-stone-300 hover:border-red-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xl">⚡</span>
              {mode === 'asap' && <CheckCircle2 className="w-4 h-4 text-red-600 dark:text-red-400" />}
            </div>
            <span className="font-extrabold text-sm block text-stone-900 dark:text-white">Ready ASAP</span>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              {isBeforeOpening
                ? 'Ready for 11:45 AM opening'
                : `Hot & ready at ~${asapTimeFormatted}`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMode('scheduled')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              mode === 'scheduled'
                ? 'border-red-600 bg-red-50 dark:bg-red-950/40 ring-2 ring-red-500/40 text-stone-950 dark:text-white'
                : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 text-stone-600 dark:text-stone-300 hover:border-red-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xl">🕒</span>
              {mode === 'scheduled' && <CheckCircle2 className="w-4 h-4 text-red-600 dark:text-red-400" />}
            </div>
            <span className="font-extrabold text-sm block text-stone-900 dark:text-white">Pre-Order by Time</span>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              Pick Lunch, Afternoon, or Dinner
            </span>
          </button>
        </div>

        {/* Scheduled Slots Section */}
        {mode === 'scheduled' && (
          <div className="space-y-3.5 pt-1">
            {/* Day Selector */}
            <div className="flex items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase text-stone-500 dark:text-stone-400">
                <Calendar className="w-3.5 h-3.5 text-red-600" />
                <span>Collection Day:</span>
              </div>
              <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-xl">
                {!isPastClosing && (
                  <button
                    type="button"
                    onClick={() => setTargetDay('today')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      targetDay === 'today'
                        ? 'bg-red-600 text-white shadow-2xs font-black'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                    }`}
                  >
                    Today
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setTargetDay('tomorrow')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    targetDay === 'tomorrow'
                      ? 'bg-red-600 text-white shadow-2xs font-black'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  Tomorrow
                </button>
              </div>
            </div>

            {/* Time of Day Filter Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-stone-400">
                Filter By Time of Day:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === 'all'
                      ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-950 font-black'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                  }`}
                >
                  All ({allSlots.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('lunch')}
                  disabled={lunchCount === 0}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    lunchCount === 0
                      ? 'opacity-30 cursor-not-allowed bg-stone-100 dark:bg-stone-800 text-stone-400'
                      : activeFilter === 'lunch'
                      ? 'bg-red-600 text-white font-black'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                  }`}
                >
                  <Sun className="w-3 h-3 text-amber-500" />
                  <span>Lunch (11:30 - 15:00)</span>
                  <span className="text-[10px] opacity-75 font-mono">({lunchCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('afternoon')}
                  disabled={afternoonCount === 0}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    afternoonCount === 0
                      ? 'opacity-30 cursor-not-allowed bg-stone-100 dark:bg-stone-800 text-stone-400'
                      : activeFilter === 'afternoon'
                      ? 'bg-red-600 text-white font-black'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                  }`}
                >
                  <Sunset className="w-3 h-3 text-orange-500" />
                  <span>Afternoon (15:00 - 17:30)</span>
                  <span className="text-[10px] opacity-75 font-mono">({afternoonCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('dinner')}
                  disabled={dinnerCount === 0}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    dinnerCount === 0
                      ? 'opacity-30 cursor-not-allowed bg-stone-100 dark:bg-stone-800 text-stone-400'
                      : activeFilter === 'dinner'
                      ? 'bg-red-600 text-white font-black'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                  }`}
                >
                  <Moon className="w-3 h-3 text-indigo-400" />
                  <span>Dinner (17:30 - 23:00)</span>
                  <span className="text-[10px] opacity-75 font-mono">({dinnerCount})</span>
                </button>
              </div>
            </div>

            {/* Slots Grid Container */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span>Select preferred pickup time:</span>
                {selectedSlot && (
                  <span className="text-red-600 dark:text-red-400 font-bold">
                    Selected: {selectedSlot.timeStr} ({selectedSlot.periodLabel})
                  </span>
                )}
              </div>

              {visibleSlots.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-2">
                  <AlertCircle className="w-6 h-6 text-stone-400 mx-auto" />
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    No time slots remaining for this category today.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetDay('tomorrow');
                      setActiveFilter('all');
                    }}
                    className="text-xs font-black text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    View Tomorrow's Available Slots →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 border border-stone-100 dark:border-stone-800/60 rounded-2xl">
                  {visibleSlots.map((slot) => {
                    const isSelected = selectedSlot?.timeStr === slot.timeStr && selectedSlot.isToday === slot.isToday;
                    return (
                      <button
                        key={`${slot.isToday ? 'today' : 'tom'}-${slot.timeStr}`}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 px-1 text-center rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-red-600 text-white font-black ring-2 ring-red-500/60 shadow-sm'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-red-50 dark:hover:bg-stone-700'
                        }`}
                      >
                        <span className="text-xs">{slot.timeStr}</span>
                        <span className="text-[9px] opacity-75 font-sans uppercase font-bold">
                          {slot.periodLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected Summary Banner */}
        <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-red-800 dark:text-red-300 block">
              Kitchen Due Time Confirmation
            </span>
            <span className="font-extrabold text-stone-900 dark:text-white">
              {mode === 'asap'
                ? isBeforeOpening
                  ? 'Today at 11:45 (Opening Lunch)'
                  : `ASAP (~15 mins • Due ${asapTimeFormatted})`
                : selectedSlot?.fullLabel || 'Please select a slot'}
            </span>
          </div>
          <span className="px-2 py-1 rounded-md bg-red-600/20 text-red-800 dark:text-red-300 font-bold text-[10px] border border-red-500/30 shrink-0">
            Auto-Fires Kitchen
          </span>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="confirm-pickup-time-btn"
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Time</span>
          </button>
        </div>
      </div>
    </div>
  );
};
