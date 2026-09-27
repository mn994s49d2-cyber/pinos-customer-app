import React from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { MenuItem } from '../types';

interface MenuCardProps {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
}

export const MenuCard: React.FC<MenuCardProps> = ({ item, onSelect }) => {
  const hasMultipleVariations = item.variations.length > 1;

  return (
    <div
      id={`menu-card-${item.sku}`}
      onClick={() => onSelect(item)}
      className="group relative flex flex-col justify-between rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-red-500 dark:hover:border-red-500 transition-all duration-200 hover:shadow-md cursor-pointer overflow-hidden select-none"
    >
      {/* Card Header & Image */}
      <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {item.badge === 'Signature' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-red-600 text-white shadow-xs">
              <span>★</span> Signature
            </span>
          )}
          {item.badge === 'Veg' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-600 text-white shadow-xs">
              <span>🌱</span> Veg
            </span>
          )}
          {item.badge === 'Spicy' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-orange-600 text-white shadow-xs">
              <span>🌶️</span> Spicy
            </span>
          )}
        </div>

        {/* Price Pill */}
        <div className="absolute top-2.5 right-2.5">
          <span className="px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-xs text-white font-mono font-black text-xs border border-white/10 shadow-xs">
            {item.priceRange}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
            {item.name}
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Footer info & CTA */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <span className="text-[11px] font-bold text-stone-400">
            {item.variations.length > 1
              ? `${item.variations.length} sizes available`
              : 'Standard size'}
          </span>

          <button
            type="button"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 group-hover:bg-red-700 text-white font-black text-xs shadow-2xs transition-all active:scale-95"
          >
            <span>{hasMultipleVariations || (item.modifierGroups && item.modifierGroups.length > 0) ? 'Options' : 'Add'}</span>
            {hasMultipleVariations || (item.modifierGroups && item.modifierGroups.length > 0) ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
