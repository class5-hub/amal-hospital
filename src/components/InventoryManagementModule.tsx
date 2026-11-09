import React, { useState, useEffect } from 'react';
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
  Building
} from 'lucide-react';
import { 
  InventoryItem, 
  InventoryCategory, 
  Vendor, 
  PurchaseOrder, 
  PurchaseOrderItem, 
  StockMovement, 
  SystemUser, 
  Language,
  PurchaseOrderStatus 
} from '../types/hmis.ts';
import { api } from '../api/client.ts';

interface InventoryProps {
  currentUser: SystemUser;
  language: Language;
}

export function InventoryManagementModule({ currentUser, language }: InventoryProps) {
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'catalog' | 'low_stock' | 'vendors' | 'purchase_orders' | 'movements'>('catalog');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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
                          <div className="text-slate-400 font-mono">
                            {item.batchNumber ? `B: ${item.batchNumber}` : ''} 
                            {item.expiryDate ? ` · Exp: ${item.expiryDate}` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
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
    </div>
  );
}
