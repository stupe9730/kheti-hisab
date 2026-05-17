import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux';
import { 
  fetchMilkEntries, 
  addMilkEntry, 
  updateMilkEntry, 
  deleteMilkEntry 
} from '../redux/slices/milkSlice';
import { 
  fetchDairyExpenses, 
  addDairyExpense, 
  updateDairyExpense, 
  updateDairyPayment,
  deleteDairyExpense 
} from '../redux/slices/dairyExpenseSlice';
import { storage } from '../api/storage';
import { MilkEntry, DairyExpense } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { 
  TrendingUp, 
  TrendingDown, 
  IndianRupee, 
  ArrowLeft,
  Calendar,
  Plus,
  History,
  Trash2,
  Package,
  ShoppingCart,
  Activity,
  Milk,
  Utensils,
  Stethoscope,
  Users,
  Info,
  ChevronRight,
  Settings,
  X,
  AlertTriangle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts';

import { useTheme } from '../context/ThemeContext';

type TabType = 'Overview' | 'Milk Records' | 'Expenses' | 'Analytics' | 'Profit';

const EXPENSE_TYPES = [
  { id: 'Sugras Khadya', label: 'सुग्रास खाद्य', icon: Package },
  { id: 'Murghas', label: 'मुरघास', icon: Utensils },
  { id: 'Pend', label: 'Pend', icon: Package },
  { id: 'Bhusa', label: 'Bhusa', icon: Utensils },
  { id: 'Chara', label: 'Chara', icon: Utensils },
  { id: 'Medicine', label: 'Medicine', icon: Stethoscope },
  { id: 'Worker', label: 'Worker', icon: Users },
  { id: 'Other', label: 'Other', icon: Info },
];

export default function DairyModuleScreen() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { theme, colors, isDark } = useTheme();
  
  const { entries: milkEntries, loading: milkLoading } = useSelector((state: RootState) => state.milk);
  const { entries: expenseEntries, loading: expenseLoading } = useSelector((state: RootState) => state.dairyExpense);
  
  const [activeTab, setActiveTab] = useState<TabType>('Overview');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    milkEntries.forEach(e => years.add(e.year || new Date(e.date).getFullYear()));
    expenseEntries.forEach(e => years.add(e.year || new Date(e.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [milkEntries, expenseEntries]);

  const filteredMilkEntries = useMemo(() => {
    return milkEntries.filter(e => (e.year || new Date(e.date).getFullYear()) === selectedYear);
  }, [milkEntries, selectedYear]);

  const filteredExpenseEntries = useMemo(() => {
    return expenseEntries.filter(e => (e.year || new Date(e.date).getFullYear()) === selectedYear);
  }, [expenseEntries, selectedYear]);
  
  // Milk Form State
  const [milkForm, setMilkForm] = useState({
    entryType: 'daily' as 'daily' | 'bulk',
    cowName: '',
    totalMilk: '',
    milkPrice: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    totalDays: '1',
  });

  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    expenseType: 'Sugras Khadya',
    quantity: '',
    price: '',
    totalAmount: '',
    paidAmountNow: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [deleteYearTarget, setDeleteYearTarget] = useState<number>(new Date().getFullYear());
  const [deleteYearConfirm, setDeleteYearConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchMilkEntries());
    dispatch(fetchDairyExpenses());
  }, [dispatch]);

  // Calculations
  const summaries = useMemo(() => {
    const totalMilk = filteredMilkEntries.reduce((sum, e) => sum + e.totalMilk, 0);
    const totalSale = filteredMilkEntries.reduce((sum, e) => sum + e.totalSale, 0);
    const totalExpense = filteredExpenseEntries.reduce((sum, e) => sum + e.totalAmount, 0);
    const totalPaid = filteredExpenseEntries.reduce((sum, e) => sum + e.totalPaidAmount, 0);
    const totalRemaining = filteredExpenseEntries.reduce((sum, e) => sum + e.remainingAmount, 0);
    const netProfit = totalSale - totalExpense;

    return { totalMilk, totalSale, totalExpense, totalPaid, totalRemaining, netProfit };
  }, [filteredMilkEntries, filteredExpenseEntries]);

  // Milk Handlers
  const handleMilkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const total = Number(milkForm.totalMilk);
    const price = Number(milkForm.milkPrice);
    const sale = total * price;

    const data = {
      cowName: milkForm.cowName,
      totalMilk: total,
      milkPrice: price,
      totalSale: sale,
      entryType: milkForm.entryType,
      date: milkForm.entryType === 'daily' ? new Date(milkForm.date).toISOString() : new Date(milkForm.startDate).toISOString(),
      startDate: milkForm.entryType === 'bulk' ? new Date(milkForm.startDate).toISOString() : null,
      endDate: milkForm.entryType === 'bulk' ? new Date(milkForm.endDate).toISOString() : null,
      totalDays: milkForm.entryType === 'bulk' ? Number(milkForm.totalDays) : 1,
    };

    const toastId = toast.loading(editingId ? "Updating record..." : "Saving record...");
    try {
      if (editingId) {
        await dispatch(updateMilkEntry({ id: editingId, data })).unwrap();
        toast.success("Record updated! 🥛", { id: toastId });
      } else {
        await dispatch(addMilkEntry(data)).unwrap();
        toast.success("Milk record saved! ✅", { id: toastId });
      }
      resetMilkForm();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      toast.error(err.message || "Failed to save record", { id: toastId });
    }
  };

  const resetMilkForm = () => {
    setEditingId(null);
    setMilkForm({
      entryType: 'daily',
      cowName: '',
      totalMilk: '',
      milkPrice: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      totalDays: '1',
    });
  };

  // Expense Handlers
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const qty = Number(expenseForm.quantity);
    const price = Number(expenseForm.price);
    const total = Number(expenseForm.totalAmount) || (qty * price);
    const paid = Number(expenseForm.paidAmountNow);
    const remaining = total - paid;

    const data = {
      expenseType: expenseForm.expenseType,
      quantity: qty,
      price: price,
      totalAmount: total,
      paidAmountNow: paid,
      remainingAmount: remaining,
      paymentStatus: remaining <= 0 ? 'paid' : 'unpaid',
      description: expenseForm.description,
      date: new Date(expenseForm.date).toISOString(),
    };

    const toastId = toast.loading(editingId ? "Updating expense..." : "Saving expense...");
    try {
      if (editingId) {
        await dispatch(updateDairyExpense({ id: editingId, data })).unwrap();
        toast.success("Expense updated! 💰", { id: toastId });
      } else {
        await dispatch(addDairyExpense(data)).unwrap();
        toast.success("Expense recorded! ✅", { id: toastId });
      }
      resetExpenseForm();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      toast.error(err.message || "Failed to save expense", { id: toastId });
    }
  };

  const resetExpenseForm = () => {
    setEditingId(null);
    setExpenseForm({
      expenseType: 'Sugras Khadya',
      quantity: '',
      price: '',
      totalAmount: '',
      paidAmountNow: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const handleUpdatePayment = async () => {
    if (!showPaymentModal || !paymentAmount) return;
    const toastId = toast.loading("Recording payment...");
    try {
      await dispatch(updateDairyPayment({ 
        id: showPaymentModal, 
        paymentAmount: Number(paymentAmount),
        paidDate: new Date().toISOString(),
        description: "Payment integration"
      })).unwrap();
      toast.success("Payment recorded! 💸", { id: toastId });
      setShowPaymentModal(null);
      setPaymentAmount('');
    } catch (err: any) {
      toast.error(err.message || "Failed to update payment", { id: toastId });
    }
  };

  const chartData = useMemo(() => {
    return filteredMilkEntries.slice().reverse().map(e => ({
      date: format(new Date(e.date), 'dd MMM'),
      total: e.totalMilk,
      morning: e.morningMilk,
      evening: e.eveningMilk,
    }));
  }, [filteredMilkEntries]);

  const expensePieData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredExpenseEntries.forEach(e => {
      data[e.expenseType] = (data[e.expenseType] || 0) + e.totalAmount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [filteredExpenseEntries]);

  const analyticsSummaries = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = selectedYear;
    
    const monthlyEntries = filteredMilkEntries.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const monthlyMilk = monthlyEntries.reduce((sum, e) => sum + e.totalMilk, 0);
    const monthlyEarnings = monthlyEntries.reduce((sum, e) => sum + e.totalSale, 0);

    return { monthlyMilk, monthlyEarnings };
  }, [filteredMilkEntries, selectedYear]);

  const profitStats = useMemo(() => {
    const totalIncome = summaries.totalSale;
    const totalExpense = summaries.totalExpense;
    const netProfit = totalIncome - totalExpense;
    
    const costPerLiter = summaries.totalMilk > 0 ? (totalExpense / summaries.totalMilk) : 0;
    const avgMilkRate = summaries.totalMilk > 0 ? (totalIncome / summaries.totalMilk) : 0;

    // Breakdown from expense entries
    const breakdown: Record<string, number> = {};
    EXPENSE_TYPES.forEach(type => {
      breakdown[type.id] = 0;
    });
    filteredExpenseEntries.forEach(e => {
      breakdown[e.expenseType] = (breakdown[e.expenseType] || 0) + e.totalAmount;
    });

    // Monthly profit
    const monthlyIncome = analyticsSummaries.monthlyEarnings;
    const currentMonth = new Date().getMonth();
    const currentYear = selectedYear;
    const monthlyExpense = filteredExpenseEntries
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + e.totalAmount, 0);
    
    const monthlyProfit = monthlyIncome - monthlyExpense;

    return { 
      totalIncome, 
      totalExpense, 
      netProfit, 
      costPerLiter, 
      avgMilkRate, 
      breakdown,
      monthlyIncome,
      monthlyExpense,
      monthlyProfit
    };
  }, [summaries, analyticsSummaries, filteredExpenseEntries, selectedYear]);

  const COLORS = [colors.accent, colors.success, colors.warning, colors.error, '#8b5cf6', '#ec4899', '#06b6d4', colors.muted];

  // Profit Trend Data for chart
  const monthlyProfitData = useMemo(() => {
    const months: Record<string, { income: number, expense: number }> = {};
    
    // Group monthly
    filteredMilkEntries.forEach(e => {
      const month = format(new Date(e.date), 'MMM yyyy');
      if (!months[month]) months[month] = { income: 0, expense: 0 };
      months[month].income += e.totalSale;
    });

    filteredExpenseEntries.forEach(e => {
      const month = format(new Date(e.date), 'MMM yyyy');
      if (!months[month]) months[month] = { income: 0, expense: 0 };
      months[month].expense += e.totalAmount;
    });

    return Object.entries(months).map(([name, val]) => ({
      name,
      income: val.income,
      expense: val.expense,
      profit: val.income - val.expense
    })).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
  }, [filteredMilkEntries, filteredExpenseEntries]);

  const handleDeleteYearData = async () => {
    if (deleteYearConfirm !== deleteYearTarget.toString()) {
      toast.error(`Please type ${deleteYearTarget} to confirm!`);
      return;
    }

    if (!window.confirm(`Are you absolutely sure? This will delete ALL dairy data for ${deleteYearTarget}.`)) {
      return;
    }

    const toastId = toast.loading(`Deleting ${deleteYearTarget} data...`);
    setIsDeleting(true);
    try {
      await storage.deleteDairyYearData(deleteYearTarget);
      toast.success(`${deleteYearTarget} data deleted successfully! 🗑️`, { id: toastId });
      setIsSettingsOpen(false);
      setDeleteYearConfirm('');
      // Refresh data
      dispatch(fetchMilkEntries());
      dispatch(fetchDairyExpenses());
      // Reset selected year if it was deleted
      if (selectedYear === deleteYearTarget) {
        setSelectedYear(new Date().getFullYear());
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete data", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 h-full relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
            <button 
            onClick={() => navigate('/')}
            className="p-2.5 bg-card rounded-2xl shadow-sm border border-border hover:bg-background active:scale-95 transition-all"
          >
            <ArrowLeft size={20} className="text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Dairy / Gay Hishob</h1>
            <div className="flex items-center gap-2 mt-0.5">
               <p className="text-[10px] font-black uppercase text-accent tracking-widest">Management System</p>
               <span className="text-muted-foreground/30">•</span>
               <div className="relative inline-block">
                  <select 
                    className="appearance-none bg-accent/10 text-accent text-[10px] font-black uppercase px-3 py-1 rounded-full outline-none cursor-pointer pr-6"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                  >
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-accent/60">
                    <ChevronRight size={10} className="rotate-90" />
                  </div>
               </div>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-3 bg-card rounded-2xl shadow-sm border border-border hover:bg-background active:scale-95 transition-all text-muted-foreground hover:text-foreground"
        >
          <Settings size={24} />
        </button>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 mb-8">
        <div className="flex gap-1 p-1 bg-card rounded-[2rem] border border-border min-w-max sm:min-w-0">
          {(['Overview', 'Milk Records', 'Expenses', 'Analytics', 'Profit'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setEditingId(null); }}
              className={`flex-1 flex items-center justify-center px-6 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 relative min-w-[110px] sm:min-w-0 ${
                activeTab === tab 
                  ? 'text-accent' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
            {activeTab === tab && (
              <motion.div
                layoutId="activeDairyTab"
                className="absolute inset-0 bg-accent/10 rounded-2xl border border-accent/20"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">{tab}</span>
          </button>
        ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'Overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-2xl shadow-accent/10 group hover:border-accent/30 transition-all">
                <div className="p-2.5 bg-accent/10 text-accent rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform">
                  <Milk size={20} />
                </div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Total Milk</p>
                <p className="text-2xl font-black text-foreground leading-tight font-mono italic">{summaries.totalMilk.toLocaleString()} L</p>
              </div>
              <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-2xl shadow-success/10 group hover:border-success/30 transition-all">
                <div className="p-2.5 bg-success/10 text-success rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform">
                  <IndianRupee size={20} />
                </div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Total Sale</p>
                <p className="text-2xl font-black text-foreground leading-tight font-mono italic">₹{summaries.totalSale.toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Net Profit Card */}
            <div className={`p-8 rounded-[3rem] shadow-xl relative overflow-hidden transition-all ${summaries.netProfit >= 0 ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white' : 'bg-gradient-to-br from-red-600 to-red-700 text-white'}`}>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="p-4 rounded-full mb-4 bg-white/20 backdrop-blur-md">
                   {summaries.netProfit >= 0 ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
                </div>
                <p className="text-xs font-black uppercase tracking-[0.25em] opacity-80 mb-2">Dairy Net {summaries.netProfit >= 0 ? 'Profit' : 'Loss'}</p>
                <h2 className="text-5xl font-black tracking-tighter mb-2">₹{Math.abs(summaries.netProfit).toLocaleString('en-IN')}</h2>
                <div className="flex gap-4 mt-6">
                   <div className="bg-white/10 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                     Exp: ₹{summaries.totalExpense.toLocaleString()}
                   </div>
                   <div className="bg-white/10 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                     Dues: ₹{summaries.totalRemaining.toLocaleString()}
                   </div>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            </div>

            {/* Quick Actions / Recent Transactions can be added here */}
          </motion.div>
        )}

        {/* Milk Records Tab */}
        {activeTab === 'Milk Records' && (
          <motion.div 
            key="milk"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Milk Entry Form */}
            <div className="bg-card p-8 rounded-[3rem] shadow-xl border border-border">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-accent/10 text-accent rounded-2xl">
                      <Plus size={24} />
                    </div>
                    <h2 className="text-xl font-black text-foreground uppercase tracking-tight">New Milk Record</h2>
                  </div>
                  
                  {/* Toggle */}
                  <div className="flex bg-card-secondary p-1 rounded-[1.25rem] w-fit border border-border">
                    <button 
                      onClick={() => setMilkForm({...milkForm, entryType: 'daily'})}
                      className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${milkForm.entryType === 'daily' ? 'bg-card text-accent shadow-sm border border-border' : 'text-muted-foreground'}`}
                    >
                      Daily
                    </button>
                    <button 
                      onClick={() => setMilkForm({...milkForm, entryType: 'bulk'})}
                      className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${milkForm.entryType === 'bulk' ? 'bg-card text-accent shadow-sm border border-border' : 'text-muted-foreground'}`}
                    >
                      Bulk (Period)
                    </button>
                  </div>
               </div>

               <form onSubmit={handleMilkSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 block tracking-wider">Cow Name / Number (Optional)</label>
                        <input type="text" placeholder="e.g. Kapila, 101" className="w-full bg-card-secondary border border-border rounded-3xl px-6 py-4 font-bold outline-none text-foreground focus:ring-2 focus:ring-accent/20" value={milkForm.cowName} onChange={e => setMilkForm({...milkForm, cowName: e.target.value})} />
                     </div>

                     {milkForm.entryType === 'daily' ? (
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 block tracking-wider">Date</label>
                          <input required type="date" className="w-full bg-card-secondary border border-border rounded-3xl px-6 py-4 font-bold outline-none text-foreground focus:ring-2 focus:ring-accent/20" value={milkForm.date} onChange={e => setMilkForm({...milkForm, date: e.target.value})} />
                       </div>
                     ) : (
                       <>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 block tracking-wider">Start Date</label>
                            <input required type="date" className="w-full bg-card-secondary border border-border rounded-3xl px-6 py-4 font-bold outline-none text-foreground focus:ring-2 focus:ring-accent/20" value={milkForm.startDate} onChange={e => setMilkForm({...milkForm, startDate: e.target.value})} />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 block tracking-wider">End Date</label>
                            <input required type="date" className="w-full bg-card-secondary border border-border rounded-3xl px-6 py-4 font-bold outline-none text-foreground focus:ring-2 focus:ring-accent/20" value={milkForm.endDate} onChange={e => setMilkForm({...milkForm, endDate: e.target.value})} />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-accent ml-1 block tracking-wider font-black">दिवस (Number of Days)</label>
                            <input required type="number" placeholder="Days" className="w-full bg-card-secondary border border-border rounded-3xl px-6 py-4 font-bold outline-none text-foreground focus:ring-2 focus:ring-accent/20" value={milkForm.totalDays} onChange={e => setMilkForm({...milkForm, totalDays: e.target.value})} />
                         </div>
                       </>
                     )}
                     
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 block tracking-wider">एकूण दूध (Total Milk - L)</label>
                        <input required type="number" step="0.1" placeholder="0.0" className="w-full bg-card-secondary border border-border rounded-3xl px-6 py-4 font-bold outline-none text-foreground focus:ring-2 focus:ring-accent/20" value={milkForm.totalMilk} onChange={e => setMilkForm({...milkForm, totalMilk: e.target.value})} />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 block tracking-wider">दुधाचा भाव (Milk Rate / L)</label>
                        <input required type="number" placeholder="₹ Price" className="w-full bg-card-secondary border border-border rounded-3xl px-6 py-4 font-bold outline-none text-foreground focus:ring-2 focus:ring-accent/20" value={milkForm.milkPrice} onChange={e => setMilkForm({...milkForm, milkPrice: e.target.value})} />
                     </div>

                     <div className="bg-accent/5 p-6 rounded-3xl md:col-span-2 border border-accent/10">
                        <div className="flex justify-between items-center mb-1 text-right">
                           <span className="text-[10px] font-black uppercase text-accent/60 tracking-wider">एकूण पैसे (Total Amount)</span>
                           <span className="text-2xl font-black text-accent drop-shadow-sm font-mono">₹{(Number(milkForm.totalMilk) * Number(milkForm.milkPrice)).toLocaleString()}</span>
                        </div>
                        <p className="text-[9px] font-bold text-accent/40 italic uppercase">Auto-calculated based on milk and rate</p>
                     </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                     <button 
                        type="button" 
                        onClick={resetMilkForm} 
                        className="w-full sm:flex-1 py-4 px-6 bg-muted text-muted-foreground font-black uppercase tracking-widest rounded-2xl hover:brightness-95 active:scale-95 transition-all text-sm whitespace-nowrap flex items-center justify-center min-h-[56px]"
                     >
                        Clear
                     </button>
                     <button 
                        type="submit" 
                        className="w-full sm:flex-[2] py-4 px-6 bg-accent text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-accent/20 hover:brightness-110 active:scale-95 transition-all text-sm whitespace-nowrap flex items-center justify-center min-h-[56px]"
                     >
                        {editingId ? 'Update Record' : 'Save Record'}
                     </button>
                  </div>
               </form>
            </div>

            {/* Milk History */}
            <div className="space-y-4">
               {filteredMilkEntries.map((entry) => (
                 <div key={entry.id} className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm flex flex-col group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-accent opacity-30" />
                    <div className="flex justify-between items-center mb-6 text-right relative z-10">
                       <div className="flex items-center gap-4 text-left">
                          <div className="p-3 bg-card-secondary text-accent border border-border rounded-2xl group-hover:bg-accent group-hover:text-white transition-all text-left">
                             <Milk size={20} />
                          </div>
                          <div className="text-left">
                             <h3 className="font-black text-foreground tracking-tight">{entry.cowName || (entry.entryType === 'bulk' ? 'Bulk Entry' : 'Milk Entry')}</h3>
                             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                               {entry.entryType === 'bulk' ? (
                                 `${format(new Date(entry.startDate), 'dd MMM')} - ${format(new Date(entry.endDate), 'dd MMM')}`
                               ) : (
                                 format(new Date(entry.date), 'dd MMM yyyy')
                               )}
                             </p>
                          </div>
                       </div>
                       <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => { 
                             setEditingId(entry.id); 
                             setMilkForm({ 
                               entryType: entry.entryType || 'daily',
                               cowName: entry.cowName || '', 
                               totalMilk: entry.totalMilk.toString(), 
                               milkPrice: entry.milkPrice.toString(), 
                               date: format(new Date(entry.date), 'yyyy-MM-dd'),
                               startDate: entry.startDate ? format(new Date(entry.startDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                               endDate: entry.endDate ? format(new Date(entry.endDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                               totalDays: (entry.totalDays || 1).toString(),
                             }); 
                             window.scrollTo({top: 0, behavior: 'smooth'}); 
                          }} className="p-2.5 bg-card-secondary border border-border text-muted-foreground hover:text-accent rounded-xl transition-colors">
                             <Plus className="rotate-45" size={16} />
                          </button>
                          <button onClick={() => { if(window.confirm('Delete?')) dispatch(deleteMilkEntry(entry.id)); }} className="p-2.5 bg-card-secondary border border-border text-muted-foreground hover:text-error rounded-xl transition-colors">
                             <Trash2 size={16} />
                          </button>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-3 relative z-10">
                       <div className="bg-card-secondary p-4 rounded-2xl text-center border border-border">
                          <p className="text-[8px] font-black text-muted-foreground uppercase mb-1 leading-none tracking-widest">Days</p>
                          <p className="text-sm font-black text-foreground leading-none font-mono italic">{entry.totalDays || 1}</p>
                       </div>
                       <div className="bg-card-secondary p-4 rounded-2xl text-center border border-border">
                          <p className="text-[8px] font-black text-muted-foreground uppercase mb-1 leading-none tracking-widest">Milk (L)</p>
                          <p className="text-sm font-black text-foreground leading-none font-mono italic">{entry.totalMilk.toFixed(1)}</p>
                       </div>
                       <div className="bg-card-secondary p-4 rounded-2xl text-center border border-border">
                          <p className="text-[8px] font-black text-muted-foreground uppercase mb-1 leading-none tracking-widest">Rate</p>
                          <p className="text-sm font-black text-foreground leading-none font-mono italic">₹{entry.milkPrice}</p>
                       </div>
                       <div className="bg-accent/5 p-4 rounded-2xl text-center border border-accent/10">
                          <p className="text-[8px] font-black text-accent uppercase mb-1 leading-none tracking-widest">Total</p>
                          <p className="text-sm font-black text-accent leading-none font-mono italic">₹{entry.totalSale.toLocaleString()}</p>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          </motion.div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'Expenses' && (
          <motion.div 
            key="expenses"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            {/* Expense Form */}
            <div className="bg-card p-8 rounded-[3rem] shadow-xl border border-border">
               <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-warning/10 text-warning rounded-2xl">
                    <ShoppingCart size={24} />
                  </div>
                  <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Dairy Expense</h2>
               </div>
               <form onSubmit={handleExpenseSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block tracking-wider">Expense Type</label>
                        <select className="w-full bg-background border border-border rounded-3xl px-6 py-4 font-bold outline-none appearance-none text-foreground" value={expenseForm.expenseType} onChange={e => setExpenseForm({...expenseForm, expenseType: e.target.value})}>
                           {EXPENSE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block tracking-wider">Date</label>
                        <input required type="date" className="w-full bg-background border border-border rounded-3xl px-6 py-4 font-bold outline-none text-foreground" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block tracking-wider">Quantity</label>
                           <input type="number" placeholder="Qty" className="w-full bg-background border border-border rounded-3xl px-6 py-4 font-bold outline-none text-foreground" value={expenseForm.quantity} onChange={e => setExpenseForm({...expenseForm, quantity: e.target.value})} />
                        </div>
                        <div>
                           <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block tracking-wider">Price / Unit</label>
                           <input type="number" placeholder="Price" className="w-full bg-background border border-border rounded-3xl px-6 py-4 font-bold outline-none text-foreground" value={expenseForm.price} onChange={e => setExpenseForm({...expenseForm, price: e.target.value})} />
                        </div>
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block tracking-wider text-warning font-black">Total Expense</label>
                        <input required type="number" placeholder="Total Amount" className="w-full bg-warning/10 border border-warning/10 rounded-3xl px-6 py-4 font-black text-warning outline-none" value={expenseForm.totalAmount || (Number(expenseForm.quantity) * Number(expenseForm.price)) || ''} onChange={e => setExpenseForm({...expenseForm, totalAmount: e.target.value})} />
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block tracking-wider">Initial Payment (Paid Now)</label>
                        <input type="number" placeholder="₹ Amount Paid" className="w-full bg-success/10 border border-success/10 rounded-3xl px-6 py-4 font-bold text-success outline-none" value={expenseForm.paidAmountNow} onChange={e => setExpenseForm({...expenseForm, paidAmountNow: e.target.value})} />
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block tracking-wider">Description</label>
                        <input type="text" placeholder="Short note..." className="w-full bg-background border border-border rounded-3xl px-6 py-4 font-bold outline-none text-foreground" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} />
                     </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                     <button 
                        type="button" 
                        onClick={resetExpenseForm} 
                        className="w-full sm:flex-1 py-4 px-6 bg-card-secondary text-muted-foreground font-black uppercase tracking-widest rounded-2xl hover:brightness-95 active:scale-95 transition-all text-sm whitespace-nowrap flex items-center justify-center min-h-[56px]"
                     >
                        Clear
                     </button>
                     <button 
                        type="submit" 
                        className="w-full sm:flex-[2] py-4 px-6 bg-warning text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-warning/20 hover:brightness-110 active:scale-95 transition-all text-sm whitespace-nowrap flex items-center justify-center min-h-[56px]"
                     >
                        Save Expense
                     </button>
                  </div>
               </form>
            </div>

            {/* Expense List */}
            <div className="space-y-4">
               {filteredExpenseEntries.map((entry) => (
                 <div key={entry.id} className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                       <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl ${entry.paymentStatus === 'paid' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                             {EXPENSE_TYPES.find(t => t.id === entry.expenseType)?.icon ? React.createElement(EXPENSE_TYPES.find(t => t.id === entry.expenseType)!.icon, { size: 20 }) : <ShoppingCart size={20} />}
                          </div>
                          <div>
                             <h3 className="font-black text-foreground uppercase text-xs">{EXPENSE_TYPES.find(t => t.id === entry.expenseType)?.label || entry.expenseType}</h3>
                             <p className="text-[10px] font-bold text-muted-foreground">{format(new Date(entry.date), 'dd MMM yyyy')}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="font-black text-foreground italic">₹{entry.totalAmount.toLocaleString()}</p>
                          <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${entry.paymentStatus === 'paid' ? 'bg-success/20 text-success-foreground' : 'bg-error/20 text-error-foreground'}`}>
                            {entry.paymentStatus}
                          </span>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                       <div className="bg-background p-3 rounded-2xl text-center">
                          <p className="text-[8px] font-black text-muted-foreground uppercase mb-1 leading-none">Paid</p>
                          <p className="text-xs font-black text-success leading-none">₹{entry.totalPaidAmount.toLocaleString()}</p>
                       </div>
                       <div className="bg-background p-3 rounded-2xl text-center">
                          <p className="text-[8px] font-black text-muted-foreground uppercase mb-1 leading-none">Remaining</p>
                          <p className="text-xs font-black text-error leading-none">₹{entry.remainingAmount.toLocaleString()}</p>
                       </div>
                    </div>

                    <div className="flex gap-2">
                       {entry.remainingAmount > 0 && (
                         <button 
                           onClick={() => setShowPaymentModal(entry.id)} 
                           className="flex-1 py-3 bg-accent text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:brightness-110 active:scale-95 transition-all whitespace-nowrap min-h-[48px] flex items-center justify-center"
                         >
                           Update Payment
                         </button>
                       )}
                       <button onClick={() => { if(window.confirm('Delete?')) dispatch(deleteDairyExpense(entry.id)); }} className="p-3 bg-background text-muted-foreground hover:text-error rounded-2xl transition-all"><Trash2 size={16} /></button>
                    </div>
                 </div>
               ))}
            </div>
          </motion.div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'Analytics' && (
          <motion.div 
            key="analytics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Monthly Stats Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-[2.5rem] text-white shadow-lg">
                <p className="text-[10px] font-black uppercase opacity-80 tracking-widest mb-1">Monthly Production</p>
                <p className="text-2xl font-black">{analyticsSummaries.monthlyMilk.toFixed(1)} L</p>
                <p className="text-[8px] font-bold opacity-60 uppercase mt-2">{format(new Date(), 'MMMM yyyy')}</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-[2.5rem] text-white shadow-lg">
                <p className="text-[10px] font-black uppercase opacity-80 tracking-widest mb-1">Monthly Earnings</p>
                <p className="text-2xl font-black">₹{analyticsSummaries.monthlyEarnings.toLocaleString()}</p>
                <p className="text-[8px] font-bold opacity-60 uppercase mt-2">{format(new Date(), 'MMMM yyyy')}</p>
              </div>
            </div>

            {/* Milk Production Line Chart */}
            <div className="bg-card p-8 rounded-[3rem] border border-border shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-8">Milk Production Trend (Litres)</h3>
                <div className="h-[250px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={chartData}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border} />
                         <XAxis dataKey="date" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} stroke={colors.muted} />
                         <YAxis fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} stroke={colors.muted} />
                         <Tooltip 
                            contentStyle={{ 
                               borderRadius: '24px', 
                               border: 'none', 
                               boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                               backgroundColor: colors.card,
                               color: colors.foreground
                            }} 
                         />
                         <Line type="monotone" dataKey="total" name="Total Milk" stroke={colors.accent} strokeWidth={4} dot={{ r: 4, fill: colors.accent }} activeDot={{ r: 8 }} />
                       </LineChart>
                   </ResponsiveContainer>
                </div>
            </div>

            {/* Expense Breakdown Pie Chart */}
            <div className="bg-card p-8 rounded-[3rem] border border-border shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-8 flex justify-center">Expense Composition</h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensePieData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {expensePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '24px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          backgroundColor: colors.card,
                          color: colors.foreground
                        }} 
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', color: colors.muted }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'Profit' && (
          <motion.div 
            key="profit"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-8"
          >
            {/* Profit Dashboard Hero */}
            <div className={`p-8 rounded-[3.5rem] shadow-2xl relative overflow-hidden transition-all ${profitStats.netProfit >= 0 ? 'bg-gradient-to-br from-green-600 to-green-700' : 'bg-gradient-to-br from-red-600 to-red-700'} text-white`}>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">{profitStats.netProfit >= 0 ? 'अंतिम नफा (Final Profit)' : 'अंतिम तोटा (Final Loss)'}</p>
                    <h2 className="text-5xl font-black tracking-tighter">₹{Math.abs(profitStats.netProfit).toLocaleString('en-IN')}</h2>
                  </div>
                  <div className="p-4 bg-white/20 backdrop-blur-xl rounded-full">
                    {profitStats.netProfit >= 0 ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 backdrop-blur-md p-5 rounded-[2rem]">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">दुधाची कमाई (Income)</p>
                    <p className="text-lg font-black">₹{profitStats.totalIncome.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-5 rounded-[2rem]">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">डेअरी खर्च (Expenses)</p>
                    <p className="text-lg font-black">₹{profitStats.totalExpense.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
            </div>

            {/* Efficiency Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm text-center">
                 <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Cost Per Liter</p>
                 <p className="text-2xl font-black text-red-500 dark:text-red-400">₹{profitStats.costPerLiter.toFixed(1)}</p>
                 <p className="text-[8px] font-bold text-slate-300 dark:text-slate-600 mt-1 uppercase italic">(Expense / Total Milk)</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm text-center">
                 <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Avg Milk Rate</p>
                 <p className="text-2xl font-black text-green-600 dark:text-green-500">₹{profitStats.avgMilkRate.toFixed(1)}</p>
                 <p className="text-[8px] font-bold text-slate-300 dark:text-slate-600 mt-1 uppercase italic">(Income / Total Milk)</p>
              </div>
            </div>

            {/* Monthly Profit Card */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Monthly Performance</h3>
                  <span className="px-3 py-1 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-black uppercase">{format(new Date(), 'MMMM')}</span>
                </div>
                <div className="space-y-4">
                   <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">This Month Income</span>
                      <span className="text-sm font-black text-green-600 dark:text-green-500">₹{profitStats.monthlyIncome.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">This Month Expense</span>
                      <span className="text-sm font-black text-red-500 dark:text-red-400">₹{profitStats.monthlyExpense.toLocaleString()}</span>
                   </div>
                   <div className={`flex justify-between items-center p-6 rounded-3xl ${profitStats.monthlyProfit >= 0 ? 'bg-green-600' : 'bg-red-600'} text-white`}>
                      <div>
                        <p className="text-[8px] font-black tracking-widest uppercase opacity-70">Monthly {profitStats.monthlyProfit >= 0 ? 'Profit' : 'Loss'}</p>
                        <p className="text-xl font-black">₹{Math.abs(profitStats.monthlyProfit).toLocaleString()}</p>
                      </div>
                      <ChevronRight size={24} className="opacity-40" />
                   </div>
                </div>
            </div>

            {/* Expense Breakdown */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
               <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-8">Expense Breakdown</h3>
               <div className="grid grid-cols-1 gap-3">
                  {EXPENSE_TYPES.map((type, idx) => (
                    <div key={type.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all text-right">
                       <div className="flex items-center gap-3 text-left">
                          <div className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-left`}>
                             <type.icon size={16} />
                          </div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{type.label}</span>
                       </div>
                       <div className="flex flex-col items-end">
                          <span className="text-sm font-black text-slate-900 dark:text-slate-100">₹{profitStats.breakdown[type.id].toLocaleString()}</span>
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                             <div 
                                className="h-full bg-blue-500" 
                                style={{ width: `${profitStats.totalExpense > 0 ? (profitStats.breakdown[type.id] / profitStats.totalExpense) * 100 : 0}%` }} 
                             />
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            {/* Charts Section */}
            <div className="space-y-6">
               <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-8">Income vs Expense</h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyProfitData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border} />
                        <XAxis dataKey="name" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} stroke={colors.muted} />
                        <YAxis fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} stroke={colors.muted} />
                        <Tooltip 
                            cursor={{ fill: colors.border }} 
                            contentStyle={{ 
                                borderRadius: '24px', 
                                border: 'none', 
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                backgroundColor: colors.card,
                                color: colors.foreground
                            }} 
                        />
                        <Bar dataKey="income" name="Income" fill={colors.success} radius={[8, 8, 0, 0]} />
                        <Bar dataKey="expense" name="Expense" fill={colors.error} radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               <div className="bg-white dark:bg-slate-900 p-8 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-8">Monthly Profit Trend</h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyProfitData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border} />
                        <XAxis dataKey="name" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} stroke={colors.muted} />
                        <YAxis fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} stroke={colors.muted} />
                        <Tooltip 
                            contentStyle={{ 
                                borderRadius: '24px', 
                                border: 'none', 
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                backgroundColor: colors.card,
                                color: colors.foreground
                            }} 
                        />
                        <Line type="monotone" dataKey="profit" name="Net Profit" stroke={colors.accent} strokeWidth={4} dot={{ r: 6, fill: colors.accent }} activeDot={{ r: 10 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPaymentModal(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 relative z-10 shadow-2xl">
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight mb-2">Update Payment</h3>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 italic text-right">Recording new payment transaction</p>
                
                <div className="space-y-6">
                   <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 mb-2 block tracking-wider">Amount (₹)</label>
                      <input autoFocus type="number" placeholder="₹ 0.00" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 font-black outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 dark:text-slate-100" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                   </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                         <button 
                           onClick={() => setShowPaymentModal(null)} 
                           className="w-full sm:flex-1 py-4 px-4 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
                         >
                           Cancel
                         </button>
                         <button 
                           onClick={handleUpdatePayment} 
                           className="w-full sm:flex-1 py-4 px-4 bg-blue-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-blue-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center whitespace-nowrap"
                         >
                           Confirm Payment
                         </button>
                      </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { if(!isDeleting) setIsSettingsOpen(false); }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 relative z-10 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Dairy Settings</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest italic text-right">Manage your records</p>
                  </div>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-8">
                   {/* Data Cleanup Section */}
                   <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-[2.5rem] border border-red-100 dark:border-red-900/30">
                      <div className="flex items-center gap-3 mb-6 text-red-600 dark:text-red-400">
                         <AlertTriangle size={20} />
                         <span className="text-[10px] font-black uppercase tracking-widest">Delete Year Data</span>
                      </div>

                      <div className="space-y-4">
                         <div>
                            <label className="text-[9px] font-black uppercase text-red-400 dark:text-red-500 ml-1 mb-2 block tracking-wider">Select Year to Delete</label>
                            <select 
                              className="w-full bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/30 rounded-2xl px-4 py-3 font-bold text-red-900 dark:text-red-200 outline-none appearance-none"
                              value={deleteYearTarget}
                              onChange={(e) => setDeleteYearTarget(Number(e.target.value))}
                            >
                              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                         </div>

                         <div>
                            <label className="text-[9px] font-black uppercase text-red-400 dark:text-red-500 ml-1 mb-2 block tracking-wider">Type {deleteYearTarget} to Confirm</label>
                            <input 
                              type="number" 
                              placeholder={`Type ${deleteYearTarget}`} 
                              className="w-full bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/30 rounded-2xl px-4 py-3 font-black text-red-900 dark:text-red-100 outline-none placeholder:text-red-200 dark:placeholder:text-red-900/50"
                              value={deleteYearConfirm}
                              onChange={e => setDeleteYearConfirm(e.target.value)}
                            />
                         </div>

                         <button 
                           onClick={handleDeleteYearData}
                           disabled={isDeleting || deleteYearConfirm !== deleteYearTarget.toString()}
                           className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg ${
                             isDeleting || deleteYearConfirm !== deleteYearTarget.toString()
                               ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 shadow-none'
                               : 'bg-red-600 text-white shadow-red-100 dark:shadow-none hover:bg-red-700 active:scale-95'
                           }`}
                         >
                           {isDeleting ? 'Deleting...' : 'Delete Year Records'}
                         </button>
                      </div>
                      <p className="mt-4 text-[8px] font-bold text-red-400 dark:text-red-500 text-center uppercase leading-relaxed font-black">
                        Warning: This will permanently delete all Milk and Expense records for the selected year.
                      </p>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
