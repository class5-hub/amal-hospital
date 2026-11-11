import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  AlertTriangle, 
  Plus, 
  Search, 
  Filter, 
  ShoppingCart, 
  Truck, 
  ArrowUpDown, 
  CheckCircle2, 
  Clock, 
  X, 
  Edit3, 
  Trash2, 
  Layers, 
  Check, 
  ChevronRight,
  TrendingUp,
  FileCheck,
  History,
  ShieldAlert,
  Building,
  Sparkles,
  Calendar,
  ShieldCheck,
  AlertOctagon,
  Tag,
  QrCode,
  Flame,
  Archive,
  Zap,
  Cpu,
  Calculator,
  Sliders,
  Send,
  FileText,
  CheckSquare,
  Square,
  Printer
} from 'lucide-react';
import { 
  InventoryItem, 
  InventoryCategory, 
  InventoryBatch,
  BatchExpiryStatus,
  Vendor, 
  PurchaseOrder, 
  PurchaseOrderItem, 
  StockMovement, 
  SystemUser, 
  Language,
  PurchaseOrderStatus,
  SupplierAutomationCalculation,
  SupplierAutomationSummary
} from '../types/hmis.ts';
import { api } from '../api/client.ts';
import {
  getDaysUntilExpiry,
  getBatchExpiryStatus,
  getBatchStatusMeta,
  calculateShelfLifeProgress,
  sortBatchesFEFO,
  getInventoryExpirySummary,
  getFlattenedBatchesWithItems,
  FlattenedBatchRecord,
  CURRENT_HMIS_DATE
} from '../utils/expiryMonitor.ts';
import {
  evaluateSupplierAutomation,
  calculateItemReorderPoint,
  buildDraftElectronicPurchaseOrders,
  DEFAULT_AUTOMATION_CONFIG
} from '../utils/supplierAutomation.ts';

interface InventoryProps {
  currentUser: SystemUser;
  language: Language;
}

