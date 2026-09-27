import { CartItem, SelectedModifier } from '../types';

export interface KitchenPrepDetail {
  originalName: string;
  expandedKitchenName: string;
  prepItems: string[];
  kdsModifiers: SelectedModifier[];
  kitchenSummaryNote: string;
  kdsStationBreakdown: {
    station: 'OVEN / BAKE' | 'FRYER' | 'HOT PREP' | 'SALAD / COLD' | 'FOH / PACKING' | 'SAUCE / DIPS';
    task: string;
  }[];
}

/**
 * Inspects an item and generates full kitchen & FOH preparation details
 * for Meal Deals, Box Meals, Set Meals, and Combos so KDS and FOH screens
 * display exactly what needs to be cooked, baked, and prepped.
 */
export function getMealDealKitchenBreakdown(item: any): KitchenPrepDetail | null {
  const name = String(item.name || '').trim();
  const lowerName = name.toLowerCase();
  const category = String(item.category || '').toLowerCase();
  const menuItemId = String(item.menuItemId || item.id || '').toLowerCase();

  const isMealDealCategory = category.includes('deal') || category.includes('combo') || category.includes('box');
  const isBoxMeal = lowerName.includes('box meal') || menuItemId.includes('box-meal');
  const isSetMeal1 = lowerName.includes('set meal 1') || menuItemId.includes('set-meal-1');
  const isSetMeal2 = lowerName.includes('set meal 2') || menuItemId.includes('set-meal-2');
  const isSetMeal3 = lowerName.includes('set meal 3') || menuItemId.includes('set-meal-3');
  const isSetMeal4 = lowerName.includes('set meal 4') || menuItemId.includes('set-meal-4');
  const isChickenCombo = lowerName.includes('chicken combo') || menuItemId.includes('chicken-combo');
  const isMumsNightOff = lowerName.includes("mum's night off") || lowerName.includes('mums night off') || menuItemId.includes('mums-night-off');
  const isFamilyFeast = lowerName.includes('family feast') || menuItemId.includes('family-feast');

  if (!isMealDealCategory && !isBoxMeal && !isSetMeal1 && !isSetMeal2 && !isSetMeal3 && !isSetMeal4 && !isChickenCombo && !isMumsNightOff && !isFamilyFeast) {
    return null;
  }

  const variationName = item.variation?.name || '';
  const size = variationName.includes('12') ? '12"' : '10"';

  // Extract customer's selected dip
  const modifiers: SelectedModifier[] = Array.isArray(item.selectedModifiers) ? item.selectedModifiers : [];
  const dipMod = modifiers.find(
    (m) =>
      /dip/i.test(m.groupName || '') ||
      /dip/i.test(m.optionName || '') ||
      /sauce/i.test(m.optionName || '') ||
      /mayo|chilli|garlic|bbq|ketchup/i.test(m.optionName || '')
  );
  const chosenDip = dipMod ? dipMod.optionName : '4oz Garlic Mayo Dip';

  // Extract selected pizzas if Mum's Night Off or Family Feast
  const pizza1Mod = modifiers.find((m) => /pizza 1/i.test(m.groupName || '') || m.groupId === 'pizza-choice-1');
  const pizza2Mod = modifiers.find((m) => /pizza 2/i.test(m.groupName || '') || m.groupId === 'pizza-choice-2');
  const pizza1Name = pizza1Mod ? pizza1Mod.optionName : '12" Margherita Pizza';
  const pizza2Name = pizza2Mod ? pizza2Mod.optionName : '12" Pepperoni Feast Pizza';

  // Extract drink option if Family Feast
  const drinkMod = modifiers.find((m) => /drink/i.test(m.groupName || '') || m.groupId === 'feast-drink-swap');
  const chosenDrink = drinkMod ? drinkMod.optionName : '1.5L Bottle Pepsi Max';

  // 1. BOX MEAL (Signature)
  if (isBoxMeal) {
    const stationBreakdown: KitchenPrepDetail['kdsStationBreakdown'] = [
      { station: 'OVEN / BAKE', task: `${size} Stone-Baked Garlic Bread with Cheese` },
      { station: 'FRYER', task: 'Portion of Hot Crispy Chips' },
      { station: 'HOT PREP', task: 'Freshly Sliced Donner Kebab Meat' },
      { station: 'SALAD / COLD', task: 'Salad Garnish: Crisp Lettuce, Tomatoes, Cucumber & Sliced Onions' },
      { station: 'SALAD / COLD', task: 'Tub of Creamy Homemade Coleslaw' },
      { station: 'SAUCE / DIPS', task: `4oz Pot of ${chosenDip}` },
    ];

    const prepItems = [
      `${size} Garlic Bread with Cheese (Oven)`,
      'Hot Crispy Chips (Fryer)',
      'Donner Kebab Meat (Hot Station)',
      'Salad: Lettuce, Tomato, Cucumber, Onion',
      'Coleslaw Tub',
      `4oz ${chosenDip}`,
    ];

    const kdsModifiers: SelectedModifier[] = stationBreakdown.map((item, idx) => ({
      groupId: `kds-prep-box-${idx + 1}`,
      groupName: `COOK & PREP: ${item.station}`,
      optionId: `kds-task-${idx + 1}`,
      optionName: item.task,
      priceDelta: 0,
    }));

    return {
      originalName: name,
      expandedKitchenName: `Box Meal (${size} Garlic Bread Cheese • Chips • Kebab Meat • Salad • Coleslaw • ${chosenDip})`,
      prepItems,
      kdsModifiers,
      kitchenSummaryNote: `PREP BOX MEAL: ${size} Garlic Bread w/ Cheese, Chips, Kebab Meat, Salad (Lettuce/Tom/Cuc/Onion), Coleslaw, 4oz ${chosenDip}`,
      kdsStationBreakdown: stationBreakdown,
    };
  }

  // 2. SET MEAL 1
  if (isSetMeal1) {
    const stationBreakdown: KitchenPrepDetail['kdsStationBreakdown'] = [
      { station: 'FRYER', task: '3 x Southern Fried Chicken Breast Fillet Strips' },
      { station: 'FRYER', task: '1 x Portion Hot Crispy Chips' },
    ];
    return {
      originalName: name,
      expandedKitchenName: 'Set Meal 1 (3x Southern Fried Chicken Fillet Strips & Hot Crispy Chips)',
      prepItems: [
        '3 x Southern Fried Chicken Strips (Fryer)',
        'Hot Crispy Chips (Fryer)',
      ],
      kdsModifiers: stationBreakdown.map((item, idx) => ({
        groupId: `kds-prep-sm1-${idx + 1}`,
        groupName: `COOK & PREP: ${item.station}`,
        optionId: `kds-sm1-task-${idx + 1}`,
        optionName: item.task,
        priceDelta: 0,
      })),
      kitchenSummaryNote: 'PREP SET MEAL 1: 3x Southern Fried Chicken Strips + Hot Chips',
      kdsStationBreakdown: stationBreakdown,
    };
  }

  // 3. SET MEAL 2
  if (isSetMeal2) {
    const stationBreakdown: KitchenPrepDetail['kdsStationBreakdown'] = [
      { station: 'FRYER', task: '8 x Golden Chicken Nuggets' },
      { station: 'FRYER', task: '1 x Portion Hot Crispy Chips' },
    ];
    return {
      originalName: name,
      expandedKitchenName: 'Set Meal 2 (8x Golden Chicken Nuggets & Hot Crispy Chips)',
      prepItems: [
        '8 x Golden Chicken Nuggets (Fryer)',
        'Hot Crispy Chips (Fryer)',
      ],
      kdsModifiers: stationBreakdown.map((item, idx) => ({
        groupId: `kds-prep-sm2-${idx + 1}`,
        groupName: `COOK & PREP: ${item.station}`,
        optionId: `kds-sm2-task-${idx + 1}`,
        optionName: item.task,
        priceDelta: 0,
      })),
      kitchenSummaryNote: 'PREP SET MEAL 2: 8x Golden Chicken Nuggets + Hot Chips',
      kdsStationBreakdown: stationBreakdown,
    };
  }

  // 4. SET MEAL 3
  if (isSetMeal3) {
    const stationBreakdown: KitchenPrepDetail['kdsStationBreakdown'] = [
      { station: 'HOT PREP', task: 'Succulent Donner Kebab Meat Portion' },
      { station: 'FRYER', task: 'Bed of Hot Crispy Chips' },
    ];
    return {
      originalName: name,
      expandedKitchenName: 'Set Meal 3 (Donner Kebab Meat served over Hot Crispy Chips)',
      prepItems: [
        'Donner Kebab Meat (Hot Station)',
        'Bed of Hot Crispy Chips (Fryer)',
      ],
      kdsModifiers: stationBreakdown.map((item, idx) => ({
        groupId: `kds-prep-sm3-${idx + 1}`,
        groupName: `COOK & PREP: ${item.station}`,
        optionId: `kds-sm3-task-${idx + 1}`,
        optionName: item.task,
        priceDelta: 0,
      })),
      kitchenSummaryNote: 'PREP SET MEAL 3: Donner Kebab Meat over Bed of Hot Chips',
      kdsStationBreakdown: stationBreakdown,
    };
  }

  // 5. SET MEAL 4
  if (isSetMeal4) {
    const stationBreakdown: KitchenPrepDetail['kdsStationBreakdown'] = [
      { station: 'FRYER', task: 'Crispy Southern Fried Popcorn Chicken Portion' },
      { station: 'FRYER', task: '1 x Portion Hot Crispy Chips' },
    ];
    return {
      originalName: name,
      expandedKitchenName: 'Set Meal 4 (Popcorn Chicken & Hot Crispy Chips)',
      prepItems: [
        'Popcorn Chicken (Fryer)',
        'Hot Crispy Chips (Fryer)',
      ],
      kdsModifiers: stationBreakdown.map((item, idx) => ({
        groupId: `kds-prep-sm4-${idx + 1}`,
        groupName: `COOK & PREP: ${item.station}`,
        optionId: `kds-sm4-task-${idx + 1}`,
        optionName: item.task,
        priceDelta: 0,
      })),
      kitchenSummaryNote: 'PREP SET MEAL 4: Popcorn Chicken + Hot Chips',
      kdsStationBreakdown: stationBreakdown,
    };
  }

  // 6. CHICKEN COMBO
  if (isChickenCombo) {
    const stationBreakdown: KitchenPrepDetail['kdsStationBreakdown'] = [
      { station: 'FRYER', task: '2 x Southern Fried Chicken Strips' },
      { station: 'FRYER', task: '4 x Golden Chicken Nuggets' },
      { station: 'FRYER', task: 'Portion of Southern Fried Popcorn Chicken' },
      { station: 'FRYER', task: '1 x Portion Hot Crispy Chips' },
    ];
    return {
      originalName: name,
      expandedKitchenName: 'Chicken Combo (2x Strips, 4x Nuggets, Popcorn Chicken & Hot Chips)',
      prepItems: [
        '2 x Chicken Fillet Strips (Fryer)',
        '4 x Chicken Nuggets (Fryer)',
        'Popcorn Chicken Portion (Fryer)',
        'Hot Crispy Chips (Fryer)',
      ],
      kdsModifiers: stationBreakdown.map((item, idx) => ({
        groupId: `kds-prep-combo-${idx + 1}`,
        groupName: `COOK & PREP: ${item.station}`,
        optionId: `kds-combo-task-${idx + 1}`,
        optionName: item.task,
        priceDelta: 0,
      })),
      kitchenSummaryNote: 'PREP CHICKEN COMBO: 2x Strips, 4x Nuggets, Popcorn Chicken & Chips',
      kdsStationBreakdown: stationBreakdown,
    };
  }

  // 7. MUM'S NIGHT OFF
  if (isMumsNightOff) {
    const stationBreakdown: KitchenPrepDetail['kdsStationBreakdown'] = [
      { station: 'OVEN / BAKE', task: `1 x 12" ${pizza1Name}` },
      { station: 'OVEN / BAKE', task: `1 x 12" ${pizza2Name}` },
      { station: 'FRYER', task: '1 x Large Hot Crispy Chips' },
    ];
    return {
      originalName: name,
      expandedKitchenName: `Mum's Night Off (12" ${pizza1Name} • 12" ${pizza2Name} • Large Chips)`,
      prepItems: [
        `12" ${pizza1Name} (Oven Bake)`,
        `12" ${pizza2Name} (Oven Bake)`,
        'Large Hot Crispy Chips (Fryer)',
      ],
      kdsModifiers: stationBreakdown.map((item, idx) => ({
        groupId: `kds-prep-mno-${idx + 1}`,
        groupName: `COOK & PREP: ${item.station}`,
        optionId: `kds-mno-task-${idx + 1}`,
        optionName: item.task,
        priceDelta: 0,
      })),
      kitchenSummaryNote: `PREP MUM'S NIGHT OFF: 12" ${pizza1Name}, 12" ${pizza2Name}, Large Chips`,
      kdsStationBreakdown: stationBreakdown,
    };
  }

  // 8. FAMILY FEAST
  if (isFamilyFeast) {
    const stationBreakdown: KitchenPrepDetail['kdsStationBreakdown'] = [
      { station: 'OVEN / BAKE', task: `1 x 12" ${pizza1Name}` },
      { station: 'OVEN / BAKE', task: `1 x 12" ${pizza2Name}` },
      { station: 'OVEN / BAKE', task: '1 x 12" Stone-Baked Garlic Bread with Cheese' },
      { station: 'FRYER', task: '1 x Large Hot Crispy Chips' },
      { station: 'FOH / PACKING', task: `1 x ${chosenDrink}` },
    ];
    return {
      originalName: name,
      expandedKitchenName: `Family Feast (2x 12" Pizzas, 12" Garlic Bread Cheese, Large Chips & ${chosenDrink})`,
      prepItems: [
        `12" ${pizza1Name} (Oven Bake)`,
        `12" ${pizza2Name} (Oven Bake)`,
        '12" Garlic Bread with Cheese (Oven Bake)',
        'Hot Crispy Chips (Fryer)',
        `${chosenDrink} (FOH Pack)`,
      ],
      kdsModifiers: stationBreakdown.map((item, idx) => ({
        groupId: `kds-prep-feast-${idx + 1}`,
        groupName: `COOK & PREP: ${item.station}`,
        optionId: `kds-feast-task-${idx + 1}`,
        optionName: item.task,
        priceDelta: 0,
      })),
      kitchenSummaryNote: `PREP FAMILY FEAST: 12" ${pizza1Name}, 12" ${pizza2Name}, 12" Garlic Bread Cheese, Chips, ${chosenDrink}`,
      kdsStationBreakdown: stationBreakdown,
    };
  }

  // 9. Generic Meal Deal fallback: parse description if available
  const description = String(item.description || '');
  if (description) {
    const parts = description
      .split(/,|\band\b|&/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);

    if (parts.length > 1) {
      const stationBreakdown: KitchenPrepDetail['kdsStationBreakdown'] = parts.map((part) => ({
        station: /pizza|garlic bread|bake|crust/i.test(part)
          ? 'OVEN / BAKE'
          : /chips|nuggets|strips|chicken|fried/i.test(part)
          ? 'FRYER'
          : /salad|slaw|coleslaw|lettuce|cucumber/i.test(part)
          ? 'SALAD / COLD'
          : /kebab|meat|burger|donner/i.test(part)
          ? 'HOT PREP'
          : /pepsi|drink|coke|bottle|can/i.test(part)
          ? 'FOH / PACKING'
          : 'COOK & PREP' as any,
        task: part,
      }));

      return {
        originalName: name,
        expandedKitchenName: `${name} (${parts.join(' • ')})`,
        prepItems: parts,
        kdsModifiers: stationBreakdown.map((p, idx) => ({
          groupId: `kds-prep-generic-${idx + 1}`,
          groupName: `COOK & PREP: ${p.station}`,
          optionId: `kds-generic-${idx + 1}`,
          optionName: p.task,
          priceDelta: 0,
        })),
        kitchenSummaryNote: `PREP ${name.toUpperCase()}: ${parts.join(', ')}`,
        kdsStationBreakdown: stationBreakdown,
      };
    }
  }

  return null;
}

