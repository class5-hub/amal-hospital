import { 
  InventoryItem, 
  StockMovement, 
  PurchaseOrder, 
  PurchaseOrderItem,
  SupplierAutomationCalculation, 
  SupplierAutomationSummary,
  SystemUser
} from '../types/hmis.ts';

/**
 * HMIS Local Reference Date: 2026-11-11
 */
export const HMIS_TODAY = new Date('2026-11-11T08:00:00Z');

/**
 * Default parameters for Surgery & Maternity supplies
 */
export const DEFAULT_AUTOMATION_CONFIG = {
  defaultLeadTimeDays: 5, // Typical vendor delivery turnaround
  defaultSafetyDays: 6,   // Safety buffer to cover emergency demand spikes
  reorderCycleDays: 14,   // Standard batch replenishment cycle
  observationWindowDays: 14 // Days of historical usage to calculate rate
};

/**
 * Identifies if an item is an essential surgery supply
 */
export function isSurgeryEssential(item: InventoryItem): boolean {
  if (item.clinicalTag === 'surgery' || item.clinicalTag === 'both') return true;
  if (item.isEssentialSurgery) return true;
  const text = `${item.name} ${item.nameAr} ${item.description} ${item.sku}`.toLowerCase();
  return (
    text.includes('surgical') ||
    text.includes('glove') ||
    text.includes('laparotomy') ||
    text.includes('suture') ||
    text.includes('gauze') ||
    text.includes('drape') ||
    text.includes('cannula') ||
    text.includes('scalpel') ||
    text.includes('ot ') ||
    text.includes('or ') ||
    text.includes('جراح') ||
    text.includes('عمليات')
  );
}

/**
 * Identifies if an item is an essential maternity / obstetric supply
 */
export function isMaternityEssential(item: InventoryItem): boolean {
  if (item.clinicalTag === 'maternity' || item.clinicalTag === 'both') return true;
  if (item.isEssentialMaternity) return true;
  const text = `${item.name} ${item.nameAr} ${item.description} ${item.sku}`.toLowerCase();
  return (
    text.includes('maternity') ||
    text.includes('obstetric') ||
    text.includes('cesarean') ||
    text.includes('c-section') ||
    text.includes('oxytocin') ||
    text.includes('syntocinon') ||
    text.includes('umbilical') ||
    text.includes('cord clamp') ||
    text.includes('tranexamic') ||
    text.includes('cyklokapron') ||
    text.includes('delivery') ||
    text.includes('fetal') ||
    text.includes('ولادة') ||
    text.includes('توليد') ||
    text.includes('حبل سري') ||
    text.includes('قيصرية')
  );
}

/**
 * Computes average daily usage (ADU) from recent stock movements
 * If movements are insufficient, uses an authoritative clinical baseline
 */