export function InventoryManagementModule({ currentUser, language }: InventoryProps) {
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'catalog' | 'low_stock' | 'batches' | 'automation' | 'vendors' | 'purchase_orders' | 'movements'>('catalog');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Supplier Automation States
  const [automationScope, setAutomationScope] = useState<'all' | 'surgery' | 'maternity' | 'both'>('all');
  const [automationStatusFilter, setAutomationStatusFilter] = useState<'all' | 'critical' | 'reorder' | 'adequate'>('all');
  const [automationSearch, setAutomationSearch] = useState('');
  const [selectedAutomationItemIds, setSelectedAutomationItemIds] = useState<string[]>([]);
  const [isGeneratingPOs, setIsGeneratingPOs] = useState(false);
  const [selectedPOForReview, setSelectedPOForReview] = useState<PurchaseOrder | null>(null);
  const [showElectronicPOModal, setShowElectronicPOModal] = useState(false);

  // Batch & Expiry Tracking States
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<'all' | 'expired' | 'critical' | 'expiring_soon' | 'valid' | 'quarantined'>('all');
  const [batchSearchQuery, setBatchSearchQuery] = useState('');
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [selectedItemForAddBatch, setSelectedItemForAddBatch] = useState<InventoryItem | null>(null);
  const [showItemBatchesModal, setShowItemBatchesModal] = useState(false);
  const [selectedItemForBatches, setSelectedItemForBatches] = useState<InventoryItem | null>(null);
  const [showQuarantineModal, setShowQuarantineModal] = useState(false);
  const [quarantineBatchData, setQuarantineBatchData] = useState<{ item: InventoryItem; batch: InventoryBatch } | null>(null);
  const [quarantineReasonText, setQuarantineReasonText] = useState('');

  // Form state - Add Batch
  const [newBatchForm, setNewBatchForm] = useState({
    batchNumber: '',
    quantity: 50,
    initialQuantity: 50,
    manufacturingDate: '',
    expiryDate: '',
    vendorLotNumber: '',
    storageConditions: 'Room Temp (15-25°C)',
    notes: ''
  });

  // Modals
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states - Add Item
  const [newItem, setNewItem] = useState<Omit<InventoryItem, 'id' | 'status'>>({
    sku: '',
    name: '',
    nameAr: '',
    category: 'supplies',
    description: '',
    location: '',
    stockLevel: 0,
    minThreshold: 10,
    unit: 'Box',
    unitCost: 0,
    unitPrice: 0,
    vendorId: '',
    vendorName: '',
    batchNumber: '',
    expiryDate: ''
  });

  // Form states - Create PO
  const [newPOVendorId, setNewPOVendorId] = useState('');
  const [newPONotes, setNewPONotes] = useState('');
  const [poLineItems, setPoLineItems] = useState<{ itemId: string; quantity: number; unitCost: number }[]>([]);

  // Permissions check
  const canManageInventory = currentUser.permissions.includes('MANAGE_INVENTORY') || currentUser.role === 'admin';
  const canCreatePO = currentUser.permissions.includes('CREATE_PO') || currentUser.role === 'admin';
  const canApprovePO = currentUser.permissions.includes('APPROVE_PO') || currentUser.role === 'admin';

  // Compute Expiry Summary & Shelf-Life Stats
  const expirySummary = useMemo(() => {
    return getInventoryExpirySummary(items);
  }, [items]);

  // Compute Supplier Automation Summary across surgery & maternity supplies
  const automationSummary = useMemo(() => {
    return evaluateSupplierAutomation(items, movements, automationScope);
  }, [items, movements, automationScope]);

  // Filtered calculations based on user filters
  const filteredAutomationCalcs = useMemo(() => {
    return automationSummary.calculations.filter(calc => {
      // Status filter
      if (automationStatusFilter === 'critical' && calc.status !== 'critical_safety_breach') return false;
      if (automationStatusFilter === 'reorder' && calc.status !== 'below_reorder_point') return false;
      if (automationStatusFilter === 'adequate' && calc.status !== 'adequately_stocked') return false;

      // Search filter
      if (automationSearch.trim()) {
        const q = automationSearch.toLowerCase();
        const matchName = calc.item.name.toLowerCase().includes(q) || calc.item.nameAr.includes(q);
        const matchSku = calc.item.sku.toLowerCase().includes(q);
        const matchVendor = calc.vendorName.toLowerCase().includes(q);
        return matchName || matchSku || matchVendor;
      }
      return true;
    });
  }, [automationSummary.calculations, automationStatusFilter, automationSearch]);

  // Handle Generate Electronic POs via Supplier Automation
  const handleRunSupplierAutomation = async (itemIdsToOrder?: string[]) => {
    try {
      setIsGeneratingPOs(true);
      setActionMessage({
        type: 'success',
        text: isAr 
          ? 'جاري تشغيل خوارزمية التوريد الآلي وحساب نقاط إعادة الطلب لمستلزمات الجراحة والولادة...' 
          : 'Running supplier automation engine & calculating reorder points...'
      });

      const res = await api.generateSupplierAutomationPOs(
        {
          itemIds: itemIdsToOrder && itemIdsToOrder.length > 0 ? itemIdsToOrder : undefined,
          scope: automationScope
        },
        currentUser
      );

      setActionMessage({
        type: 'success',
        text: isAr ? res.message : (res.messageEn || res.message)
      });

      setSelectedAutomationItemIds([]);
      await loadData();
      setActiveTab('purchase_orders');
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Supplier automation failed' });
    } finally {
      setIsGeneratingPOs(false);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [itms, vends, pos, movs] = await Promise.all([
        api.getInventoryItems(),
        api.getVendors(),
        api.getPurchaseOrders(),
        api.getStockMovements()
      ]);
      setItems(itms);
      setVendors(vends);
      setPurchaseOrders(pos);
      setMovements(movs);
    } catch (err: any) {
      console.error('Failed to load inventory data:', err);
      setActionMessage({ type: 'error', text: err.message || 'Failed to load inventory' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const lowStockItems = items.filter(i => i.stockLevel <= i.minThreshold);

  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nameAr.includes(searchQuery) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Handle Create Item
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedVen = vendors.find(v => v.id === newItem.vendorId);
      await api.addInventoryItem({
        ...newItem,
        vendorName: selectedVen?.name || ''
      }, currentUser);

      setActionMessage({ 
        type: 'success', 
        text: isAr ? 'تمت إضافة الصنف إلى المستودع بنجاح' : 'Item successfully added to inventory' 
      });
      setShowAddItemModal(false);
      loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Handle Edit Item
  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await api.updateInventoryItem(editingItem.id, editingItem, currentUser);
      setActionMessage({ 
        type: 'success', 
        text: isAr ? 'تم تحديث بيانات الصنف ومستوى المخزون بنجاح' : 'Item updated successfully' 
      });
      setShowEditItemModal(false);
      setEditingItem(null);
      loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Handle Delete Item
  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(isAr ? `هل أنت متأكد من حذف الصنف "${name}" من المنظومة؟` : `Are you sure you want to delete ${name}?`)) return;
    try {
      await api.deleteInventoryItem(id, currentUser);
      setActionMessage({ 
        type: 'success', 
        text: isAr ? 'تم حذف الصنف من سجلات المخزون' : 'Item removed from inventory' 
      });
      loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Handle Create PO
  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPOVendorId || poLineItems.length === 0) {
      alert(isAr ? 'يرجى اختيار المورد وإضافة بند واحد على الأقل' : 'Please select vendor and add at least one item');
      return;
    }
    const vendor = vendors.find(v => v.id === newPOVendorId);
    if (!vendor) return;

    const itemsForPO: PurchaseOrderItem[] = poLineItems.map(line => {
      const itm = items.find(i => i.id === line.itemId);
      return {
        itemId: line.itemId,
        itemName: itm ? itm.name : 'Unknown Item',
        quantity: line.quantity,
        unitCost: line.unitCost,
        totalCost: line.quantity * line.unitCost
      };
    });

    const totalAmount = itemsForPO.reduce((sum, item) => sum + item.totalCost, 0);

    try {
      await api.createPurchaseOrder({
        vendorId: vendor.id,
        vendorName: vendor.name,
        items: itemsForPO,
        totalAmount,
        orderedBy: isAr ? currentUser.nameAr : currentUser.name,
        notes: newPONotes
      }, currentUser);

      setActionMessage({ 
        type: 'success', 
        text: isAr ? 'تم إنشاء أمر الشراء بنجاح بانتظار الاعتماد' : 'Purchase order created successfully' 
      });
      setShowCreatePOModal(false);
      setPoLineItems([]);
      setNewPOVendorId('');
      setNewPONotes('');
      loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Handle PO Status changes
  const handleUpdatePOStatus = async (poId: string, newStatus: PurchaseOrderStatus) => {
    try {
      await api.updatePurchaseOrderStatus(poId, newStatus, currentUser);
      setActionMessage({ 
        type: 'success', 
        text: newStatus === 'received' 
          ? (isAr ? 'تم استلام وتوريد البضاعة وتحديث أرصدة المخزون آلياً' : 'Goods received! Stock levels updated automatically')
          : (isAr ? `تم تحديث حالة أمر الشراء إلى ${newStatus}` : `PO status updated to ${newStatus}`)
      });
      loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Handle Add Batch to item
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForAddBatch) return;

    try {
      await api.addBatchToItem(
        selectedItemForAddBatch.id,
        {
          batchNumber: newBatchForm.batchNumber,
          quantity: Number(newBatchForm.quantity),
          initialQuantity: Number(newBatchForm.initialQuantity || newBatchForm.quantity),
          manufacturingDate: newBatchForm.manufacturingDate || undefined,
          expiryDate: newBatchForm.expiryDate,
          vendorLotNumber: newBatchForm.vendorLotNumber || undefined,
          storageConditions: newBatchForm.storageConditions || undefined,
          notes: newBatchForm.notes || undefined,
          quarantined: false
        },
        currentUser
      );

      setActionMessage({
        type: 'success',
        text: isAr
          ? `تم إضافة التشغيلة (${newBatchForm.batchNumber}) بنجاح إلى رصيد ${selectedItemForAddBatch.nameAr}`
          : `Batch ${newBatchForm.batchNumber} added successfully to ${selectedItemForAddBatch.name}`
      });

      setShowAddBatchModal(false);
      setSelectedItemForAddBatch(null);
      setNewBatchForm({
        batchNumber: '',
        quantity: 50,
        initialQuantity: 50,
        manufacturingDate: '',
        expiryDate: '',
        vendorLotNumber: '',
        storageConditions: 'Room Temp (15-25°C)',
        notes: ''
      });
      loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to add batch' });
    }
  };

  // Handle Quarantine Batch
  const handleQuarantineBatch = async () => {
    if (!quarantineBatchData) return;

    try {
      await api.quarantineBatch(
        quarantineBatchData.item.id,
        quarantineBatchData.batch.id,
        quarantineReasonText || (isAr ? 'عزل يدوي وقائي' : 'Manual precautionary quarantine'),
        currentUser
      );

      setActionMessage({
        type: 'success',
        text: isAr
          ? `تم عزل وحجز التشغيلة (${quarantineBatchData.batch.batchNumber}) وتنزيل كميتها (${quarantineBatchData.batch.quantity}) من الرصيد المتاح`
          : `Batch ${quarantineBatchData.batch.batchNumber} quarantined and ${quarantineBatchData.batch.quantity} units removed from active stock`
      });

      setShowQuarantineModal(false);
      setQuarantineBatchData(null);
      setQuarantineReasonText('');
      loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to quarantine batch' });
    }
  };

  // Filter batches for Expiry Monitor Tab
  const filteredBatches = useMemo(() => {
    return expirySummary.flattened.filter(record => {
      // Filter by status/quarantine
      if (selectedBatchFilter === 'expired' && record.status !== 'expired') return false;
      if (selectedBatchFilter === 'critical' && record.status !== 'critical') return false;
      if (selectedBatchFilter === 'expiring_soon' && record.status !== 'expiring_soon') return false;
      if (selectedBatchFilter === 'valid' && record.status !== 'valid') return false;
      if (selectedBatchFilter === 'quarantined' && !record.batch.quarantined) return false;

      // Filter by search query
      if (batchSearchQuery.trim()) {
        const query = batchSearchQuery.toLowerCase();
        const matchItem = record.item.name.toLowerCase().includes(query) ||
          record.item.nameAr.includes(query) ||
          record.item.sku.toLowerCase().includes(query);
        const matchBatch = record.batch.batchNumber.toLowerCase().includes(query) ||
          (record.batch.vendorLotNumber && record.batch.vendorLotNumber.toLowerCase().includes(query)) ||
          (record.batch.storageConditions && record.batch.storageConditions.toLowerCase().includes(query));
        return matchItem || matchBatch;
      }

      return true;
    });
  }, [expirySummary.flattened, selectedBatchFilter, batchSearchQuery]);

  return (
    <div className="space-y-6">
      {/* Module Title & Top Stats */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-700 font-semibold text-xs tracking-wider uppercase mb-1">
            <Package className="w-4 h-4" />
            <span>{isAr ? 'إدارة المستودعات والتوريد' : 'Supply Chain & Inventory Management'}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {isAr ? 'مستودع الأدوية والمعدات والمستهلكات الجراحية' : 'Hospital Medical & Equipment Inventory'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAr 
              ? 'متابعة حركة المخزون، وتنبيهات النواقص، وإدارة الموردين وأوامر الشراء والتوريد الآلي' 
              : 'Track stock levels, low-stock threshold alerts, vendor procurement, and automated restock fulfillment'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManageInventory && (
            <button
              onClick={() => setShowAddItemModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'إضافة صنف جديد' : 'New Inventory Item'}</span>
            </button>
          )}

          {canCreatePO && (
            <button
              onClick={() => setShowCreatePOModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs transition-colors"
            >
              <ShoppingCart className="w-4 h-4 text-teal-400" />
              <span>{isAr ? 'إنشاء أمر شراء PO' : 'Create Purchase Order'}</span>
            </button>
          )}

          {canCreatePO && lowStockItems.length > 0 && (
            <button
              onClick={async () => {
                try {
                  setActionMessage({ type: 'success', text: isAr ? 'جاري إنشاء أوامر الشراء والتوريد الآلي...' : 'Generating automated reorder POs...' });
                  const res = await api.autoReorderLowStockItems(currentUser);
                  setActionMessage({
                    type: 'success',
                    text: isAr ? `تم تشغيل التوريد الآلي بنجاح وإنشاء ${res.createdOrders.length} أمر شراء للموردين للأصناف الناقصة!` : res.message
                  });
                  await loadData();
                  setActiveTab('purchase_orders');
                } catch (err: any) {
                  setActionMessage({ type: 'error', text: err.message || 'Auto-reorder failed' });
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-600 to-teal-600 hover:from-amber-700 hover:to-teal-700 text-white rounded-md text-xs font-bold shadow-xs transition-all cursor-pointer"
              title={isAr ? 'إنشاء أوامر شراء وتوريد آلي لجميع الأصناف الناقصة' : 'Generate automated purchase orders for all low stock items'}
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>{isAr ? 'التوريد الآلي للنواقص' : 'Auto-Reorder Low Stock'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div className={`p-4 rounded-lg text-xs flex items-center justify-between ${
          actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 text-rose-600" />}
            <span className="font-medium">{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Low-Stock Critical Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm">
                  {isAr ? `تنبيه نقص المخزون: يوجد ${lowStockItems.length} أصناف وصلت أو تجاوزت الحد الأدنى!` : `Low Stock Alert: ${lowStockItems.length} items reached or breached minimum thresholds!`}
                </h4>
                <button
                  onClick={() => setActiveTab('low_stock')}
                  className="text-xs font-semibold text-amber-800 hover:underline flex items-center gap-1"
                >
                  <span>{isAr ? 'عرض الأصناف الحرجة' : 'View Critical Items'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {lowStockItems.slice(0, 4).map(item => (
                  <span key={item.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-100/80 border border-amber-300 text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>{isAr ? item.nameAr : item.name}:</span>
                    <strong className="font-mono text-amber-950">{item.stockLevel} {item.unit}</strong>
                    <span className="text-amber-700 text-[10px]">({isAr ? 'الحد الأدنى' : 'Min'}: {item.minThreshold})</span>
                  </span>
                ))}
                {lowStockItems.length > 4 && (
                  <span className="text-xs text-amber-700 self-center">
                    +{lowStockItems.length - 4} {isAr ? 'أصناف أخرى' : 'more'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expiry Critical Alert Banner */}
      {(expirySummary.expiredCount > 0 || expirySummary.criticalCount > 0) && (
        <div className="bg-rose-50 border border-rose-300 rounded-lg p-4 text-rose-950">
          <div className="flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <span>
                    {isAr 
                      ? `تنبيه رقابة الصلاحية: يوجد ${expirySummary.expiredCount} تشغيلات منتهية و ${expirySummary.criticalCount} تشغيلات في نطاق الصلاحية الحرج (< 30 يوماً)!` 
                      : `Batch Expiry Warning: ${expirySummary.expiredCount} expired lots and ${expirySummary.criticalCount} critical lots (< 30 days remaining)!`}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-200 text-rose-900 font-mono text-[11px] font-bold uppercase">
                    FEFO Protocol
                  </span>
                </h4>
                <button
                  onClick={() => {
                    setActiveTab('batches');
                    setSelectedBatchFilter(expirySummary.expiredCount > 0 ? 'expired' : 'critical');
                  }}
                  className="text-xs font-semibold text-rose-800 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{isAr ? 'عرض جدول مراقبة الصلاحية' : 'View Expiry Monitor'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-rose-800 mt-1">
                {isAr
                  ? 'يجب عزل التشغيلات المنتهية فوراً لمنع صرفها للمرضى، وإعطاء أولوية الصرف للتشغيلات الأقرب انتهاءً وفق بروتوكول FEFO الصيدلي.'
                  : 'Immediately quarantine expired batches to prevent patient dispensing, and prioritize earliest-expiring lots under hospital FEFO dispensing rules.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Automation Safety Stock Alert Banner */}
      {automationSummary.criticalSafetyBreaches > 0 && (
        <div className="bg-gradient-to-r from-rose-50 to-indigo-50 border border-rose-300 rounded-lg p-4 text-rose-950 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0 mt-0.5">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-rose-200 text-rose-900 font-mono text-[10px] font-bold uppercase">
                      ROP & Safety Stock Trigger
                    </span>
                    <span className="text-xs text-rose-700 font-medium">
                      {isAr ? 'مستلزمات العمليات والتوليد' : 'Surgery & Maternity Supplies'}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 mt-1">
                    {isAr 
                      ? `تنبيه التوريد الآلي: يوجد ${automationSummary.criticalSafetyBreaches} أصناف هبطت تحت حد الأمان الحرج (${automationSummary.belowReorderPoint} تحت نقطة إعادة الطلب ROP)!`
                      : `Supplier Automation: ${automationSummary.criticalSafetyBreaches} essential items fell below safety stock level (${automationSummary.belowReorderPoint} below ROP)!`}
                  </h4>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setActiveTab('automation');
                      setAutomationStatusFilter('critical');
                    }}
                    className="px-3 py-1.5 bg-white border border-rose-300 hover:bg-rose-50 text-rose-800 rounded text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    {isAr ? 'معاينة الحسابات' : 'Inspect ROP'}
                  </button>
                  {canCreatePO && (
                    <button
                      onClick={() => handleRunSupplierAutomation()}
                      disabled={isGeneratingPOs}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>{isAr ? 'توليد أوامر شراء إلكترونية فورية' : 'Generate Draft Electronic POs'}</span>
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-1.5">
                {isAr
                  ? 'تم حساب نقاط إعادة الطلب بناءً على متوسط الاستهلاك اليومي الحقيقي وفترة توريد المورد. تتطلب هذه المستلزمات إصدار أوامر شراء إلكترونية مسودة للاعتماد الإداري لتفادي نفاد الرصيد أثناء العمليات والولادات.'
                  : 'Reorder points and safety stock calculated based on actual daily consumption rates and vendor lead times. Generate draft electronic POs for administrative review.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>{isAr ? 'إجمالي الأصناف' : 'Total Items'}</span>
            <Layers className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{items.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {items.filter(i => i.category === 'medicine').length} {isAr ? 'أدوية' : 'meds'} · {items.filter(i => i.category === 'equipment').length} {isAr ? 'أجهزة' : 'devices'} · {items.filter(i => i.category === 'supplies').length} {isAr ? 'مستلزمات' : 'supplies'}
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${lowStockItems.length > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span className={lowStockItems.length > 0 ? 'text-amber-800 font-semibold' : ''}>
              {isAr ? 'تنبيهات نقص المخزون' : 'Low Stock Alerts'}
            </span>
            <AlertTriangle className={`w-4 h-4 ${lowStockItems.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-bold font-mono ${lowStockItems.length > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
            {lowStockItems.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {isAr ? 'تحتاج إلى إصدار أوامر شراء عاجلة' : 'Require replenishment POs'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>{isAr ? 'أوامر الشراء المفتوحة' : 'Open Purchase Orders'}</span>
            <ShoppingCart className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {purchaseOrders.filter(p => p.status === 'pending_approval' || p.status === 'approved').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {purchaseOrders.filter(p => p.status === 'pending_approval').length} {isAr ? 'بانتظار الاعتماد' : 'pending approval'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>{isAr ? 'الموردين المعتمدين' : 'Active Vendors'}</span>
            <Truck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{vendors.filter(v => v.active).length}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {isAr ? 'شركات أدوية ومستلزمات وأجهزة' : 'Pharma & equipment vendors'}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-medium overflow-x-auto">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'catalog'
              ? 'border-teal-600 text-teal-700 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{isAr ? 'دليل المخزون العام' : 'Inventory Catalog'}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 font-mono text-[10px] text-slate-600">{items.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('low_stock')}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'low_stock'
              ? 'border-amber-600 text-amber-700 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>{isAr ? 'أصناف تحت الحد الأدنى' : 'Low Stock Items'}</span>
          {lowStockItems.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono text-[10px] font-bold">
              {lowStockItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('batches')}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'batches'
              ? 'border-rose-600 text-rose-700 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Calendar className="w-4 h-4 text-rose-500" />
          <span>{isAr ? 'مراقبة الصلاحية والتشغيلات FEFO' : 'Batch & Expiry Monitor'}</span>
          {expirySummary.flaggedTotal > 0 ? (
            <span className={`px-1.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${
              expirySummary.expiredCount > 0 
                ? 'bg-rose-100 text-rose-800 animate-pulse' 
                : 'bg-amber-100 text-amber-800'
            }`}>
              {expirySummary.flaggedTotal}
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 font-mono text-[10px] text-slate-600">
              {expirySummary.totalBatches}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('automation')}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'automation'
              ? 'border-indigo-600 text-indigo-700 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Cpu className="w-4 h-4 text-indigo-600" />
          <span>{isAr ? 'أتمتة التوريد الذكي (Supplier Auto)' : 'Supplier Automation'}</span>
          {automationSummary.criticalSafetyBreaches > 0 ? (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-mono text-[10px] font-bold animate-pulse">
              {automationSummary.criticalSafetyBreaches}
            </span>
          ) : automationSummary.belowReorderPoint > 0 ? (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono text-[10px] font-bold">
              {automationSummary.belowReorderPoint}
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 font-mono text-[10px] text-slate-600">
              {automationSummary.totalEvaluated}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('purchase_orders')}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'purchase_orders'
              ? 'border-teal-600 text-teal-700 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>{isAr ? 'أوامر الشراء والتوريد' : 'Purchase Orders'}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 font-mono text-[10px] text-slate-600">{purchaseOrders.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('vendors')}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'vendors'
              ? 'border-teal-600 text-teal-700 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>{isAr ? 'سجل الموردين' : 'Vendors Directory'}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 font-mono text-[10px] text-slate-600">{vendors.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'movements'
              ? 'border-teal-600 text-teal-700 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <History className="w-4 h-4" />
          <span>{isAr ? 'حركة وسجل المخزون' : 'Stock Movement Ledger'}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 font-mono text-[10px] text-slate-600">{movements.length}</span>
        </button>
      </div>

      {/* TAB 1 & 2: Inventory Catalog & Low Stock */}
      {(activeTab === 'catalog' || activeTab === 'low_stock') && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute top-2.5 left-2.5 rtl:left-auto rtl:right-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={isAr ? 'بحث بالاسم، الكود SKU، أو الموقع...' : 'Search by name, SKU, or location...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 rtl:pl-3 rtl:pr-8 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {activeTab === 'catalog' && (
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md">
                  {['all', 'medicine', 'equipment', 'supplies'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded text-xs capitalize font-medium transition-colors ${
                        selectedCategory === cat ? 'bg-white shadow-xs text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cat === 'all' ? (isAr ? 'الكل' : 'All') :
                       cat === 'medicine' ? (isAr ? 'أدوية' : 'Medicines') :
                       cat === 'equipment' ? (isAr ? 'أجهزة' : 'Equipment') :
                       (isAr ? 'مستلزمات' : 'Supplies')}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="text-slate-500 font-mono text-xs">
              {isAr ? 'المعروض:' : 'Showing:'} <strong className="text-slate-800">
                {(activeTab === 'low_stock' ? lowStockItems : filteredItems).length}
              </strong> {isAr ? 'صنف' : 'items'}
            </div>
          </div>

          {/* Catalog Data Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">SKU / {isAr ? 'الكود' : 'Code'}</th>
                    <th className="py-3 px-4">{isAr ? 'اسم الصنف والمواصفات' : 'Item Description'}</th>
                    <th className="py-3 px-4">{isAr ? 'الفئة' : 'Category'}</th>
                    <th className="py-3 px-4">{isAr ? 'الموقع التخزيني' : 'Storage Location'}</th>
                    <th className="py-3 px-4">{isAr ? 'الرصيد / الحد الأدنى' : 'Stock / Min'}</th>
                    <th className="py-3 px-4">{isAr ? 'سعر التكلفة / البيع' : 'Cost / Price (LYD)'}</th>
                    <th className="py-3 px-4">{isAr ? 'المورد والمجموعة' : 'Vendor & Batch'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(activeTab === 'low_stock' ? lowStockItems : filteredItems).map(item => {
                    const isLow = item.stockLevel <= item.minThreshold;
                    const isOut = item.stockLevel <= 0;

                    return (
                      <tr key={item.id} className={`hover:bg-slate-50/80 transition-colors ${isLow ? 'bg-amber-50/30' : ''}`}>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">
                          {item.sku}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{isAr ? item.nameAr : item.name}</div>
                          <div className="text-[11px] text-slate-500 font-sans">{isAr ? item.name : item.description}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                            item.category === 'medicine' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            item.category === 'equipment' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            'bg-teal-50 text-teal-700 border border-teal-200'
                          }`}>
                            {item.category === 'medicine' ? (isAr ? 'أدوية ومحاليل' : 'Medicine') :
                             item.category === 'equipment' ? (isAr ? 'أجهزة طبية' : 'Equipment') :
                             (isAr ? 'مستلزمات جراحية' : 'Supplies')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px]">
                          {item.location}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-sm font-bold ${
                              isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-900'
                            }`}>
                              {item.stockLevel}
                            </span>
                            <span className="text-slate-400 text-xs">/</span>
                            <span className="font-mono text-slate-500 text-xs">{item.minThreshold}</span>
                            <span className="text-[11px] text-slate-500">{item.unit}</span>

                            {isLow && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                {isOut ? (isAr ? 'نفذ المخزون' : 'Out of stock') : (isAr ? 'نقص حرج' : 'Low stock')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">
                          <div>
                            <span className="text-slate-500 text-[11px]">{isAr ? 'تكلفة:' : 'Cost:'}</span>{' '}
                            <strong className="text-slate-800">{item.unitCost.toFixed(2)}</strong> د.ل
                          </div>
                          <div>
                            <span className="text-slate-500 text-[11px]">{isAr ? 'بيع:' : 'Sell:'}</span>{' '}
                            <strong className="text-emerald-700">{item.unitPrice.toFixed(2)}</strong> د.ل
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[11px]">
                          <div className="text-slate-800 font-medium truncate max-w-[150px]">{item.vendorName || '--'}</div>
                          
                          {/* Active Lot and Expiry Monitor Details */}
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            {item.batches && item.batches.length > 0 ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedItemForBatches(item);
                                    setShowItemBatchesModal(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium text-[10px] cursor-pointer"
                                  title={isAr ? 'عرض جميع تشغيلات الصنف' : 'View all lots'}
                                >
                                  <Layers className="w-2.5 h-2.5" />
                                  <span>{item.batches.length} {isAr ? 'تشغيلات' : 'lots'}</span>
                                </button>

                                {item.batchNumber && (
                                  <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                    Lot: {item.batchNumber}
                                  </span>
                                )}

                                {item.expiryStatus === 'expired' && (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                    {isAr ? 'منتهية الصلاحية' : 'Expired'}
                                  </span>
                                )}

                                {item.expiryStatus === 'critical' && (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px]">
                                    {isAr ? `ينتهي خلال ${item.shelfLifeDaysRemaining} يوم` : `${item.shelfLifeDaysRemaining}d left`}
                                  </span>
                                )}

                                {item.expiryStatus === 'expiring_soon' && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px]">
                                    {isAr ? `ينتهي خلال ${item.shelfLifeDaysRemaining} يوم` : `${item.shelfLifeDaysRemaining}d left`}
                                  </span>
                                )}

                                {item.expiryStatus === 'valid' && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                                    {item.expiryDate}
                                  </span>
                                )}
                              </>
                            ) : (
                              <div className="text-slate-400 font-mono text-[10px]">
                                {item.batchNumber ? `B: ${item.batchNumber}` : ''} 
                                {item.expiryDate ? ` · Exp: ${item.expiryDate}` : ''}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Quick Add Batch Button */}
                            {canManageInventory && item.category === 'medicine' && (
                              <button
                                onClick={() => {
                                  setSelectedItemForAddBatch(item);
                                  setShowAddBatchModal(true);
                                }}
                                title={isAr ? 'إضافة واستلام تشغيلة جديدة لهذا الصنف' : 'Add lot/batch'}
                                className="p-1 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* View Batches List Button */}
                            <button
                              onClick={() => {
                                setSelectedItemForBatches(item);
                                setShowItemBatchesModal(true);
                              }}
                              title={isAr ? 'سجل تشغيلات هذا الصنف' : 'Inspect batches'}
                              className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>

                            {canManageInventory && (
                              <button
                                onClick={() => {
                                  setEditingItem({ ...item });
                                  setShowEditItemModal(true);
                                }}
                                title={isAr ? 'تعديل الصنف والمخزون' : 'Edit item'}
                                className="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {currentUser.role === 'admin' && (
                              <button
                                onClick={() => handleDeleteItem(item.id, item.name)}
                                title={isAr ? 'حذف من المستودع' : 'Delete item'}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Batches & Expiry Monitoring (FEFO) */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          {/* Header & Controls */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-rose-600 font-semibold text-xs tracking-wider uppercase mb-1">
                <Calendar className="w-4 h-4" />
                <span>{isAr ? 'نظام مراقبة الصلاحية والتشغيلات' : 'Batch & Expiry Monitoring System'}</span>
                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">FEFO Protocol</span>
              </div>
              <h3 className="font-bold text-base text-slate-900">
                {isAr ? 'مراقبة تشغيلات الأدوية والأسبقية بالصرف (FEFO)' : 'First-Expired, First-Out (FEFO) Lot Control'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'متابعة العد التنازلي لانتهاء صلاحية دفعات الأدوية، وحجز التشغيلات المنتهية لمنع صرفها سريرياً، وإلزام الصرف وفق أسبقية الصلاحية.'
                  : 'Track lot-level expiry countdowns, enforce automatic quarantine of expired batches, and prioritize earliest-expiring medications for clinical dispensing.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {canManageInventory && (
                <button
                  onClick={() => {
                    setSelectedItemForAddBatch(items.find(i => i.category === 'medicine') || items[0] || null);
                    setShowAddBatchModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? 'استلام وتشغيل دفعة جديدة' : 'Add New Lot/Batch'}</span>
                </button>
              )}
            </div>
          </div>

          {/* 4 Batch KPI Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Lots */}
            <div 
              onClick={() => setSelectedBatchFilter('all')}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedBatchFilter === 'all' ? 'ring-2 ring-teal-500 bg-teal-50/20 border-teal-300' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
                <span>{isAr ? 'إجمالي التشغيلات' : 'Total Batches'}</span>
                <Layers className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {expirySummary.totalBatches}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {isAr ? 'دفعات مسجلة بجميع المستودعات' : 'Registered lots across hospital'}
              </div>
            </div>

            {/* Expired Lots */}
            <div 
              onClick={() => setSelectedBatchFilter('expired')}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedBatchFilter === 'expired' 
                  ? 'ring-2 ring-rose-500 bg-rose-50/80 border-rose-400' 
                  : expirySummary.expiredCount > 0 
                    ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-medium mb-1">
                <span className={expirySummary.expiredCount > 0 ? 'text-rose-800 font-bold' : 'text-slate-500'}>
                  {isAr ? 'تشغيلات منتهية (عزل)' : 'Expired (Quarantine)'}
                </span>
                <AlertOctagon className={`w-4 h-4 ${expirySummary.expiredCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
              </div>
              <div className={`text-2xl font-bold font-mono ${expirySummary.expiredCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                {expirySummary.expiredCount}
              </div>
              <div className={`text-[11px] mt-1 ${expirySummary.expiredCount > 0 ? 'text-rose-700 font-medium' : 'text-slate-400'}`}>
                {isAr ? 'تتطلب عزل فوري وإعدام' : 'Requires immediate quarantine'}
              </div>
            </div>

            {/* Critical < 30 Days */}
            <div 
              onClick={() => setSelectedBatchFilter('critical')}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedBatchFilter === 'critical' 
                  ? 'ring-2 ring-amber-500 bg-amber-50/80 border-amber-400' 
                  : expirySummary.criticalCount > 0 
                    ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-medium mb-1">
                <span className={expirySummary.criticalCount > 0 ? 'text-amber-800 font-bold' : 'text-slate-500'}>
                  {isAr ? 'صلاحية حرجة (< 30 يوم)' : 'Critical (< 30 Days)'}
                </span>
                <Flame className={`w-4 h-4 ${expirySummary.criticalCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
              </div>
              <div className={`text-2xl font-bold font-mono ${expirySummary.criticalCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                {expirySummary.criticalCount}
              </div>
              <div className={`text-[11px] mt-1 ${expirySummary.criticalCount > 0 ? 'text-amber-700 font-medium' : 'text-slate-400'}`}>
                {isAr ? 'أولوية قصوى بالصرف FEFO' : 'High priority for FEFO dispensing'}
              </div>
            </div>

            {/* Expiring Soon 30-90 Days */}
            <div 
              onClick={() => setSelectedBatchFilter('expiring_soon')}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedBatchFilter === 'expiring_soon' 
                  ? 'ring-2 ring-blue-500 bg-blue-50/80 border-blue-400' 
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
                <span>{isAr ? 'تنتهي خلال (30-90 يوم)' : 'Expiring Soon (30-90d)'}</span>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {expirySummary.expiringSoonCount}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {isAr ? 'تحت المتابعة وتدوير الرصيد' : 'Under active shelf-life rotation'}
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[260px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute top-2.5 left-2.5 rtl:left-auto rtl:right-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={isAr ? 'بحث باسم الدواء، الكود SKU، رقم التشغيلة Lot، أو ظروف التخزين...' : 'Search drug name, SKU, lot/batch number, storage condition...'}
                  value={batchSearchQuery}
                  onChange={(e) => setBatchSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 rtl:pl-3 rtl:pr-8 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md overflow-x-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedBatchFilter('all')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    selectedBatchFilter === 'all' ? 'bg-white shadow-xs text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isAr ? 'الكل' : 'All'} ({expirySummary.totalBatches})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBatchFilter('expired')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    selectedBatchFilter === 'expired' ? 'bg-rose-600 text-white font-semibold' : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  {isAr ? 'منتهية' : 'Expired'} ({expirySummary.expiredCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBatchFilter('critical')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    selectedBatchFilter === 'critical' ? 'bg-amber-600 text-white font-semibold' : 'text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  {isAr ? 'حرجة <30ي' : '<30d'} ({expirySummary.criticalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBatchFilter('expiring_soon')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    selectedBatchFilter === 'expiring_soon' ? 'bg-blue-600 text-white font-semibold' : 'text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  {isAr ? '30-90 يوم' : '30-90d'} ({expirySummary.expiringSoonCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBatchFilter('valid')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    selectedBatchFilter === 'valid' ? 'bg-emerald-600 text-white font-semibold' : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {isAr ? 'صالحة' : 'Valid'} ({expirySummary.validCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBatchFilter('quarantined')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    selectedBatchFilter === 'quarantined' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isAr ? 'معزولة' : 'Quarantined'} ({expirySummary.quarantinedCount})
                </button>
              </div>
            </div>

            <div className="text-slate-500 font-mono text-xs">
              {isAr ? 'التشغيلات المعروضة:' : 'Showing lots:'} <strong className="text-slate-800">{filteredBatches.length}</strong>
            </div>
          </div>

          {/* Batches Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">{isAr ? 'الصنف الطبي / الكود' : 'Medication / SKU'}</th>
                    <th className="py-3 px-4">{isAr ? 'رقم التشغيلة واللوط' : 'Batch / Lot #'}</th>
                    <th className="py-3 px-4">{isAr ? 'الكمية المتوفرة' : 'Available Stock'}</th>
                    <th className="py-3 px-4">{isAr ? 'ظروف التخزين' : 'Storage Condition'}</th>
                    <th className="py-3 px-4">{isAr ? 'تاريخ الصلاحية والعد التنازلي' : 'Expiry & Countdown'}</th>
                    <th className="py-3 px-4 w-44">{isAr ? 'مؤشر استهلاك الصلاحية' : 'Shelf-Life Elapsed'}</th>
                    <th className="py-3 px-4">{isAr ? 'الحالة وأولوية FEFO' : 'Status & FEFO'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBatches.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        {isAr ? 'لا توجد تشغيلات مطابقة لمعايير البحث والتصفية' : 'No batches match current filter criteria'}
                      </td>
                    </tr>
                  ) : (
                    filteredBatches.map(record => {
                      const isExpired = record.status === 'expired' || record.daysRemaining <= 0;
                      const isCritical = record.status === 'critical' && !record.batch.quarantined;
                      const isQuarantined = record.batch.quarantined;

                      return (
                        <tr 
                          key={`${record.item.id}-${record.batch.id}`} 
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isQuarantined ? 'bg-slate-50/60 opacity-80' :
                            isExpired ? 'bg-rose-50/40' :
                            isCritical ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          {/* Item & SKU */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{isAr ? record.item.nameAr : record.item.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                              <span>{record.item.sku}</span>
                              <span className="text-slate-300">·</span>
                              <span className="text-slate-400">{record.item.location}</span>
                            </div>
                          </td>

                          {/* Batch & Vendor Lot */}
                          <td className="py-3 px-4 font-mono">
                            <div className="font-bold text-slate-900 flex items-center gap-1">
                              <Tag className="w-3 h-3 text-teal-600" />
                              <span>{record.batch.batchNumber}</span>
                            </div>
                            {record.batch.vendorLotNumber && (
                              <div className="text-[10px] text-slate-400">
                                {isAr ? 'لوط المورد:' : 'Vendor Lot:'} {record.batch.vendorLotNumber}
                              </div>
                            )}
                          </td>

                          {/* Quantity */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <strong className={`font-mono text-sm ${isQuarantined ? 'line-through text-slate-400' : isExpired ? 'text-rose-700' : 'text-slate-900'}`}>
                                {record.batch.quantity}
                              </strong>
                              <span className="text-slate-500 text-[11px]">{record.item.unit}</span>
                            </div>
                            {record.batch.initialQuantity && record.batch.initialQuantity > record.batch.quantity && (
                              <div className="text-[10px] text-slate-400">
                                {isAr ? 'من أصل:' : 'out of'} {record.batch.initialQuantity}
                              </div>
                            )}
                          </td>

                          {/* Storage Condition */}
                          <td className="py-3 px-4 text-[11px]">
                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {record.batch.storageConditions || 'Room Temp (15-25°C)'}
                            </span>
                          </td>

                          {/* Expiry & Countdown */}
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-slate-900 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{record.batch.expiryDate}</span>
                            </div>
                            <div className="mt-0.5 font-medium text-[11px]">
                              {isExpired ? (
                                <span className="text-rose-700 font-bold">
                                  {isAr ? `منتهية منذ ${Math.abs(record.daysRemaining)} يوماً` : `Expired ${Math.abs(record.daysRemaining)} days ago`}
                                </span>
                              ) : isCritical ? (
                                <span className="text-rose-600 font-bold">
                                  {isAr ? `متبقي ${record.daysRemaining} يوماً فقط!` : `Only ${record.daysRemaining} days left!`}
                                </span>
                              ) : record.status === 'expiring_soon' ? (
                                <span className="text-amber-700">
                                  {isAr ? `متبقي ${record.daysRemaining} يوماً` : `${record.daysRemaining} days left`}
                                </span>
                              ) : (
                                <span className="text-emerald-700">
                                  {isAr ? `متبقي ${record.daysRemaining} يوماً` : `${record.daysRemaining} days left`}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Shelf-Life Elapsed Progress */}
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                                <span>{record.progressPercent}% {isAr ? 'مستهلك' : 'elapsed'}</span>
                                {record.batch.manufacturingDate && (
                                  <span className="text-slate-400">{record.batch.manufacturingDate.slice(0, 7)}</span>
                                )}
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                                <div 
                                  className={`h-full rounded-full transition-all ${
                                    isQuarantined ? 'bg-slate-400' :
                                    record.progressPercent >= 100 || isExpired ? 'bg-rose-600' :
                                    record.progressPercent >= 85 ? 'bg-rose-500' :
                                    record.progressPercent >= 65 ? 'bg-amber-500' :
                                    'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(5, record.progressPercent))}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Status & FEFO */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col items-start gap-1">
                              {isQuarantined ? (
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center gap-1">
                                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                                  <span>{isAr ? 'معزولة ومحجوزة' : 'Quarantined'}</span>
                                </span>
                              ) : isExpired ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center gap-1 animate-pulse">
                                  <AlertOctagon className="w-3 h-3" />
                                  <span>{isAr ? 'منتهية الصلاحية' : 'Expired'}</span>
                                </span>
                              ) : isCritical ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[10px] flex items-center gap-1">
                                  <Flame className="w-3 h-3 text-rose-600" />
                                  <span>{isAr ? 'صلاحية حرجة' : 'Critical Shelf-Life'}</span>
                                </span>
                              ) : record.status === 'expiring_soon' ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px]">
                                  {isAr ? 'قريبة الانتهاء' : 'Expiring Soon'}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px]">
                                  {isAr ? 'صالحة للاستخدام' : 'Valid'}
                                </span>
                              )}

                              {/* FEFO Tag */}
                              {!isQuarantined && !isExpired && (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[9px] font-bold">
                                  FEFO Priority
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {!isQuarantined ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuarantineBatchData({ item: record.item, batch: record.batch });
                                    setQuarantineReasonText(
                                      isExpired 
                                        ? (isAr ? 'انتهاء تاريخ الصلاحية' : 'Shelf-life expiration')
                                        : (isAr ? 'عزل وقائي أثناء الفحص المخبري' : 'Precautionary quality hold')
                                    );
                                    setShowQuarantineModal(true);
                                  }}
                                  title={isAr ? 'حجز وعزل التشغيلة ومنع صرفها' : 'Quarantine this batch'}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  <span>{isAr ? 'عزل وحجز' : 'Quarantine'}</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">
                                  {isAr ? 'محجوزة' : 'Quarantined'}
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedItemForBatches(record.item);
                                  setShowItemBatchesModal(true);
                                }}
                                title={isAr ? 'عرض كافة تشغيلات الصنف' : 'View all lots for item'}
                                className="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Supplier Automation & Reorder Points (ROP) */}
      {activeTab === 'automation' && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-700 font-semibold text-xs tracking-wider uppercase mb-1">
                <Cpu className="w-4 h-4" />
                <span>{isAr ? 'منظومة أتمتة التوريد ونقاط إعادة الطلب' : 'Supplier Automation & Reorder Engine'}</span>
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                  ROP = (ADU × Lead Time) + Safety Stock
                </span>
              </div>
              <h3 className="font-bold text-base text-slate-900">
                {isAr ? 'التوريد الآلي لمستلزمات العمليات الجراحية والولادة' : 'Automated Replenishment for Essential Surgery & Maternity Supplies'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr 
                  ? 'حساب معدلات الاستهلاك اليومي الفعلية، مراقبة هبوط الرصيد تحت حد الأمان، وتوليد أوامر شراء إلكترونية مسودة للاعتماد المالي والإداري بنقرة واحدة.' 
                  : 'Calculates dynamic reorder points based on daily usage rates and vendor lead times to prevent stockouts in surgical theaters and delivery rooms.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Scope filter toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-md text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setAutomationScope('all')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    automationScope === 'all' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isAr ? 'الكل' : 'All'}
                </button>
                <button
                  type="button"
                  onClick={() => setAutomationScope('surgery')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    automationScope === 'surgery' ? 'bg-white text-teal-800 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isAr ? 'الجراحة' : 'Surgery'}
                </button>
                <button
                  type="button"
                  onClick={() => setAutomationScope('maternity')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    automationScope === 'maternity' ? 'bg-white text-purple-800 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isAr ? 'الولادة' : 'Maternity'}
                </button>
              </div>

              {canCreatePO && (
                <button
                  onClick={() => handleRunSupplierAutomation(selectedAutomationItemIds.length > 0 ? selectedAutomationItemIds : undefined)}
                  disabled={isGeneratingPOs}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  title={isAr ? 'توليد أوامر شراء إلكترونية مسودة لجميع الأصناف تحت حد الأمان أو نقطة الطلب' : 'Generate electronic purchase orders for approval'}
                >
                  <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>
                    {selectedAutomationItemIds.length > 0 
                      ? (isAr ? `توليد PO لـ (${selectedAutomationItemIds.length}) أصناف مختارة` : `Generate PO for (${selectedAutomationItemIds.length}) selected`)
                      : (isAr ? 'توليد أوامر الشراء الإلكترونية لجميع النواقص' : 'Generate Draft Electronic POs')}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* 4 Automation KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Card 1: Critical Safety Breach */}
            <div 
              onClick={() => setAutomationStatusFilter('critical')}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                automationStatusFilter === 'critical'
                  ? 'ring-2 ring-rose-500 bg-rose-50/90 border-rose-400'
                  : automationSummary.criticalSafetyBreaches > 0
                    ? 'bg-rose-50/50 border-rose-300 hover:border-rose-400'
                    : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-medium mb-1">
                <span className={automationSummary.criticalSafetyBreaches > 0 ? 'text-rose-800 font-bold' : 'text-slate-500'}>
                  {isAr ? 'هبوط دون حد الأمان (عاجل)' : 'Below Safety Stock Floor'}
                </span>
                <AlertOctagon className={`w-4 h-4 ${automationSummary.criticalSafetyBreaches > 0 ? 'text-rose-600 animate-bounce' : 'text-slate-400'}`} />
              </div>
              <div className={`text-2xl font-bold font-mono ${automationSummary.criticalSafetyBreaches > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                {automationSummary.criticalSafetyBreaches}
              </div>
              <div className={`text-[11px] mt-1 ${automationSummary.criticalSafetyBreaches > 0 ? 'text-rose-700 font-medium' : 'text-slate-400'}`}>
                {isAr ? 'مستلزمات في خطر نفاد وشيك بالعمليات' : 'Critical items breaching safety reserve'}
              </div>
            </div>

            {/* Card 2: Below Reorder Point */}
            <div 
              onClick={() => setAutomationStatusFilter('reorder')}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                automationStatusFilter === 'reorder'
                  ? 'ring-2 ring-amber-500 bg-amber-50/90 border-amber-400'
                  : automationSummary.belowReorderPoint > 0
                    ? 'bg-amber-50/50 border-amber-300 hover:border-amber-400'
                    : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-medium mb-1">
                <span className={automationSummary.belowReorderPoint > 0 ? 'text-amber-800 font-bold' : 'text-slate-500'}>
                  {isAr ? 'بلغت نقطة إعادة الطلب (ROP)' : 'At / Below Reorder Point'}
                </span>
                <TrendingUp className={`w-4 h-4 ${automationSummary.belowReorderPoint > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
              </div>
              <div className={`text-2xl font-bold font-mono ${automationSummary.belowReorderPoint > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                {automationSummary.belowReorderPoint}
              </div>
              <div className={`text-[11px] mt-1 ${automationSummary.belowReorderPoint > 0 ? 'text-amber-700 font-medium' : 'text-slate-400'}`}>
                {isAr ? 'تتطلب إصدار أمر شراء للتوريد' : 'Reorder trigger activated'}
              </div>
            </div>

            {/* Card 3: Total Estimated Restock Cost */}
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
                <span>{isAr ? 'التكلفة التقديرية للتوريد' : 'Estimated Restock Cost'}</span>
                <ShoppingCart className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-700">
                {automationSummary.totalEstimatedCost.toLocaleString()} <span className="text-xs font-sans text-slate-500 font-normal">د.ل</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {isAr ? 'قيمة الكميات المحسوبة وفق فترات التوريد' : 'Calculated across recommended PO items'}
              </div>
            </div>

            {/* Card 4: Total Monitored Items */}
            <div 
              onClick={() => setAutomationStatusFilter('all')}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                automationStatusFilter === 'all' ? 'ring-2 ring-teal-500 bg-teal-50/30 border-teal-300' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
                <span>{isAr ? 'المستلزمات الخاضعة للأتمتة' : 'Monitored Supplies'}</span>
                <ShieldCheck className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {automationSummary.totalEvaluated}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {automationSummary.surgeryItemsCount} {isAr ? 'جراحة' : 'surgery'} · {automationSummary.maternityItemsCount} {isAr ? 'ولادة' : 'maternity'}
              </div>
            </div>
          </div>

          {/* Search, Filter Chips & Bulk Selection Toolbar */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[260px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute top-2.5 left-2.5 rtl:left-auto rtl:right-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={isAr ? 'بحث باسم المستلزم الجراحي، الكود SKU، أو المورد...' : 'Search surgical supply, SKU, or vendor...'}
                  value={automationSearch}
                  onChange={(e) => setAutomationSearch(e.target.value)}
                  className="w-full pl-8 pr-3 rtl:pl-3 rtl:pr-8 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md shrink-0">
                <button
                  type="button"
                  onClick={() => setAutomationStatusFilter('all')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    automationStatusFilter === 'all' ? 'bg-white shadow-xs text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isAr ? 'الكل' : 'All'} ({automationSummary.totalEvaluated})
                </button>
                <button
                  type="button"
                  onClick={() => setAutomationStatusFilter('critical')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    automationStatusFilter === 'critical' ? 'bg-rose-600 text-white font-semibold' : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  {isAr ? 'دون حد الأمان' : 'Below Safety'} ({automationSummary.criticalSafetyBreaches})
                </button>
                <button
                  type="button"
                  onClick={() => setAutomationStatusFilter('reorder')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    automationStatusFilter === 'reorder' ? 'bg-amber-600 text-white font-semibold' : 'text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  {isAr ? 'نقطة الطلب ROP' : 'Below ROP'} ({automationSummary.belowReorderPoint})
                </button>
                <button
                  type="button"
                  onClick={() => setAutomationStatusFilter('adequate')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    automationStatusFilter === 'adequate' ? 'bg-emerald-600 text-white font-semibold' : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {isAr ? 'مخزون آمن' : 'Adequate'} ({automationSummary.adequatelyStocked})
                </button>
              </div>
            </div>

            {/* Quick Bulk Select Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const needyIds = automationSummary.calculations
                    .filter(c => c.status !== 'adequately_stocked')
                    .map(c => c.item.id);
                  if (selectedAutomationItemIds.length === needyIds.length) {
                    setSelectedAutomationItemIds([]);
                  } else {
                    setSelectedAutomationItemIds(needyIds);
                  }
                }}
                className="px-2.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium flex items-center gap-1 cursor-pointer"
              >
                {selectedAutomationItemIds.length > 0 ? <CheckSquare className="w-3.5 h-3.5 text-indigo-600" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                <span>
                  {selectedAutomationItemIds.length > 0 
                    ? (isAr ? `إلغاء التحديد (${selectedAutomationItemIds.length})` : `Deselect (${selectedAutomationItemIds.length})`)
                    : (isAr ? 'تحديد كل النواقص' : 'Select All Below ROP')}
                </span>
              </button>
            </div>
          </div>

          {/* Supplier Automation Calculation Matrix Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-4">{isAr ? 'المستلزم الطبي والقسم' : 'Supply & Clinical Scope'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'الرصيد الحالي' : 'Stock Level'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'الاستهلاك اليومي' : 'Daily Usage'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'التوريد / الأمان' : 'Lead / Safety'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'حد الأمان SS' : 'Safety Floor (SS)'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'نقطة الطلب ROP' : 'Reorder Point'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'أيام التغطية' : 'Stockout Days'}</th>
                    <th className="py-3 px-4">{isAr ? 'الحالة الآلية' : 'Safety Status'}</th>
                    <th className="py-3 px-4">{isAr ? 'الطلب المقترح / التكلفة' : 'Recommended PO'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAutomationCalcs.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        {isAr ? 'لا توجد مستلزمات مطابقة لمعايير التصفية الحالية' : 'No items match current filter criteria'}
                      </td>
                    </tr>
                  ) : (
                    filteredAutomationCalcs.map(calc => {
                      const isSelected = selectedAutomationItemIds.includes(calc.item.id);
                      const isCriticalBreach = calc.status === 'critical_safety_breach';
                      const isBelowROP = calc.status === 'below_reorder_point';

                      return (
                        <tr 
                          key={calc.item.id} 
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isCriticalBreach ? 'bg-rose-50/30' :
                            isBelowROP ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          {/* Selection Checkbox */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) {
                                  setSelectedAutomationItemIds(selectedAutomationItemIds.filter(id => id !== calc.item.id));
                                } else {
                                  setSelectedAutomationItemIds([...selectedAutomationItemIds, calc.item.id]);
                                }
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>

                          {/* Item & Clinical Scope */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{isAr ? calc.item.nameAr : calc.item.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                              <span>{calc.item.sku}</span>
                              <span className="text-slate-300">·</span>
                              <span className="text-slate-400">{calc.vendorName}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1">
                              {(calc.clinicalTag === 'surgery' || calc.clinicalTag === 'both') && (
                                <span className="inline-block px-1.5 py-0.2 rounded bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-medium">
                                  {isAr ? 'جراحة وعمليات' : 'Surgery'}
                                </span>
                              )}
                              {(calc.clinicalTag === 'maternity' || calc.clinicalTag === 'both') && (
                                <span className="inline-block px-1.5 py-0.2 rounded bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-medium">
                                  {isAr ? 'ولادة وتوليد' : 'Maternity'}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Current Stock */}
                          <td className="py-3 px-3 text-center">
                            <div className={`font-mono text-sm font-bold ${
                              isCriticalBreach ? 'text-rose-700' :
                              isBelowROP ? 'text-amber-700' : 'text-slate-900'
                            }`}>
                              {calc.currentStock}
                            </div>
                            <span className="text-[10px] text-slate-400">{calc.item.unit}</span>
                          </td>

                          {/* Daily Usage Rate */}
                          <td className="py-3 px-3 text-center font-mono">
                            <div className="font-bold text-slate-800 text-xs">{calc.dailyUsageRate}</div>
                            <span className="text-[10px] text-slate-400">{isAr ? 'وحدة/يوم' : 'units/day'}</span>
                          </td>

                          {/* Lead Time & Safety Days */}
                          <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-600">
                            <div><strong className="text-slate-800">{calc.leadTimeDays}d</strong> {isAr ? 'توريد' : 'lead'}</div>
                            <div className="text-[10px] text-slate-400">{calc.safetyStockDays}d {isAr ? 'أمان' : 'buffer'}</div>
                          </td>

                          {/* Safety Stock Level (SS) */}
                          <td className="py-3 px-3 text-center font-mono">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                              calc.currentStock <= calc.safetyStockLevel 
                                ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {calc.safetyStockLevel}
                            </span>
                          </td>

                          {/* Calculated Reorder Point (ROP) */}
                          <td className="py-3 px-3 text-center font-mono">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                              calc.currentStock <= calc.reorderPoint 
                                ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {calc.reorderPoint}
                            </span>
                          </td>

                          {/* Days of Stock Remaining */}
                          <td className="py-3 px-3 text-center font-mono">
                            <div className={`text-xs font-bold ${
                              calc.daysUntilStockout <= 2 ? 'text-rose-700 animate-pulse' :
                              calc.daysUntilStockout <= 5 ? 'text-amber-700' : 'text-slate-700'
                            }`}>
                              {calc.daysUntilStockout} {isAr ? 'يوم' : 'days'}
                            </div>
                          </td>

                          {/* Automation Status Badge */}
                          <td className="py-3 px-4">
                            {isCriticalBreach ? (
                              <span className="px-2 py-1 rounded-full bg-rose-100 border border-rose-300 text-rose-800 font-bold text-[10px] flex items-center gap-1 w-fit animate-pulse">
                                <AlertOctagon className="w-3 h-3 text-rose-600" />
                                <span>{isAr ? 'تحت حد الأمان (خطر نفاد)' : 'Safety Breach (< SS)'}</span>
                              </span>
                            ) : isBelowROP ? (
                              <span className="px-2 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 font-bold text-[10px] flex items-center gap-1 w-fit">
                                <TrendingUp className="w-3 h-3 text-amber-600" />
                                <span>{isAr ? 'تحت نقطة الطلب (ROP)' : 'Below ROP'}</span>
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-[10px] flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>{isAr ? 'مخزون آمن ومكتمل' : 'Adequately Stocked'}</span>
                              </span>
                            )}
                          </td>

                          {/* Recommended Order Quantity & Estimated Cost */}
                          <td className="py-3 px-4 font-mono text-xs">
                            {calc.status !== 'adequately_stocked' ? (
                              <div>
                                <div className="font-bold text-slate-900">
                                  +{calc.recommendedOrderQty} <span className="font-sans text-[10px] text-slate-500 font-normal">{calc.item.unit}</span>
                                </div>
                                <div className="text-[10px] text-emerald-700 font-semibold">
                                  ~{calc.estimatedCost.toLocaleString()} د.ل
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] font-sans italic">
                                {isAr ? 'لا يلزم طلب' : 'No reorder needed'}
                              </span>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="py-3 px-4 text-center">
                            {canCreatePO && calc.status !== 'adequately_stocked' && (
                              <button
                                type="button"
                                onClick={() => handleRunSupplierAutomation([calc.item.id])}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors mx-auto"
                                title={isAr ? 'توليد أمر شراء إلكتروني فوري لهذا الصنف' : 'Generate electronic PO for this item'}
                              >
                                <Zap className="w-3 h-3" />
                                <span>{isAr ? 'طلب إلكتروني' : 'Draft PO'}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Electronic Draft Purchase Orders Awaiting Approval */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-sm text-slate-900">
                  {isAr ? 'أوامر الشراء الإلكترونية المولّدة آلياً بانتظار الاعتماد (Draft Electronic POs)' : 'Draft Electronic Purchase Orders Generated by Automation'}
                </h4>
              </div>
              <button
                onClick={() => setActiveTab('purchase_orders')}
                className="text-xs text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <span>{isAr ? 'عرض سجل جميع أوامر الشراء' : 'View Full PO Directory'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {purchaseOrders.filter(p => p.status === 'pending_approval').length === 0 ? (
              <div className="py-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg text-xs">
                {isAr ? 'لا توجد أوامر شراء إلكترونية معلقة للاعتماد حالياً' : 'No pending electronic purchase orders awaiting approval'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {purchaseOrders.filter(p => p.status === 'pending_approval').map(po => (
                  <div key={po.id} className="p-3.5 rounded-lg border border-indigo-200 bg-indigo-50/20 shadow-xs flex flex-col justify-between space-y-2.5">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-indigo-900">{po.poNumber}</span>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono text-[10px] font-bold">
                          {isAr ? 'بانتظار الاعتماد' : 'Pending Approval'}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-800">{po.vendorName}</div>
                      <div className="text-[11px] text-slate-500">
                        {po.items.length} {isAr ? 'أصناف مستلزمات طبية' : 'items'} · <strong className="font-mono text-emerald-700">{po.totalAmount.toLocaleString()} د.ل</strong>
                      </div>
                      {po.notes && (
                        <p className="text-[10px] text-slate-600 italic bg-white p-2 rounded border border-slate-100 line-clamp-2">
                          {po.notes}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-indigo-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPOForReview(po);
                          setShowElectronicPOModal(true);
                        }}
                        className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium cursor-pointer"
                      >
                        {isAr ? 'معاينة القسيمة' : 'View Voucher'}
                      </button>

                      {canApprovePO && (
                        <button
                          type="button"
                          onClick={() => handleUpdatePOStatus(po.id, 'approved')}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isAr ? 'اعتماد إلكتروني' : 'Approve PO'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Purchase Orders & Workflow */}
      {activeTab === 'purchase_orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {isAr ? 'دورة أوامر الشراء والتوريد' : 'Procurement & Purchase Orders Lifecycle'}
              </h3>
              <p className="text-xs text-slate-500">
                {isAr ? 'إنشاء، اعتماد الإدارة، وتأكيد الاستلام والتوريد المباشر لأرصدة المستودع' : 'Drafting, Administrative Approval, and Automated Warehouse Restocking'}
              </p>
            </div>
            {canCreatePO && (
              <button
                onClick={() => setShowCreatePOModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold"
              >
                <Plus className="w-4 h-4 text-teal-400" />
                <span>{isAr ? 'طلب شراء جديد' : 'New PO'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {purchaseOrders.map(po => {
              const statusColor = 
                po.status === 'received' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                po.status === 'approved' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                po.status === 'pending_approval' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                'bg-slate-50 text-slate-700 border-slate-200';

              return (
                <div key={po.id} className="bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between overflow-hidden">
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-slate-900">{po.poNumber}</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border capitalize ${statusColor}`}>
                        {po.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500">{isAr ? 'المورد:' : 'Vendor:'}</div>
                      <div className="text-sm font-semibold text-slate-900">{po.vendorName}</div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded border border-slate-100 space-y-1">
                      <div className="text-[11px] font-semibold text-slate-600 mb-1">
                        {isAr ? 'الأصناف المطلوبة:' : 'Ordered Items:'}
                      </div>
                      {po.items.map((line, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-slate-700">
                          <span>{line.itemName} <strong className="font-mono text-slate-900">x{line.quantity}</strong></span>
                          <span className="font-mono font-medium">{line.totalCost.toFixed(2)} د.ل</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-500">{isAr ? 'إجمالي القيمة:' : 'Total Cost:'}</span>
                      <span className="font-mono text-sm font-bold text-emerald-700">{po.totalAmount.toLocaleString()} د.ل</span>
                    </div>

                    <div className="text-[11px] text-slate-400 space-y-0.5">
                      <div>{isAr ? 'طلب بواسطة:' : 'Ordered by:'} {po.orderedBy} ({po.orderDate.split('T')[0]})</div>
                      {po.approvedBy && <div>{isAr ? 'معتمد من:' : 'Approved by:'} {po.approvedBy}</div>}
                      {po.receivedBy && <div>{isAr ? 'مستلم بواسطة:' : 'Received by:'} {po.receivedBy} ({po.receivedDate?.split('T')[0]})</div>}
                      {po.notes && <div className="italic text-slate-500">"{po.notes}"</div>}
                    </div>
                  </div>

                  {/* PO Action Buttons */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                    {po.status === 'pending_approval' && canApprovePO && (
                      <button
                        onClick={() => handleUpdatePOStatus(po.id, 'approved')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isAr ? 'اعتماد الطلب' : 'Approve PO'}</span>
                      </button>
                    )}

                    {po.status === 'approved' && canManageInventory && (
                      <button
                        onClick={() => handleUpdatePOStatus(po.id, 'received')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-xs"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>{isAr ? 'استلام وتوريد للمخزون' : 'Receive & Restock'}</span>
                      </button>
                    )}

                    {po.status === 'received' && (
                      <div className="flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isAr ? 'تم استلامه وإضافته للرصيد' : 'Fulfilled & Restocked'}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: Vendors Directory */}
      {activeTab === 'vendors' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {isAr ? 'دليل شركات وموردي المستشفى' : 'Hospital Approved Vendors & Suppliers'}
              </h3>
              <p className="text-xs text-slate-500">
                {isAr ? 'إدارة بيانات التعاقد والشروط المالية للموردين المسجلين' : 'Manage vendor directory, contact persons, and payment terms'}
              </p>
            </div>
            {canManageInventory && (
              <button
                onClick={() => setShowAddVendorModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-semibold"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? 'إضافة مورد جديد' : 'Add Vendor'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vendors.map(vendor => (
              <div key={vendor.id} className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-teal-700">{vendor.code}</span>
                    <h4 className="font-bold text-sm text-slate-900">{isAr ? vendor.nameAr : vendor.name}</h4>
                    <div className="text-xs text-slate-500">{vendor.category}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    vendor.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {vendor.active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'غير نشط' : 'Inactive')}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-2 space-y-1.5 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400">{isAr ? 'المسؤول:' : 'Contact:'}</span>{' '}
                    <strong className="text-slate-800">{vendor.contactPerson}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">{isAr ? 'الهاتف:' : 'Phone:'}</span>{' '}
                    <span className="font-mono text-slate-800">{vendor.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">{isAr ? 'البريد:' : 'Email:'}</span>{' '}
                    <span className="font-mono text-slate-800">{vendor.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">{isAr ? 'العنوان:' : 'Address:'}</span>{' '}
                    <span>{vendor.address}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded text-[11px] font-medium text-slate-700">
                    <span className="text-slate-400">{isAr ? 'شروط السداد:' : 'Terms:'}</span> {vendor.paymentTerms}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Stock Movement Ledger */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'سجل التدقيق لحركات المخزون والتوريد' : 'Stock Movements Audit Ledger'}</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {movements.length} {isAr ? 'حركة مسجلة' : 'records logged'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">{isAr ? 'الوقت والتاريخ' : 'Timestamp'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'الصنف' : 'Item'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'نوع الحركة' : 'Type'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'الرصيد السابق' : 'Prev'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'الكمية' : 'Change'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'الرصيد الجديد' : 'New'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'المرجع والملاحظات' : 'Ref & Notes'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'المستخدم' : 'User'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map(mov => (
                  <tr key={mov.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {mov.timestamp.replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {mov.itemName}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        mov.type === 'PURCHASE_RECEIPT' ? 'bg-emerald-100 text-emerald-800' :
                        mov.type === 'PATIENT_DISPENSE' ? 'bg-blue-100 text-blue-800' :
                        mov.type === 'ADJUSTMENT' ? 'bg-purple-100 text-purple-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {mov.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{mov.previousStock}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {mov.type === 'PATIENT_DISPENSE' ? `-${mov.quantity}` : `+${mov.quantity}`}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{mov.newStock}</td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-600">
                      <span className="font-mono font-medium">{mov.referenceId}</span> {mov.notes ? `· ${mov.notes}` : ''}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-600">{mov.performedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Add New Inventory Item */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">
                {isAr ? 'إضافة صنف جديد إلى المستودع' : 'Add New Inventory Item'}
              </h3>
              <button onClick={() => setShowAddItemModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'كود الصنف SKU' : 'SKU Code'} *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SUP-CAN-18G"
                    value={newItem.sku}
                    onChange={e => setNewItem({ ...newItem, sku: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'الفئة' : 'Category'} *</label>
                  <select
                    value={newItem.category}
                    onChange={e => setNewItem({ ...newItem, category: e.target.value as InventoryCategory })}
                    className="w-full p-2 border border-slate-300 rounded text-xs"
                  >
                    <option value="supplies">{isAr ? 'مستلزمات ومستهلكات جراحية' : 'Supplies & Disposables'}</option>
                    <option value="medicine">{isAr ? 'أدوية ومحاليل وريدية' : 'Medicines & Solutions'}</option>
                    <option value="equipment">{isAr ? 'أجهزة ومعدات طبية' : 'Equipment & Medical Devices'}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'الاسم بالإنجليزية' : 'Item Name (EN)'} *</label>
                  <input
                    type="text"
                    required
                    value={newItem.name}
                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'الاسم بالعربية' : 'Item Name (AR)'} *</label>
                  <input
                    type="text"
                    required
                    value={newItem.nameAr}
                    onChange={e => setNewItem({ ...newItem, nameAr: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-xs"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'الوصف الطبي' : 'Clinical Description'}</label>
                  <input
                    type="text"
                    value={newItem.description}
                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'موقع التخزين في المستشفى' : 'Storage Location'} *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. OT Supply Room - Shelf 4"
                    value={newItem.location}
                    onChange={e => setNewItem({ ...newItem, location: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'وحدة القياس / التعبئة' : 'Unit'} *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Box, Vial, Device, Pack"
                    value={newItem.unit}
                    onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'الرصيد المبدئي' : 'Initial Stock Level'} *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newItem.stockLevel}
                    onChange={e => setNewItem({ ...newItem, stockLevel: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'حد التنبيه الأدنى' : 'Min Threshold Alert'} *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newItem.minThreshold}
                    onChange={e => setNewItem({ ...newItem, minThreshold: parseInt(e.target.value) || 1 })}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'سعر التكلفة (د.ل)' : 'Unit Cost (LYD)'} *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={newItem.unitCost}
                    onChange={e => setNewItem({ ...newItem, unitCost: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'سعر البيع للمريض (د.ل)' : 'Selling Price (LYD)'} *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={newItem.unitPrice}
                    onChange={e => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'المورد المعتمد' : 'Preferred Vendor'}</label>
                  <select
                    value={newItem.vendorId}
                    onChange={e => setNewItem({ ...newItem, vendorId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-xs"
                  >
                    <option value="">{isAr ? '-- اختر المورد --' : '-- Select Vendor --'}</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'رقم التشغيلة / الدفعة' : 'Batch Number'}</label>
                  <input
                    type="text"
                    value={newItem.batchNumber}
                    onChange={e => setNewItem({ ...newItem, batchNumber: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'تاريخ انتهاء الصلاحية' : 'Expiry Date'}</label>
                  <input
                    type="date"
                    value={newItem.expiryDate}
                    onChange={e => setNewItem({ ...newItem, expiryDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-xs font-medium hover:bg-slate-50"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold"
                >
                  {isAr ? 'حفظ الصنف في المستودع' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Item & Stock Level */}
      {showEditItemModal && editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">
                {isAr ? `تعديل صنف: ${editingItem.name}` : `Edit: ${editingItem.name}`}
              </h3>
              <button onClick={() => setShowEditItemModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="p-4 space-y-4 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'الاسم بالإنجليزية' : 'Item Name'}</label>
                  <input
                    type="text"
                    value={editingItem.name}
                    onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'الاسم بالعربية' : 'Item Name (Arabic)'}</label>
                  <input
                    type="text"
                    value={editingItem.nameAr}
                    onChange={e => setEditingItem({ ...editingItem, nameAr: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">{isAr ? 'الرصيد الفعلي الحالي' : 'Stock Level'}</label>
                    <input
                      type="number"
                      min="0"
                      value={editingItem.stockLevel}
                      onChange={e => setEditingItem({ ...editingItem, stockLevel: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 border border-slate-300 rounded text-xs font-mono font-bold text-teal-700"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">{isAr ? 'حد التنبيه الأدنى' : 'Min Threshold'}</label>
                    <input
                      type="number"
                      min="1"
                      value={editingItem.minThreshold}
                      onChange={e => setEditingItem({ ...editingItem, minThreshold: parseInt(e.target.value) || 1 })}
                      className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">{isAr ? 'سعر التكلفة (د.ل)' : 'Unit Cost'}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingItem.unitCost}
                      onChange={e => setEditingItem({ ...editingItem, unitCost: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">{isAr ? 'سعر البيع للمريض (د.ل)' : 'Unit Price'}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingItem.unitPrice}
                      onChange={e => setEditingItem({ ...editingItem, unitPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'الموقع التخزيني' : 'Location'}</label>
                  <input
                    type="text"
                    value={editingItem.location}
                    onChange={e => setEditingItem({ ...editingItem, location: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditItemModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-xs hover:bg-slate-50"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold"
                >
                  {isAr ? 'حفظ التعديلات' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create Purchase Order */}
      {showCreatePOModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'إنشاء أمر شراء وتوريد مستودعي جديد' : 'New Purchase Order (PO)'}</span>
              </h3>
              <button onClick={() => setShowCreatePOModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="p-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">{isAr ? 'المورد المعتمد' : 'Vendor'} *</label>
                <select
                  required
                  value={newPOVendorId}
                  onChange={e => setNewPOVendorId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                >
                  <option value="">{isAr ? '-- اختر المورد المطلوب --' : '-- Select Vendor --'}</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
                  ))}
                </select>
              </div>

              {/* Line items selector */}
              <div className="border border-slate-200 rounded p-3 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{isAr ? 'بنود الشراء والكميات' : 'Purchase Line Items'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (items.length > 0) {
                        setPoLineItems([...poLineItems, { itemId: items[0].id, quantity: 10, unitCost: items[0].unitCost }]);
                      }
                    }}
                    className="px-2.5 py-1 bg-teal-100 hover:bg-teal-200 text-teal-800 rounded font-semibold text-[11px] flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إضافة بند' : 'Add Item'}</span>
                  </button>
                </div>

                {poLineItems.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 italic">
                    {isAr ? 'لم تتم إضافة بنود بعد. انقر على "+ إضافة بند"' : 'No items added yet. Click "+ Add Item"'}
                  </div>
                ) : (
                  poLineItems.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded">
                      <select
                        value={line.itemId}
                        onChange={e => {
                          const selected = items.find(i => i.id === e.target.value);
                          const updated = [...poLineItems];
                          updated[idx].itemId = e.target.value;
                          if (selected) updated[idx].unitCost = selected.unitCost;
                          setPoLineItems(updated);
                        }}
                        className="flex-1 p-1.5 border border-slate-200 rounded text-xs"
                      >
                        {items.map(it => (
                          <option key={it.id} value={it.id}>{it.name} (Stock: {it.stockLevel})</option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-[10px]">{isAr ? 'الكمية:' : 'Qty:'}</span>
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={e => {
                            const updated = [...poLineItems];
                            updated[idx].quantity = parseInt(e.target.value) || 1;
                            setPoLineItems(updated);
                          }}
                          className="w-16 p-1 border border-slate-200 rounded text-xs font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-[10px]">{isAr ? 'التكلفة:' : 'Cost:'}</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={line.unitCost}
                          onChange={e => {
                            const updated = [...poLineItems];
                            updated[idx].unitCost = parseFloat(e.target.value) || 0;
                            setPoLineItems(updated);
                          }}
                          className="w-20 p-1 border border-slate-200 rounded text-xs font-mono"
                        />
                      </div>

                      <div className="font-mono font-bold text-xs text-emerald-700 min-w-[70px] text-right">
                        {(line.quantity * line.unitCost).toFixed(2)} د.ل
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = poLineItems.filter((_, i) => i !== idx);
                          setPoLineItems(updated);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}

                {poLineItems.length > 0 && (
                  <div className="flex justify-end pt-2 text-xs font-semibold text-slate-800">
                    <span>{isAr ? 'إجمالي أمر الشراء:' : 'Total Amount:'}</span>{' '}
                    <span className="font-mono text-emerald-700 text-sm ml-2 mr-2">
                      {poLineItems.reduce((sum, l) => sum + (l.quantity * l.unitCost), 0).toFixed(2)} د.ل
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">{isAr ? 'ملاحظات أمر الشراء' : 'Order Notes'}</label>
                <textarea
                  rows={2}
                  value={newPONotes}
                  onChange={e => setNewPONotes(e.target.value)}
                  placeholder={isAr ? 'سبب الطلب، الميزانية، أو شروط التوريد الخاصة...' : 'Purpose of order, budget line, or special delivery notes...'}
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreatePOModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-xs hover:bg-slate-50"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={poLineItems.length === 0}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded text-xs font-semibold"
                >
                  {isAr ? 'إرسال أمر الشراء للاعتماد' : 'Submit PO for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Vendor */}
      {showAddVendorModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">
                {isAr ? 'إضافة مورد طبي جديد' : 'Register New Vendor'}
              </h3>
              <button onClick={() => setShowAddVendorModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as any;
                try {
                  await api.addVendor({
                    name: form.vendorName.value,
                    nameAr: form.nameAr.value,
                    code: form.code.value,
                    contactPerson: form.contactPerson.value,
                    phone: form.phone.value,
                    email: form.email.value,
                    address: form.address.value,
                    category: form.category.value,
                    paymentTerms: form.paymentTerms.value,
                    active: true
                  }, currentUser);
                  setShowAddVendorModal(false);
                  setActionMessage({ type: 'success', text: isAr ? 'تم تسجيل المورد بنجاح' : 'Vendor registered successfully' });
                  loadData();
                } catch (err: any) {
                  setActionMessage({ type: 'error', text: err.message });
                }
              }} 
              className="p-4 space-y-3 text-xs"
            >
              <div>
                <label className="block font-medium text-slate-700 mb-1">{isAr ? 'اسم الشركة (EN)' : 'Company Name (EN)'} *</label>
                <input name="vendorName" required className="w-full p-2 border border-slate-300 rounded text-xs" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{isAr ? 'اسم الشركة (AR)' : 'Company Name (AR)'} *</label>
                <input name="nameAr" required className="w-full p-2 border border-slate-300 rounded text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'كود المورد' : 'Vendor Code'} *</label>
                  <input name="code" placeholder="e.g. VEND-04" required className="w-full p-2 border border-slate-300 rounded text-xs font-mono" />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'نشاط المورد' : 'Category'} *</label>
                  <input name="category" placeholder="e.g. Surgical Equipment" required className="w-full p-2 border border-slate-300 rounded text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'المسؤول' : 'Contact Person'} *</label>
                  <input name="contactPerson" required className="w-full p-2 border border-slate-300 rounded text-xs" />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'الهاتف' : 'Phone'} *</label>
                  <input name="phone" required className="w-full p-2 border border-slate-300 rounded text-xs font-mono" />
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{isAr ? 'البريد الإلكتروني' : 'Email'}</label>
                <input name="email" type="email" className="w-full p-2 border border-slate-300 rounded text-xs" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{isAr ? 'العنوان' : 'Address'}</label>
                <input name="address" className="w-full p-2 border border-slate-300 rounded text-xs" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{isAr ? 'شروط السداد المالي' : 'Payment Terms'}</label>
                <input name="paymentTerms" placeholder="e.g. Net 30 Days" defaultValue="Net 30 Days" className="w-full p-2 border border-slate-300 rounded text-xs" />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button type="button" onClick={() => setShowAddVendorModal(false)} className="px-3 py-1.5 border border-slate-300 rounded text-xs">
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="px-4 py-1.5 bg-teal-600 text-white rounded text-xs font-semibold">
                  {isAr ? 'تسجيل المورد' : 'Register Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: Add Batch to Item */}
      {showAddBatchModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {isAr ? 'استلام وإضافة تشغيلة دواء جديدة' : 'Register New Medication Lot / Batch'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setShowAddBatchModal(false);
                  setSelectedItemForAddBatch(null);
                }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="p-4 space-y-4 text-xs">
              {/* Target Item Selection */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {isAr ? 'الصنف الطبي المستلم' : 'Target Medication / Item'} *
                </label>
                <select
                  required
                  value={selectedItemForAddBatch?.id || ''}
                  onChange={e => {
                    const found = items.find(i => i.id === e.target.value);
                    if (found) setSelectedItemForAddBatch(found);
                  }}
                  className="w-full p-2 border border-slate-300 rounded text-xs bg-slate-50 font-medium"
                >
                  <option value="">{isAr ? '-- اختر الصنف --' : '-- Select Item --'}</option>
                  {items.map(it => (
                    <option key={it.id} value={it.id}>
                      {it.sku} - {isAr ? it.nameAr : it.name} ({isAr ? 'الرصيد الحالي:' : 'Stock:'} {it.stockLevel} {it.unit})
                    </option>
                  ))}
                </select>
                {selectedItemForAddBatch && (
                  <div className="mt-1 text-[11px] text-teal-700 bg-teal-50 p-2 rounded border border-teal-100 flex items-center justify-between">
                    <span>{isAr ? 'الموقع التخزيني:' : 'Location:'} <strong>{selectedItemForAddBatch.location}</strong></span>
                    <span>{isAr ? 'الوحدة:' : 'Unit:'} <strong>{selectedItemForAddBatch.unit}</strong></span>
                  </div>
                )}
              </div>

              {/* Batch Number & Vendor Lot */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    {isAr ? 'رقم التشغيلة بالمستشفى' : 'Hospital Batch #'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BATCH-2026-X8"
                    value={newBatchForm.batchNumber}
                    onChange={e => setNewBatchForm({ ...newBatchForm, batchNumber: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    {isAr ? 'رقم لوط المورد / المصنع' : 'Manufacturer Lot #'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LOT-SAN-881"
                    value={newBatchForm.vendorLotNumber}
                    onChange={e => setNewBatchForm({ ...newBatchForm, vendorLotNumber: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
              </div>

              {/* Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    {isAr ? 'الكمية المستلمة' : 'Received Quantity'} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newBatchForm.quantity}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 1;
                      setNewBatchForm({ ...newBatchForm, quantity: val, initialQuantity: val });
                    }}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    {isAr ? 'ظروف التخزين' : 'Storage Conditions'}
                  </label>
                  <select
                    value={newBatchForm.storageConditions}
                    onChange={e => setNewBatchForm({ ...newBatchForm, storageConditions: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-xs"
                  >
                    <option value="Room Temp (15-25°C)">Room Temp (15-25°C)</option>
                    <option value="Cold Chain (2-8°C)">Cold Chain (2-8°C)</option>
                    <option value="Deep Freeze (-20°C)">Deep Freeze (-20°C)</option>
                    <option value="Protect from Light">Protect from Light</option>
                  </select>
                </div>
              </div>

              {/* Dates: Manufacturing & Expiry */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    {isAr ? 'تاريخ الإنتاج / التصنيع' : 'Manufacturing Date'}
                  </label>
                  <input
                    type="date"
                    value={newBatchForm.manufacturingDate}
                    onChange={e => setNewBatchForm({ ...newBatchForm, manufacturingDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    {isAr ? 'تاريخ انتهاء الصلاحية' : 'Expiry Date'} *
                  </label>
                  <input
                    type="date"
                    required
                    value={newBatchForm.expiryDate}
                    onChange={e => setNewBatchForm({ ...newBatchForm, expiryDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono font-bold bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {isAr ? 'تاريخ اليوم المرجعي: 2026-11-11' : 'HMIS reference: 2026-11-11'}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {isAr ? 'ملاحظات الفحص والاستلام' : 'Receiving / Quality Notes'}
                </label>
                <textarea
                  rows={2}
                  value={newBatchForm.notes}
                  onChange={e => setNewBatchForm({ ...newBatchForm, notes: e.target.value })}
                  placeholder={isAr ? 'ملاحظات الفحص الظاهري، درجة الحرارة عند الاستلام...' : 'Physical inspection notes, temperature on arrival...'}
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBatchModal(false);
                    setSelectedItemForAddBatch(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-xs hover:bg-slate-50"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!selectedItemForAddBatch || !newBatchForm.batchNumber || !newBatchForm.expiryDate}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded text-xs font-semibold shadow-xs"
                >
                  {isAr ? 'اعتماد وإضافة التشغيلة' : 'Save & Receive Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Quarantine Batch Confirmation */}
      {showQuarantineModal && quarantineBatchData && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-rose-50 border-b border-rose-200">
              <div className="flex items-center gap-2 text-rose-800">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-sm">
                  {isAr ? 'حجز وعزل تشغيلة دوائية' : 'Quarantine Medication Batch'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setShowQuarantineModal(false);
                  setQuarantineBatchData(null);
                }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded text-amber-900 space-y-1">
                <div className="font-semibold text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>{isAr ? 'تحذير السلامة الدوائية والحجز' : 'Clinical Safety Hold Warning'}</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  {isAr
                    ? `سيتم حجز التشغيلة (${quarantineBatchData.batch.batchNumber}) بالكامل وتنزيل كميتها (${quarantineBatchData.batch.quantity} ${quarantineBatchData.item.unit}) من الرصيد الصالح للصرف السريري، وتسجيل حركة عزل بمستودع التوالف والحجوزات.`
                    : `Batch ${quarantineBatchData.batch.batchNumber} will be quarantined and removed (${quarantineBatchData.batch.quantity} ${quarantineBatchData.item.unit}) from active dispensing stock.`}
                </p>
              </div>

              {/* Batch Specs */}
              <div className="border border-slate-200 rounded p-3 bg-slate-50 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">{isAr ? 'الصنف الطبي:' : 'Medication:'}</span>
                  <strong className="text-slate-900 font-sans">{isAr ? quarantineBatchData.item.nameAr : quarantineBatchData.item.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">{isAr ? 'رقم التشغيلة:' : 'Batch #:'}</span>
                  <strong className="text-teal-700">{quarantineBatchData.batch.batchNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">{isAr ? 'تاريخ الصلاحية:' : 'Expiry Date:'}</span>
                  <strong className="text-rose-700">{quarantineBatchData.batch.expiryDate}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">{isAr ? 'الكمية المحجوزة:' : 'Quantity to Hold:'}</span>
                  <strong className="text-slate-900">{quarantineBatchData.batch.quantity} {quarantineBatchData.item.unit}</strong>
                </div>
              </div>

              {/* Quarantine Reason Presets */}
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">
                  {isAr ? 'سبب الحجز والعزل' : 'Reason for Quarantine'} *
                </label>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {[
                    isAr ? 'انتهاء تاريخ الصلاحية' : 'Shelf-life expiration',
                    isAr ? 'تلف أو كسر بالعبوة' : 'Packaging damage',
                    isAr ? 'سحب رقابي من المصنع' : 'Manufacturer recall',
                    isAr ? 'تغير بالخواص أو اللون' : 'Discoloration / quality defect'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setQuarantineReasonText(preset)}
                      className={`p-1.5 border rounded text-[10px] text-center transition-colors ${
                        quarantineReasonText === preset 
                          ? 'bg-rose-50 border-rose-400 text-rose-800 font-bold' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'اكتب سبب العزل بالتفصيل...' : 'Detailed quarantine justification...'}
                  value={quarantineReasonText}
                  onChange={e => setQuarantineReasonText(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuarantineModal(false);
                    setQuarantineBatchData(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-xs hover:bg-slate-50"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={!quarantineReasonText.trim()}
                  onClick={handleQuarantineBatch}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>{isAr ? 'تأكيد الحجز والعزل' : 'Confirm Quarantine'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Inspect Item Batches Detail */}
      {showItemBatchesModal && selectedItemForBatches && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {isAr ? 'سجل تشغيلات الصنف وتتبع الصلاحية' : 'Item Batches & Expiry Audit'}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {selectedItemForBatches.sku} - {isAr ? selectedItemForBatches.nameAr : selectedItemForBatches.name}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowItemBatchesModal(false);
                  setSelectedItemForBatches(null);
                }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs">
              {/* Item Info Banner */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">{isAr ? 'الرصيد الكلي المتاح:' : 'Total Active Stock:'}</span>
                  <span className="font-mono font-bold text-sm text-slate-900">{selectedItemForBatches.stockLevel} {selectedItemForBatches.unit}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">{isAr ? 'حد التنبيه الأدنى:' : 'Min Threshold:'}</span>
                  <span className="font-mono font-bold text-sm text-amber-700">{selectedItemForBatches.minThreshold} {selectedItemForBatches.unit}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">{isAr ? 'الموقع التخزيني:' : 'Location:'}</span>
                  <span className="font-medium text-slate-800">{selectedItemForBatches.location}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">{isAr ? 'المورد المعتمد:' : 'Vendor:'}</span>
                  <span className="font-medium text-slate-800 truncate block">{selectedItemForBatches.vendorName || '--'}</span>
                </div>
              </div>

              {/* Batches FEFO List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>{isAr ? 'التشغيلات المسجلة مرتبة حسب أولوية الصرف (FEFO):' : 'Registered Lots in FEFO Dispensing Priority:'}</span>
                  </div>
                  {canManageInventory && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItemForAddBatch(selectedItemForBatches);
                        setShowItemBatchesModal(false);
                        setShowAddBatchModal(true);
                      }}
                      className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAr ? 'إضافة تشغيلة لهذا الصنف' : 'Add Lot'}</span>
                    </button>
                  )}
                </div>

                {(!selectedItemForBatches.batches || selectedItemForBatches.batches.length === 0) ? (
                  <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg text-slate-400">
                    {isAr ? 'لا توجد تشغيلات فرعية مسجلة لهذا الصنف حتى الآن' : 'No batches registered for this item yet'}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {sortBatchesFEFO(selectedItemForBatches.batches).map((batch, idx) => {
                      const days = getDaysUntilExpiry(batch.expiryDate, CURRENT_HMIS_DATE);
                      const isExpired = batch.quarantined ? false : days <= 0;
                      const isCritical = !batch.quarantined && days > 0 && days <= 30;
                      const progress = calculateShelfLifeProgress(batch.manufacturingDate, batch.expiryDate, CURRENT_HMIS_DATE);

                      return (
                        <div 
                          key={batch.id} 
                          className={`p-3 rounded-lg border transition-all ${
                            batch.quarantined ? 'bg-slate-100/70 border-slate-300 opacity-80' :
                            isExpired ? 'bg-rose-50/50 border-rose-300' :
                            isCritical ? 'bg-amber-50/40 border-amber-300' :
                            'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {/* Sequence / Priority */}
                              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-mono text-[10px] font-bold">
                                {idx + 1}
                              </span>

                              <div>
                                <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{batch.batchNumber}</span>
                                  {batch.vendorLotNumber && (
                                    <span className="text-[10px] font-normal text-slate-500">
                                      ({isAr ? 'لوط المصنع:' : 'Lot:'} {batch.vendorLotNumber})
                                    </span>
                                  )}
                                  {idx === 0 && !batch.quarantined && !isExpired && (
                                    <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 text-[9px] font-bold">
                                      FEFO NEXT
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {batch.storageConditions || 'Room Temp (15-25°C)'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* Quantity */}
                              <div className="text-right rtl:text-left">
                                <div className="font-mono font-bold text-slate-900 text-sm">
                                  {batch.quantity} <span className="text-xs font-normal text-slate-500">{selectedItemForBatches.unit}</span>
                                </div>
                                {batch.initialQuantity && (
                                  <div className="text-[10px] text-slate-400">
                                    {isAr ? 'مبدئي:' : 'initial:'} {batch.initialQuantity}
                                  </div>
                                )}
                              </div>

                              {/* Expiry Badge */}
                              <div className="min-w-[120px]">
                                <div className="font-mono text-xs font-bold text-slate-800">
                                  {batch.expiryDate}
                                </div>
                                <div className="text-[10px]">
                                  {batch.quarantined ? (
                                    <span className="text-slate-500 font-bold">{isAr ? 'معزولة' : 'Quarantined'}</span>
                                  ) : isExpired ? (
                                    <span className="text-rose-700 font-bold">{isAr ? 'منتهية الصلاحية' : 'Expired'}</span>
                                  ) : isCritical ? (
                                    <span className="text-rose-600 font-bold">{isAr ? `باقي ${days} يوم!` : `${days}d left!`}</span>
                                  ) : (
                                    <span className="text-emerald-700">{isAr ? `باقي ${days} يوم` : `${days}d left`}</span>
                                  )}
                                </div>
                              </div>

                              {/* Action */}
                              {!batch.quarantined && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuarantineBatchData({ item: selectedItemForBatches, batch });
                                    setQuarantineReasonText(isExpired ? (isAr ? 'انتهاء تاريخ الصلاحية' : 'Shelf-life expiration') : '');
                                    setShowQuarantineModal(true);
                                  }}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  <span>{isAr ? 'عزل' : 'Hold'}</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-mono w-16 shrink-0">{progress}% {isAr ? 'مستهلك' : 'used'}</span>
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  batch.quarantined ? 'bg-slate-400' :
                                  progress >= 100 ? 'bg-rose-600' :
                                  progress >= 85 ? 'bg-rose-500' :
                                  progress >= 65 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`} 
                                style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowItemBatchesModal(false);
                    setSelectedItemForBatches(null);
                  }}
                  className="px-4 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Electronic Purchase Order (e-PO) Voucher & Approval */}
      {showElectronicPOModal && selectedPOForReview && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-xs">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm tracking-wide">
                      {isAr ? 'قسيمة أمر الشراء الإلكتروني المعتمد' : 'Electronic Purchase Order Voucher'}
                    </h3>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-bold border border-slate-700">
                      {selectedPOForReview.poNumber}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isAr ? 'منظومة التوريد المؤتمت للمستلزمات الجراحية وحالات الولادة' : 'Automated Surgery & Maternity Procurement System'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowElectronicPOModal(false);
                  setSelectedPOForReview(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Voucher Document Printable Card */}
            <div className="p-6 space-y-5 text-xs text-slate-800">
              {/* Hospital Voucher Heading */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                <div>
                  <div className="text-base font-extrabold text-slate-900">
                    {isAr ? 'مستشفى الأمل التخصصي - طرابلس' : 'Al-Amal Specialized Hospital'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {isAr ? 'إدارة المستودعات والتوريد الطبي والدوائي' : 'Department of Medical Supply & Pharmacy Procurement'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">{isAr ? 'الحالة الحالية:' : 'Status:'}</span>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                    selectedPOForReview.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                    selectedPOForReview.status === 'received' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                    selectedPOForReview.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                    'bg-amber-50 text-amber-700 border-amber-300'
                  }`}>
                    {selectedPOForReview.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {selectedPOForReview.status === 'received' && <Truck className="w-3.5 h-3.5" />}
                    {selectedPOForReview.status === 'pending_approval' && <Clock className="w-3.5 h-3.5" />}
                    <span>
                      {selectedPOForReview.status === 'pending_approval' ? (isAr ? 'بانتظار الاعتماد الإلكتروني' : 'Pending Approval') :
                       selectedPOForReview.status === 'approved' ? (isAr ? 'معتمد رسمياً للتوريد' : 'Approved') :
                       selectedPOForReview.status === 'received' ? (isAr ? 'تم الاستلام والتوريد' : 'Received') : selectedPOForReview.status}
                    </span>
                  </span>
                </div>
              </div>

              {/* Order Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] block">{isAr ? 'المورد المعتمد:' : 'Supplier / Vendor:'}</span>
                  <span className="font-bold text-slate-900 text-xs truncate block">{selectedPOForReview.vendorName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">{isAr ? 'تاريخ الإنشاء:' : 'Date Issued:'}</span>
                  <span className="font-mono text-slate-800 text-xs">{selectedPOForReview.orderDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">{isAr ? 'جهة الإصدار:' : 'Issued By:'}</span>
                  <span className="font-medium text-slate-800 text-xs truncate block">{selectedPOForReview.orderedBy}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">{isAr ? 'الاعتماد الإداري:' : 'Approved By:'}</span>
                  <span className="font-medium text-slate-800 text-xs truncate block">
                    {selectedPOForReview.approvedBy ? `${selectedPOForReview.approvedBy} (${selectedPOForReview.approvedDate || ''})` : (isAr ? 'قيد المراجعة' : 'In Review')}
                  </span>
                </div>
              </div>

              {/* Automation Trigger Explanation Banner */}
              {(selectedPOForReview.isAutomatedDraft || selectedPOForReview.automationTriggerReason) && (
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-lg p-3 text-xs flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <div className="font-bold text-indigo-900">
                      {isAr ? 'مستند أمر شراء مُولّد آلياً عبر خوارزمية التوريد الذكي (Dynamic ROP)' : 'Auto-Generated Electronic Order (Dynamic ROP Engine)'}
                    </div>
                    <div className="text-indigo-800/90 text-[11px] leading-relaxed">
                      {selectedPOForReview.automationTriggerReason || (isAr ? 'تم إنشاء أمر الشراء بناء على هبوط رصيد المستلزمات الجراحية/الولادة دون حد الأمان المطلوب لتغطية فترات التوريد المتوقعة.' : 'Drafted automatically based on lead time consumption and safety stock thresholds.')}
                    </div>
                  </div>
                </div>
              )}

              {/* Order Items Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 font-bold text-slate-700 text-xs border-b border-slate-200 flex items-center justify-between">
                  <span>{isAr ? 'بنود التوريد المطلوبة:' : 'Requested Supply Line Items:'}</span>
                  <span className="font-normal text-slate-500 text-[11px]">
                    {selectedPOForReview.items.length} {isAr ? 'بند' : 'items'}
                  </span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-center w-10">#</th>
                      <th className="px-3 py-2">{isAr ? 'الصنف / المستلزم' : 'Item Description'}</th>
                      <th className="px-3 py-2 text-center">{isAr ? 'الكمية المطلوبة' : 'Quantity'}</th>
                      <th className="px-3 py-2 text-right">{isAr ? 'سعر الوحدة' : 'Unit Cost'}</th>
                      <th className="px-3 py-2 text-right">{isAr ? 'الإجمالي' : 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPOForReview.items.map((lineItem, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-center font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium text-slate-900">{lineItem.itemName}</td>
                        <td className="px-3 py-2 text-center font-mono font-bold text-slate-800">{lineItem.quantity}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-600">{lineItem.unitCost.toFixed(2)} د.ل</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">{lineItem.totalCost.toFixed(2)} د.ل</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                    <tr>
                      <td colSpan={4} className="px-3 py-2.5 text-right text-slate-700">
                        {isAr ? 'المجموع الكلي لأمر الشراء:' : 'Total PO Amount:'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm text-indigo-700">
                        {selectedPOForReview.totalAmount.toLocaleString()} د.ل
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Notes / Justification if any */}
              {selectedPOForReview.notes && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase">{isAr ? 'ملاحظات إضافية للمستودع:' : 'Additional Warehouse Notes:'}</span>
                  <p className="text-slate-700 mt-1 leading-relaxed">{selectedPOForReview.notes}</p>
                </div>
              )}

              {/* Approval & Verification Stamp Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">{isAr ? 'إقرار قسم العمليات الجراحية والولادة' : 'Surgical & Maternity Clearance'}</div>
                  <div className="flex items-center gap-2 text-slate-700 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{isAr ? 'تمت مطابقة متطلبات السلامة والأرصدة الحرجة' : 'Safety stock & lead times verified'}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">{isAr ? 'الختم الإلكتروني للخدمات الطبية' : 'Digital Electronic Stamp'}</div>
                  <div className="font-mono text-[11px] text-slate-600">
                    {selectedPOForReview.status === 'approved' || selectedPOForReview.status === 'received' ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>VERIFIED: {selectedPOForReview.approvedBy || 'Procurement Board'}</span>
                      </span>
                    ) : (
                      <span className="text-amber-600 italic">{isAr ? 'بانتظار توقيع مسؤول الإمداد الطبي' : 'Awaiting Electronic Signature'}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isAr ? 'طباعة القسيمة الرسمية' : 'Print Voucher'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowElectronicPOModal(false);
                      setSelectedPOForReview(null);
                    }}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold cursor-pointer"
                  >
                    {isAr ? 'إغلاق' : 'Close'}
                  </button>

                  {canApprovePO && selectedPOForReview.status === 'pending_approval' && (
                    <button
                      type="button"
                      onClick={async () => {
                        await handleUpdatePOStatus(selectedPOForReview.id, 'approved');
                        setSelectedPOForReview(prev => prev ? {
                          ...prev,
                          status: 'approved',
                          approvedBy: currentUser.name,
                          approvedDate: CURRENT_HMIS_DATE.toISOString().split('T')[0]
                        } : null);
                      }}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isAr ? 'اعتماد أمر الشراء إلكترونياً' : 'Approve Electronic PO'}</span>
                    </button>
                  )}

                  {selectedPOForReview.status === 'approved' && (
                    <button
                      type="button"
                      onClick={async () => {
                        await handleUpdatePOStatus(selectedPOForReview.id, 'received');
                        setShowElectronicPOModal(false);
                        setSelectedPOForReview(null);
                      }}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Truck className="w-4 h-4" />
                      <span>{isAr ? 'تأكيد استلام الشحنة وتحديث الرصيد' : 'Mark Received & Stock In'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