/**
 * Enriches cart item list before sending to POS backend so KDS and FOH screens
 * receive explicit preparation items for Meal Deals and Box Meals.
 */
export function enrichItemsForKitchenDispatch(items: any[]): any[] {
  if (!Array.isArray(items)) return [];

  return items.map((rawItem) => {
    const breakdown = getMealDealKitchenBreakdown(rawItem);
    if (!breakdown) {
      return rawItem;
    }

    const existingModifiers: SelectedModifier[] = Array.isArray(rawItem.selectedModifiers)
      ? rawItem.selectedModifiers
      : [];

    // Filter out existing KDS prep modifiers if already added
    const cleanExisting = existingModifiers.filter(
      (m) => !m.groupId?.startsWith('kds-prep-') && !m.groupName?.startsWith('COOK & PREP')
    );

    // Merge breakdown modifiers
    const mergedModifiers = [...cleanExisting, ...breakdown.kdsModifiers];

    // Combine notes
    const baseNotes = String(rawItem.notes || '').trim();
    const combinedNotes = baseNotes
      ? `${baseNotes}\n[${breakdown.kitchenSummaryNote}]`
      : breakdown.kitchenSummaryNote;

    return {
      ...rawItem,
      name: breakdown.expandedKitchenName,
      kitchenOriginalName: breakdown.originalName,
      selectedModifiers: mergedModifiers,
      notes: combinedNotes,
      kitchenInstructions: breakdown.kitchenSummaryNote,
      kitchenPrepItems: breakdown.prepItems,
      kdsStationBreakdown: breakdown.kdsStationBreakdown,
    };
  });
}
