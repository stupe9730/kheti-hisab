import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, IndianRupee, Trash2, History, Plus, Edit3, Loader2, Percent, Sprout, Calendar, ChevronDown, List, BarChart3 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux';
import { fetchSeedEntries, addSeedEntry, deleteSeedEntry, updateSeedEntry } from '../redux/slices/seedSlice';
import { SeedEntry, Farm } from '../types';
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

export default function SeedModuleScreen() {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { entries, loading } = useSelector((state: RootState) => state.seed);
  const { farms } = useSelector((state: RootState) => state.farm);
  const { colors } = useTheme();
  
  const [farm, setFarm] = useState<Farm | null>(null);
  const [displayEntries, setDisplayEntries] = useState<SeedEntry[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('My Farms');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  
  const [isManualMode, setIsManualMode] = useState(false);
  const [formData, setFormData] = useState({
    season: 'Rainy Season',
    seedName: '',
    seedCompany: '',
    cropType: '',
    quantity: '',
    unit: 'kg' as 'kg' | 'gram' | 'packet',
    price: '',
    totalAmount: '',
    paidAmountNow: '',
    paymentStatus: 'unpaid' as 'paid' | 'unpaid',
    interest: '0',
    description: '',
    providerName: '',
    billNumber: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [editingEntry, setEditingEntry] = useState<SeedEntry | null>(null);
  const [selectedCropFilter, setSelectedCropFilter] = useState('All');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [revisionMessage, setRevisionMessage] = useState('');

  useEffect(() => {
    if (farmId) {
      setFarm(farms.find(f => f.id === farmId) || null);
      dispatch(fetchSeedEntries(farmId));
    }
  }, [farmId, farms, dispatch]);

  useEffect(() => {
    if (entries && Array.isArray(entries)) {
      const filtered = entries.filter(e => e.farmId === farmId);
      setDisplayEntries([...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }
  }, [entries, farmId]);

  // Auto-calculate logic
  useEffect(() => {
    if (isManualMode) return;

    const qty = Number(formData.quantity) || 0;
    const prc = Number(formData.price) || 0;
    const total = Math.round(qty * prc);

    setFormData(prev => {
      const updates: any = { totalAmount: total.toString() };
      if (prev.paymentStatus === 'paid') {
        if (editingEntry) {
          updates.paidAmountNow = editingEntry.remainingAmount.toString();
        } else {
          updates.paidAmountNow = total.toString();
        }
      }
      return { ...prev, ...updates };
    });

    if (editingEntry) {
      const hasPriceChanged = prc !== editingEntry.price || qty !== editingEntry.quantity;
      setRevisionMessage(hasPriceChanged ? "Price/Qty updated" : "");
    }
  }, [formData.quantity, formData.price, isManualMode, formData.paymentStatus, editingEntry]);

  // Handle Payment Status changes
  useEffect(() => {
    if (formData.paymentStatus === 'paid') {
      const targetAmount = editingEntry ? editingEntry.remainingAmount.toString() : formData.totalAmount;
      setFormData(prev => ({
        ...prev,
        paidAmountNow: targetAmount,
        interest: '0'
      }));
    } else if (editingEntry) {
      setFormData(prev => ({ ...prev, paidAmountNow: '0' }));
    }
  }, [formData.paymentStatus, editingEntry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId) return;

    const toastId = toast.loading(editingEntry ? "Updating record..." : "Saving record...");
    try {
      if (editingEntry) {
        const incrementalPaid = Number(formData.paidAmountNow) || 0;
        await dispatch(updateSeedEntry({
          id: editingEntry.id,
          data: {
            season: formData.season,
            paidNow: incrementalPaid,
            description: formData.description,
            seedCompany: formData.seedCompany,
            providerName: formData.providerName,
            billNumber: formData.billNumber,
            paymentStatus: formData.paymentStatus,
            totalAmount: Number(formData.totalAmount) || editingEntry.totalAmount,
          }
        })).unwrap();
      } else {
        const total = Number(formData.totalAmount) || 0;
        const paid = Number(formData.paidAmountNow) || 0;
        const remaining = formData.paymentStatus === 'paid' ? 0 : total - paid;

        await dispatch(addSeedEntry({
          farmId,
          season: formData.season,
          seedName: formData.seedName,
          seedCompany: formData.seedCompany,
          providerName: formData.providerName,
          billNumber: formData.billNumber,
          cropType: formData.cropType,
          quantity: Number(formData.quantity) || 0,
          unit: formData.unit,
          price: Number(formData.price) || 0,
          totalAmount: total,
          paidAmountNow: paid,
          remainingAmount: remaining,
          paymentStatus: formData.paymentStatus,
          interest: formData.paymentStatus === 'paid' ? 0 : (Number(formData.interest) || 0),
          description: formData.description,
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
      seedName: '',
      seedCompany: '',
      cropType: '',
      quantity: '',
      unit: 'kg',
      price: '',
      totalAmount: '',
      paidAmountNow: '',
      paymentStatus: 'unpaid',
      interest: '0',
      description: '',
      providerName: '',
      billNumber: '',
      date: new Date().toISOString().split('T')[0],
    });
    setEditingEntry(null);
    setIsManualMode(false);
    setRevisionMessage('');
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCropFilter, supplierSearch]);

  const startEdit = (entry: SeedEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveTab('My Farms');
    setEditingEntry(entry);
    setFormData({
      season: entry.season || 'Rainy Season',
      seedName: entry.seedName,
      seedCompany: entry.seedCompany || '',
      cropType: entry.cropType,
      quantity: entry.quantity.toString(),
      unit: entry.unit as any,
      price: entry.price.toString(),
      totalAmount: entry.totalAmount.toString(),
      paidAmountNow: '0',
      paymentStatus: entry.paymentStatus,
      interest: entry.interest.toString(),
      description: '',
      providerName: entry.providerName || '',
      billNumber: entry.billNumber || '',
      date: new Date().toISOString().split('T')[0],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this seed record?")) {
      const toastId = toast.loading("Deleting record...");
      try {
        await dispatch(deleteSeedEntry(id)).unwrap();
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
    return displayEntries.filter(e => {
      const matchesCrop = selectedCropFilter === 'All' || e.cropType === selectedCropFilter;
      const matchesSupplier = !supplierSearch || (e.providerName || '').toLowerCase().includes(supplierSearch.toLowerCase());
      return matchesCrop && matchesSupplier;
    });
  }, [displayEntries, selectedCropFilter, supplierSearch]);

  const totalPages = Math.ceil(filteredAggregatedEntries.length / ITEMS_PER_PAGE);
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAggregatedEntries.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAggregatedEntries, currentPage]);

  const seedTypeBreakdown = useMemo(() => {
    const breakdown: Record<string, { total: number; paid: number; remaining: number }> = {};
    displayEntries.forEach(e => {
      const key = e.seedName;
      if (!breakdown[key]) {
        breakdown[key] = { total: 0, paid: 0, remaining: 0 };
      }
      breakdown[key].total += e.totalAmount;
      breakdown[key].paid += e.totalPaidAmount;
      breakdown[key].remaining += e.remainingAmount;
    });
    return Object.entries(breakdown).sort((a, b) => b[1].total - a[1].total);
  }, [displayEntries]);

  if (loading && entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 p-4 animate-pulse">
        <Loader2 className="animate-spin text-blue-600 dark:text-blue-500 mb-4" size={40} />
        <p className="text-slate-500 dark:text-slate-400 font-bold">Fetching Seed records...</p>
      </div>
    );
  }

  if (!farm) return <div className="p-10 text-center text-slate-500 dark:text-slate-400 font-bold text-left">Farm information not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 pb-20">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(`/farm/${farmId}`)} 
          className="p-3 bg-card rounded-2xl shadow-sm border border-border hover:bg-background active:scale-95 transition-all text-left"
        >
          <ArrowLeft size={20} className="text-muted-foreground" />
        </button>
        <div className="flex-1 text-left">
          <h1 className="text-2xl font-black text-foreground tracking-tight text-left">Seeds (Beej)</h1>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-left">{farm.name}</p>
        </div>
      </div>

      {/* Summary Stat */}
      <div className="bg-primary rounded-[2.5rem] p-8 text-primary-foreground shadow-2xl shadow-primary/20 relative overflow-hidden text-left border border-white/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <Sprout size={120} className="absolute -right-5 -bottom-5 opacity-10" />
        <p className="text-primary-foreground/70 text-[10px] font-black uppercase tracking-widest text-left">Total Seed Expense</p>
        <div className="flex items-baseline gap-2 mt-1 text-left relative z-10">
          <span className="text-5xl font-black tracking-tighter text-left font-mono italic">₹{totalSpent.toLocaleString()}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10 text-left relative z-10">
          <div className="text-left">
            <p className="text-[10px] text-primary-foreground/60 font-black uppercase text-left tracking-wider">Paid</p>
            <p className="text-xl font-black text-left font-mono">₹{totalPaid.toLocaleString()}</p>
          </div>
          <div className="text-left">
            <p className="text-[10px] text-primary-foreground/60 font-black uppercase text-left tracking-wider">Udhar</p>
            <p className="text-xl font-black text-warning-foreground text-left font-mono">₹{totalRemaining.toLocaleString()}</p>
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
                layoutId="activeTabSeed"
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
            <div className={`rounded-[3rem] p-8 border transition-all duration-300 relative overflow-hidden text-left ${editingEntry ? 'bg-warning/5 border-warning/30 shadow-xl shadow-warning/5 ring-4 ring-warning/5' : 'bg-card border-border shadow-sm'}`}>
        <div className="flex items-center justify-between mb-6 text-left">
          <div className="flex items-center gap-3 text-left">
            <div className={`p-3 rounded-2xl transition-all border ${editingEntry ? 'bg-warning/10 text-warning border-warning/20' : 'bg-card-secondary text-muted-foreground border-border'}`}>
              {editingEntry ? <Edit3 size={20} /> : <Plus size={20} />}
            </div>
            <div className="text-left">
              <h3 className={`font-black text-xs uppercase tracking-widest text-left ${editingEntry ? 'text-warning' : 'text-muted-foreground'}`}>
                {editingEntry ? 'Update Seed Receipt' : 'New Seed Entry'}
              </h3>
              {editingEntry && <p className="text-[9px] text-warning/80 font-bold uppercase tracking-tight text-left mt-0.5">Editing: {editingEntry.seedName}</p>}
            </div>
          </div>
          {editingEntry && (
            <button 
              onClick={handleResetForm} 
              className="px-4 py-2 bg-card border border-warning/30 text-[9px] font-black text-warning uppercase rounded-xl shadow-sm active:scale-95 transition-all hover:bg-card-secondary"
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
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
            </div>
          </div>

          <div className="flex items-center justify-between bg-card-secondary p-4 rounded-3xl border border-border group transition-all text-left">
            <div className="flex items-center gap-3 text-left">
              <div className={`p-2.5 rounded-xl transition-all border ${isManualMode ? 'bg-primary/10 text-primary border-primary/20' : 'bg-card text-muted-foreground border-border'}`}>
                <Edit3 size={16} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase text-foreground leading-none mb-1 text-left tracking-tight">Manual Total Amount</p>
                <p className="text-[8px] font-bold text-muted-foreground uppercase text-left tracking-widest">Input total bill manually</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsManualMode(!isManualMode)}
              className={`w-12 h-6 rounded-full transition-all relative flex items-center px-1 border border-white/10 ${isManualMode ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-md ${isManualMode ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="text-left">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left tracking-widest">Seed Name (बियाण्याचे नाव)</label>
              <input
                required
                disabled={!!editingEntry}
                placeholder="e.g. Mahyco 51, Hybrid..."
                className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-bold transition-all text-sm"
                value={formData.seedName}
                onChange={(e) => setFormData({ ...formData, seedName: e.target.value })}
              />
            </div>
            <div className="text-left">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left tracking-widest">Seed Company (कंपनी)</label>
              <input
                placeholder="e.g. Mahyco, Pioneer..."
                className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-bold transition-all text-sm placeholder:font-normal"
                value={formData.seedCompany}
                onChange={(e) => setFormData({ ...formData, seedCompany: e.target.value })}
              />
            </div>

            <div className="text-left">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left tracking-widest">From (कोणाकडून)</label>
              <input
                placeholder="e.g. Krushi Seva Kendra..."
                className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-bold transition-all text-sm placeholder:font-normal"
                value={formData.providerName}
                onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
              />
            </div>
            <div className="text-left">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left tracking-widest">Bill Number (बिल नंबर)</label>
              <input
                placeholder="e.g. BILL-45"
                className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-bold transition-all text-sm placeholder:font-normal"
                value={formData.billNumber}
                onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
              />
            </div>
            <div className={`${editingEntry ? 'opacity-50' : ''} text-left`}>
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left tracking-widest">Crop Type (पिकाचा प्रकार)</label>
              <input
                required
                disabled={!!editingEntry}
                placeholder="e.g. Soyabean, Cotton..."
                className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-bold transition-all text-sm"
                value={formData.cropType}
                onChange={(e) => setFormData({ ...formData, cropType: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className={`${editingEntry || isManualMode ? 'opacity-50' : ''} text-left`}>
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left tracking-widest">Quantity</label>
              <input
                required={!isManualMode}
                disabled={!!editingEntry || isManualMode}
                type="number"
                placeholder="10"
                className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-bold font-mono transition-all text-sm"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>
            <div className={`${editingEntry ? 'opacity-50' : ''} text-left`}>
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left tracking-widest">Unit</label>
              <div className="relative">
                <select
                  disabled={!!editingEntry}
                  className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 font-bold text-foreground appearance-none text-[10px] transition-all uppercase tracking-widest pr-10"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
                >
                  <option value="kg">kg (किलो)</option>
                  <option value="gram">gram (ग्रॅम)</option>
                  <option value="packet">packet (पाकीट)</option>
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="text-left">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left tracking-widest">Price (Per {formData.unit})</label>
            <div className="relative">
              <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <input
                required={!isManualMode}
                disabled={isManualMode}
                type="number"
                placeholder="₹850"
                className="w-full bg-card-secondary border border-border rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-bold font-mono transition-all text-sm"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
          </div>

          <div className="text-left">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left tracking-widest">Total Amount</label>
            <div className="relative">
              <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 text-primary" size={20} />
              <input
                required
                disabled={!isManualMode}
                type="number"
                className={`w-full ${isManualMode ? 'bg-card border-primary/30' : 'bg-card-secondary border-border'} border-2 rounded-2xl pl-12 pr-6 py-4 font-black text-primary focus:bg-card focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono text-xl`}
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="text-left">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left tracking-widest">Payment Status</label>
              <div className="relative">
                <select
                  className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 font-bold uppercase text-[10px] text-foreground appearance-none transition-all pr-12 tracking-wider"
                  value={formData.paymentStatus}
                  onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as 'paid' | 'unpaid' })}
                >
                  <option value="unpaid">Unpaid (उधारी)</option>
                  <option value="paid">Full Paid (पूर्ण जमा)</option>
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
              </div>
            </div>
            <div className="text-left">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left tracking-widest">
                {editingEntry ? 'Paid Now (आज जमा)' : 'Paid Amount (जमा रक्कम)'}
              </label>
              <div className="relative text-left">
                <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <input
                  type="number"
                  placeholder="0"
                  className={`w-full bg-card-secondary border border-border rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-black text-success font-mono text-sm ${formData.paymentStatus === 'paid' && !editingEntry ? 'opacity-50 cursor-not-allowed' : ''}`}
                  value={formData.paidAmountNow}
                  onChange={(e) => setFormData({ ...formData, paidAmountNow: e.target.value })}
                />
              </div>
            </div>
          </div>

          {editingEntry && (
            <div className="bg-card-secondary rounded-[2rem] p-6 flex justify-between items-center border border-border mt-2 text-left relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 rotate-12 transition-transform group-hover:scale-175 group-hover:rotate-0">
                <IndianRupee size={80} className="text-error" />
              </div>
              <div className="text-left relative z-10">
                 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-left">Remaining Balance</p>
                 <p className="text-[8px] text-muted-foreground/50 font-black uppercase text-left mt-1 tracking-tighter">After applied payment</p>
              </div>
              <div className="text-right relative z-10">
                <p className="text-2xl font-black text-error text-right font-mono italic leading-none drop-shadow-sm">
                  ₹{(Math.max(0, editingEntry.remainingAmount - (Number(formData.paidAmountNow) || 0))).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {formData.paymentStatus === 'unpaid' && (
            <div className="text-left">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block flex items-center gap-1.5 text-left tracking-widest">Interest Percentage <Percent size={12} /></label>
              <div className="relative">
                <Percent className="absolute left-6 top-1/2 -translate-y-1/2 text-warning" size={14} />
                <input
                  type="number"
                  className="w-full bg-card-secondary border border-border rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-black text-warning font-mono text-sm"
                  value={formData.interest}
                  onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="text-left">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left tracking-widest">Date</label>
              <div className="relative text-left font-sans">
                 <Calendar size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                 <input
                   type="date"
                   className="w-full bg-card-secondary border border-border rounded-2xl pl-14 pr-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-bold transition-all text-sm font-mono appearance-none"
                   value={formData.date}
                   onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                 />
              </div>
            </div>
            <div className="text-left">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left tracking-widest">Notes / Description</label>
              <input
                placeholder="e.g. Details about seeds..."
                className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-bold transition-all text-sm"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            className={`w-full py-5 rounded-[2rem] font-black shadow-2xl active:scale-98 transition-all relative overflow-hidden group ${editingEntry ? 'bg-warning text-white shadow-warning/20' : 'bg-primary text-primary-foreground shadow-primary/20'} uppercase tracking-widest text-[10px] mt-4`}
          >
            <div className="absolute inset-0 bg-white/10 translate-y-full translate-x-full rotate-45 transition-transform group-hover:translate-y-0 group-hover:translate-x-0 group-hover:rotate-0" />
            <span className="relative z-10">{editingEntry ? 'Update Receipt (Save Revision)' : 'Save Seed Record'}</span>
          </button>
        </form>
      </div>

      {/* History List */}
      <div className="space-y-4">
        {/* Filter Row */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-card p-6 rounded-[2.5rem] border border-border shadow-sm text-left">
          <div className="grid grid-cols-2 gap-4 w-full md:w-auto text-left">
            <div className="flex-1 text-left font-sans">
              <label className="text-[9px] font-black uppercase text-muted-foreground ml-1 mb-1.5 block text-left tracking-widest opacity-70">Crop Filter</label>
              <div className="relative">
                <select 
                  className="w-full bg-card-secondary border border-border rounded-xl px-4 py-3 pr-10 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary text-foreground appearance-none transition-all tracking-wider"
                  value={selectedCropFilter}
                  onChange={(e) => setSelectedCropFilter(e.target.value)}
                >
                  <option value="All">All Crops</option>
                  {Array.from(new Set(displayEntries.map(e => e.cropType))).sort().map(crop => (
                    <option key={crop} value={crop}>{crop}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={14} />
              </div>
            </div>
            <div className="flex-1 text-left font-sans">
              <label className="text-[9px] font-black uppercase text-muted-foreground ml-1 mb-1.5 block text-left tracking-widest opacity-70">Search Supplier</label>
              <input
                placeholder="Search name..."
                className="w-full bg-card-secondary border border-border rounded-xl px-4 py-3 text-[10px] font-black outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/30 tracking-wider"
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="w-full md:w-auto flex justify-between md:justify-end items-center gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-border text-right font-sans">
             <div className="text-right">
                <p className="text-[9px] font-black text-muted-foreground uppercase leading-none mb-1.5 text-right tracking-widest opacity-60">Filtered Udhar</p>
                <p className="text-2xl font-black text-error text-right font-mono italic tracking-tighter drop-shadow-sm">
                  ₹{displayEntries
                    .filter(e => {
                      const matchesCrop = selectedCropFilter === 'All' || e.cropType === selectedCropFilter;
                      const matchesSupplier = !supplierSearch || (e.providerName || '').toLowerCase().includes(supplierSearch.toLowerCase());
                      return matchesCrop && matchesSupplier;
                    })
                    .reduce((sum, e) => sum + e.remainingAmount, 0)
                    .toLocaleString()}
                </p>
             </div>
          </div>
        </div>

        <div className="grid gap-4">
          {displayEntries.filter(e => {
            const matchesCrop = selectedCropFilter === 'All' || e.cropType === selectedCropFilter;
            const matchesSupplier = !supplierSearch || (e.providerName || '').toLowerCase().includes(supplierSearch.toLowerCase());
            return matchesCrop && matchesSupplier;
          }).length === 0 ? (
            <div className="bg-card p-16 rounded-[3rem] border-2 border-dashed border-border text-center text-muted-foreground/20 font-black uppercase tracking-widest text-[10px] flex flex-col items-center">
              <div className="p-6 bg-card-secondary rounded-full border border-border mb-4 opacity-50 shadow-inner">
                <History size={32} />
              </div>
              No records found.
            </div>
          ) : (
            displayEntries
              .filter(e => {
                const matchesCrop = selectedCropFilter === 'All' || e.cropType === selectedCropFilter;
                const matchesSupplier = !supplierSearch || (e.providerName || '').toLowerCase().includes(supplierSearch.toLowerCase());
                return matchesCrop && matchesSupplier;
              })
              .map((entry) => (
                <motion.div
                  whileHover={{ scale: 1.005, translateX: 4 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate(`/farm/${farmId}/seeds/${entry.id}`)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={entry.id}
                  className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm overflow-hidden cursor-pointer hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all group text-left relative"
                >
                  <div className="absolute top-0 right-0 p-6">
                     <span className="text-[10px] font-black text-muted-foreground uppercase opacity-40 group-hover:opacity-100 transition-opacity font-sans">
                        {format(new Date(entry.date), 'dd MMM yyyy')}
                     </span>
                  </div>

                  <div className="mb-4 text-left relative z-10 font-sans">
                    <div className="flex items-center gap-3 mb-2 text-left">
                       <h4 className="text-2xl font-black text-foreground font-mono text-left italic tracking-tighter">₹{entry.totalAmount.toLocaleString()}</h4>
                       <span className="bg-primary/10 text-primary text-[9px] font-black uppercase px-3 py-1 rounded-full border border-primary/10 tracking-widest">
                          {entry.seedName}
                       </span>
                    </div>
                    <div className="flex flex-wrap gap-4 items-center text-left pt-2">
                       <div className="flex items-center gap-1.5">
                         <div className="w-1.5 h-1.5 rounded-full bg-accent/40" />
                         <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-left">
                            Qty: <span className="text-foreground">{entry.quantity} {entry.unit}</span> @ ₹{entry.price}
                         </p>
                       </div>
                       {entry.providerName && (
                        <div className="flex items-center gap-1.5">
                           <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                           <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-left">
                             From: <span className="text-foreground">{entry.providerName}</span>
                           </p>
                        </div>
                       )}
                       {entry.billNumber && (
                        <div className="flex items-center gap-1.5 border-l border-border pl-4 ml-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40" />
                           <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-left">
                             Bill: <span className="text-foreground">{entry.billNumber}</span>
                           </p>
                        </div>
                       )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end pt-5 border-t border-border/50 relative z-10 font-mono">
                    <div className="flex gap-10 text-left">
                        <div className="text-left group/paid">
                          <p className="text-[9px] text-muted-foreground font-black uppercase leading-none mb-2 text-left tracking-widest opacity-60 group-hover/paid:opacity-100 transition-opacity">Settled</p>
                          <p className="text-base font-black text-success text-left font-mono italic tracking-tighter">₹{entry.totalPaidAmount.toLocaleString()}</p>
                        </div>
                        <div className="text-left group/pending">
                          <p className="text-[9px] text-muted-foreground font-black uppercase leading-none mb-2 text-left tracking-widest opacity-60 group-hover/pending:opacity-100 transition-opacity">Pending</p>
                          <p className={`text-base font-black text-left font-mono italic tracking-tighter ${entry.remainingAmount > 0 ? 'text-error' : 'text-muted-foreground/30'}`}>₹{entry.remainingAmount.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                       <button 
                          onClick={(e) => startEdit(entry, e)}
                          className="p-3.5 bg-card-secondary border border-border rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 hover:border-primary/20 transition-all active:scale-90"
                       >
                         <Edit3 size={16} />
                       </button>
                       <button 
                          onClick={(e) => handleDelete(entry.id, e)}
                          className="p-3.5 bg-error/5 border border-error/10 rounded-xl text-error/30 hover:text-error hover:bg-error/10 hover:border-error/20 transition-all opacity-0 group-hover:opacity-100 active:scale-90 font-sans"
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
                  <label className="text-[9px] font-black uppercase text-muted-foreground ml-1 mb-1.5 block text-left tracking-widest opacity-70">Crop Filter</label>
                  <div className="relative">
                    <select 
                      className="w-full bg-card-secondary border border-border rounded-xl px-4 py-3 pr-10 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary text-foreground appearance-none transition-all tracking-wider"
                      value={selectedCropFilter}
                      onChange={(e) => {
                        setSelectedCropFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="All">All Crops</option>
                      {Array.from(new Set(displayEntries.map(e => e.cropType))).sort().map(crop => (
                        <option key={crop} value={crop}>{crop}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={14} />
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <label className="text-[9px] font-black uppercase text-muted-foreground ml-1 mb-1.5 block text-left tracking-widest opacity-70">Search Store</label>
                  <input
                    placeholder="Search name..."
                    className="w-full bg-card-secondary border border-border rounded-xl px-4 py-3 text-[10px] font-black outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/30 tracking-wider"
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
                    <p className="text-lg font-black text-error text-right font-mono italic tracking-tighter drop-shadow-sm">
                      ₹{filteredAggregatedEntries
                        .reduce((sum, e) => sum + e.remainingAmount, 0)
                        .toLocaleString()}
                    </p>
                 </div>
              </div>
            </div>

            <div className="grid gap-4">
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
                    onClick={() => navigate(`/farm/${farmId}/seeds/${entry.id}`)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={entry.id}
                    className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm overflow-hidden cursor-pointer hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all group text-left relative"
                  >
                    <div className="absolute top-4 right-6 text-[8px] font-black text-muted-foreground uppercase opacity-60 font-sans">
                       {format(new Date(entry.date), 'dd MMM yyyy')}
                    </div>
                    
                    <div className="mb-4 text-left relative z-10 font-sans">
                      <div className="flex items-center gap-3 mb-2 text-left">
                         <h4 className="text-2xl font-black text-foreground font-mono text-left italic tracking-tighter">₹{entry.totalAmount.toLocaleString()}</h4>
                         <span className="bg-primary/10 text-primary text-[9px] font-black uppercase px-3 py-1 rounded-full border border-primary/10 tracking-widest">
                            {entry.seedName}
                         </span>
                      </div>
                      <div className="flex flex-wrap gap-4 items-center text-left pt-2 font-sans">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-left">
                          Qty: <span className="text-foreground">{entry.quantity} {entry.unit}</span> @ ₹{entry.price}
                        </p>
                        {entry.providerName && (
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-left border-l border-border pl-4 ml-2">
                            Store: <span className="text-foreground">{entry.providerName}</span>
                          </p>
                        )}
                        {entry.billNumber && (
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-left border-l border-border pl-4 ml-2">
                            Bill: <span className="text-foreground">{entry.billNumber}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end pt-5 border-t border-border/50 relative z-10 font-mono">
                      <div className="flex gap-10 text-left">
                          <div className="text-left">
                            <p className="text-[9px] text-muted-foreground font-black uppercase leading-none mb-2 text-left tracking-widest opacity-60">Settled</p>
                            <p className="text-base font-black text-success font-mono italic">₹{entry.totalPaidAmount.toLocaleString()}</p>
                          </div>
                          <div className="text-left">
                            <p className="text-[9px] text-muted-foreground font-black uppercase leading-none mb-2 text-left tracking-widest opacity-60">Pending</p>
                            <p className={`text-base font-black font-mono italic ${entry.remainingAmount > 0 ? 'text-error' : 'text-muted-foreground/30'}`}>₹{entry.remainingAmount.toLocaleString()}</p>
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
                    <span className="text-[10px] font-black uppercase text-muted-foreground text-left">Prev</span>
                  </button>
                  
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((p, i, arr) => (
                        <React.Fragment key={p}>
                          {i > 0 && arr[i-1] !== p - 1 && <span className="text-muted-foreground/30 font-black">...</span>}
                          <button
                            onClick={() => setCurrentPage(p)}
                            className={`w-10 h-10 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${
                              currentPage === p 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-card text-muted-foreground hover:bg-card-secondary border border-transparent'
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
                    <span className="text-[10px] font-black uppercase text-muted-foreground text-left">Next</span>
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
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card p-5 rounded-[2rem] border border-border text-center shadow-sm">
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1.5 tracking-tighter">Total Bill</p>
                <p className="text-xs font-black text-foreground font-mono">₹{totalSpent.toLocaleString()}</p>
              </div>
              <div className="bg-card p-5 rounded-[2rem] border border-border text-center shadow-sm">
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1.5 tracking-tighter">Total Paid</p>
                <p className="text-xs font-black text-success font-mono">₹{totalPaid.toLocaleString()}</p>
              </div>
              <div className="bg-card p-5 rounded-[2rem] border border-border text-center shadow-sm">
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1.5 tracking-tighter">Total Due</p>
                <p className="text-xs font-black text-error font-mono">₹{totalRemaining.toLocaleString()}</p>
              </div>
            </div>

            {/* Expenses Bar Chart */}
            <div className="bg-card p-8 rounded-[3rem] border border-border shadow-sm">
              <div className="flex items-center gap-3 mb-8 text-left">
                 <div className="p-2.5 bg-primary/10 text-primary rounded-2xl glow-primary">
                   <BarChart3 size={20} />
                 </div>
                 <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground text-left font-sans">Expense Overview</h3>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Total Bill', value: totalSpent, fill: '#10b981' },
                      { name: 'Paid', value: totalPaid, fill: '#22c55e' },
                      { name: 'Due', value: totalRemaining, fill: '#ef4444' }
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

            {/* Seed Type Breakdown */}
            <div className="space-y-4 text-left">
               <div className="flex items-center gap-3 px-2 text-left font-sans">
                  <div className="p-2 bg-card-secondary text-muted-foreground rounded-xl border border-border">
                    <History size={18} />
                  </div>
                  <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground text-left">Efficiency Breakdown</h3>
               </div>
               
               <div className="grid gap-4 text-left">
                  {seedTypeBreakdown.map(([type, stats]) => (
                    <motion.div 
                      layout
                      key={type} 
                      className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm space-y-5 text-left"
                    >
                      <div className="flex justify-between items-start text-left">
                        <div className="text-left font-sans">
                          <h4 className="font-black text-foreground uppercase tracking-tighter text-lg text-left">{type}</h4>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-left mt-1">Total Bill: ₹{stats.total.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-foreground font-mono italic text-right leading-none">₹{stats.total.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="space-y-3 text-left">
                        <div className="h-2 w-full bg-card-secondary rounded-full overflow-hidden flex transition-all border border-border/50">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(stats.paid / stats.total) * 100}%` }}
                            className="h-full bg-success glow-success" 
                          />
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(stats.remaining / stats.total) * 100}%` }}
                            className="h-full bg-error/20" 
                          />
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest px-1 font-mono">
                          <div className="flex items-center gap-1.5 text-success text-left">
                             <div className="w-1.5 h-1.5 rounded-full bg-success glow-success" />
                             Paid: ₹{stats.paid.toLocaleString()}
                          </div>
                          <div className="flex items-center gap-1.5 text-error text-right">
                             <div className="w-1.5 h-1.5 rounded-full bg-error glow-error" />
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
