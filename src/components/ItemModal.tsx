import React, { useState } from 'react';
import { X, Plus, Minus, Check } from 'lucide-react';
import { MenuItem, Variation, SelectedModifier, CartItem } from '../types';
import { PIZZA_EXTRA_TOPPINGS } from '../data/menu';

interface ItemModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onAddToCart: (cartItem: CartItem) => void;
}

interface ItemModalContentProps {
  item: MenuItem;
  onClose: () => void;
  onAddToCart: (cartItem: CartItem) => void;
}

const ItemModalContent: React.FC<ItemModalContentProps> = ({ item, onClose, onAddToCart }) => {
  // Selected variation (default to first or 12" if 2 sizes)
  const [selectedVariation, setSelectedVariation] = useState<Variation>(
    item.variations.length > 1 ? item.variations[0] : item.variations[0]
  );

  // Selected modifiers for groups
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, SelectedModifier>>(() => {
    const initial: Record<string, SelectedModifier> = {};
    if (item.modifierGroups) {
      item.modifierGroups.forEach((group) => {
        if (group.required && group.options.length > 0) {
          const firstOpt = group.options[0];
          initial[group.id] = {
            groupId: group.id,
            groupName: group.name,
            optionId: firstOpt.id,
            optionName: firstOpt.name,
            priceDelta: firstOpt.priceDelta,
          };
        }
      });
    }
    return initial;
  });

  // Removals and additions
  const [specialRemovals, setSpecialRemovals] = useState<string[]>([]);
  const [specialAdditions, setSpecialAdditions] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Determine removable options based on item category & properties
  const removableOptions = item.removableIngredients && item.removableIngredients.length > 0
    ? item.removableIngredients
    : item.category === 'Pizzas'
    ? ['Onions', 'Mushrooms', 'Peppers', 'Sweetcorn', 'Pineapple', 'Jalapenos', 'Cheese']
    : item.category === 'Burgers'
    ? ['Lettuce', 'Onions', 'Burger Sauce', 'Cheese', 'Mayo']
    : item.category === 'Wraps'
    ? ['Lettuce', 'Onions', 'Tomatoes', 'Cucumber', 'Sauce']
    : [];

  // Extra toppings for pizzas (+£1.20 for 10", +£1.60 for 12")
  const toppingPrice = selectedVariation.name.includes('12') ? 1.60 : 1.20;

  // Calculate unit price
  let unitPrice = selectedVariation.price;
  (Object.values(selectedModifiers) as SelectedModifier[]).forEach((m) => {
    unitPrice += m.priceDelta;
  });
  // Extra pizza toppings
  unitPrice += specialAdditions.length * toppingPrice;

  const totalPrice = unitPrice * quantity;

  const handleToggleRemoval = (opt: string) => {
    setSpecialRemovals((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  };

  const handleToggleAddition = (addName: string) => {
    setSpecialAdditions((prev) =>
      prev.includes(addName) ? prev.filter((a) => a !== addName) : [...prev, addName]
    );
  };

  const handleSelectModifier = (
    groupId: string,
    groupName: string,
    optionId: string,
    optionName: string,
    priceDelta: number
  ) => {
    setSelectedModifiers((prev) => ({
      ...prev,
      [groupId]: { groupId, groupName, optionId, optionName, priceDelta },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cartItem: CartItem = {
      cartItemId: `cart-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      menuItemId: item.id,
      sku: selectedVariation.sku || item.sku,
      name: item.name,
      category: item.category,
      variation: selectedVariation,
      quantity,
      unitPrice,
      totalPrice,
      selectedModifiers: Object.values(selectedModifiers),
      specialRemovals,
      specialAdditions,
      notes: notes.trim(),
      image: item.image,
    };

    onAddToCart(cartItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="item-customizer-dialog"
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Item Image Header */}
        <div className="relative h-48 sm:h-56 w-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title & Category on Image */}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-red-600 text-white inline-block mb-1 shadow-xs">
              {item.category} {item.subcategory ? `• ${item.subcategory}` : ''}
            </span>
            <h2 className="text-xl sm:text-2xl font-black">{item.name}</h2>
            <p className="text-xs text-stone-200 line-clamp-2 mt-0.5">{item.description}</p>
          </div>
        </div>

        {/* Customization Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Portion / Size Variations */}
          {item.variations.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-stone-900 dark:text-stone-200">
                Select Size / Variant <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {item.variations.map((v) => {
                  const isSelected = selectedVariation.name === v.name;
                  return (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => setSelectedVariation(v)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-red-600 bg-red-50 dark:bg-red-950/60 text-red-950 dark:text-white shadow-xs ring-1 ring-red-600/30'
                          : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs">{v.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />}
                      </div>
                      <span className="font-mono font-bold text-xs text-red-600 dark:text-red-400 block mt-1">
                        £{v.price.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dynamic Modifier Groups (e.g. Pizza Bases, Crusts, Dips, Burger Options) */}
          {item.modifierGroups &&
            item.modifierGroups.map((group) => (
              <div key={group.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-stone-900 dark:text-stone-200">
                    {group.name}{' '}
                    {group.required && <span className="text-red-500">* (Required)</span>}
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {group.options.map((opt) => {
                    const isSelected = selectedModifiers[group.id]?.optionId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          handleSelectModifier(group.id, group.name, opt.id, opt.name, opt.priceDelta)
                        }
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-red-600 bg-red-50 dark:bg-red-950/60 font-black text-red-950 dark:text-white ring-1 ring-red-600/40 shadow-2xs'
                            : 'border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 hover:border-stone-300 dark:hover:border-stone-600'
                        }`}
                      >
                        <span className="truncate pr-1 font-semibold">{opt.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {opt.priceDelta > 0 && (
                            <span className="font-mono text-[10px] text-red-600 dark:text-red-400 font-bold">
                              +£{opt.priceDelta.toFixed(2)}
                            </span>
                          )}
                          {isSelected && <Check className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

          {/* Extra Toppings for Pizzas */}
          {item.category === 'Pizzas' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-stone-900 dark:text-stone-200">
                  Extra Toppings (+£{toppingPrice.toFixed(2)} each)
                </label>
                <span className="text-[10px] text-stone-500 dark:text-stone-400 font-bold">Multiple allowed</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {PIZZA_EXTRA_TOPPINGS.map((topping) => {
                  const isAdded = specialAdditions.includes(topping);
                  return (
                    <button
                      key={topping}
                      type="button"
                      onClick={() => handleToggleAddition(topping)}
                      className={`p-2 rounded-xl border text-left text-xs transition-colors cursor-pointer flex items-center justify-between ${
                        isAdded
                          ? 'border-red-600 bg-red-50 dark:bg-red-950/60 font-bold text-red-950 dark:text-white ring-1 ring-red-600/30'
                          : 'border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 hover:border-stone-300 dark:hover:border-stone-600'
                      }`}
                    >
                      <span className="truncate font-medium">{topping}</span>
                      {isAdded && <Check className="w-3 h-3 text-red-600 dark:text-red-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Removals / Hold Ingredients */}
          {removableOptions.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-stone-900 dark:text-stone-200">
                Hold Ingredients (Kitchen Instructions)
              </label>
              <div className="flex flex-wrap gap-2">
                {removableOptions.map((opt) => {
                  const isHeld = specialRemovals.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleToggleRemoval(opt)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                        isHeld
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/30'
                          : 'border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:border-stone-300 dark:hover:border-stone-600'
                      }`}
                    >
                      <span>No {opt}</span>
                      {isHeld && <X className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Kitchen Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-stone-900 dark:text-stone-200">
              Special Instructions / Dietary Note
            </label>
            <input
              type="text"
              placeholder="e.g. well done crust, extra crispy, or allergy note"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-hidden focus:border-red-500"
            />
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-4">
            {/* Quantity Stepper */}
            <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800 p-1 rounded-2xl border border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-xl bg-white dark:bg-stone-700 flex items-center justify-center text-stone-900 dark:text-white hover:bg-stone-200 cursor-pointer shadow-2xs font-bold"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center font-mono font-black text-sm text-stone-900 dark:text-white">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-xl bg-white dark:bg-stone-700 flex items-center justify-center text-stone-900 dark:text-white hover:bg-stone-200 cursor-pointer shadow-2xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Submit Button */}
            <button
              id="add-to-bag-submit-btn"
              type="submit"
              className="flex-1 py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-sm flex items-center justify-between shadow-md transition-all cursor-pointer"
            >
              <span>Add to Bag</span>
              <span className="font-mono">£{totalPrice.toFixed(2)}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ItemModal: React.FC<ItemModalProps> = ({ item, onClose, onAddToCart }) => {
  if (!item) return null;
  return <ItemModalContent key={item.id} item={item} onClose={onClose} onAddToCart={onAddToCart} />;
};
