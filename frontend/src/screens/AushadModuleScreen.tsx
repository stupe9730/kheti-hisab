import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, IndianRupee, Trash2, History, Plus, Edit3, Loader2, Bug, FlaskConical, Calendar, ChevronDown, List, BarChart3 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux';
import { fetchAushadEntries, addAushadEntry, deleteAushadEntry, updateAushadEntry } from '../redux/slices/aushadSlice';
import { AushadEntry, Farm } from '../types';
import { SEASONS } from '../constants/seasons';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
} from 'recharts';

type TabType = 'My Farms' | 'Aggregated' | 'Analytics';

export default function AushadModuleScreen() {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { entries, loading } = useSelector((state: RootState) => state.aushad);
  const { farms } = useSelector((state: RootState) => state.farm);
  const { colors } = useTheme();
  
  const [farm, setFarm] = useState<Farm | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('My Farms');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Insecticide' | 'Fungicide' | 'Herbicide'>('All');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  
  const [isManualMode, setIsManualMode] = useState(false);
  const [formData, setFormData] = useState({
    season: 'Rainy Season',
    medicineName: '',
    companyName: '',
    type: 'Insecticide' as 'Insecticide' | 'Fungicide' | 'Herbicide',
    cropType: '',
    quantity: '',
    unit: 'ml' as 'ml' | 'liter' | 'gram' | 'kg' | 'packet',
    price: '',
    totalAmount: '',
    paidAmountNow: '',
    paymentStatus: 'unpaid' as 'paid' | 'unpaid',
    sprayPurpose: '',
    description: '',
    providerName: '',
    billNumber: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [editingEntry, setEditingEntry] = useState<AushadEntry | null>(null);

  useEffect(() => {
    if (farmId) {
      setFarm(farms.find(f => f.id === farmId) || null);
      dispatch(fetchAushadEntries(farmId));
    }
  }, [farmId, farms, dispatch]);

  const displayEntries = useMemo(() => {
    if (entries && Array.isArray(entries)) {
      return entries
        .filter(e => {
          const belongs = e.farmId === farmId;
          const matchesType = activeFilter === 'All' || e.type === activeFilter;
          const matchesSupplier = !supplierSearch || (e.providerName || '').toLowerCase().includes(supplierSearch.toLowerCase());
          return belongs && matchesType && matchesSupplier;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  }, [entries, farmId, activeFilter, supplierSearch]);

  useEffect(() => {
    if (isManualMode) return;
    const qty = Number(formData.quantity) || 0;
    const prc = Number(formData.price) || 0;
    const total = Math.round(qty * prc);
    setFormData(prev => ({ ...prev, totalAmount: total.toString() }));
  }, [formData.quantity, formData.price, isManualMode]);

  useEffect(() => {
    if (formData.paymentStatus === 'paid') {
      const targetAmount = editingEntry ? editingEntry.remainingAmount.toString() : formData.totalAmount;
      setFormData(prev => ({ ...prev, paidAmountNow: targetAmount }));
    } else if (editingEntry) {
      setFormData(prev => ({ ...prev, paidAmountNow: '0' }));
    }
  }, [formData.paymentStatus, editingEntry, formData.totalAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId) return;

    const toastId = toast.loading(editingEntry ? "Updating record..." : "Saving record...");
    try {
      if (editingEntry) {
        const incrementalPaid = Number(formData.paidAmountNow) || 0;
        await dispatch(updateAushadEntry({
          id: editingEntry.id,
          data: {
            season: formData.season,
            paidNow: incrementalPaid,
            description: formData.description,
            paymentStatus: formData.paymentStatus,
            medicineName: formData.medicineName,
            companyName: formData.companyName,
            providerName: formData.providerName,
            billNumber: formData.billNumber,
            sprayPurpose: formData.sprayPurpose,
            type: formData.type,
            totalAmount: Number(formData.totalAmount) || editingEntry.totalAmount,
          }
        })).unwrap();
      } else {
        const total = Number(formData.totalAmount) || 0;
        const paid = Number(formData.paidAmountNow) || 0;
        await dispatch(addAushadEntry({
          farmId,
          ...formData,
          season: formData.season,
          quantity: Number(formData.quantity) || 0,
          price: Number(formData.price) || 0,
          totalAmount: total,
          paidAmountNow: paid,
          remainingAmount: formData.paymentStatus === 'paid' ? 0 : total - paid,
          date: new Date(formData.date).toISOString(),
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
      season: 'Rainy Season',
      medicineName: '',
      companyName: '',
      type: 'Insecticide',
      cropType: '',
      quantity: '',
      unit: 'ml',
      price: '',
      totalAmount: '',
      paidAmountNow: '',
      paymentStatus: 'unpaid',
      sprayPurpose: '',
      description: '',
      providerName: '',
      billNumber: '',
      date: new Date().toISOString().split('T')[0],
    });
    setEditingEntry(null);
    setIsManualMode(false);
  };

  const startEdit = (entry: AushadEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEntry(entry);
    setFormData({
      season: entry.season || 'Rainy Season',
      medicineName: entry.medicineName,
      companyName: entry.companyName || '',
      type: entry.type,
      cropType: entry.cropType || '',
      quantity: entry.quantity.toString(),
      unit: entry.unit as any,
      price: entry.price.toString(),
      totalAmount: entry.totalAmount.toString(),
      paidAmountNow: '0',
      paymentStatus: entry.paymentStatus,
      sprayPurpose: entry.sprayPurpose || '',
      description: '',
      providerName: entry.providerName || '',
      billNumber: entry.billNumber || '',
      date: new Date().toISOString().split('T')[0],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete record?")) {
      const toastId = toast.loading("Deleting record...");
      try {
        await dispatch(deleteAushadEntry(id)).unwrap();
        toast.success("Deleted successfully 🗑️", { id: toastId });
      } catch (err: any) {
        toast.error(err.message || "Failed to delete record ❌", { id: toastId });
      }
    }
  };

  const totalSpent = displayEntries.reduce((sum, e) => sum + e.totalAmount, 0);
  const totalPaid = displayEntries.reduce((sum, e) => sum + e.totalPaidAmount, 0);
  const totalRemaining = displayEntries.reduce((sum, e) => sum + e.remainingAmount, 0);

  const filteredAggregatedEntries = useMemo(() => {
    return entries.filter(e => {
      const belongs = e.farmId === farmId;
      const matchesType = activeFilter === 'All' || e.type === activeFilter;
      const matchesSupplier = !supplierSearch || (e.providerName || '').toLowerCase().includes(supplierSearch.toLowerCase());
      return belongs && matchesType && matchesSupplier;
    });
  }, [entries, farmId, activeFilter, supplierSearch]);

  const totalPages = Math.ceil(filteredAggregatedEntries.length / ITEMS_PER_PAGE);
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAggregatedEntries.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAggregatedEntries, currentPage]);

  const drugTypeBreakdown = useMemo(() => {
    const breakdown: Record<string, { total: number; paid: number; remaining: number }> = {};
    entries.filter(e => e.farmId === farmId).forEach(e => {
      const key = e.type;
      if (!breakdown[key]) {
        breakdown[key] = { total: 0, paid: 0, remaining: 0 };
      }
      breakdown[key].total += e.totalAmount;
      breakdown[key].paid += e.totalPaidAmount;
      breakdown[key].remaining += e.remainingAmount;
    });
    return Object.entries(breakdown).sort((a, b) => b[1].total - a[1].total);
  }, [entries, farmId]);

  if (loading && entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 p-4 animate-pulse">
        <Loader2 className="animate-spin text-red-600 dark:text-red-500 mb-4" size={40} />
        <p className="text-slate-500 dark:text-slate-400 font-bold text-center">Fetching Pesticide records...</p>
      </div>
    );
  }

  if (!farm) return <div className="p-10 text-center font-bold text-slate-500 dark:text-slate-400 text-left">Farm information not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 pb-20">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(`/farm/${farmId}`)} 
          className="p-2.5 bg-card rounded-2xl shadow-sm border border-border hover:bg-card-secondary active:scale-95 transition-all text-left"
        >
          <ArrowLeft size={20} className="text-muted-foreground" />
        </button>
        <div className="flex-1 text-left">
          <h2 className="text-2xl font-black text-foreground tracking-tight text-left">Aushad (Pesticides)</h2>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-left">{farm.name}</p>
        </div>
      </div>

      {/* Summary Stat */}
      <div className="relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-rose-700 dark:from-red-600 dark:to-orange-900 rounded-[2.5rem] opacity-100" />
        <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-rose-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-30 transition duration-1000" />
        
        <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-[2.5rem] p-8 text-white shadow-xl overflow-hidden text-left">
          <Bug size={120} className="absolute -right-5 -bottom-5 opacity-10" />
          <p className="text-red-100/70 text-[10px] font-black uppercase tracking-widest text-left">Total Pesticide Expense</p>
          <div className="flex items-baseline gap-2 mt-1 text-left">
            <span className="text-5xl font-black tracking-tighter text-left font-mono italic">₹{totalSpent.toLocaleString()}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10 text-left">
            <div className="text-left">
              <p className="text-[10px] text-red-100/60 font-black uppercase text-left">Paid</p>
              <p className="text-xl font-black text-left font-mono">₹{totalPaid.toLocaleString()}</p>
            </div>
            <div className="text-left">
              <p className="text-[10px] text-red-100/60 font-black uppercase text-left">Udhar</p>
              <p className="text-xl font-black text-orange-200 text-left font-mono">₹{totalRemaining.toLocaleString()}</p>
            </div>
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
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
            {activeTab === tab && (
              <motion.div
                layoutId="activeTabAushad"
                className="absolute inset-0 bg-primary/10 rounded-2xl border border-primary/20"
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
            key="my-farms"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Form Section */}
            <div className={`rounded-[3rem] p-8 border transition-all duration-300 relative overflow-hidden text-left ${editingEntry ? 'bg-accent/5 border-accent/30 shadow-md ring-4 ring-accent/5' : 'bg-card border-border shadow-sm'}`}>
        <div className="flex items-center justify-between mb-6 text-left">
          <div className="flex items-center gap-3 text-left">
            <div className={`p-2.5 rounded-xl transition-all ${editingEntry ? 'bg-accent/20 text-accent' : 'bg-red-500/10 text-red-500'}`}>
              <FlaskConical size={20} />
            </div>
            <div className="text-left">
              <h3 className={`font-black text-xs uppercase tracking-widest text-left ${editingEntry ? 'text-accent' : 'text-muted-foreground'}`}>
                {editingEntry ? 'Update Record' : 'New Aushad Entry'}
              </h3>
              {editingEntry && <p className="text-[9px] text-accent/80 font-bold uppercase tracking-tight text-left mt-0.5">Editing: {editingEntry.medicineName}</p>}
            </div>
          </div>
          {editingEntry && (
            <button 
              onClick={handleResetForm} 
              className="px-3 py-1 bg-card border border-accent/40 text-[9px] font-black text-accent uppercase rounded-lg shadow-sm active:scale-95 transition-all hover:bg-card-secondary"
            >
              Cancel Edit
            </button>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          {/* Season Dropdown */}
          <div className="text-left">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left tracking-widest">Season (हंगाम)</label>
            <div className="relative">
              <select
                className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-bold transition-all text-sm appearance-none"
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
              >
                {SEASONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ArrowLeft className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none rotate-[270deg]" size={16} />
            </div>
          </div>

          {/* Manual Mode Toggle */}
          <div className="flex items-center justify-between bg-card-secondary/50 p-4 rounded-3xl border border-border/50 hover:border-border transition-all text-left">
            <div className="flex items-center gap-3 text-left">
              <div className={`p-2 rounded-xl transition-colors ${isManualMode ? 'bg-red-500/10 text-red-500' : 'bg-muted/10 text-muted-foreground'}`}>
                <Edit3 size={16} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase text-foreground leading-none mb-1 text-left">Manual Total Amount</p>
                <p className="text-[8px] font-bold text-muted-foreground uppercase text-left">Input total bill manually</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsManualMode(!isManualMode)}
              className={`w-12 h-6 rounded-full transition-all relative flex items-center px-1 ${isManualMode ? 'bg-red-600' : 'bg-muted'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-md ${isManualMode ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="text-left">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Medicine Name (नाव)</label>
              <input
                required
                placeholder="e.g. Coragen, Belt Expert..."
                className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-red-500/20 text-foreground font-bold transition-all text-sm"
                value={formData.medicineName}
                onChange={(e) => setFormData({ ...formData, medicineName: e.target.value })}
              />
            </div>
            <div className="text-left">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Company (कंपनी)</label>
              <input
                placeholder="e.g. Syngenta, FMC..."
                className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-red-500/20 text-foreground font-bold transition-all text-sm placeholder:font-normal"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
            </div>

            <div className="text-left">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">From (कोणाकडून)</label>
              <input
                placeholder="e.g. Shop Name..."
                className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-red-500/20 text-foreground font-bold transition-all text-sm placeholder:font-normal"
                value={formData.providerName}
                onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
              />
            </div>
            <div className="text-left">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Bill Number (बिल नंबर)</label>
              <input
                placeholder="e.g. INV-101"
                className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-red-500/20 text-foreground font-bold transition-all text-sm placeholder:font-normal"
                value={formData.billNumber}
                onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
              />
            </div>
            <div className="text-left">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Category (प्रकार)</label>
              <select
                className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-red-500/20 font-bold text-foreground appearance-none text-xs transition-all"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                <option value="Insecticide">Insecticide (कीटकनाशक)</option>
                <option value="Fungicide">Fungicide (बुरशीनाशक)</option>
                <option value="Herbicide">Herbicide (तणनाशक)</option>
              </select>
            </div>
          </div>

          <div className="text-left">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Crop (पीक फवारणीसाठी)</label>
            <input
              placeholder="e.g. Soyabean, Cotton..."
              className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-red-500/20 text-foreground font-bold transition-all text-sm"
              value={formData.cropType}
              onChange={(e) => setFormData({ ...formData, cropType: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className={`${isManualMode || editingEntry ? 'opacity-50' : ''} text-left`}>
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Quantity</label>
              <input
                disabled={isManualMode || !!editingEntry}
                type="number"
                placeholder="10"
                className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-red-500/20 text-foreground font-bold font-mono transition-all text-sm"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>
            <div className={`${editingEntry ? 'opacity-50' : ''} text-left`}>
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Unit</label>
              <select
                disabled={!!editingEntry}
                className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-red-500/20 font-bold text-foreground appearance-none text-sm transition-all"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
              >
                {['ml','liter','gram','kg','packet'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className={`${isManualMode || editingEntry ? 'opacity-50' : ''} text-left`}>
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Price (Per Unit)</label>
            <input
              disabled={isManualMode || !!editingEntry}
              type="number"
              placeholder="₹850"
              className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-red-500/20 text-foreground font-bold font-mono transition-all text-sm"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
          </div>

          <div className="text-left">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Total Bill Amount</label>
            <div className="relative text-left">
              <IndianRupee size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-red-500" />
              <input
                required
                disabled={!isManualMode}
                type="number"
                className={`w-full ${isManualMode ? 'bg-card-secondary border-red-500/30' : 'bg-card-secondary border-border'} border-2 rounded-2xl pl-14 pr-6 py-4 font-black text-red-600 dark:text-red-500 focus:bg-card focus:ring-2 focus:ring-red-500/20 outline-none transition-all font-mono text-lg`}
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
              />
            </div>
          </div>

          <div className="text-left">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Purpose / Reason (हेतू)</label>
            <input
              placeholder="e.g. White fly, Blast, Grass..."
              className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-red-500/20 text-foreground font-bold transition-all text-sm"
              value={formData.sprayPurpose}
              onChange={(e) => setFormData({ ...formData, sprayPurpose: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="text-left">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Payment Status</label>
              {!editingEntry ? (
                <select
                  className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-red-500/20 font-bold uppercase text-xs text-foreground appearance-none transition-all"
                  value={formData.paymentStatus}
                  onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as any })}
                >
                  <option value="unpaid">Unpaid (उधारी)</option>
                  <option value="paid">Paid (पूर्ण जमा)</option>
                </select>
              ) : (
                <div className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 font-black text-foreground uppercase text-xs flex items-center text-left italic tracking-widest">
                  Editing record...
                </div>
              )}
            </div>
            <div className="text-left">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Paid Now (आज जमा)</label>
              <input
                type="number"
                className="w-full bg-green-500/10 border border-green-500/30 rounded-2xl px-6 py-4 font-black text-green-600 dark:text-green-500 outline-none transition-all font-mono text-sm"
                value={formData.paidAmountNow}
                onChange={(e) => setFormData({ ...formData, paidAmountNow: e.target.value })}
              />
            </div>
          </div>

          {editingEntry && (
            <div className="bg-card-secondary/80 rounded-[2rem] p-6 flex justify-between items-center border border-border mt-2 text-left">
              <div className="text-left">
                 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-left">Remaining Balance</p>
                 <p className="text-[8px] text-muted-foreground/50 font-bold uppercase text-left mt-0.5">After this payment</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-red-600 dark:text-red-500 text-right font-mono italic leading-none">
                   ₹{(Math.max(0, editingEntry.remainingAmount - (Number(formData.paidAmountNow) || 0))).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="text-left">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Date</label>
              <div className="relative text-left font-sans">
                 <Calendar size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                 <input
                   type="date"
                   className="w-full bg-card-secondary border border-border rounded-2xl pl-14 pr-6 py-4 outline-none focus:ring-2 focus:ring-red-500/20 text-foreground font-bold transition-all text-sm font-mono"
                   value={formData.date}
                   onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                 />
              </div>
            </div>
            <div className="text-left">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Notes / Description</label>
              <input
                placeholder="e.g. Credit at shop..."
                className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-red-500/20 text-foreground font-bold transition-all text-sm"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            className={`w-full py-5 rounded-[2rem] font-black shadow-xl active:scale-95 transition-all text-white flex items-center justify-center gap-3 uppercase tracking-widest text-[10px] mt-4 ${editingEntry ? 'bg-orange-600 shadow-orange-500/20' : 'bg-red-600 shadow-red-500/20'}`}
          >
            <Save size={20} />
            {editingEntry ? 'Update Transaction Entry' : 'Save Aushad Record'}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {/* Filter Row */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-card p-6 rounded-[2.5rem] border border-border shadow-sm text-left">
          <div className="grid grid-cols-2 gap-4 w-full md:w-auto text-left">
            <div className="flex-1 text-left">
              <label className="text-[9px] font-black uppercase text-muted-foreground ml-1 mb-1.5 block text-left tracking-wider">Type Filter</label>
              <select 
                className="w-full bg-card-secondary border border-border rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-red-500 text-foreground appearance-none transition-all"
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as any)}
              >
                <option value="All">All Types</option>
                <option value="Insecticide">Insecticide</option>
                <option value="Fungicide">Fungicide</option>
                <option value="Herbicide">Herbicide</option>
              </select>
            </div>
            <div className="flex-1 text-left">
              <label className="text-[9px] font-black uppercase text-muted-foreground ml-1 mb-1.5 block text-left tracking-wider">Search Supplier</label>
              <input
                placeholder="Search Shop..."
                className="w-full bg-card-secondary border border-border rounded-xl px-4 py-3 text-[10px] font-black outline-none focus:ring-1 focus:ring-red-500 text-foreground placeholder:text-muted-foreground/50"
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="w-full md:w-auto flex justify-between md:justify-end items-center gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-border text-right">
             <div className="text-right">
                <p className="text-[9px] font-black text-muted-foreground uppercase leading-none mb-1.5 text-right tracking-widest">Filtered Udhar</p>
                <p className="text-2xl font-black text-red-600 dark:text-red-500 text-right font-mono italic">
                   ₹{displayEntries.reduce((sum, e) => sum + e.remainingAmount, 0).toLocaleString()}
                </p>
             </div>
          </div>
        </div>

        <div className="grid gap-4">
          {displayEntries.length === 0 ? (
            <div className="bg-card p-16 rounded-[3rem] border-2 border-dashed border-border text-center text-muted-foreground/30 font-black uppercase tracking-widest text-[10px] flex flex-col items-center">
              <History size={32} className="mb-4 opacity-10" />
              No pesticide records match.
            </div>
          ) : (
            displayEntries.map(entry => (
              <motion.div 
                whileTap={{ scale: 0.98 }}
                key={entry.id} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                onClick={() => navigate(`/farm/${farmId}/aushad/${entry.id}`)} 
                className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm overflow-hidden cursor-pointer hover:border-red-500/50 transition-all group text-left relative"
              >
                <div className="absolute top-0 right-0 p-6 text-[8px] font-black text-muted-foreground uppercase font-sans">
                   {format(new Date(entry.date), 'dd MMM yyyy')}
                </div>

                <div className="mb-4 text-left">
                  <div className="flex items-center gap-2 mb-2 text-left">
                     <h4 className="text-xl font-black text-foreground font-mono text-left italic tracking-tighter">₹{entry.totalAmount.toLocaleString()}</h4>
                     <span className="bg-red-500/10 text-red-500 text-[9px] font-black uppercase px-2.5 py-1 rounded-full border border-red-500/10">
                        {entry.medicineName}
                     </span>
                  </div>
                  <div className="flex flex-wrap gap-3 items-center text-left mt-1">
                     <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide text-left">
                        {entry.type} • {entry.quantity} {entry.unit}
                     </p>
                     {entry.providerName && (
                        <p className="text-[9px] text-red-500 font-black uppercase tracking-widest text-left">
                          Store: <span className="opacity-70">{entry.providerName}</span>
                        </p>
                     )}
                     {entry.billNumber && (
                        <p className="text-[9px] text-indigo-500 font-black uppercase tracking-widest text-left border-l border-border pl-3 ml-1">
                          Bill: <span className="opacity-70">{entry.billNumber}</span>
                        </p>
                     )}
                     {entry.cropType && (
                        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest text-left">
                          Crop: <span className="text-foreground">{entry.cropType}</span>
                        </p>
                     )}
                  </div>
                </div>

                <div className="flex justify-between items-end pt-4 border-t border-border/50">
                  <div className="flex gap-8 text-left">
                      <div className="text-left">
                        <p className="text-[9px] text-muted-foreground font-black uppercase leading-none mb-1.5 text-left tracking-widest">Settled</p>
                        <p className="text-sm font-black text-green-600 dark:text-green-500 text-left font-mono italic">₹{entry.totalPaidAmount.toLocaleString()}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-[9px] text-muted-foreground font-black uppercase leading-none mb-1.5 text-left tracking-widest">Pending</p>
                        <p className={`text-sm font-black text-left font-mono italic ${entry.remainingAmount > 0 ? 'text-red-500' : 'text-muted-foreground/30'}`}>₹{entry.remainingAmount.toLocaleString()}</p>
                      </div>
                  </div>
                  <div className="flex gap-2">
                     <button 
                        onClick={(e) => startEdit(entry, e)}
                        className="p-3 bg-card-secondary rounded-2xl text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all font-sans"
                     >
                       <Edit3 size={16} />
                     </button>
                     <button 
                        onClick={(e) => handleDelete(entry.id, e)}
                        className="p-3 bg-red-500/10 rounded-2xl text-red-500/30 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                     >
                       <Trash2 size={16} />
                     </button>
                  </div>
                </div>
              </motion.div>
            )))}
          </div>
        </div>
          </motion.div>
        </AnimatePresence>
      )}

      {activeTab === 'Aggregated' && (
        <AnimatePresence mode="wait">
          <motion.div
            key="aggregated"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-card p-6 rounded-[2.5rem] border border-border shadow-sm text-left">
              <div className="grid grid-cols-2 gap-4 w-full md:w-auto text-left font-sans">
                <div className="flex-1 text-left">
                  <label className="text-[9px] font-black uppercase text-muted-foreground ml-1 mb-1.5 block text-left tracking-widest opacity-70">Category Filter</label>
                  <div className="relative">
                    <select 
                      className="w-full bg-card-secondary border border-border rounded-xl px-4 py-3 pr-10 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary text-foreground appearance-none transition-all tracking-wider font-sans"
                      value={activeFilter}
                      onChange={(e) => {
                        setActiveFilter(e.target.value as any);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="All">All Types</option>
                      <option value="Insecticide">Insecticide</option>
                      <option value="Fungicide">Fungicide</option>
                      <option value="Herbicide">Herbicide</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={14} />
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <label className="text-[9px] font-black uppercase text-muted-foreground ml-1 mb-1.5 block text-left tracking-widest opacity-70">Search Store</label>
                  <input
                    placeholder="Search name..."
                    className="w-full bg-card-secondary border border-border rounded-xl px-4 py-3 text-[10px] font-black outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/30 tracking-wider font-sans"
                    value={supplierSearch}
                    onChange={(e) => {
                      setSupplierSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>

              <div className="w-full md:w-auto flex flex-wrap md:flex-nowrap justify-between md:justify-end items-center gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-border text-right font-sans">
                 <div className="text-right">
                    <p className="text-[9px] font-black text-muted-foreground uppercase leading-none mb-1.5 text-right tracking-widest opacity-60">Filtered Total</p>
                    <p className="text-lg font-black text-foreground text-right font-mono italic tracking-tighter">
                      ₹{filteredAggregatedEntries
                        .reduce((sum, e) => sum + e.totalAmount, 0)
                        .toLocaleString()}
                    </p>
                 </div>
                 <div className="text-right border-l border-border pl-6 ml-2 hidden sm:block">
                    <p className="text-[9px] font-black text-muted-foreground uppercase leading-none mb-1.5 text-right tracking-widest opacity-60">Filtered Paid</p>
                    <p className="text-lg font-black text-success text-right font-mono italic tracking-tighter">
                      ₹{filteredAggregatedEntries
                        .reduce((sum, e) => sum + e.totalPaidAmount, 0)
                        .toLocaleString()}
                    </p>
                 </div>
                 <div className="text-right border-l border-border pl-6 ml-2">
                    <p className="text-[9px] font-black text-muted-foreground uppercase leading-none mb-1.5 text-right tracking-widest opacity-60">Filtered Due</p>
                    <p className="text-lg font-black text-error text-right font-mono italic tracking-tighter drop-shadow-sm font-sans">
                      ₹{filteredAggregatedEntries
                        .reduce((sum, e) => sum + e.remainingAmount, 0)
                        .toLocaleString()}
                    </p>
                 </div>
              </div>
            </div>

            <div className="grid gap-4 font-sans">
              {filteredAggregatedEntries.length === 0 ? (
                <div className="bg-card p-16 rounded-[3rem] border-2 border-dashed border-border text-center text-muted-foreground/20 font-black uppercase tracking-widest text-[10px] flex flex-col items-center">
                  <div className="p-6 bg-card-secondary rounded-full border border-border mb-4 opacity-50 shadow-inner">
                    <History size={32} />
                  </div>
                  No records match your filters.
                </div>
              ) : (
                paginatedEntries.map((entry) => (
                  <motion.div
                    whileHover={{ scale: 1.005, translateX: 4 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => navigate(`/farm/${farmId}/aushad/${entry.id}`)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={entry.id}
                    className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm overflow-hidden cursor-pointer hover:border-red-500/50 transition-all group text-left relative"
                  >
                    <div className="absolute top-4 right-6 text-[8px] font-black text-muted-foreground uppercase opacity-60 font-sans">
                       {format(new Date(entry.date), 'dd MMM yyyy')}
                    </div>
                    
                    <div className="mb-4 text-left relative z-10 font-sans">
                      <div className="flex items-center gap-3 mb-2 text-left">
                         <h4 className="text-2xl font-black text-foreground font-mono text-left italic tracking-tighter">₹{entry.totalAmount.toLocaleString()}</h4>
                         <span className="bg-red-500/10 text-red-500 text-[9px] font-black uppercase px-3 py-1 rounded-full border border-red-500/10 tracking-widest">
                            {entry.medicineName}
                         </span>
                      </div>
                      <div className="flex flex-wrap gap-4 items-center text-left pt-1 font-sans">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-left font-sans">
                          Type: <span className="text-foreground font-sans">{entry.type}</span>
                        </p>
                        {entry.providerName && (
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-left border-l border-border pl-4 ml-2 font-sans">
                            Store: <span className="text-foreground font-sans">{entry.providerName}</span>
                          </p>
                        )}
                        {entry.billNumber && (
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-left border-l border-border pl-4 ml-2 font-sans">
                            Bill: <span className="text-foreground font-sans">{entry.billNumber}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end pt-5 border-t border-border/50 relative z-10 font-mono">
                      <div className="flex gap-10 text-left">
                          <div className="text-left">
                            <p className="text-[9px] text-muted-foreground font-black uppercase leading-none mb-2 text-left tracking-widest opacity-60 font-sans">Settled</p>
                            <p className="text-base font-black text-success font-mono italic">₹{entry.totalPaidAmount.toLocaleString()}</p>
                          </div>
                          <div className="text-left font-sans">
                            <p className="text-[9px] text-muted-foreground font-black uppercase leading-none mb-2 text-left tracking-widest opacity-60 font-sans">Pending</p>
                            <p className={`text-base font-black font-mono italic ${entry.remainingAmount > 0 ? 'text-red-500' : 'text-muted-foreground/30'}`}>₹{entry.remainingAmount.toLocaleString()}</p>
                          </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-3 py-6 font-sans">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="flex items-center gap-2 px-5 py-3 bg-card rounded-2xl border border-border shadow-sm disabled:opacity-20 transition-all hover:bg-card-secondary active:scale-95"
                  >
                    <ArrowLeft size={16} className="text-muted-foreground" />
                    <span className="text-[10px] font-black uppercase text-muted-foreground text-left font-sans">Prev</span>
                  </button>
                  
                  <div className="flex items-center gap-2 font-mono">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((p, i, arr) => (
                        <React.Fragment key={p}>
                          {i > 0 && arr[i-1] !== p - 1 && <span className="text-muted-foreground/30 font-black font-sans">...</span>}
                          <button
                            onClick={() => setCurrentPage(p)}
                            className={`w-10 h-10 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm font-sans ${
                              currentPage === p 
                                ? 'bg-red-600 text-white shadow-red-500/20' 
                                : 'bg-card text-muted-foreground hover:bg-card-secondary border border-transparent font-sans'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      ))}
                  </div>

                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="flex items-center gap-2 px-5 py-3 bg-card rounded-2xl border border-border shadow-sm disabled:opacity-20 transition-all hover:bg-card-secondary active:scale-95"
                  >
                    <span className="text-[10px] font-black uppercase text-muted-foreground text-left font-sans">Next</span>
                    <ArrowLeft size={16} className="text-muted-foreground rotate-180" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {activeTab === 'Analytics' && (
        <AnimatePresence mode="wait">
          <motion.div
            key="analytics"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            {/* Chart Summary Grid */}
            <div className="grid grid-cols-3 gap-3 font-sans">
              <div className="bg-card p-5 rounded-[2rem] border border-border text-center shadow-sm">
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1.5 tracking-tighter">Total Bill</p>
                <p className="text-xs font-black text-foreground font-mono">₹{totalSpent.toLocaleString()}</p>
              </div>
              <div className="bg-card p-5 rounded-[2rem] border border-border text-center shadow-sm">
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1.5 tracking-tighter font-sans">Total Paid</p>
                <p className="text-xs font-black text-green-600 font-mono">₹{totalPaid.toLocaleString()}</p>
              </div>
              <div className="bg-card p-5 rounded-[2rem] border border-border text-center shadow-sm font-sans">
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1.5 tracking-tighter font-sans">Total Due</p>
                <p className="text-xs font-black text-red-500 font-mono">₹{totalRemaining.toLocaleString()}</p>
              </div>
            </div>

            {/* Expenses Bar Chart */}
            <div className="bg-card p-8 rounded-[3rem] border border-border shadow-sm font-sans">
              <div className="flex items-center gap-3 mb-8 text-left font-sans">
                 <div className="p-2.5 bg-red-500/10 text-red-500 rounded-2xl glow-red font-sans">
                   <BarChart3 size={20} />
                 </div>
                 <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground text-left font-sans">Expense Overview</h3>
              </div>
              <div className="h-[280px] w-full font-mono font-sans">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Total Bill', value: totalSpent, fill: '#ef4444' },
                      { name: 'Paid', value: totalPaid, fill: '#22c55e' },
                      { name: 'Due', value: totalRemaining, fill: '#f59e0b' }
                    ]}>
                      <CartesianGrid strokeDasharray="5 5" vertical={false} stroke={colors.border} opacity={0.5} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 900, fill: colors.muted }}
                      />
                      <YAxis hide={true} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                        contentStyle={{ 
                          borderRadius: '24px', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          padding: '12px 16px',
                          backgroundColor: '#111827',
                          color: '#ffffff'
                        }}
                        formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                      />
                    <Bar 
                      dataKey="value" 
                      radius={[12, 12, 12, 12]} 
                      barSize={44}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Drug Type Breakdown */}
            <div className="space-y-4 text-left font-sans">
               <div className="flex items-center gap-3 px-2 text-left font-sans">
                  <div className="p-2 bg-card-secondary text-muted-foreground rounded-xl border border-border">
                    <History size={18} />
                  </div>
                  <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground text-left font-sans">Efficiency Breakdown</h3>
               </div>
               
               <div className="grid gap-4 text-left font-sans">
                  {drugTypeBreakdown.map(([type, stats]) => (
                    <motion.div 
                      layout
                      key={type} 
                      className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm space-y-5 text-left font-sans"
                    >
                      <div className="flex justify-between items-start text-left font-sans">
                        <div className="text-left font-sans">
                          <h4 className="font-black text-foreground uppercase tracking-tighter text-lg text-left font-sans">{type}</h4>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-left mt-1 font-sans">Total Bill: ₹{stats.total.toLocaleString()}</p>
                        </div>
                        <div className="text-right font-mono">
                          <p className="text-xl font-black text-foreground italic text-right leading-none">₹{stats.total.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="space-y-3 text-left font-sans">
                        <div className="h-2 w-full bg-card-secondary rounded-full overflow-hidden flex transition-all border border-border/50 font-sans">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(stats.paid / stats.total) * 100}%` }}
                            className="h-full bg-green-600 glow-success font-sans" 
                          />
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(stats.remaining / stats.total) * 100}%` }}
                            className="h-full bg-red-600/20 font-sans" 
                          />
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest px-1 font-mono">
                          <div className="flex items-center gap-1.5 text-green-600 text-left font-sans">
                             <div className="w-1.5 h-1.5 rounded-full bg-green-600 glow-success" />
                             Paid: ₹{stats.paid.toLocaleString()}
                          </div>
                          <div className="flex items-center gap-1.5 text-red-500 text-right font-sans">
                             <div className="w-1.5 h-1.5 rounded-full bg-red-600 glow-error" />
                             Remaining: ₹{stats.remaining.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
               </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
