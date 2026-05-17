import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Tractor, Calendar, IndianRupee, History, Plus, Edit3, Loader2, BarChart3, List } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux';
import { fetchEntries, addEntry, updateEntry } from '../redux/slices/tractorSlice';
import { TractorEntry, Farm } from '../types';
import { SEASONS } from '../constants/seasons';
import { WORK_TYPES } from '../constants/workTypes';
import { calculateTractorTotal } from '../utils/calculations';
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
  Tooltip, 
  ResponsiveContainer, 
} from 'recharts';

type TabType = 'My Farms' | 'Aggregated' | 'Analytics';

export default function TractorModuleScreen() {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { colors, isDark } = useTheme();
  const { entries, loading, error } = useSelector((state: RootState) => state.tractor);
  const { farms } = useSelector((state: RootState) => state.farm);
  
  const [farm, setFarm] = useState<Farm | null>(null);
  const [displayEntries, setDisplayEntries] = useState<TractorEntry[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('My Farms');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  
  const [isManualMode, setIsManualMode] = useState(false);
  const [formData, setFormData] = useState({
    season: 'Rainy Season',
    landSize: '',
    rate: '',
    totalAmount: '',
    paidAmountNow: '',
    paymentStatus: 'Unpaid' as 'Paid' | 'Unpaid',
    paidDate: new Date().toISOString().split('T')[0],
    description: '',
    workType: 'नागरणी',
    providerName: '',
  });

  const [editingEntry, setEditingEntry] = useState<TractorEntry | null>(null);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [revisionMessage, setRevisionMessage] = useState('');

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFilter, supplierSearch]);

  useEffect(() => {
    if (farmId) {
      setFarm(farms.find(f => f.id === farmId) || null);
      dispatch(fetchEntries(farmId));
    }
  }, [farmId, farms, dispatch]);

  useEffect(() => {
    const groups = new Map<string, TractorEntry>();
    
    if (entries && Array.isArray(entries)) {
      entries.forEach(e => {
        if (e.farmId === farmId) {
          const rootId = e.parentId || e.id;
          const existing = groups.get(rootId);
          if (!existing || new Date(e.createdAt) > new Date(existing.createdAt)) {
            groups.set(rootId, e);
          }
        }
      });
    }

    setDisplayEntries(Array.from(groups.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, [entries, farmId]);

  useEffect(() => {
    if (isManualMode) return;

    const sizeInGunta = Number(formData.landSize) || 0;
    const ratePerAcre = Number(formData.rate) || 0;
    const total = calculateTractorTotal(sizeInGunta, ratePerAcre);

    setFormData(prev => {
      let newPaidAmountNow = prev.paidAmountNow;
      if (prev.paymentStatus === 'Paid') {
        if (editingEntry) {
          newPaidAmountNow = (prev.paidAmountNow === '0' || prev.paidAmountNow === '') ? editingEntry.remainingAmount.toString() : prev.paidAmountNow;
        } else {
          newPaidAmountNow = (prev.paidAmountNow === '0' || prev.paidAmountNow === '') ? total.toString() : prev.paidAmountNow;
        }
      } else {
        newPaidAmountNow = '0';
      }

      return {
        ...prev,
        totalAmount: total.toString(),
        paidAmountNow: newPaidAmountNow,
      };
    });

    if (editingEntry) {
      const hasRateChanged = ratePerAcre !== editingEntry.rate;
      setRevisionMessage(hasRateChanged ? "New total calculated. Saved as new revision" : "");
    }
  }, [formData.landSize, formData.rate, formData.paymentStatus, editingEntry, isManualMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId) return;

    const toastId = toast.loading(editingEntry ? "Updating record..." : "Saving record...");
    try {
      if (editingEntry) {
        const incrementalPaid = Number(formData.paidAmountNow) || 0;
        await dispatch(updateEntry({
          id: editingEntry.id,
          data: {
            season: formData.season,
            paidNow: incrementalPaid,
            description: formData.description,
            paymentStatus: formData.paymentStatus,
            providerName: formData.providerName,
          }
        })).unwrap();
      } else {
        await dispatch(addEntry({
          farmId,
          season: formData.season,
          landSize: Number(formData.landSize) || 0,
          rate: Number(formData.rate) || 0,
          totalAmount: Number(formData.totalAmount) || 0,
          paidAmountNow: Number(formData.paidAmountNow) || 0,
          paymentStatus: formData.paymentStatus,
          paidDate: new Date(formData.paidDate).toISOString(),
          description: formData.description,
          workType: formData.workType,
          providerName: formData.providerName,
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
      landSize: '',
      rate: '',
      totalAmount: '',
      paidAmountNow: '',
      paymentStatus: 'Unpaid',
      paidDate: new Date().toISOString().split('T')[0],
      description: '',
      workType: 'नागरणी',
      providerName: '',
    });
    setEditingEntry(null);
    setIsManualMode(false);
  };

  const startEdit = (entry: TractorEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveTab('My Farms');
    setEditingEntry(entry);
    setFormData({
      season: entry.season || 'Rainy Season',
      landSize: entry.landSize.toString(),
      rate: entry.rate.toString(),
      totalAmount: entry.totalAmount.toString(),
      paidAmountNow: '0',
      paymentStatus: entry.paymentStatus,
      paidDate: new Date().toISOString().split('T')[0],
      description: '',
      workType: entry.workType || 'नागरणी',
      providerName: entry.providerName || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalSpent = displayEntries.reduce((sum, e) => sum + e.totalAmount, 0);
  const totalPaid = displayEntries.reduce((sum, e) => sum + e.totalPaidAmount, 0);
  const totalRemaining = displayEntries.reduce((sum, e) => sum + e.remainingAmount, 0);

  const workTypeBreakdown = useMemo(() => {
    const breakdown: Record<string, { total: number; paid: number; remaining: number }> = {};
    displayEntries.forEach(e => {
      if (!breakdown[e.workType]) {
        breakdown[e.workType] = { total: 0, paid: 0, remaining: 0 };
      }
      breakdown[e.workType].total += e.totalAmount;
      breakdown[e.workType].paid += e.totalPaidAmount;
      breakdown[e.workType].remaining += e.remainingAmount;
    });
    return Object.entries(breakdown).sort((a, b) => b[1].total - a[1].total);
  }, [displayEntries]);

  const filteredAggregatedEntries = useMemo(() => {
    return displayEntries.filter(e => {
      const matchesWork = selectedFilter === 'All' || e.workType === selectedFilter;
      const matchesSupplier = !supplierSearch || (e.providerName || '').toLowerCase().includes(supplierSearch.toLowerCase());
      return matchesWork && matchesSupplier;
    });
  }, [displayEntries, selectedFilter, supplierSearch]);

  const totalPages = Math.ceil(filteredAggregatedEntries.length / ITEMS_PER_PAGE);
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAggregatedEntries.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAggregatedEntries, currentPage]);

  if (loading && entries.length === 0) {
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
          <h2 className="text-2xl font-black text-foreground tracking-tight text-left">Tractor Records</h2>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-left">{farm.name}</p>
        </div>
      </div>

      {/* Summary Stat */}
      <div className="bg-accent rounded-[2.5rem] p-8 text-white shadow-2xl shadow-accent/20 relative overflow-hidden text-left group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-white/20 transition-all duration-500" />
        <Tractor size={120} className="absolute -right-5 -bottom-5 opacity-10 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500" />
        <p className="text-white/70 text-[10px] font-black uppercase tracking-widest text-left">Farm Tractor Expense</p>
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
                  ? 'text-accent' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
            {activeTab === tab && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-accent/10 rounded-2xl border border-accent/20"
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
            {/* Form */}
            <div className="bg-card rounded-[3rem] p-8 border border-border shadow-sm space-y-6 text-left">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 text-muted-foreground text-left">
                  {editingEntry ? <History size={20} /> : <Plus size={20} />}
                  <h3 className="font-black text-xs uppercase tracking-widest text-left">
                    {editingEntry ? `Update Receipt: ${editingEntry.landSize} Gunta` : 'New Tractor Entry'}
                  </h3>
                </div>
                {editingEntry && (
                  <button onClick={handleResetForm} className="text-[10px] font-black text-error uppercase tracking-widest hover:underline px-2 py-1 bg-error/10 rounded-lg transition-all">Cancel Edit</button>
                )}
              </div>
              
              {editingEntry && (
                <div className="bg-accent/5 border border-accent/10 rounded-3xl p-6 grid grid-cols-3 gap-2">
                  <div className="text-left">
                    <p className="text-[8px] font-black text-muted-foreground uppercase text-left">Total Bill</p>
                    <p className="text-sm font-black text-accent font-mono text-left">₹{editingEntry.totalAmount.toLocaleString()}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[8px] font-black text-muted-foreground uppercase text-left">Already Paid</p>
                    <p className="text-sm font-black text-success font-mono text-left">₹{editingEntry.totalPaidAmount.toLocaleString()}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[8px] font-black text-muted-foreground uppercase text-left">Balance</p>
                    <p className="text-sm font-black text-error font-mono text-left">₹{editingEntry.remainingAmount.toLocaleString()}</p>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6 text-left">
                {/* Season Dropdown */}
                <div className="text-left">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Season (हंगाम)</label>
                  <select
                    className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-accent/20 text-foreground font-bold transition-all text-sm appearance-none"
                    value={formData.season}
                    onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                  >
                    {SEASONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Manual Mode Toggle */}
                <div className="flex items-center justify-between bg-card-secondary p-4 rounded-3xl border border-border transition-all text-left">
                  <div className="flex items-center gap-3 text-left">
                    <div className={`p-2 rounded-xl transition-colors ${isManualMode ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>
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
                    className={`w-12 h-6 rounded-full transition-all relative flex items-center px-1 ${isManualMode ? 'bg-accent' : 'bg-muted-foreground/30'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-md ${isManualMode ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">कामाचा प्रकार (Work Type)</label>
                    <select
                      className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-accent/20 text-foreground font-bold transition-all text-sm appearance-none"
                      value={formData.workType}
                      onChange={(e) => setFormData({ ...formData, workType: e.target.value })}
                    >
                      <option value="नागरणी">नागरणी</option>
                      <option value="फट्ट्या">फट्ट्या</option>
                      <option value="रोट्या">रोट्या</option>
                      <option value="सरी">सरी</option>
                      <option value="पेरणी">पेरणी</option>
                      <option value="हारवेस्टीग">हारवेस्टीग</option>
                      <option value="पास">पास</option>
                      <option value="मुरगास">मुरगास</option>
                      <option value="कुट्टी">कुट्टी</option>
                      <option value="ट्रॅाली">ट्रॅाली</option>
                      <option value="अन्य">अन्य</option>
                    </select>
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">From (कोणाकडून)</label>
                    <input
                      placeholder="e.g. Dadasaheb Tractor"
                      className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-accent/20 text-foreground font-bold transition-all text-sm"
                      value={formData.providerName}
                      onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                    />
                  </div>

                  <div className={`text-left ${editingEntry || isManualMode ? 'opacity-50' : ''}`}>
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Land Size (Gunta)</label>
                    <input
                      required={!isManualMode}
                      disabled={!!editingEntry || isManualMode}
                      type="number"
                      placeholder="20"
                      className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-accent/20 text-foreground font-bold transition-all text-sm font-mono"
                      value={formData.landSize}
                      onChange={(e) => setFormData({ ...formData, landSize: e.target.value })}
                    />
                  </div>
                  <div className={`text-left ${isManualMode ? 'opacity-50' : ''}`}>
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Rate (Per Acre)</label>
                    <input
                      required={!isManualMode}
                      disabled={isManualMode}
                      type="number"
                      placeholder="₹4000"
                      className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-accent/20 text-foreground font-bold transition-all text-sm font-mono"
                      value={formData.rate}
                      onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="text-left">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Total Amount</label>
                  <input
                    required
                    disabled={!isManualMode}
                    type="number"
                    placeholder={isManualMode ? "Enter amount manually..." : "Calculated automatically..."}
                    className={`w-full ${isManualMode ? 'bg-card-secondary border-accent/30' : 'bg-card-secondary border-border'} border-2 rounded-2xl px-6 py-4 font-black text-accent focus:bg-card focus:ring-2 focus:ring-accent/20 outline-none transition-all font-mono text-lg`}
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                  />
                  {revisionMessage && !isManualMode && (
                    <p className="text-[10px] text-warning mt-2 font-black uppercase tracking-tight flex items-center gap-1 ml-1 text-left">
                      <Edit3 size={10} /> {revisionMessage}
                    </p>
                  )}
                  {!isManualMode && (
                    <p className="text-[9px] text-muted-foreground mt-1.5 ml-1 font-bold italic uppercase tracking-wider text-left">Calculation: (Gunta / 40) × Rate per Acre</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Payment Status</label>
                    {!editingEntry ? (
                      <select
                        className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-accent/20 text-foreground font-bold transition-all text-sm appearance-none"
                        value={formData.paymentStatus}
                        onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as 'Paid' | 'Unpaid' })}
                      >
                        <option value="Unpaid">Unpaid (उधारी)</option>
                        <option value="Paid">Full Paid (पूर्ण जमा)</option>
                      </select>
                    ) : (
                      <div className="w-full bg-muted border border-border rounded-2xl px-6 py-4 font-black text-foreground text-sm flex items-center">
                        {formData.workType}
                      </div>
                    )}
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">
                      {editingEntry ? 'Paid Now (आज जमा)' : 'Paid Amount (जमा रक्कम)'}
                    </label>
                    <div className="relative text-left">
                      <p className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</p>
                      <input
                        type="number"
                        placeholder="0"
                        className={`w-full bg-card-secondary border border-border rounded-2xl pl-10 pr-6 py-4 outline-none focus:ring-2 focus:ring-accent/20 transition-all font-black text-success font-mono text-sm ${formData.paymentStatus === 'Paid' && !editingEntry ? 'opacity-50 cursor-not-allowed' : ''}`}
                        value={formData.paidAmountNow}
                        onChange={(e) => setFormData({ ...formData, paidAmountNow: e.target.value })}
                      />
                    </div>
                    {editingEntry && (
                      <p className="text-[9px] text-accent mt-2 ml-1 font-black uppercase tracking-tight leading-tight text-left italic">
                        Adds to previous ₹{editingEntry.totalPaidAmount.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {editingEntry && (
                  <div className="bg-card-secondary rounded-[2rem] p-6 flex justify-between items-center border border-border mt-2 text-left">
                    <div className="text-left">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-left">Remaining Balance</p>
                      <p className="text-[8px] text-muted-foreground/50 font-bold uppercase text-left mt-0.5">After this payment</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-error text-right font-mono italic">
                        ₹{(Math.max(0, editingEntry.remainingAmount - (Number(formData.paidAmountNow) || 0))).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 mb-2 block text-left">Date</label>
                    <div className="relative text-left font-sans">
                      <Calendar size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                      <input
                        type="date"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-14 pr-6 py-4 outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 font-bold transition-all text-sm font-mono"
                        value={formData.paidDate}
                        onChange={(e) => setFormData({ ...formData, paidDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 mb-2 block text-left">Notes / Description</label>
                    <input
                      placeholder="e.g. Diesel cost, Driver bhatta..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 font-bold transition-all text-sm"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className={`w-full py-5 rounded-[2rem] font-black shadow-xl active:scale-95 transition-all ${editingEntry ? 'bg-orange-600 dark:bg-orange-700 shadow-orange-100 dark:shadow-none' : 'bg-blue-600 dark:bg-blue-700 shadow-blue-100 dark:shadow-none'} text-white uppercase tracking-widest text-[10px] mt-4`}
                >
                  {editingEntry ? 'Update Receipt (Save Revision)' : 'Save Record Entry'}
                </button>
              </form>
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
            {/* Filter & Summary Row */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm text-left">
              <div className="grid grid-cols-2 gap-4 w-full md:w-auto text-left">
                <div className="flex-1 text-left">
                  <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 mb-1.5 block text-left tracking-wider">Work Filter</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-slate-100 appearance-none"
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                  >
                    {WORK_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 text-left">
                  <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 mb-1.5 block text-left tracking-wider">Search Supplier</label>
                  <input
                    placeholder="Search name..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-[10px] font-black outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="w-full md:w-auto flex justify-between md:justify-end items-center gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-slate-50 dark:border-slate-800 text-right">
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase leading-none mb-1.5 text-right tracking-widest">Filtered Due</p>
                    <p className="text-2xl font-black text-red-600 dark:text-red-500 text-right font-mono italic">
                      ₹{filteredAggregatedEntries
                        .reduce((sum, e) => sum + e.remainingAmount, 0)
                        .toLocaleString()}
                    </p>
                  </div>
              </div>
            </div>

            {filteredAggregatedEntries.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-16 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800 text-center text-slate-300 dark:text-slate-600 font-black flex flex-col items-center uppercase tracking-widest text-[10px]">
                <History size={32} className="mb-4 opacity-10" />
                No results for this selection.
              </div>
            ) : (
              <div className="grid gap-4">
                  {paginatedEntries.map((entry) => (
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/farm/${farmId}/tractor/${entry.id}`)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={entry.id}
                    className="premium-card p-6 overflow-hidden cursor-pointer group text-left relative"
                  >
                    <div className="absolute top-4 right-6 text-[8px] font-black text-muted-foreground uppercase opacity-60">
                       {format(new Date(entry.paidDate), 'dd MMM yyyy')}
                    </div>
                    
                    <div className="flex justify-between items-start mb-4 text-left">
                      <div className="text-left">
                        <div className="flex items-center gap-2 mb-2 text-left">
                           <h4 className="text-xl font-black text-foreground font-mono text-left italic">₹{entry.totalAmount.toLocaleString()}</h4>
                           <span className="bg-primary/10 text-primary text-[9px] font-black uppercase px-2.5 py-1 rounded-full border border-primary/10 glow-primary mx-2">
                              {entry.workType}
                           </span>
                        </div>
                        {entry.providerName && (
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide text-left">Supplier: <span className="text-foreground">{entry.providerName}</span></p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end pt-4 border-t border-border/40">
                      <div className="flex gap-8 text-left">
                          <div className="text-left">
                            <p className="text-[9px] text-muted-foreground font-black uppercase leading-none mb-1.5 text-left tracking-widest">Settled</p>
                            <p className="text-sm font-black text-success text-left font-mono italic">₹{entry.totalPaidAmount.toLocaleString()}</p>
                          </div>
                          <div className="text-left">
                            <p className="text-[9px] text-muted-foreground font-black uppercase leading-none mb-1.5 text-left tracking-widest">Pending</p>
                            <p className="text-sm font-black text-error text-left font-mono italic">₹{entry.remainingAmount.toLocaleString()}</p>
                          </div>
                      </div>
                      <div 
                        onClick={(e) => startEdit(entry, e)}
                        className="p-3 bg-card-secondary border border-border rounded-xl text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
                      >
                         <Edit3 size={16} />
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-center gap-3 py-6">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm disabled:opacity-20 disabled:grayscale group transition-all hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95"
                    >
                      <ArrowLeft size={16} className="text-slate-400 dark:text-slate-600 transition-colors" />
                      <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Prev</span>
                    </button>
                    
                    <div className="flex items-center gap-2">
                       {Array.from({ length: totalPages }, (_, i) => i + 1)
                         .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                         .map((p, i, arr) => (
                           <React.Fragment key={p}>
                             {i > 0 && arr[i-1] !== p - 1 && <span className="text-slate-300 dark:text-slate-700 font-black">...</span>}
                             <button
                               onClick={() => setCurrentPage(p)}
                               className={`w-10 h-10 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${
                                 currentPage === p 
                                   ? 'bg-blue-600 text-white shadow-blue-200 dark:shadow-none' 
                                   : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-800 border border-transparent'
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
                      className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm disabled:opacity-20 disabled:grayscale group transition-all hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95"
                    >
                      <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Next</span>
                      <ArrowLeft size={16} className="text-slate-400 dark:text-slate-600 transition-colors rotate-180" />
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
            key="analytics"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            {/* Chart Summary Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="premium-card p-5 text-center">
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1.5 tracking-tighter">Total Bill</p>
                <p className="text-xs font-black text-foreground font-mono">₹{totalSpent.toLocaleString()}</p>
              </div>
              <div className="premium-card p-5 text-center">
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1.5 tracking-tighter">Total Paid</p>
                <p className="text-xs font-black text-success font-mono">₹{totalPaid.toLocaleString()}</p>
              </div>
              <div className="premium-card p-5 text-center">
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1.5 tracking-tighter">Total Due</p>
                <p className="text-xs font-black text-error font-mono">₹{totalRemaining.toLocaleString()}</p>
              </div>
            </div>

            {/* Expenses Bar Chart */}
            <div className="premium-card p-8">
              <div className="flex items-center gap-3 mb-8 text-left">
                 <div className="p-2.5 bg-primary/10 text-primary rounded-2xl glow-primary">
                   <BarChart3 size={20} />
                 </div>
                 <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground text-left">Expense Overview</h3>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Total Bill', value: totalSpent, fill: '#4f8cff' },
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
                          boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', 
                          padding: '12px 16px',
                          backgroundColor: '#1a1f29',
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

            {/* Work Type Lists */}
            <div className="space-y-4 text-left">
               <div className="flex items-center gap-3 px-2 text-left">
                  <div className="p-2 bg-card-secondary text-muted-foreground rounded-xl border border-border">
                    <History size={18} />
                  </div>
                  <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground text-left">Work Efficiency</h3>
               </div>
               
               <div className="grid gap-4 text-left">
                  {workTypeBreakdown.map(([type, stats]) => (
                    <motion.div 
                      layout
                      key={type} 
                      className="premium-card p-6 space-y-5 text-left"
                    >
                      <div className="flex justify-between items-start text-left">
                        <div className="text-left">
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
                             Due: ₹{stats.remaining.toLocaleString()}
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
