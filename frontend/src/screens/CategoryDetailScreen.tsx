import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux';
import { fetchGlobalSummary } from '../redux/slices/farmSlice';
import { 
  Tractor, 
  LayoutGrid, 
  Sprout, 
  Bug, 
  Users, 
  ArrowLeft, 
  TrendingUp, 
  IndianRupee, 
  Search,
  Calendar,
  Filter,
  ChevronDown,
  Loader2,
  Wallet,
  X,
  Plus,
  History,
  CheckCircle2,
  AlertCircle,
  Hammer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { useTheme } from '../context/ThemeContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { storage } from '../api/storage';
import toast from 'react-hot-toast';

type CategoryType = 'tractor' | 'khat' | 'seeds' | 'aushad' | 'worker' | 'other-expenses';

const CATEGORY_MAP: Record<string, { label: string, icon: any, color: string, textColor: string, bgColor: string }> = {
  tractor: { label: 'Tractor Details', icon: Tractor, color: '#3b82f6', textColor: 'text-accent', bgColor: 'bg-accent/10' },
  khat: { label: 'Fertilizer (Khat) Details', icon: LayoutGrid, color: '#10b981', textColor: 'text-primary', bgColor: 'bg-primary/10' },
  seeds: { label: 'Seeds (Beej) Details', icon: Sprout, color: '#2563eb', textColor: 'text-accent', bgColor: 'bg-accent/10' },
  aushad: { label: 'Pesticide (Aushad) Details', icon: Bug, color: '#ef4444', textColor: 'text-error', bgColor: 'bg-error/10' },
  worker: { label: 'Worker (Majdur) Details', icon: Users, color: '#ea580c', textColor: 'text-warning', bgColor: 'bg-warning/10' },
  'other-expenses': { label: 'Other Farm Expenses', icon: Hammer, color: '#6366f1', textColor: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
};

export default function CategoryDetailScreen() {
  const { category = '' } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { colors, isDark } = useTheme();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [expandedFarmId, setExpandedFarmId] = useState<string | null>(null);

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payDate, setPayDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [payMethod, setPayMethod] = useState('Cash');
  const [submittingPay, setSubmittingPay] = useState(false);

  const catKey = category.toLowerCase();
  const catInfo = CATEGORY_MAP[catKey] || CATEGORY_MAP.tractor;

  useEffect(() => {
    dispatch(fetchGlobalSummary())
      .unwrap()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [dispatch]);

  const refreshData = () => {
    setLoading(true);
    dispatch(fetchGlobalSummary())
      .unwrap()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handlePayClick = (e: React.MouseEvent, farm: any) => {
    e.stopPropagation();
    setSelectedFarm(farm);
    setPayAmount(farm.remaining.toString());
    setPayNote('');
    setIsPayModalOpen(true);
  };

  const submitBulkPayment = async () => {
    if (!selectedFarm || !payAmount || parseFloat(payAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (parseFloat(payAmount) > selectedFarm.remaining) {
      toast.error('Payment cannot exceed remaining amount');
      return;
    }

    try {
      setSubmittingPay(true);
      await storage.bulkPayment(catKey, {
        farmId: selectedFarm.id,
        year: selectedYear,
        amount: parseFloat(payAmount),
        note: payNote || `Year-end payment for ${selectedYear}`,
        date: payDate
      });
      toast.success('Payment added successfully');
      setIsPayModalOpen(false);
      refreshData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit payment');
    } finally {
      setSubmittingPay(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!data) return { farmWiseData: [], overallTotal: 0, overallPaid: 0, overallRemaining: 0 };

    let entries: any[] = [];
    if (catKey === 'tractor') entries = data.tractorEntries || [];
    else if (catKey === 'khat') entries = data.khatEntries || [];
    else if (catKey === 'seeds') entries = data.seedEntries || [];
    else if (catKey === 'aushad') entries = data.aushadEntries || [];
    else if (catKey === 'worker') entries = data.workerEntries || [];
    else if (catKey === 'other-expenses') {
      // Backend returns otherExpenses in global summary
      entries = data.otherExpenses || [];
    }

    // Map entries to the latest version by root ID for Tractor, or just use them for others
    const consolidatedEntries = catKey === 'tractor' 
      ? Array.from(entries.reduce((acc, e) => {
          const id = e.parentId || e.id;
          if (!acc.has(id) || new Date(e.createdAt) > new Date(acc.get(id).createdAt)) {
            acc.set(id, e);
          }
          return acc;
        }, new Map()).values())
      : entries;

    const farms = data.farms || [];
    const farmWiseData = farms.map((farm: any) => {
      const farmEntries = consolidatedEntries.filter((e: any) => {
        const date = new Date(e.date || e.createdAt);
        const matchesYear = date.getFullYear() === selectedYear;
        const matchesPayment = paymentFilter === 'all' 
          || (paymentFilter === 'paid' && e.remainingAmount === 0)
          || (paymentFilter === 'pending' && e.remainingAmount > 0);
        
        return e.farmId === farm.id && matchesYear && matchesPayment;
      });

      const total = farmEntries.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0);
      const paid = farmEntries.reduce((sum: number, e: any) => sum + (e.totalPaidAmount || e.paidAmount || 0), 0);
      const remaining = total - paid;

      return {
        ...farm,
        entries: farmEntries,
        total,
        paid,
        remaining,
        count: farmEntries.length
      };
    })
    .filter((f: any) => f.total > 0 && f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a: any, b: any) => b.total - a.total);

    const overallTotal = farmWiseData.reduce((sum: number, f: any) => sum + f.total, 0);
    const overallPaid = farmWiseData.reduce((sum: number, f: any) => sum + f.paid, 0);
    const overallRemaining = overallTotal - overallPaid;

    return { farmWiseData, overallTotal, overallPaid, overallRemaining };
  }, [data, catKey, searchQuery, selectedYear, paymentFilter]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    if (data) {
      const allEntries = [
        ...(data.tractorEntries || []),
        ...(data.khatEntries || []),
        ...(data.seedEntries || []),
        ...(data.aushadEntries || []),
        ...(data.workerEntries || []),
        ...(data.otherExpenses || [])
      ];
      allEntries.forEach(e => {
        const d = new Date(e.date || e.createdAt);
        years.add(d.getFullYear());
      });
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [data]);

  const pieData = useMemo(() => {
    return filteredData.farmWiseData.slice(0, 5).map(f => ({
      name: f.name,
      value: f.total
    }));
  }, [filteredData.farmWiseData]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 min-h-screen bg-background">
      <Loader2 className="animate-spin text-primary mb-4" size={40} />
      <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Loading {catKey} data...</p>
    </div>
  );

  const Icon = catInfo.icon;

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/summary')}
          className="p-3 bg-card rounded-2xl shadow-sm border border-border hover:bg-background active:scale-95 transition-all"
        >
          <ArrowLeft size={20} className="text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">{catInfo.label}</h1>
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-0.5">Farm-wise Breakdown • {selectedYear}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${catInfo.bgColor} p-6 rounded-[2.5rem] border border-border shadow-xl shadow-${catKey === 'tractor' || catKey === 'seeds' ? 'accent' : catKey === 'khat' ? 'primary' : catKey === 'aushad' ? 'error' : 'warning'}/10 relative overflow-hidden`}
        >
          <TrendingUp className="absolute top-2 right-2 text-foreground opacity-5" size={80} />
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Overall Expense</p>
          <p className={`text-4xl font-black ${catInfo.textColor}`}>₹{filteredData.overallTotal.toLocaleString()}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm"
        >
          <p className="text-[10px] font-black uppercase text-success tracking-widest mb-1">Total Paid</p>
          <p className="text-3xl font-black text-success">₹{filteredData.overallPaid.toLocaleString()}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm"
        >
          <p className="text-[10px] font-black uppercase text-error tracking-widest mb-1">Total Pending</p>
          <p className="text-3xl font-black text-error">₹{filteredData.overallRemaining.toLocaleString()}</p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
           {/* Year Filter */}
           <div className="flex-1 relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full pl-12 pr-4 py-3 bg-card-secondary border border-border rounded-2xl font-bold text-foreground focus:ring-2 focus:ring-accent/20 appearance-none outline-none"
              >
                {availableYears.map(y => <option key={y} value={y}>{y} Year</option>)}
              </select>
           </div>

           {/* Payment Filter */}
           <div className="flex-1 relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as any)}
                className="w-full pl-12 pr-4 py-3 bg-card-secondary border border-border rounded-2xl font-bold text-foreground focus:ring-2 focus:ring-accent/20 appearance-none outline-none text-sm"
              >
                <option value="all">All Payments</option>
                <option value="paid">Fully Paid</option>
                <option value="pending">Pending Dues</option>
              </select>
           </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Search farm name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-card-secondary border border-border rounded-2xl font-bold text-foreground focus:ring-2 focus:ring-accent/20 outline-none placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

        <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Top Contributing Farms</h4>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="focus:outline-none drop-shadow-lg" />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => `₹${value.toLocaleString()}`}
                  contentStyle={{ 
                    borderRadius: '1.25rem', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    backgroundColor: colors.card,
                    color: colors.foreground
                  }}
                  itemStyle={{ color: colors.foreground, fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      {/* Farm Breakdown List */}
      <div className="space-y-4">
        <h3 className="font-bold text-muted-foreground text-xs uppercase tracking-widest px-2">Farm-wise Records</h3>
        {filteredData.farmWiseData.length === 0 ? (
          <div className="text-center py-12 px-6 bg-card rounded-[3rem] border-2 border-dashed border-border text-muted-foreground italic">
            No records found for the selected filters.
          </div>
        ) : (
          filteredData.farmWiseData.map((farm: any) => {
            const isExpanded = expandedFarmId === farm.id;
            return (
              <div key={farm.id} className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden group">
                <button
                  onClick={() => setExpandedFarmId(isExpanded ? null : farm.id)}
                  className={`w-full p-6 flex flex-col sm:flex-row sm:items-center justify-between transition-colors ${isExpanded ? 'bg-muted/30' : 'hover:bg-muted/20'}`}
                >
                  <div className="flex items-center gap-4 text-left">
                     <div className={`p-4 rounded-2xl ${catInfo.bgColor} ${catInfo.textColor}`}>
                        <Icon size={24} />
                     </div>
                     <div>
                        <h4 className="text-xl font-black text-foreground tracking-tight">{farm.name}</h4>
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{farm.count} Records</p>
                     </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-border text-right">
                     <div className="text-left sm:text-right flex-1">
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Remaining</p>
                        <p className="text-xl font-black text-error tracking-tighter">₹{farm.remaining.toLocaleString()}</p>
                     </div>
                     {farm.remaining > 0 && (
                       <button
                         onClick={(e) => handlePayClick(e, farm)}
                         className="px-4 py-2 bg-foreground text-background border border-border rounded-xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-sm"
                       >
                         Pay Money
                       </button>
                     )}
                     <ChevronDown size={24} className={`text-muted-foreground/30 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border bg-muted/10"
                    >
                      <div className="p-6 space-y-4">
                         {/* Stats Grid */}
                         <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-card p-4 rounded-2xl border border-border">
                               <p className="text-[9px] font-black text-success uppercase tracking-widest mb-1 opacity-80">Paid Amount</p>
                               <p className="text-lg font-black text-success">₹{farm.paid.toLocaleString()}</p>
                            </div>
                            <div className="bg-card p-4 rounded-2xl border border-border">
                               <p className="text-[9px] font-black text-error uppercase tracking-widest mb-1 opacity-80">Pending Amount</p>
                               <p className="text-lg font-black text-error">₹{farm.remaining.toLocaleString()}</p>
                            </div>
                         </div>

                         {/* Records Table and History */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                           <div className="space-y-3">
                              <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <LayoutGrid size={12} />
                                Individual Records
                              </h5>
                              {farm.entries.map((entry: any, index: number) => (
                                <motion.div 
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  key={entry.id} 
                                  className="bg-card p-4 rounded-2xl shadow-sm border border-border flex items-center justify-between group/row hover:border-primary/30 transition-colors"
                                >
                                   <div className="flex flex-col text-left">
                                      <span className="text-xs font-black text-foreground">
                                         {entry.workType || entry.name || entry.expenseType || entry.expenseName || entry.khatName || entry.seedName || entry.medicineName || 'Expense Record'}
                                      </span>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                          {format(new Date(entry.date || entry.createdAt), 'dd MMM yyyy')}
                                        </span>
                                        <span className="text-slate-300 dark:text-slate-700">•</span>
                                        <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                          {entry.supplier || entry.provider || entry.providerName || 'General'}
                                        </span>
                                      </div>
                                   </div>
                                   <div className="text-right">
                                      <p className="text-sm font-black text-slate-900 dark:text-slate-100">₹{entry.totalAmount.toLocaleString()}</p>
                                      {(() => {
                                        const rem = entry.remainingAmount ?? (entry.totalAmount - (entry.totalPaidAmount || entry.paidAmount || 0));
                                        const paid = entry.totalPaidAmount || entry.paidAmount || 0;
                                        if (rem <= 0) return <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-500">Paid</span>;
                                        if (paid > 0) return <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-500">₹{rem.toLocaleString()} Partial</span>;
                                        return <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500">₹{rem.toLocaleString()} Unpaid</span>;
                                      })()}
                                   </div>
                                </motion.div>
                              ))}
                           </div>

                           {/* Payment History Section */}
                           <div className="space-y-3">
                              <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <History size={12} />
                                Payment History
                              </h5>
                              {(() => {
                                const allHistory = farm.entries.flatMap((e: any) => 
                                  (e.transactionHistory || []).map((h: any) => ({
                                    ...h,
                                    entryName: e.workType || e.name || e.expenseType || e.expenseName || e.khatName || e.seedName || e.medicineName || 'Record'
                                  }))
                                ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                if (allHistory.length === 0) {
                                  return (
                                    <div className="bg-card p-8 rounded-3xl border border-border flex flex-col items-center justify-center text-center opacity-70">
                                      <AlertCircle className="text-muted-foreground mb-2" size={24} />
                                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">No Payments Yet</p>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="space-y-2">
                                     {allHistory.slice(0, 10).map((h: any, i: number) => (
                                       <div key={i} className="bg-card p-3 rounded-xl shadow-xs border border-border flex justify-between items-center group hover:bg-card-secondary transition-colors text-right">
                                          <div className="text-left">
                                             <p className="text-[10px] font-black text-foreground">{h.description}</p>
                                             <p className="text-[8px] text-muted-foreground font-bold uppercase mt-0.5">{format(new Date(h.date), 'dd/MM/yyyy')} • {h.entryName}</p>
                                          </div>
                                          <div className="text-right">
                                             <p className="text-xs font-black text-success">+₹{h.paidNow.toLocaleString()}</p>
                                          </div>
                                       </div>
                                     ))}
                                  </div>
                                );
                              })()}
                           </div>
                         </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {isPayModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submittingPay && setIsPayModalOpen(false)}
              className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md"
            />
             <motion.div
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="bg-card w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col pt-0 border border-border"
             >
               <div className="p-8 border-b border-border flex justify-between items-center bg-card-secondary">
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-accent/10 text-accent rounded-2xl border border-accent/20">
                       <Wallet size={24} />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-foreground tracking-tight">Add Payment</h3>
                       <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{selectedFarm?.name} • {catKey}</p>
                    </div>
                 </div>
                 <button 
                   onClick={() => setIsPayModalOpen(false)}
                   disabled={submittingPay}
                   className="p-2.5 bg-card border border-border rounded-xl transition-all active:scale-95 text-muted-foreground hover:text-foreground"
                 >
                   <X size={24} />
                 </button>
               </div>

               <div className="p-8 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card-secondary p-4 rounded-2xl border border-border">
                       <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Remaining Due</p>
                       <p className="text-xl font-black text-error font-mono italic">₹{selectedFarm?.remaining.toLocaleString()}</p>
                    </div>
                    <div className="bg-accent/5 p-4 rounded-2xl border border-accent/10">
                       <p className="text-[9px] font-black uppercase text-accent tracking-widest mb-1">New Applied Payment</p>
                       <p className="text-xl font-black text-accent font-mono italic">₹{parseFloat(payAmount || '0').toLocaleString()}</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Pay Amount (₹)</label>
                       <div className="relative">
                          <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                          <input
                            type="number"
                            placeholder="Enter amount..."
                            className="w-full pl-12 pr-28 py-4 bg-card-secondary border border-border rounded-2xl font-black text-lg focus:ring-2 focus:ring-accent/20 outline-none text-foreground"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                          />
                          <button
                            onClick={() => setPayAmount(selectedFarm?.remaining.toString())}
                            className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-accent text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:brightness-110 transition-colors shadow-sm shadow-accent/20"
                          >
                            Pay Full
                          </button>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Payment Date</label>
                          <input
                            type="date"
                            className="w-full px-4 py-4 bg-card-secondary border border-border rounded-2xl font-bold text-sm focus:ring-2 focus:ring-accent/20 outline-none text-foreground"
                            value={payDate}
                            onChange={(e) => setPayDate(e.target.value)}
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Payment Method</label>
                          <select
                            className="w-full px-4 py-4 bg-card-secondary border border-border rounded-2xl font-bold text-sm focus:ring-2 focus:ring-accent/20 outline-none text-foreground appearance-none"
                            value={payMethod}
                            onChange={(e) => setPayMethod(e.target.value)}
                          >
                            <option value="Cash">Cash</option>
                            <option value="Online">Online Transfer</option>
                            <option value="UPI">UPI / PhonePe</option>
                            <option value="Cheque">Cheque</option>
                          </select>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Note / Description</label>
                       <textarea
                         rows={3}
                         placeholder="Add a remark..."
                         className="w-full px-4 py-4 bg-card-secondary border border-border rounded-2xl font-bold text-sm focus:ring-2 focus:ring-accent/20 outline-none resize-none text-foreground"
                         value={payNote}
                         onChange={(e) => setPayNote(e.target.value)}
                       />
                    </div>
                 </div>

                 <div className="pt-4 flex gap-4">
                    <button
                      onClick={() => setIsPayModalOpen(false)}
                      disabled={submittingPay}
                      className="flex-1 py-4 bg-muted text-muted-foreground rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-muted/80 transition-colors border border-border"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitBulkPayment}
                      disabled={submittingPay || !payAmount || parseFloat(payAmount) <= 0}
                      className="flex-[2] py-4 bg-accent text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-accent/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                    >
                      {submittingPay ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                      {submittingPay ? 'Processing...' : 'Confirm Payment'}
                    </button>
                 </div>
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
