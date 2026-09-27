import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Gift,
  Check,
  Percent,
  Flame,
  Leaf,
  Star,
  ShoppingBag,
} from 'lucide-react';
import { LoyaltyReward, MenuItem, Variation } from '../types';
import { MENU_ITEMS } from '../data/menu';

interface RewardRedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
  reward: LoyaltyReward | null;
  userPoints: number;
  onClaimRewardItem?: (
    reward: LoyaltyReward,
    item: MenuItem,
    variation: Variation
  ) => void;
  onConfirmClaimItem?: (
    reward: LoyaltyReward,
    item: MenuItem,
    variation: Variation
  ) => void;
  onClaimRewardDiscount?: (reward: LoyaltyReward) => void;
  onConfirmClaimDiscount?: (reward: LoyaltyReward) => void;
}

export const RewardRedeemModal: React.FC<RewardRedeemModalProps> = ({
  isOpen,
  onClose,
  reward,
  userPoints,
  onClaimRewardItem,
  onConfirmClaimItem,
  onClaimRewardDiscount,
  onConfirmClaimDiscount,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedVariationName, setSelectedVariationName] = useState<string>('');

  // Find applicable items based on the reward
  const getApplicableItems = (): MenuItem[] => {
    if (!reward) return [];

    if (reward.applicableCategory) {
      const matched = MENU_ITEMS.filter(
        (item) => item.category === reward.applicableCategory
      );
      if (matched.length > 0) return matched;
    }

    // Fallbacks by ID or Title
    const lowerTitle = reward.title.toLowerCase();
    if (lowerTitle.includes('dip') || lowerTitle.includes('sauce')) {
      return MENU_ITEMS.filter((item) => item.category === 'Sides' && item.name.toLowerCase().includes('sauce'));
    }
    if (lowerTitle.includes('chips') || lowerTitle.includes('side')) {
      return MENU_ITEMS.filter((item) => item.category === 'Sides');
    }
    if (lowerTitle.includes('garlic bread')) {
      return MENU_ITEMS.filter((item) => item.category === 'Garlic Bread');
    }
    if (lowerTitle.includes('pizza')) {
      return MENU_ITEMS.filter((item) => item.category === 'Pizzas');
    }

    return [];
  };

  const candidateItems = getApplicableItems();
  const isItemReward =
    reward?.discountType === 'free_item' ||
    Boolean(reward?.applicableCategory) ||
    candidateItems.length > 0;

  // Auto-select first item when opening
  useEffect(() => {
    if (isOpen && reward) {
      if (candidateItems.length > 0) {
        setSelectedItemId(candidateItems[0].id);
        const firstItem = candidateItems[0];
        if (reward.title.toLowerCase().includes('12"')) {
          const var12 = firstItem.variations.find((v) => v.name.includes('12'));
          setSelectedVariationName(var12 ? var12.name : firstItem.variations[0].name);
        } else if (reward.title.toLowerCase().includes('10"')) {
          const var10 = firstItem.variations.find((v) => v.name.includes('10'));
          setSelectedVariationName(var10 ? var10.name : firstItem.variations[0].name);
        } else {
          setSelectedVariationName(firstItem.variations[0].name);
        }
      }
    }
  }, [isOpen, reward]);

  if (!isOpen || !reward) return null;

  const canAfford = userPoints >= reward.pointsCost;
  const selectedItem = candidateItems.find((i) => i.id === selectedItemId) || candidateItems[0];
  const selectedVariation =
    selectedItem?.variations.find((v) => v.name === selectedVariationName) ||
    selectedItem?.variations[0];

  const handleClaim = () => {
    if (!canAfford) return;

    if (isItemReward && selectedItem && selectedVariation) {
      if (onClaimRewardItem) {
        onClaimRewardItem(reward, selectedItem, selectedVariation);
      } else if (onConfirmClaimItem) {
        onConfirmClaimItem(reward, selectedItem, selectedVariation);
      }
    } else {
      if (onClaimRewardDiscount) {
        onClaimRewardDiscount(reward);
      } else if (onConfirmClaimDiscount) {
        onConfirmClaimDiscount(reward);
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-red-600 to-red-700 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/30 transition-colors text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-white/20 text-white">
              <Gift className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-red-200">
              Pino Club Reward
            </span>
          </div>
          <h2 className="text-xl font-black">{reward.title}</h2>
          <p className="text-xs text-red-100 mt-1">{reward.description}</p>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Points summary */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Cost</span>
              <span className="font-mono font-black text-red-600 dark:text-red-400 text-sm">
                {reward.pointsCost} Pino Points
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Your Balance</span>
              <span className="font-mono font-black text-stone-900 dark:text-white text-sm">
                {userPoints} pts
              </span>
            </div>
          </div>

          {/* Item Selector if item reward */}
          {isItemReward && candidateItems.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-stone-400 block">
                Choose Item to Claim Free:
              </label>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {candidateItems.map((item) => {
                  const isSelected = selectedItemId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedItemId(item.id);
                        if (reward.title.toLowerCase().includes('12"')) {
                          const var12 = item.variations.find((v) => v.name.includes('12'));
                          setSelectedVariationName(var12 ? var12.name : item.variations[0].name);
                        } else if (reward.title.toLowerCase().includes('10"')) {
                          const var10 = item.variations.find((v) => v.name.includes('10'));
                          setSelectedVariationName(var10 ? var10.name : item.variations[0].name);
                        } else {
                          setSelectedVariationName(item.variations[0].name);
                        }
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-red-600 bg-red-50 dark:bg-red-950/40 text-stone-900 dark:text-white ring-1 ring-red-600/30'
                          : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-8 h-8 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold truncate">{item.name}</p>
                          <p className="text-[10px] text-stone-400 truncate">{item.description}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-red-600 shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>

              {/* Variations selector if chosen item has multiple sizes */}
              {selectedItem && selectedItem.variations.length > 1 && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                    Select Size:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedItem.variations.map((v) => {
                      const isVarSelected = selectedVariationName === v.name;
                      return (
                        <button
                          key={v.name}
                          type="button"
                          onClick={() => setSelectedVariationName(v.name)}
                          className={`p-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                            isVarSelected
                              ? 'border-red-600 bg-red-600 text-white shadow-xs'
                              : 'border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {v.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canAfford}
            onClick={handleClaim}
            className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
              canAfford
                ? 'bg-red-600 hover:bg-red-700 text-white active:scale-95'
                : 'bg-stone-300 dark:bg-stone-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            <span>{canAfford ? 'Confirm & Add Free Item' : 'Insufficient Points'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
