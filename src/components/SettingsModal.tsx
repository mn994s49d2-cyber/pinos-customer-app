import React from 'react';
import {
  X,
  Moon,
  Sun,
  Bell,
  Volume2,
  VolumeX,
  ShieldCheck,
  ChefHat,
  Sparkles,
  Pizza,
  CheckCircle2,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  pushEnabled: boolean;
  onTogglePush: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  pushEnabled,
  onTogglePush,
  soundEnabled,
  onToggleSound,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="settings-dialog"
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-red-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
              <Pizza className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-stone-900 dark:text-white">
                Pizza Pino Preferences
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Customise appearance, order alerts & sound chimes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 max-h-[75vh]">
          {/* Theme Option */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/60 flex items-center justify-center text-red-600 dark:text-red-400">
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-stone-900 dark:text-white">
                  Appearance
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {theme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled'}
                </p>
              </div>
            </div>
            <button
              onClick={onToggleTheme}
              className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 font-bold text-xs text-stone-900 dark:text-white shadow-2xs hover:bg-stone-100 dark:hover:bg-stone-600 cursor-pointer transition-colors"
            >
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </button>
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/60 flex items-center justify-center text-red-600 dark:text-red-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-stone-900 dark:text-white">
                  Order Status Alerts
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Alerts when your pizza is stone-baking and ready
                </p>
              </div>
            </div>
            <button
              onClick={onTogglePush}
              className={`px-3.5 py-1.5 rounded-xl border font-bold text-xs shadow-2xs transition-colors cursor-pointer ${
                pushEnabled
                  ? 'bg-red-600 border-red-700 text-white'
                  : 'bg-white dark:bg-stone-700 border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300'
              }`}
            >
              {pushEnabled ? 'Enabled' : 'Enable'}
            </button>
          </div>

          {/* Sound FX */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/60 flex items-center justify-center text-red-600 dark:text-red-400">
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-stone-900 dark:text-white">
                  Baking & Ready Chimes
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Audio chime when your order is ready for collection
                </p>
              </div>
            </div>
            <button
              onClick={onToggleSound}
              className={`px-3.5 py-1.5 rounded-xl border font-bold text-xs shadow-2xs transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-red-600 border-red-700 text-white'
                  : 'bg-white dark:bg-stone-700 border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300'
              }`}
            >
              {soundEnabled ? 'Sound On' : 'Muted'}
            </button>
          </div>

          {/* Quality & Fresh Baking Promise */}
          <div className="p-3.5 rounded-2xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-xs text-stone-700 dark:text-stone-300 space-y-1.5">
            <span className="font-black text-red-950 dark:text-red-200 flex items-center gap-1.5 text-xs">
              <ChefHat className="w-4 h-4 text-red-600" />
              Authentic Stone-Baked Craftsmanship
            </span>
            <p className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
              Every pizza is hand-stretched using slow-fermented dough, topped with 100% mozzarella and our signature tomato sauce, and baked hot on the stone deck for the perfect blistered crust.
            </p>
          </div>

          {/* Dietary & Allergens Notice */}
          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 space-y-2 text-xs">
            <span className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Dietary & Allergen Guidance
            </span>
            <ul className="text-[11px] text-stone-600 dark:text-stone-400 space-y-1 list-disc list-inside">
              <li>
                <strong className="text-stone-800 dark:text-stone-200">Vegetarian & Halal:</strong> Clearly marked across our pizzas, calzones, burgers, and dips.
              </li>
              <li>
                <strong className="text-stone-800 dark:text-stone-200">Customizations:</strong> Select your base sauce (Tomato, BBQ, Chilli, Garlic) and toppings in the item customiser.
              </li>
              <li>
                <strong className="text-stone-800 dark:text-stone-200">Allergy Warning:</strong> Food prepared in a kitchen handling dairy, wheat, gluten, eggs, mustard, and sesame. Please contact us before ordering if you have severe allergies.
              </li>
            </ul>
          </div>

          {/* App Info Footer */}
          <div className="pt-2 text-center text-[11px] text-stone-400 dark:text-stone-500 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-red-500" />
            <span>Pizza Pino Online Ordering • Fast Stone-Baked Pickup</span>
          </div>
        </div>
      </div>
    </div>
  );
};