export function computeDailyUsageRate(
  item: InventoryItem,
  movements: StockMovement[] = [],
  windowDays: number = DEFAULT_AUTOMATION_CONFIG.observationWindowDays,
  referenceDate: Date = HMIS_TODAY
): number {
  if (item.dailyUsageRate && item.dailyUsageRate > 0) {
    return item.dailyUsageRate;
  }

  // Filter dispensing and damage movements for this item within observation window
  const windowStart = new Date(referenceDate.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const relevantMovements = movements.filter(m => {
    if (m.itemId !== item.id) return false;
    if (m.type !== 'PATIENT_DISPENSE' && m.type !== 'DAMAGE') return false;
    const movDate = new Date(m.timestamp);
    return !isNaN(movDate.getTime()) && movDate >= windowStart && movDate <= referenceDate;
  });

  const totalConsumed = relevantMovements.reduce((sum, m) => sum + (m.quantity || 0), 0);

  if (totalConsumed > 0) {
    const rate = totalConsumed / windowDays;
    return Number(Math.max(0.5, rate).toFixed(2));
  }

  // Clinical baseline defaults based on item unit and nature
  if (item.category === 'supplies') {
    if (item.unit === 'Box') return 2.8; // e.g. gloves, cannulas
    if (item.unit === 'Pack') return 2.0; // e.g. cord clamps, drapes
    return 3.0;
  }
  if (item.category === 'medicine') {
    if (item.unit === 'Ampoule' || item.unit === 'Vial') return 4.5;
    if (item.unit === 'IV Bag') return 8.0;
    return 3.5;
  }

  return 1.0;
}

/**
 * Evaluates an inventory item against safety stock levels and reorder points
 */
export function calculateItemReorderPoint(
  item: InventoryItem,
  movements: StockMovement[] = [],
  options?: {
    customLeadTime?: number;
    customSafetyDays?: number;
    referenceDate?: Date;
  }
): SupplierAutomationCalculation {
  const refDate = options?.referenceDate || HMIS_TODAY;
  const leadTimeDays = options?.customLeadTime || item.leadTimeDays || DEFAULT_AUTOMATION_CONFIG.defaultLeadTimeDays;
  const safetyStockDays = options?.customSafetyDays || item.safetyStockDays || DEFAULT_AUTOMATION_CONFIG.defaultSafetyDays;
  
  const dailyUsageRate = computeDailyUsageRate(item, movements, DEFAULT_AUTOMATION_CONFIG.observationWindowDays, refDate);
  
  // Defined safety stock buffer floor
  const safetyStockLevel = Math.max(
    Math.ceil(item.minThreshold * 0.6),
    Math.ceil(dailyUsageRate * safetyStockDays)
  );

  // Calculated Reorder Point (ROP) = (Usage * LeadTime) + SafetyStock
  const reorderPoint = Math.ceil((dailyUsageRate * leadTimeDays) + safetyStockLevel);

  const currentStock = Math.max(0, item.stockLevel || 0);
  const daysUntilStockout = Number((currentStock / Math.max(0.1, dailyUsageRate)).toFixed(1));

  let status: 'critical_safety_breach' | 'below_reorder_point' | 'adequately_stocked';
  if (currentStock <= safetyStockLevel) {
    status = 'critical_safety_breach';
  } else if (currentStock <= reorderPoint) {
    status = 'below_reorder_point';
  } else {
    status = 'adequately_stocked';
  }

  // Recommended order quantity (covers lead time + safety stock + replenishment cycle)
  const targetBuffer = Math.ceil(dailyUsageRate * (leadTimeDays + safetyStockDays + DEFAULT_AUTOMATION_CONFIG.reorderCycleDays));
  const recommendedOrderQty = Math.max(
    item.minThreshold,
    Math.max(0, targetBuffer - currentStock)
  );

  const unitCost = item.unitCost || 15;
  const estimatedCost = Number((recommendedOrderQty * unitCost).toFixed(2));

  // Determine clinical tag
  let clinicalTag: 'surgery' | 'maternity' | 'both' | 'general' = 'general';
  const isSurg = isSurgeryEssential(item);
  const isMat = isMaternityEssential(item);
  if (isSurg && isMat) clinicalTag = 'both';
  else if (isSurg) clinicalTag = 'surgery';
  else if (isMat) clinicalTag = 'maternity';

  return {
    item,
    currentStock,
    dailyUsageRate,
    leadTimeDays,
    safetyStockDays,
    safetyStockLevel,
    reorderPoint,
    daysUntilStockout,
    status,
    recommendedOrderQty,
    estimatedCost,
    vendorId: item.vendorId || 'vend-3',
    vendorName: item.vendorName || 'Tripoli Surgical Supplies & Consumables',
    clinicalTag
  };
}

/**
 * Runs full Supplier Automation calculation across surgery & maternity items
 */
export function evaluateSupplierAutomation(
  items: InventoryItem[],
  movements: StockMovement[] = [],
  filterScope: 'all' | 'surgery' | 'maternity' | 'both' = 'all'
): SupplierAutomationSummary {
  // Focus on supplies and essential medicines
  const eligibleItems = items.filter(i => {
    if (i.category === 'equipment') return false; // Focus on consumable supplies and medicines
    if (filterScope === 'surgery') return isSurgeryEssential(i);
    if (filterScope === 'maternity') return isMaternityEssential(i);
    if (filterScope === 'both') return isSurgeryEssential(i) || isMaternityEssential(i);
    return isSurgeryEssential(i) || isMaternityEssential(i) || i.category === 'supplies';
  });

  const calculations = eligibleItems.map(item => calculateItemReorderPoint(item, movements));

  let criticalSafetyBreaches = 0;
  let belowReorderPoint = 0;
  let adequatelyStocked = 0;
  let totalEstimatedCost = 0;
  let surgeryItemsCount = 0;
  let maternityItemsCount = 0;

  for (const calc of calculations) {
    if (calc.status === 'critical_safety_breach') {
      criticalSafetyBreaches++;
      totalEstimatedCost += calc.estimatedCost;
    } else if (calc.status === 'below_reorder_point') {
      belowReorderPoint++;
      totalEstimatedCost += calc.estimatedCost;
    } else {
      adequatelyStocked++;
    }

    if (calc.clinicalTag === 'surgery' || calc.clinicalTag === 'both') surgeryItemsCount++;
    if (calc.clinicalTag === 'maternity' || calc.clinicalTag === 'both') maternityItemsCount++;
  }

  // Sort: Critical safety breaches first, then below ROP, then lowest days of stock remaining
  calculations.sort((a, b) => {
    const priority = { critical_safety_breach: 0, below_reorder_point: 1, adequately_stocked: 2 };
    if (priority[a.status] !== priority[b.status]) {
      return priority[a.status] - priority[b.status];
    }
    return a.daysUntilStockout - b.daysUntilStockout;
  });

  return {
    totalEvaluated: calculations.length,
    criticalSafetyBreaches,
    belowReorderPoint,
    adequatelyStocked,
    totalEstimatedCost: Number(totalEstimatedCost.toFixed(2)),
    surgeryItemsCount,
    maternityItemsCount,
    calculations
  };
}

/**
 * Groups items triggering reorder by vendor and creates draft electronic purchase orders for approval
 */
export function buildDraftElectronicPurchaseOrders(
  calculationsToOrder: SupplierAutomationCalculation[],
  currentUser: SystemUser,
  existingPOCount: number = 0
): Omit<PurchaseOrder, 'id'>[] {
  const vendorGroups = new Map<string, SupplierAutomationCalculation[]>();

  for (const calc of calculationsToOrder) {
    const vId = calc.vendorId || 'vend-3';
    if (!vendorGroups.has(vId)) {
      vendorGroups.set(vId, []);
    }
    vendorGroups.get(vId)!.push(calc);
  }

  const generatedPOs: Omit<PurchaseOrder, 'id'>[] = [];
  let seq = existingPOCount + 1;
  const now = new Date().toISOString();

  for (const [vendorId, groupCalcs] of vendorGroups.entries()) {
    const vendorName = groupCalcs[0].vendorName || 'Medical Supplier';
    const items: PurchaseOrderItem[] = groupCalcs.map(c => ({
      itemId: c.item.id,
      itemName: c.item.name,
      quantity: c.recommendedOrderQty,
      unitCost: c.item.unitCost,
      totalCost: c.estimatedCost
    }));

    const totalAmount = items.reduce((sum, it) => sum + it.totalCost, 0);
    const criticalCount = groupCalcs.filter(c => c.status === 'critical_safety_breach').length;

    const poNumber = `PO-AUTO-${new Date().getFullYear()}-${String(seq++).padStart(3, '0')}`;
    const triggerReason = `أمر شراء إلكتروني آلي (Supplier Automation): تم حسابه بناءً على معدلات الاستهلاك اليومية ونقاط إعادة الطلب (ROP). يحتوي على ${groupCalcs.length} صنفاً لمستلزمات الجراحة والولادة (${criticalCount} أصناف تحت حد الأمان الحرج).`;

    generatedPOs.push({
      poNumber,
      vendorId,
      vendorName,
      items,
      totalAmount,
      status: 'pending_approval',
      orderedBy: `${currentUser.name} (${currentUser.role})`,
      orderDate: now,
      notes: triggerReason,
      isAutomatedDraft: true,
      automationTriggerReason: triggerReason
    });
  }

  return generatedPOs;
}
