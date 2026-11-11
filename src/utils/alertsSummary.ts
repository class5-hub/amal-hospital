import { SmartAlert, InventoryItem, MedicationOrder, Admission } from '../types/hmis.ts';

export interface AlertsCategorizedSummary {
  totalCount: number;
  unacknowledgedCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  criticalAlerts: SmartAlert[];
  warningAlerts: SmartAlert[];
  infoAlerts: SmartAlert[];
  categoryCounts: {
    vital: number;
    lab: number;
    interaction: number;
    stock: number;
    beds: number;
    other: number;
  };
}

/**
 * Categorizes and summarizes smart alerts by urgency level (Critical, Warning, Info)
 */
export function categorizeAlerts(alerts: SmartAlert[] = []): AlertsCategorizedSummary {
  const criticalAlerts: SmartAlert[] = [];
  const warningAlerts: SmartAlert[] = [];
  const infoAlerts: SmartAlert[] = [];

  let unacknowledgedCount = 0;
  const categoryCounts = {
    vital: 0,
    lab: 0,
    interaction: 0,
    stock: 0,
    beds: 0,
    other: 0
  };

  for (const alert of alerts) {
    if (!alert.isAcknowledged) {
      unacknowledgedCount++;
    }

    // Urgency categorization
    if (alert.severity === 'critical') {
      criticalAlerts.push(alert);
    } else if (alert.severity === 'warning') {
      warningAlerts.push(alert);
    } else {
      infoAlerts.push(alert);
    }

    // Category breakdown
    if (alert.category === 'clinical_meows') categoryCounts.vital++;
    else if (alert.category === 'lab_lis') categoryCounts.lab++;
    else if (alert.category === 'medication_allergy') categoryCounts.interaction++;
    else if (alert.category === 'inventory_stock') categoryCounts.stock++;
    else if (alert.category === 'emar_delay' || alert.category === 'consent_surgery') categoryCounts.beds++;
    else categoryCounts.other++;
  }

  return {
    totalCount: alerts.length,
    unacknowledgedCount,
    criticalCount: criticalAlerts.length,
    warningCount: warningAlerts.length,
    infoCount: infoAlerts.length,
    criticalAlerts,
    warningAlerts,
    infoAlerts,
    categoryCounts
  };
}

export interface StockCrossReferenceItem {
  id: string;
  itemId: string;
  itemName: string;
  itemNameAr: string;
  currentStock: number;
  minThreshold: number;
  unit: string;
  activePatientsCount: number;
  prescribedDosesDaily: number;
  coverageDays: number;
  severity: 'critical' | 'warning' | 'info';
  messageAr: string;
  messageEn: string;
}

/**
 * Cross-references active patient medication orders with warehouse inventory levels
 * to notify pharmacy and nursing teams of stock shortages for active inpatients.
 */
export function crossReferenceStockWithMedications(
  inventoryItems: InventoryItem[] = [],
  activeMedications: MedicationOrder[] = [],
  activeAdmissions: Admission[] = []
): StockCrossReferenceItem[] {
  const activeAdmissionIds = new Set(
    activeAdmissions.filter(a => a.status === 'active').map(a => a.admissionId)
  );

  const currentMedOrders = activeMedications.filter(m => 
    activeAdmissionIds.has(m.admissionId) && m.status === 'active'
  );

  const pharmacyMedicines = inventoryItems.filter(i => i.category === 'medicine');
  const results: StockCrossReferenceItem[] = [];

  for (const item of pharmacyMedicines) {
    const matchingOrders = currentMedOrders.filter(m => 
      m.tradeName.toLowerCase().includes(item.name.toLowerCase()) ||
      item.name.toLowerCase().includes(m.tradeName.toLowerCase()) ||
      (m.genericName && item.name.toLowerCase().includes(m.genericName.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(m.tradeName.toLowerCase()))
    );

    const activePatientsCount = new Set(matchingOrders.map(m => m.admissionId)).size;
    if (activePatientsCount === 0 && item.stockLevel > item.minThreshold) {
      continue;
    }

    let dailyDoses = 0;
    for (const ord of matchingOrders) {
      if (ord.frequency === 'QID' || ord.frequency === 'Q6H') dailyDoses += 4;
      else if (ord.frequency === 'TID' || ord.frequency === 'Q8H') dailyDoses += 3;
      else if (ord.frequency === 'BD' || ord.frequency === 'Q12H') dailyDoses += 2;
      else if (ord.frequency === 'OD' || ord.frequency === 'Daily') dailyDoses += 1;
      else dailyDoses += 2;
    }

    const coverageDays = dailyDoses > 0 ? Math.round((item.stockLevel / dailyDoses) * 10) / 10 : 999;
    
    // Trigger shortage alert if below threshold or coverage < 3 days for active patients
    if (item.stockLevel <= item.minThreshold || (activePatientsCount > 0 && coverageDays < 3)) {
      const isCritical = item.stockLevel <= 0 || coverageDays <= 1 || item.stockLevel <= (item.minThreshold / 2);
      results.push({
        id: `alert-stock-crossref-${item.id}`,
        itemId: item.id,
        itemName: item.name,
        itemNameAr: item.nameAr,
        currentStock: item.stockLevel,
        minThreshold: item.minThreshold,
        unit: item.unit,
        activePatientsCount,
        prescribedDosesDaily: dailyDoses,
        coverageDays,
        severity: isCritical ? 'critical' : 'warning',
        messageAr: `نقص مخزون حرج: ${item.nameAr} - الرصيد الحالي (${item.stockLevel} ${item.unit}) يغطي فقط ${coverageDays} أيام لـ (${activePatientsCount}) مرضى منومين!`,
        messageEn: `Critical Stock Shortage: ${item.name} (${item.stockLevel} ${item.unit} left). Covers only ${coverageDays} days for ${activePatientsCount} active inpatients!`
      });
    }
  }

  return results;
}
