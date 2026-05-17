import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux';
import { 
  fetchHarvestEntries, 
  addHarvestEntry, 
  updateHarvestEntry, 
  deleteHarvestEntry 
} from '../redux/slices/harvestSlice';
import { fetchEntries as fetchTractorEntries } from '../redux/slices/tractorSlice';
import { fetchKhatEntries } from '../redux/slices/khatSlice';
import { fetchSeedEntries } from '../redux/slices/seedSlice';
import { fetchAushadEntries } from '../redux/slices/aushadSlice';
import { fetchWorkerEntries } from '../redux/slices/workerSlice';
import { HarvestEntry, Farm } from '../types';
import { SEASONS } from '../constants/seasons';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingBag, 
  IndianRupee, 
  Truck, 
  Package, 
  BarChart2, 
  Plus, 
  History, 
  ArrowLeft,
  PieChart as PieChartIcon,
  Trash2,
  Edit3,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell,
  Legend,
  PieChart,
  Pie
} from 'recharts';

type TabType = 'Overview' | 'New Record' | 'History' | 'Analytics';

export default function HarvestModuleScreen() {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { theme, colors, isDark } = useTheme();
  
  const { entries: harvestEntries, loading: harvestLoading } = useSelector((state: RootState) => state.harvest);
  const { entries: tractorEntries } = useSelector((state: RootState) => state.tractor);
  const { entries: khatEntries } = useSelector((state: RootState) => state.khat);
  const { entries: seedEntries } = useSelector((state: RootState) => state.seed);
  const { entries: aushadEntries } = useSelector((state: RootState) => state.aushad);
  const { entries: workerEntries } = useSelector((state: RootState) => state.worker);
  const farms = useSelector((state: RootState) => state.farm.farms);
  
  const [activeTab, setActiveTab] = useState<TabType>('Overview');
  const [farm, setFarm] = useState<Farm | null>(null);
  
  const [formData, setFormData] = useState({
    season: 'Rainy Season',
    cropName: '',
    quantity: '',
    unit: 'Quintal' as 'Quintal' | 'Kg' | 'Ton',
    marketPrice: '',
    transportCost: '0',
    marketExpense: '0',
    otherExpense: '0',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (farmId) {
      setFarm(farms.find(f => f.id === farmId) || null);
      dispatch(fetchHarvestEntries(farmId));
      // Load all other module data for profit calculation
      dispatch(fetchTractorEntries(farmId));
      dispatch(fetchKhatEntries(farmId));
      dispatch(fetchSeedEntries(farmId));
      dispatch(fetchAushadEntries(farmId));
      dispatch(fetchWorkerEntries(farmId));
    }
  }, [farmId, farms, dispatch]);

  // Calculations
  const otherModuleExpenses = useMemo(() => {
    const tractorTotal = tractorEntries.reduce((sum, e) => sum + e.totalAmount, 0);
    const khatTotal = khatEntries.reduce((sum, e) => sum + e.totalAmount, 0);
    const seedTotal = seedEntries.reduce((sum, e) => sum + e.totalAmount, 0);
    const aushadTotal = aushadEntries.reduce((sum, e) => sum + e.totalAmount, 0);
    const workerTotal = workerEntries.reduce((sum, e) => sum + e.totalAmount, 0);
    
    return {
      tractor: tractorTotal,
      khat: khatTotal,
      seed: seedTotal,
      aushad: aushadTotal,
      worker: workerTotal,
      total: tractorTotal + khatTotal + seedTotal + aushadTotal + workerTotal
    };
  }, [tractorEntries, khatEntries, seedEntries, aushadEntries, workerEntries]);

  const currentSaleAmount = Number(formData.quantity) * Number(formData.marketPrice) || 0;
  const currentLocalExpenses = Number(formData.transportCost) + Number(formData.marketExpense) + Number(formData.otherExpense) || 0;
  
  const totalSale = harvestEntries.reduce((sum, e) => sum + e.totalSale, 0);
  const totalProductionExpenses = harvestEntries.reduce((sum, e) => sum + (e.transportCost + e.marketExpense + e.otherExpense), 0);
  const totalExpense = otherModuleExpenses.total + totalProductionExpenses;
  const netProfit = totalSale - totalExpense;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId) return;

    const quantity = Number(formData.quantity);
    const marketPrice = Number(formData.marketPrice);
    const sale = quantity * marketPrice;
    
    const entryData = {
      farmId,
      season: formData.season,
      cropName: formData.cropName,
      quantity,
      unit: formData.unit,
      marketPrice,
      totalSale: sale,
      transportCost: Number(formData.transportCost),
      marketExpense: Number(formData.marketExpense),
      otherExpense: Number(formData.otherExpense),
      totalExpense: (Number(formData.transportCost) + Number(formData.marketExpense) + Number(formData.otherExpense)),
      profit: sale - (Number(formData.transportCost) + Number(formData.marketExpense) + Number(formData.otherExpense)),
      date: new Date(formData.date).toISOString(),
    };

    const toastId = toast.loading(editingId ? "Updating record..." : "Saving record...");
    try {
      if (editingId) {
        await dispatch(updateHarvestEntry({ id: editingId, data: entryData })).unwrap();
        toast.success("Updated successfully ✏️", { id: toastId });
      } else {
        await dispatch(addHarvestEntry(entryData)).unwrap();
        toast.success("Record saved successfully ✅", { id: toastId });
      }
      handleReset();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveTab('Overview');
    } catch (err: any) {
      toast.error(err.message || "Something went wrong ❌", { id: toastId });
    }
  };

  const handleEdit = (entry: HarvestEntry) => {
    setEditingId(entry.id);
    setFormData({
      season: entry.season || 'Rainy Season',
      cropName: entry.cropName,
      quantity: entry.quantity.toString(),
      unit: entry.unit,
      marketPrice: entry.marketPrice.toString(),
      transportCost: entry.transportCost.toString(),
      marketExpense: entry.marketExpense.toString(),
      otherExpense: entry.otherExpense.toString(),
      date: format(new Date(entry.date), 'yyyy-MM-dd'),
    });
    setActiveTab('New Record');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this harvest record?")) {
      const toastId = toast.loading("Deleting record...");
      try {
        await dispatch(deleteHarvestEntry(id)).unwrap();
        toast.success("Deleted successfully 🗑️", { id: toastId });
      } catch (err: any) {
        toast.error(err.message || "Failed to delete", { id: toastId });
      }
    }
  };

  const handleReset = () => {
    setEditingId(null);
    setFormData({
      season: 'Rainy Season',
      cropName: '',
      quantity: '',
      unit: 'Quintal',
      marketPrice: '',
      transportCost: '0',
      marketExpense: '0',
      otherExpense: '0',
      date: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const cropData = useMemo(() => {
    const data: Record<string, number> = {};
    harvestEntries.forEach(e => {
      data[e.cropName] = (data[e.cropName] || 0) + (e.totalSale - (e.transportCost + e.marketExpense + e.otherExpense));
    });
    return Object.entries(data).map(([name, profit]) => ({ name, profit }));
  }, [harvestEntries]);

  const expensePieData = [
    { name: 'Tractor', value: otherModuleExpenses.tractor, color: colors.accent },
    { name: 'Khat', value: otherModuleExpenses.khat, color: colors.success },
    { name: 'Seeds', value: otherModuleExpenses.seed, color: colors.warning },
    { name: 'Aushad', value: otherModuleExpenses.aushad, color: colors.error },
    { name: 'Worker', value: otherModuleExpenses.worker, color: '#8b5cf6' },
    { name: 'Selling Exp', value: totalProductionExpenses, color: '#ec4899' },
  ].filter(d => d.value > 0);

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/farm/${farmId}`)}
            className="p-2.5 bg-card rounded-2xl shadow-sm border border-border hover:bg-background active:scale-95 transition-all"
          >
            <ArrowLeft size={20} className="text-muted-foreground" />
          </button>
          <div className="text-left">
            <h1 className="text-2xl font-black text-foreground tracking-tight text-left">Profit / Harvest</h1>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-left">{farm?.name} ({farm?.year})</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 mb-8">
        <div className="flex gap-1 p-1 bg-card rounded-[2rem] border border-border min-w-max sm:min-w-0">
          {(['Overview', 'New Record', 'History', 'Analytics'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center px-6 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 relative min-w-[120px] sm:min-w-0 ${
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
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm text-left">
                <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-2xl w-fit mb-4">
                  <Package size={20} />
                </div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1 text-left">Total Sale</p>
                <p className="text-xl font-black text-foreground leading-tight text-left">₹{totalSale.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm text-left">
                <div className="p-2.5 bg-orange-500/10 text-orange-500 rounded-2xl w-fit mb-4">
                  <AlertCircle size={20} />
                </div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1 text-left">Total Expense</p>
                <p className="text-xl font-black text-foreground leading-tight text-left">₹{totalExpense.toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Net Profit Card */}
            <div className="relative overflow-hidden group">
              <div className={`absolute inset-0 bg-gradient-to-br rounded-[3rem] opacity-100 ${netProfit >= 0 ? 'from-green-600 to-emerald-700 dark:from-green-600 dark:to-green-950' : 'from-red-600 to-rose-700 dark:from-red-600 dark:to-red-950'}`} />
              <div className={`absolute -inset-0.5 rounded-[3rem] blur opacity-20 group-hover:opacity-30 transition duration-1000 ${netProfit >= 0 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`} />

              <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-[3rem] p-8 text-white shadow-xl overflow-hidden text-center">
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className={`p-4 rounded-full mb-4 bg-white/20 backdrop-blur-md`}>
                    {netProfit >= 0 ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] opacity-80 mb-2 font-mono">Net {netProfit >= 0 ? 'Profit' : 'Loss'}</p>
                  <h2 className="text-5xl font-black tracking-tighter mb-2 italic font-mono">₹{Math.abs(netProfit).toLocaleString('en-IN')}</h2>
                  <div className="flex gap-4 mt-6">
                     <div className="bg-white/10 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest font-mono">
                       Sale: ₹{totalSale.toLocaleString()}
                     </div>
                     <div className="bg-white/10 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-50 font-mono">
                       Expense: ₹{totalExpense.toLocaleString()}
                     </div>
                  </div>
                </div>
                {/* Decorative Circle */}
                <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl opacity-50" />
              </div>
            </div>

            {/* Expense Source Breakdown */}
            <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm text-left">
               <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6 text-left">Expense Distribution</h3>
               <div className="space-y-4">
                  {Object.entries(otherModuleExpenses).filter(([key]) => key !== 'total').map(([key, val]) => (
                    <div key={key} className="flex items-center gap-4 text-left">
                      <div className="flex-1 text-left">
                        <div className="flex justify-between text-[10px] font-black uppercase mb-1.5 text-left">
                          <span className="text-muted-foreground">{key}</span>
                          <span className="text-foreground">₹{val.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-card-secondary rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(val / totalExpense) * 100}%` }}
                            className={`h-full rounded-full ${
                              key === 'tractor' ? 'bg-blue-500' :
                              key === 'khat' ? 'bg-green-500' :
                              key === 'seed' ? 'bg-orange-500' :
                              key === 'aushad' ? 'bg-red-500' :
                              'bg-purple-500'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-4 pt-2 border-t border-border">
                    <div className="flex-1 text-left">
                      <div className="flex justify-between text-[10px] font-black uppercase mb-1.5 text-left">
                        <span className="text-muted-foreground">Sell & Transport</span>
                        <span className="text-foreground">₹{totalProductionExpenses.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-card-secondary rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(totalProductionExpenses / totalExpense) * 100}%` }}
                          className="h-full bg-pink-500 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'New Record' && (
          <motion.div
            key="new-record"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-card p-8 rounded-[3rem] shadow-xl border border-border"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-accent/10 text-accent rounded-2xl">
                <Plus size={24} />
              </div>
              <h2 className="text-xl font-black text-foreground uppercase tracking-tight text-left">
                {editingId ? 'Edit Harvest Record' : 'New Harvest Record'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-left">
                   <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Crop Name</label>
                   <input required type="text" placeholder="e.g. Soyabean, Wheat" className="w-full bg-card-secondary border border-border rounded-3xl px-6 py-4 font-bold outline-none focus:ring-2 focus:ring-accent/20 text-foreground transition-all font-sans" value={formData.cropName} onChange={e => setFormData({...formData, cropName: e.target.value})} />
                </div>
                <div className="text-left">
                   <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Harvest Date</label>
                   <div className="relative">
                      <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground font-sans" size={18} />
                      <input required type="date" className="w-full bg-card-secondary border border-border rounded-3xl pl-14 pr-6 py-4 font-bold outline-none focus:ring-2 focus:ring-accent/20 text-foreground transition-all font-sans" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                   </div>
                </div>
                <div className="flex gap-2 text-left">
                   <div className="flex-1 text-left">
                      <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Quantity</label>
                      <input required type="number" placeholder="Production" className="w-full bg-card-secondary border border-border rounded-3xl px-6 py-4 font-bold outline-none focus:ring-2 focus:ring-accent/20 text-foreground transition-all font-sans" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                   </div>
                   <div className="w-1/3 text-left">
                      <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Unit</label>
                      <select className="w-full bg-card-secondary border border-border rounded-3xl px-4 py-4 font-bold outline-none appearance-none text-foreground transition-all text-xs" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value as any})}>
                        <option value="Quintal">Quintal</option>
                        <option value="Kg">Kg</option>
                        <option value="Ton">Ton</option>
                      </select>
                   </div>
                </div>
                <div className="text-left">
                   <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block text-left">Market Price (per {formData.unit})</label>
                   <input required type="number" placeholder="₹ Price" className="w-full bg-card-secondary border border-border rounded-3xl px-6 py-4 font-bold outline-none focus:ring-2 focus:ring-accent/20 text-foreground transition-all font-sans" value={formData.marketPrice} onChange={e => setFormData({...formData, marketPrice: e.target.value})} />
                </div>
              </div>

              <div className="bg-card-secondary/50 p-6 rounded-[2.5rem] space-y-6 text-left border border-border">
                 <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground text-left">Production & Selling Expenses</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                    <div className="text-left">
                      <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block tracking-wider text-left">वाहतूक खर्च</label>
                      <input type="number" className="w-full bg-card border border-border rounded-2xl px-6 py-4 font-bold text-foreground outline-none transition-all font-sans" value={formData.transportCost} onChange={e => setFormData({...formData, transportCost: e.target.value})} />
                      <p className="text-[9px] text-muted-foreground mt-1 ml-1 font-medium italic leading-none text-left">माल बाजारात नेण्याचा खर्च</p>
                    </div>
                    <div className="text-left">
                      <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block tracking-wider text-left">बाजार खर्च</label>
                      <input type="number" className="w-full bg-card border border-border rounded-2xl px-6 py-4 font-bold text-foreground outline-none transition-all font-sans" value={formData.marketExpense} onChange={e => setFormData({...formData, marketExpense: e.target.value})} />
                      <p className="text-[9px] text-muted-foreground mt-1 ml-1 font-medium italic leading-none text-left">हमाली / फी / कमिशन</p>
                    </div>
                    <div className="text-left">
                      <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block tracking-wider text-left">इतर खर्च</label>
                      <input type="number" className="w-full bg-card border border-border rounded-2xl px-6 py-4 font-bold text-foreground outline-none transition-all font-sans" value={formData.otherExpense} onChange={e => setFormData({...formData, otherExpense: e.target.value})} />
                      <p className="text-[9px] text-muted-foreground mt-1 ml-1 font-medium italic leading-none text-left">इतर अतिरिक्त खर्च</p>
                    </div>
                 </div>
              </div>

              {/* Live Preview */}
              <div className="grid grid-cols-2 gap-4 text-left">
                  <div className="bg-green-500/10 p-6 rounded-[2rem] border border-green-500/20 text-left">
                    <p className="text-[10px] font-black uppercase text-green-500 mb-1 leading-none text-left font-mono">Estimate Sale</p>
                    <p className="text-xl font-black text-green-600 dark:text-green-500 leading-none text-left font-mono">₹{currentSaleAmount.toLocaleString()}</p>
                  </div>
                  <div className="bg-red-500/10 p-6 rounded-[2rem] border border-red-500/20 text-left">
                    <p className="text-[10px] font-black uppercase text-red-500 mb-1 leading-none text-left font-mono">Selling Expense</p>
                    <p className="text-xl font-black text-red-600 dark:text-red-500 leading-none text-left font-mono">₹{currentLocalExpenses.toLocaleString()}</p>
                  </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 py-5 bg-card-secondary text-muted-foreground font-black uppercase tracking-widest rounded-3xl hover:bg-muted transition-all border border-border text-xs"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-5 bg-accent text-white font-black uppercase tracking-widest rounded-3xl shadow-lg hover:brightness-110 active:scale-95 transition-all text-xs"
                >
                  {editingId ? 'Update Record' : 'Save Harvest Record'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {activeTab === 'History' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="space-y-4"
          >
            {harvestEntries.length === 0 ? (
              <div className="bg-card p-16 rounded-[3rem] border-2 border-dashed border-border text-center">
                <div className="p-4 bg-card-secondary text-muted-foreground/30 rounded-full w-fit mx-auto mb-4">
                   <History size={32} />
                </div>
                <p className="text-muted-foreground/50 font-bold uppercase tracking-widest">No harvest records yet</p>
              </div>
            ) : (
              harvestEntries.map((entry) => (
                <motion.div
                  key={entry.id}
                  whileTap={{ scale: 0.98 }}
                  className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm relative overflow-hidden group text-left hover:border-accent/40 transition-all"
                >
                  <div className="flex justify-between items-start relative z-10 text-left">
                    <div className="space-y-3 text-left">
                      <div className="flex items-center gap-2 text-left">
                        <div className="p-2 bg-accent/10 text-accent rounded-xl">
                          <Package size={16} />
                        </div>
                        <div className="text-left">
                           <h3 className="font-black text-foreground uppercase leading-none text-left tracking-tight">{entry.cropName}</h3>
                           <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1 text-left font-sans">
                             {format(new Date(entry.date), 'dd MMM yyyy')}
                           </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-6 text-left">
                        <div className="text-left">
                          <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 text-left tracking-wider">Production</p>
                          <p className="text-sm font-black text-foreground text-left font-mono">{entry.quantity} {entry.unit}</p>
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 text-left tracking-wider">Sale</p>
                          <p className="text-sm font-black text-green-500 text-left font-mono">₹{entry.totalSale.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-4">
                       <div className="flex items-center gap-2">
                          <button onClick={() => handleEdit(entry)} className="p-2 text-muted-foreground/40 hover:text-accent hover:bg-accent/10 rounded-xl transition-all">
                             <Edit3 size={18} />
                          </button>
                          <button onClick={() => handleDelete(entry.id)} className="p-2 text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                             <Trash2 size={18} />
                          </button>
                       </div>
                       <div className="space-y-1 text-right">
                          <p className="text-[10px] font-black uppercase text-muted-foreground leading-none text-right tracking-widest">Net Sale</p>
                          <p className="text-xl font-black text-foreground leading-none italic text-right font-mono tracking-tighter">₹{(entry.totalSale - entry.totalExpense).toLocaleString()}</p>
                       </div>
                    </div>
                  </div>
                  {/* Progress Indicator */}
                  <div className="absolute bottom-0 left-0 h-1.5 bg-accent opacity-20 transition-all" style={{ width: `${Math.min(100, (entry.totalSale / 10000) * 100)}%` }} />
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'Analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Profit vs Expense Chart */}
            <div className="bg-card p-8 rounded-[3rem] border border-border shadow-sm text-left font-sans">
                <div className="flex items-center justify-between mb-8 text-left">
                   <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground text-left">Production vs Sell Expense</h3>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={harvestEntries.slice().reverse()}>
                        <XAxis 
                          dataKey="cropName" 
                          fontSize={10} 
                          fontWeight="black" 
                          axisLine={false} 
                          tickLine={false}
                          tickFormatter={(v) => v.substring(0, 4)}
                          stroke={colors.muted}
                        />
                        <YAxis hide stroke={colors.muted} />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '24px', 
                            border: 'none', 
                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                            backgroundColor: colors.card,
                            color: colors.foreground
                          }}
                          cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}
                        />
                      <Bar dataKey="totalSale" name="Sale" fill={colors.success} radius={[8, 8, 0, 0]} />
                      <Bar dataKey="totalExpense" name="Sell Exp" fill={colors.error} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
            </div>

            {/* Crop-wise Net Result */}
            <div className="bg-card p-8 rounded-[3rem] border border-border shadow-sm text-left font-sans">
               <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-8 text-left">Crop-wise Profit/Loss</h3>
               <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={cropData} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          fontSize={10} 
                          fontWeight="black" 
                          width={60}
                          axisLine={false}
                          tickLine={false}
                          stroke={colors.muted}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '24px', 
                            border: 'none', 
                            backgroundColor: colors.card,
                            color: colors.foreground
                          }}
                        />
                        <Bar dataKey="profit" radius={[0, 10, 10, 0]}>
                           {cropData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? colors.success : colors.error} />
                           ))}
                        </Bar>
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Total Expense Pie */}
            <div className="bg-card p-8 rounded-[3rem] border border-border shadow-sm text-center font-sans">
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
                        stroke="none"
                      >
                        {expensePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '24px', 
                          border: 'none', 
                          backgroundColor: colors.card,
                          color: colors.foreground
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle"
                        wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: colors.muted }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
