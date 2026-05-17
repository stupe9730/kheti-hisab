import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Calendar, IndianRupee, History, Plus, Edit3, Loader2, BarChart3, List, Hammer, Package, Settings, Wrench, Droplets, Zap, ShieldCheck } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux';
import { fetchOtherExpenses, addOtherExpense, updateOtherExpense, deleteOtherExpense } from '../redux/slices/otherExpenseSlice';
import { OtherExpense } from '../redux/slices/otherExpenseSlice';
import { Farm } from '../types';
import { SEASONS } from '../constants/seasons';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';

type TabType = 'My Farms' | 'Aggregated' | 'Analytics';

const CATEGORIES = [
  { id: 'Drip', label: 'Drip (ठिबक)', icon: Droplets },
  { id: 'Pipe', label: 'Pipe (पाईप)', icon: Package },
  { id: 'Motor', label: 'Motor (मोटार)', icon: Zap },
  { id: 'Electric', label: 'Electric (इलेक्ट्रिक)', icon: Zap },
  { id: 'Borewell', label: 'Borewell (बोअरवेल)', icon: Droplets },
  { id: 'Repair', label: 'Repair (दुुरुस्ती)', icon: Wrench },
  { id: 'Equipment', label: 'Equipment (अवजारे)', icon: Hammer },
  { id: 'Irrigation', label: 'Irrigation (सिंचन)', icon: Droplets },
  { id: 'Fence', label: 'Fencing (तारांचे कुंपण)', icon: ShieldCheck },
  { id: 'Shed', label: 'Shed (शेड साहित्य)', icon: Package },
  { id: 'Other', label: 'Other (इतर)', icon: Settings },
];

