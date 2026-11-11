import { InventoryItem, InventoryBatch, BatchExpiryStatus } from '../types/hmis.ts';

// Current reference date (defaults to current date, simulated as Nov 11, 2026 if earlier)
export const CURRENT_HMIS_DATE = new Date('2026-11-11T00:00:00Z');

/**
 * Calculates days remaining until expiration date
 * Negative number means already expired
 */
export function getDaysUntilExpiry(expiryDate: string, referenceDate: Date = CURRENT_HMIS_DATE): number {
  if (!expiryDate) return 9999;
  const exp = new Date(expiryDate);
  if (isNaN(exp.getTime())) return 9999;
  const diffMs = exp.getTime() - referenceDate.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determines expiry status based on days remaining:
 * - <= 0 days: 'expired'
 * - 1 to 30 days: 'critical' (< 1 month)
 * - 31 to 90 days: 'expiring_soon' (< 3 months)
 * - > 90 days: 'valid'
 */
export function getBatchExpiryStatus(expiryDate: string, referenceDate: Date = CURRENT_HMIS_DATE): BatchExpiryStatus {
  const days = getDaysUntilExpiry(expiryDate, referenceDate);
  if (days <= 0) return 'expired';
  if (days <= 30) return 'critical';
  if (days <= 90) return 'expiring_soon';
  return 'valid';
}

/**
 * Visual metadata for display badges
 */
export function getBatchStatusMeta(status: BatchExpiryStatus, isAr: boolean) {
  switch (status) {
    case 'expired':
      return {
        label: isAr ? 'منتهي الصلاحية' : 'Expired',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
        dotColor: 'bg-rose-600',
        textColor: 'text-rose-700',
        urgency: 'high'
      };
    case 'critical':
      return {
        label: isAr ? 'حرج (< 30 يوم)' : 'Critical (< 30d)',
        badgeClass: 'bg-red-50 text-red-700 border-red-300 animate-pulse',
        dotColor: 'bg-red-500',
        textColor: 'text-red-700',
        urgency: 'critical'
      };
    case 'expiring_soon':
      return {
        label: isAr ? 'يقترب من الانتهاء (30-90 يوم)' : 'Expiring Soon (30-90d)',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        dotColor: 'bg-amber-500',
        textColor: 'text-amber-700',
        urgency: 'medium'
      };
    case 'valid':
    default:
      return {
        label: isAr ? 'ساري الصلاحية' : 'Valid',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        dotColor: 'bg-emerald-500',
        textColor: 'text-emerald-700',
        urgency: 'low'
      };
  }
}

/**
 * Calculates percentage of shelf life consumed (0% to 100%)
 */
export function calculateShelfLifeProgress(
  manufacturingDate?: string,
  expiryDate?: string,
  referenceDate: Date = CURRENT_HMIS_DATE
): number {
  if (!expiryDate) return 50;
  const exp = new Date(expiryDate).getTime();
  const ref = referenceDate.getTime();
  
  if (ref >= exp) return 100; // 100% expired

  // If manufacturing date exists, calculate true proportion
  if (manufacturingDate) {
    const mfg = new Date(manufacturingDate).getTime();
    if (!isNaN(mfg) && exp > mfg) {
      const totalSpan = exp - mfg;
      const elapsed = ref - mfg;
      return Math.min(100, Math.max(0, Math.round((elapsed / totalSpan) * 100)));
    }
  }

  // Fallback assuming a typical 2-year shelf life
  const daysLeft = getDaysUntilExpiry(expiryDate, referenceDate);
  const assumedTotalDays = 730; // 2 years
  const elapsedDays = Math.max(0, assumedTotalDays - daysLeft);
  return Math.min(100, Math.max(0, Math.round((elapsedDays / assumedTotalDays) * 100)));
}

/**
 * Sorts batches according to FEFO (First Expired, First Out)
 * Earliest expiring non-quarantined batches come first
 */
export function sortBatchesFEFO(batches: InventoryBatch[] = []): InventoryBatch[] {
  return [...batches].sort((a, b) => {
    // Quarantined always to the back
    if (a.quarantined && !b.quarantined) return 1;
    if (!a.quarantined && b.quarantined) return -1;

    const timeA = new Date(a.expiryDate).getTime() || 9999999999999;
    const timeB = new Date(b.expiryDate).getTime() || 9999999999999;
    return timeA - timeB;
  });
}

export interface FlattenedBatchRecord {
  batch: InventoryBatch;
  item: InventoryItem;
  daysRemaining: number;
  status: BatchExpiryStatus;
  progressPercent: number;
}

/**
 * Extracts and normalizes all batches across items with computed metrics
 */
export function getFlattenedBatchesWithItems(
  items: InventoryItem[] = [],
  referenceDate: Date = CURRENT_HMIS_DATE
): FlattenedBatchRecord[] {
  const records: FlattenedBatchRecord[] = [];

  for (const item of items) {
    // If item has explicit batches array
    if (item.batches && item.batches.length > 0) {
      for (const b of item.batches) {
        const days = getDaysUntilExpiry(b.expiryDate, referenceDate);
        const status = b.quarantined ? 'expired' : getBatchExpiryStatus(b.expiryDate, referenceDate);
        const progress = calculateShelfLifeProgress(b.manufacturingDate, b.expiryDate, referenceDate);
        records.push({
          batch: { ...b, shelfLifeDays: days, status },
          item,
          daysRemaining: days,
          status,
          progressPercent: progress
        });
      }
    } else if (item.batchNumber || item.expiryDate) {
      // Synthesize a primary batch from the item's direct fields
      const expiry = item.expiryDate || '2027-12-31';
      const days = getDaysUntilExpiry(expiry, referenceDate);
      const status = getBatchExpiryStatus(expiry, referenceDate);
      const progress = calculateShelfLifeProgress(undefined, expiry, referenceDate);
      records.push({
        batch: {
          id: `batch-${item.id}-primary`,
          batchNumber: item.batchNumber || `LOT-${item.sku}-01`,
          quantity: item.stockLevel,
          expiryDate: expiry,
          shelfLifeDays: days,
          status,
          storageConditions: item.location.includes('Refrigerator') ? 'Cold Chain (2-8°C)' : 'Room Temp (15-25°C)'
        },
        item,
        daysRemaining: days,
        status,
        progressPercent: progress
      });
    }
  }

  // Sort FEFO (First Expired First Out)
  return records.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Summary KPI statistics for expiry monitoring dashboard
 */
export function getInventoryExpirySummary(
  items: InventoryItem[] = [],
  referenceDate: Date = CURRENT_HMIS_DATE
) {
  const flattened = getFlattenedBatchesWithItems(items, referenceDate);

  let expiredCount = 0;
  let criticalCount = 0;
  let expiringSoonCount = 0;
  let validCount = 0;
  let quarantinedCount = 0;

  for (const r of flattened) {
    if (r.batch.quarantined) {
      quarantinedCount++;
    }
    if (r.status === 'expired') expiredCount++;
    else if (r.status === 'critical') criticalCount++;
    else if (r.status === 'expiring_soon') expiringSoonCount++;
    else validCount++;
  }

  return {
    totalBatches: flattened.length,
    expiredCount,
    criticalCount,
    expiringSoonCount,
    validCount,
    quarantinedCount,
    flaggedTotal: expiredCount + criticalCount + expiringSoonCount,
    flattened
  };
}