export default function OtherExpenseScreen() {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { colors } = useTheme();
  const { items: otherExpenses, loading, error } = useSelector((state: RootState) => state.otherExpense);
  const { farms } = useSelector((state: RootState) => state.farm);
  
  const [farm, setFarm] = useState<Farm | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('My Farms');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  
  const [formData, setFormData] = useState({
    expenseName: '',
    category: 'Other',
    date: new Date().toISOString().split('T')[0],
    quantity: '',
    unit: '',
    totalAmount: '',
    paidAmount: '',
    remainingAmount: '0',
    paymentStatus: 'Unpaid' as 'Paid' | 'Unpaid' | 'Partial',
    sellerName: '',
    billNumber: '',
    notes: '',
    season: 'Rainy Season',
  });

  // Auto-calculate remaining amount based on status
  useEffect(() => {
    const total = Number(formData.totalAmount) || 0;
    
    if (formData.paymentStatus === 'Paid') {
      setFormData(prev => ({ 
        ...prev, 
        paidAmount: total.toString(), 
        remainingAmount: '0' 
      }));
    } else if (formData.paymentStatus === 'Unpaid') {
      setFormData(prev => ({ 
        ...prev, 
        paidAmount: '0', 
        remainingAmount: total.toString() 
      }));
    } else {
      // Partial: user inputs paidAmount, we calculate remaining
      const paid = Number(formData.paidAmount) || 0;
      const remaining = Math.max(0, total - paid);
      setFormData(prev => ({ ...prev, remainingAmount: remaining.toString() }));
    }
  }, [formData.totalAmount, formData.paidAmount, formData.paymentStatus]);

  const [editingEntry, setEditingEntry] = useState<OtherExpense | null>(null);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [supplierSearch, setSupplierSearch] = useState('');

  useEffect(() => {
    if (farmId) {
      setFarm(farms.find(f => f.id === farmId) || null);
      dispatch(fetchOtherExpenses(farmId));
    }
  }, [farmId, farms, dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId || !farm) return;

    const toastId = toast.loading(editingEntry ? "Updating record..." : "Saving record...");
    try {
      const totalAmt = Number(formData.totalAmount) || 0;
      const paidAmt = Number(formData.paidAmount) || 0;
      const remainingAmt = Number(formData.remainingAmount) || 0;

      if (paidAmt > totalAmt) {
        toast.error("Paid amount cannot exceed total amount ❌", { id: toastId });
        return;
      }

      if (editingEntry?.id) {
        await dispatch(updateOtherExpense({
          id: editingEntry.id,
          data: {
            expenseName: formData.expenseName,
            category: formData.category,
            date: formData.date,
            quantity: Number(formData.quantity) || 0,
            unit: formData.unit,
            totalAmount: totalAmt,
            paidAmount: paidAmt,
            remainingAmount: remainingAmt,
            sellerName: formData.sellerName,
            billNumber: formData.billNumber,
            notes: formData.notes,
            season: formData.season,
          }
        })).unwrap();
      } else {
        await dispatch(addOtherExpense({
          farmId,
          expenseName: formData.expenseName,
          category: formData.category,
          date: formData.date,
          quantity: Number(formData.quantity) || 0,
          unit: formData.unit,
          totalAmount: totalAmt,
          paidAmount: paidAmt,
          remainingAmount: remainingAmt,
          sellerName: formData.sellerName,
          billNumber: formData.billNumber,
          notes: formData.notes,
          season: formData.season,
          year: farm.year || String(new Date().getFullYear()),
        })).unwrap();
      }
      
      handleResetForm();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success(editingEntry ? "Updated successfully ✏️" : "Record saved successfully ✅", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Something went wrong ❌", { id: toastId });
    }
  };

  const handleResetForm = () => {
    setFormData({
      expenseName: '',
      category: 'Other',
      date: new Date().toISOString().split('T')[0],
      quantity: '',
      unit: '',
      totalAmount: '',
      paidAmount: '',
      remainingAmount: '0',
      paymentStatus: 'Unpaid',
      sellerName: '',
      billNumber: '',
      notes: '',
      season: 'Rainy Season',
    });
    setEditingEntry(null);
  };

  const startEdit = (entry: OtherExpense, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveTab('My Farms');
    setEditingEntry(entry);
    setFormData({
      expenseName: entry.expenseName,
      category: entry.category,
      date: entry.date,
      quantity: entry.quantity.toString(),
      unit: entry.unit,
      totalAmount: entry.totalAmount.toString(),
      paidAmount: entry.paidAmount.toString(),
      remainingAmount: entry.remainingAmount.toString(),
      paymentStatus: entry.remainingAmount === 0 ? 'Paid' : (entry.paidAmount > 0 ? 'Partial' : 'Unpaid'),
      sellerName: entry.sellerName,
      billNumber: entry.billNumber || '',
      notes: entry.notes || '',
      season: entry.season,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentFarmEntries = useMemo(() => {
    return otherExpenses.filter(e => e.farmId === farmId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [otherExpenses, farmId]);

  const totalSpent = currentFarmEntries.reduce((sum, e) => sum + e.totalAmount, 0);
  const totalPaid = currentFarmEntries.reduce((sum, e) => sum + e.paidAmount, 0);
  const totalRemaining = currentFarmEntries.reduce((sum, e) => sum + e.remainingAmount, 0);

  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    currentFarmEntries.forEach(e => {
      breakdown[e.category] = (breakdown[e.category] || 0) + e.totalAmount;
    });
    return Object.entries(breakdown).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [currentFarmEntries]);

  const filteredItems = useMemo(() => {
    return currentFarmEntries.filter(e => {
      const matchesCategory = selectedFilter === 'All' || e.category === selectedFilter;
      const matchesSupplier = !supplierSearch || e.sellerName.toLowerCase().includes(supplierSearch.toLowerCase()) || e.expenseName.toLowerCase().includes(supplierSearch.toLowerCase());
      return matchesCategory && matchesSupplier;
    });
  }, [currentFarmEntries, selectedFilter, supplierSearch]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);

  if (loading && otherExpenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 p-4 animate-pulse">
        <Loader2 className="animate-spin text-blue-600 dark:text-blue-500 mb-4" size={40} />
        <p className="text-slate-500 dark:text-slate-400 font-bold">Fetching records...</p>
      </div>
    );
  }

  if (!farm) return <div className="p-10 text-center text-slate-500 dark:text-slate-400 font-bold">Farm information not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 pb-20">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(`/farm/${farmId}`)} 
          className="p-2.5 bg-card rounded-2xl shadow-sm border border-border hover:bg-background active:scale-95 transition-all"
        >
          <ArrowLeft size={20} className="text-muted-foreground" />
        </button>
        <div className="flex-1 text-left">
          <h2 className="text-2xl font-black text-foreground tracking-tight text-left">Other Farm Expenses</h2>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-left">{farm.name} (इतर शेती खर्च)</p>
        </div>
      </div>

      {/* Summary Stat */}
      <div className="bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden text-left group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-white/20 transition-all duration-500" />
        <ShoppingBag size={120} className="absolute -right-5 -bottom-5 opacity-10 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500" />
        <p className="text-white/70 text-[10px] font-black uppercase tracking-widest text-left">Total Asset & Misc Expenses</p>
        <div className="flex items-baseline gap-2 mt-1 text-left">
          <span className="text-5xl font-black tracking-tighter text-left font-mono">₹{totalSpent.toLocaleString()}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/20 text-left">
          <div className="text-left">
            <p className="text-[10px] text-white/60 font-black uppercase text-left">Paid</p>
            <p className="text-xl font-black text-left font-mono">₹{totalPaid.toLocaleString()}</p>
          </div>
          <div className="text-left">
            <p className="text-[10px] text-white/60 font-black uppercase text-left">Remaining</p>
            <p className="text-xl font-black text-white/90 text-left font-mono">₹{totalRemaining.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 mb-4">
        <div className="flex gap-1 p-1 bg-card rounded-[2rem] border border-border min-w-max sm:min-w-0">
          {(['My Farms', 'Aggregated', 'Analytics'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 relative min-w-[120px] sm:min-w-0 ${
                activeTab === tab 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
            {activeTab === tab && (
              <motion.div
                layoutId="activeTabEx"
                className="absolute inset-0 bg-indigo-600/10 rounded-2xl border border-indigo-600/20"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {tab === 'My Farms' && <List size={14} />}
              {tab === 'Aggregated' && <History size={14} />}
              {tab === 'Analytics' && <BarChart3 size={14} />}
              {tab}
            </span>
          </button>
        ))}
        </div>
      </div>

      {activeTab === 'My Farms' && (
        <AnimatePresence mode="wait">
          <motion.div
            key="my-farms-ex"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Form */}
            <div className="bg-card rounded-[3rem] p-8 border border-border shadow-sm space-y-6 text-left">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 text-muted-foreground text-left">
                  {editingEntry ? <Edit3 size={20} /> : <Plus size={20} />}
                  <h3 className="font-black text-xs uppercase tracking-widest text-left">
                    {editingEntry ? `Update Expense: ${editingEntry.expenseName}` : 'New Other Farm Expense'}
                  </h3>
                </div>
                {editingEntry && (
                  <button onClick={handleResetForm} className="text-[10px] font-black text-error uppercase tracking-widest hover:underline px-3 py-1.5 bg-error/10 rounded-xl transition-all">Cancel Edit</button>
                )}
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Expense Name (खर्चाचे नाव)</label>
                    <input
                      required
                      placeholder="e.g. ठिबक पाईप खरेदी, नवीन मोटार"
                      className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground font-bold transition-all text-sm"
                      value={formData.expenseName}
                      onChange={(e) => setFormData({ ...formData, expenseName: e.target.value })}
                    />
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Category</label>
                    <div className="relative">
                      <select
                        className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground font-bold transition-all text-sm appearance-none"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Quantity</label>
                    <input
                      type="number"
                      placeholder="100"
                      className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground font-bold transition-all text-sm font-mono"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    />
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Unit</label>
                    <input
                      placeholder="e.g. Feet, Bundle, Nos"
                      className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground font-bold transition-all text-sm"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    />
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Season (हंगाम)</label>
                    <select
                      className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground font-bold transition-all text-sm appearance-none"
                      value={formData.season}
                      onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                    >
                      {SEASONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Total Amount</label>
                    <div className="relative">
                       <p className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</p>
                       <input
                        required
                        type="number"
                        placeholder="0"
                        className="w-full bg-card-secondary border border-border rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground font-black transition-all text-lg font-mono"
                        value={formData.totalAmount}
                        onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Payment Status</label>
                    <div className="relative">
                      <select
                        className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground font-bold transition-all text-sm appearance-none"
                        value={formData.paymentStatus}
                        onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as any })}
                      >
                        <option value="Paid">Paid (पूर्ण भरले)</option>
                        <option value="Partial">Partial (काही रक्कम भरली)</option>
                        <option value="Unpaid">Unpaid (उधारी/बाकी)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">
                      {formData.paymentStatus === 'Partial' ? 'Paid Amount' : 'Amount Info'}
                    </label>
                    <div className="relative">
                       <p className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</p>
                       <input
                        required
                        readOnly={formData.paymentStatus !== 'Partial'}
                        type="number"
                        placeholder="0"
                        className={`w-full bg-card-secondary border border-border rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500/20 font-black transition-all text-lg font-mono ${formData.paymentStatus === 'Partial' ? 'text-success' : 'text-muted-foreground opacity-60'}`}
                        value={formData.paidAmount}
                        onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                      />
                    </div>
                    {formData.paymentStatus === 'Paid' && <p className="text-[9px] text-success mt-1.5 ml-1 font-black uppercase tracking-tight italic">Full payment will be recorded</p>}
                    {formData.paymentStatus === 'Unpaid' && <p className="text-[9px] text-error mt-1.5 ml-1 font-black uppercase tracking-tight italic">Zero payment | Full amount due</p>}
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Remaining (Due)</label>
                    <div className="relative">
                       <p className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</p>
                       <input
                        readOnly
                        type="number"
                        placeholder="0"
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-border rounded-2xl pl-12 pr-6 py-4 outline-none text-muted-foreground font-black transition-all text-lg font-mono"
                        value={formData.remainingAmount}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Seller / Supplier Name</label>
                    <input
                      placeholder="Shop name or individual"
                      className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground font-bold transition-all text-sm"
                      value={formData.sellerName}
                      onChange={(e) => setFormData({ ...formData, sellerName: e.target.value })}
                    />
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Bill Number (Optional)</label>
                    <input
                      placeholder="e.g. 1234, B-99"
                      className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground font-bold transition-all text-sm"
                      value={formData.billNumber}
                      onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Date</label>
                    <div className="relative">
                      <Calendar size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <input
                        type="date"
                        className="w-full bg-card-secondary border border-border rounded-2xl pl-16 pr-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground font-bold transition-all text-sm font-mono"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Notes (टिप्पणी)</label>
                    <input
                      placeholder="Additional details..."
                      className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground font-bold transition-all text-sm"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-5 rounded-[2rem] font-black shadow-xl active:scale-95 transition-all bg-indigo-600 dark:bg-indigo-700 shadow-indigo-100 dark:shadow-none text-white uppercase tracking-widest text-[10px] mt-4"
                >
                  {editingEntry ? 'Update Other Expense Record' : 'Save Other Expense Record'}
                </button>
              </form>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {activeTab === 'Aggregated' && (
        <AnimatePresence mode="wait">
          <motion.div
            key="aggregated-ex"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Filter */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-card p-6 rounded-[2.5rem] border border-border shadow-sm text-left">
              <div className="grid grid-cols-2 gap-4 w-full md:w-auto text-left">
                <div className="flex-1 text-left">
                  <label className="text-[9px] font-black uppercase text-muted-foreground ml-1 mb-1.5 block text-left tracking-wider">Category</label>
                  <select 
                    className="w-full bg-card-secondary border border-border rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-indigo-500 text-foreground appearance-none"
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                  >
                    <option value="All">All Categories</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 text-left">
                  <label className="text-[9px] font-black uppercase text-muted-foreground ml-1 mb-1.5 block text-left tracking-wider">Search</label>
                  <input
                    placeholder="Expense or Seller..."
                    className="w-full bg-card-secondary border border-border rounded-xl px-4 py-3 text-[10px] font-black outline-none focus:ring-1 focus:ring-indigo-500 text-foreground placeholder:text-muted-foreground"
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap md:flex-nowrap justify-between items-center gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-border text-right">
                  <div className="text-right">
                    <p className="text-[9px] font-black text-muted-foreground uppercase leading-none mb-1.5 text-right tracking-widest">Total</p>
                    <p className="text-lg font-black text-foreground text-right font-mono italic">
                      ₹{filteredItems.reduce((sum, e) => sum + e.totalAmount, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-muted-foreground uppercase leading-none mb-1.5 text-right tracking-widest">Paid</p>
                    <p className="text-lg font-black text-success text-right font-mono italic">
                      ₹{filteredItems.reduce((sum, e) => sum + e.paidAmount, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-muted-foreground uppercase leading-none mb-1.5 text-right tracking-widest">Remaining</p>
                    <p className="text-lg font-black text-error text-right font-mono italic">
                      ₹{filteredItems.reduce((sum, e) => sum + e.remainingAmount, 0).toLocaleString()}
                    </p>
                  </div>
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="bg-card p-16 rounded-[3rem] border-2 border-dashed border-border text-center text-muted-foreground/30 font-black flex flex-col items-center uppercase tracking-widest text-[10px]">
                <ShoppingBag size={32} className="mb-4 opacity-10" />
                No other expenses found for this module.
              </div>
            ) : (
              <div className="grid gap-4">
                  {paginatedItems.map((entry) => (
                  <motion.div
                    key={entry.id}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="premium-card p-6 overflow-hidden cursor-pointer group text-left relative"
                  >
                    <div className="absolute top-4 right-6 text-[8px] font-black text-muted-foreground uppercase opacity-60">
                       {format(new Date(entry.date), 'dd MMM yyyy')}
                    </div>
                    
                    <div className="flex justify-between items-start mb-4 text-left">
                      <div className="text-left">
                        <div className="flex items-center gap-2 mb-2 text-left">
                           <h4 className="text-xl font-black text-foreground font-mono text-left italic">₹{entry.totalAmount.toLocaleString()}</h4>
                           <span className="bg-indigo-600/10 text-indigo-600 text-[9px] font-black uppercase px-2.5 py-1 rounded-full border border-indigo-600/10">
                              {entry.category}
                           </span>
                           {/* Payment Status Badge */}
                           {entry.remainingAmount === 0 ? (
                             <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-500/10">Paid</span>
                           ) : entry.paidAmount > 0 ? (
                             <span className="bg-orange-500/10 text-orange-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-orange-500/10">Partial</span>
                           ) : (
                             <span className="bg-red-500/10 text-red-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-red-500/10">Unpaid</span>
                           )}
                        </div>
                        <p className="text-sm font-black text-foreground uppercase tracking-tight text-left">{entry.expenseName}</p>
                        {entry.sellerName && (
                          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wide text-left mt-1">Supplier: <span className="text-foreground">{entry.sellerName}</span></p>
                        )}
                        {entry.quantity > 0 && (
                          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wide text-left">Quantity: <span className="text-foreground">{entry.quantity} {entry.unit}</span></p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end pt-4 border-t border-border/40">
                      <div className="flex gap-8 text-left">
                          <div className="text-left">
                            <p className="text-[9px] text-muted-foreground font-black uppercase leading-none mb-1.5 text-left tracking-widest">Paid</p>
                            <p className="text-sm font-black text-success text-left font-mono italic">₹{entry.paidAmount.toLocaleString()}</p>
                          </div>
                          <div className="text-left">
                            <p className="text-[9px] text-muted-foreground font-black uppercase leading-none mb-1.5 text-left tracking-widest">Pending</p>
                            <p className="text-sm font-black text-error text-left font-mono italic">₹{entry.remainingAmount.toLocaleString()}</p>
                          </div>
                      </div>
                      <div className="flex gap-2">
                        <div 
                          onClick={(e) => {
                            if (window.confirm('Are you sure you want to delete this record?')) {
                              dispatch(deleteOtherExpense(entry.id!));
                            }
                            e.stopPropagation();
                          }}
                          className="p-3 bg-error/5 border border-error/10 rounded-xl text-error hover:bg-error/10 transition-all"
                        >
                           <History size={16} />
                        </div>
                        <div 
                          onClick={(e) => startEdit(entry, e)}
                          className="p-3 bg-card-secondary border border-border rounded-xl text-muted-foreground hover:text-indigo-600 hover:border-indigo-600/30 transition-all"
                        >
                           <Edit3 size={16} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 py-6">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="p-3 bg-card rounded-2xl border border-border disabled:opacity-30 active:scale-95 transition-all"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Page {currentPage} of {totalPages}</span>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="p-3 bg-card rounded-2xl border border-border disabled:opacity-30 active:scale-95 transition-all"
                    >
                      <ArrowLeft size={16} className="rotate-180" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {activeTab === 'Analytics' && (
        <AnimatePresence mode="wait">
          <motion.div
            key="analytics-ex"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            {/* Chart */}
            <div className="premium-card p-8">
              <div className="flex items-center gap-3 mb-8 text-left">
                 <div className="p-2.5 bg-indigo-600/10 text-indigo-600 rounded-2xl">
                   <BarChart3 size={20} />
                 </div>
                 <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground text-left">Category Wise Investment</h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryBreakdown}>
                      <CartesianGrid strokeDasharray="5 5" vertical={false} stroke={colors.border} opacity={0.5} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 900, fill: colors.muted }}
                      />
                      <YAxis hide={true} />
                      <RechartsTooltip 
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                        contentStyle={{ 
                          borderRadius: '24px', 
                          border: 'none',
                          boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', 
                          padding: '12px 16px',
                          backgroundColor: '#1a1f29',
                          color: '#ffffff'
                        }}
                        formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Amount']}
                      />
                    <Bar 
                      dataKey="value" 
                      radius={[12, 12, 12, 12]} 
                      barSize={40}
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#8b5cf6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* List breakdown */}
            <div className="grid gap-4">
              {categoryBreakdown.map((item) => (
                <div key={item.name} className="premium-card p-6 flex justify-between items-center group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600/5 text-indigo-600 rounded-2xl border border-indigo-600/10 group-hover:scale-110 transition-transform">
                      {React.createElement(CATEGORIES.find(c => c.id === item.name)?.icon || Settings, { size: 18 })}
                    </div>
                    <div>
                      <p className="font-black text-foreground uppercase tracking-tight">{item.name}</p>
                      <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60">Category Total</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-foreground font-mono italic">₹{item.value.toLocaleString()}</p>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{((item.value / totalSpent) * 100).toFixed(1)}% Share</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
