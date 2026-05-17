import React, { useState, useEffect } from 'react';
import { PieChart, Tractor, Calendar, LayoutGrid, IndianRupee, Loader2, Sprout, Bug, Users, ChevronRight, ShoppingBag } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch } from '../redux';
import { fetchGlobalSummary } from '../redux/slices/farmSlice';
import { TractorEntry, Farm, KhatEntry, SeedEntry, AushadEntry, WorkerEntry, OtherExpense } from '../types';
import { motion } from 'motion/react';

export default function SummaryScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [data, setData] = useState<{ farms: Farm[], tractorEntries: TractorEntry[], khatEntries: KhatEntry[], seedEntries: SeedEntry[], aushadEntries: AushadEntry[], workerEntries: WorkerEntry[], otherExpenses: OtherExpense[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dispatch(fetchGlobalSummary())
      .unwrap()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [dispatch]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 p-4">
      <Loader2 className="animate-spin text-primary mb-4" size={40} />
      <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">Aggregating data...</p>
    </div>
  );

  if (!data) return <div className="p-10 text-center text-muted-foreground font-bold">No data found.</div>;

  // Group by transaction root ID and take latest version
  const latestEntriesMap = new Map<string, TractorEntry>();
  
  if (data.tractorEntries && Array.isArray(data.tractorEntries)) {
    data.tractorEntries.forEach(e => {
      const rootId = e.parentId || e.id;
      const existing = latestEntriesMap.get(rootId);
      if (!existing || new Date(e.createdAt) > new Date(existing.createdAt)) {
        latestEntriesMap.set(rootId, e);
      }
    });
  }

  const latestEntries = Array.from(latestEntriesMap.values());
  
  const khatStats = {
    total: data.khatEntries?.reduce((sum, e) => sum + e.totalAmount, 0) || 0,
    paid: data.khatEntries?.reduce((sum, e) => sum + e.totalPaidAmount, 0) || 0,
    remaining: data.khatEntries?.reduce((sum, e) => sum + e.remainingAmount, 0) || 0
  };

  const seedStats = {
    total: data.seedEntries?.reduce((sum, e) => sum + e.totalAmount, 0) || 0,
    paid: data.seedEntries?.reduce((sum, e) => sum + e.totalPaidAmount, 0) || 0,
    remaining: data.seedEntries?.reduce((sum, e) => sum + e.remainingAmount, 0) || 0
  };

  const aushadStats = {
    total: data.aushadEntries?.reduce((sum, e) => sum + e.totalAmount, 0) || 0,
    paid: data.aushadEntries?.reduce((sum, e) => sum + e.totalPaidAmount, 0) || 0,
    remaining: data.aushadEntries?.reduce((sum, e) => sum + e.remainingAmount, 0) || 0
  };

  const workerStats = {
    total: data.workerEntries?.reduce((sum, e) => sum + e.totalAmount, 0) || 0,
    paid: data.workerEntries?.reduce((sum, e) => sum + e.totalPaidAmount, 0) || 0,
    remaining: data.workerEntries?.reduce((sum, e) => sum + e.remainingAmount, 0) || 0
  };

  const otherStats = {
    total: data.otherExpenses?.reduce((sum, e) => sum + Number(e.totalAmount || 0), 0) || 0,
    paid: data.otherExpenses?.reduce((sum, e) => sum + Number(e.paidAmount || 0), 0) || 0,
    remaining: data.otherExpenses?.reduce((sum, e) => sum + Number(e.remainingAmount || 0), 0) || 0
  };

  const entriesPerFarm = (data.farms && Array.isArray(data.farms)) 
    ? data.farms.map(farm => {
        const farmTractor = latestEntries
          .filter(e => e.farmId === farm.id)
          .reduce((sum, e) => sum + e.totalAmount, 0);
        const farmKhat = (data.khatEntries || [])
          .filter(e => e.farmId === farm.id)
          .reduce((sum, e) => sum + e.totalAmount, 0);
        const farmSeed = (data.seedEntries || [])
          .filter(e => e.farmId === farm.id)
          .reduce((sum, e) => sum + e.totalAmount, 0);
        const farmAushad = (data.aushadEntries || [])
          .filter(e => e.farmId === farm.id)
          .reduce((sum, e) => sum + e.totalAmount, 0);
        const farmWorker = (data.workerEntries || [])
          .filter(e => e.farmId === farm.id)
          .reduce((sum, e) => sum + e.totalAmount, 0);
        const farmOther = (data.otherExpenses || [])
          .filter(e => e.farmId === farm.id)
          .reduce((sum, e) => sum + Number(e.totalAmount || 0), 0);
          
        return {
          ...farm,
          tractor: farmTractor,
          khat: farmKhat,
          seed: farmSeed,
          aushad: farmAushad,
          worker: farmWorker,
          other: farmOther,
          total: farmTractor + farmKhat + farmSeed + farmAushad + farmWorker + farmOther
        };
      }).filter(f => f.total > 0)
    : [];

  const totalSpentTractor = latestEntries.reduce((sum, e) => sum + e.totalAmount, 0);
  const totalPaidTractor = latestEntries.reduce((sum, e) => sum + e.totalPaidAmount, 0);
  const remainingTractor = totalSpentTractor - totalPaidTractor;
  
  const grandTotal = totalSpentTractor + khatStats.total + seedStats.total + aushadStats.total + workerStats.total + otherStats.total;
  const grandPaid = totalPaidTractor + khatStats.paid + seedStats.paid + aushadStats.paid + workerStats.paid + otherStats.paid;
  const grandRemaining = grandTotal - grandPaid;

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-4 pb-20">
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
            <PieChart className="text-primary" size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tight leading-none">Global Summary</h2>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1 opacity-60">Complete Farm Portfolio</p>
          </div>
        </div>
      </div>

      {/* Global Totals */}
      <div className="space-y-6">
        {/* Total Expenses Card */}
        <motion.div 
          whileHover={{ scale: 1.01, translateY: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/analytics/tractor')}
          className="bg-primary rounded-[3rem] p-10 glow-primary space-y-8 cursor-pointer relative overflow-hidden group transition-all duration-500 border border-white/20"
        >
          <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-all duration-700 text-white">
            <IndianRupee size={160} />
          </div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-[100px] group-hover:bg-white/20 transition-all duration-700" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Portfolio Overview</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md h-12 w-12 rounded-2xl flex items-center justify-center text-white border border-white/20 group-hover:bg-white/20 group-hover:scale-110 transition-all">
              <ChevronRight size={24} />
            </div>
          </div>
          
          <div className="space-y-4 relative z-10 text-left">
            <div className="text-left">
              <p className="text-[11px] text-white/50 font-black uppercase text-left tracking-widest mb-1">Grand Total खर्च</p>
              <div className="flex items-baseline gap-2 text-left">
                <span className="text-4xl sm:text-6xl font-black text-white tracking-tighter text-left font-mono italic break-all">₹{grandTotal.toLocaleString()}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/10 text-left">
              <div className="text-left group/paid">
                <p className="text-[10px] text-white/40 font-black uppercase text-left tracking-widest mb-2 group-hover/paid:text-white/70 transition-colors">Total Paid</p>
                <p className="text-2xl font-black text-white text-left font-mono">₹{grandPaid.toLocaleString()}</p>
              </div>
              <div className="text-left group/pending">
                <p className="text-[10px] text-white/40 font-black uppercase text-left tracking-widest mb-2 group-hover/pending:text-white/70 transition-colors">Total Udhar</p>
                <p className="text-2xl font-black text-white/90 text-left font-mono">₹{grandRemaining.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <motion.div 
            onClick={() => navigate('/analytics/tractor')}
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            className="premium-card rounded-[2.5rem] p-8 space-y-6 cursor-pointer relative overflow-hidden group"
          >
            <div className="flex items-center gap-3 text-accent relative z-10">
              <div className="p-3 bg-accent/10 rounded-2xl border border-accent/10 group-hover:scale-110 transition-transform">
                <Tractor size={20} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">Tractor</span>
            </div>
            
            <div className="space-y-5 pt-2 text-left relative z-10">
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground font-black uppercase text-left tracking-widest opacity-60 mb-2">Total Expenses</p>
                <p className="text-4xl font-black text-foreground tracking-tighter text-left font-mono italic">₹{totalSpentTractor.toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border/50 text-left">
                <div className="text-left">
                  <p className="text-[9px] text-muted-foreground font-black uppercase text-left tracking-widest opacity-40 mb-1">Paid</p>
                  <p className="text-lg font-black text-success text-left font-mono">₹{totalPaidTractor.toLocaleString()}</p>
                </div>
                <div className="text-left">
                  <p className="text-[9px] text-muted-foreground font-black uppercase text-left tracking-widest opacity-40 mb-1">Due</p>
                  <p className="text-lg font-black text-error text-left font-mono">₹{remainingTractor.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Khat Summary */}
          <motion.div 
            onClick={() => navigate('/analytics/khat')}
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            className="premium-card rounded-[2.5rem] p-8 space-y-6 cursor-pointer relative overflow-hidden group"
          >
            <div className="flex items-center gap-3 text-success relative z-10">
              <div className="p-3 bg-success/10 rounded-2xl border border-success/10 group-hover:scale-110 transition-transform">
                <LayoutGrid size={20} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">Khat</span>
            </div>
            
            <div className="space-y-5 pt-2 text-left relative z-10">
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground font-black uppercase text-left tracking-widest opacity-60 mb-2">Total Expenses</p>
                <p className="text-4xl font-black text-foreground tracking-tighter text-left font-mono italic">₹{khatStats.total.toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border/50 text-left">
                <div className="text-left">
                  <p className="text-[9px] text-muted-foreground font-black uppercase text-left tracking-widest opacity-40 mb-1">Paid</p>
                  <p className="text-lg font-black text-success text-left font-mono">₹{khatStats.paid.toLocaleString()}</p>
                </div>
                <div className="text-left">
                  <p className="text-[9px] text-muted-foreground font-black uppercase text-left tracking-widest opacity-40 mb-1">Due</p>
                  <p className="text-lg font-black text-error text-left font-mono">₹{khatStats.remaining.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Seeds Summary */}
          <motion.div 
            onClick={() => navigate('/analytics/seeds')}
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            className="premium-card rounded-[2.5rem] p-8 space-y-6 cursor-pointer relative overflow-hidden group"
          >
            <div className="flex items-center gap-3 text-accent relative z-10">
              <div className="p-3 bg-accent/10 rounded-2xl border border-accent/10 group-hover:scale-110 transition-transform">
                <Sprout size={20} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">Seeds</span>
            </div>
            
            <div className="space-y-5 pt-2 text-left relative z-10">
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground font-black uppercase text-left tracking-widest opacity-60 mb-2">Total Expenses</p>
                <p className="text-4xl font-black text-foreground tracking-tighter text-left font-mono italic">₹{seedStats.total.toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border/50 text-left">
                <div className="text-left">
                  <p className="text-[9px] text-muted-foreground font-black uppercase text-left tracking-widest opacity-40 mb-1">Paid</p>
                  <p className="text-lg font-black text-success text-left font-mono">₹{seedStats.paid.toLocaleString()}</p>
                </div>
                <div className="text-left">
                  <p className="text-[9px] text-muted-foreground font-black uppercase text-left tracking-widest opacity-40 mb-1">Due</p>
                  <p className="text-lg font-black text-error text-left font-mono">₹{seedStats.remaining.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Aushad Summary */}
          <motion.div 
            onClick={() => navigate('/analytics/aushad')}
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            className="premium-card rounded-[2.5rem] p-8 space-y-6 cursor-pointer relative overflow-hidden group"
          >
            <div className="flex items-center gap-3 text-error relative z-10">
              <div className="p-3 bg-error/10 rounded-2xl border border-error/10 group-hover:scale-110 transition-transform">
                <Bug size={20} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">Aushad</span>
            </div>
            
            <div className="space-y-5 pt-2 text-left relative z-10">
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground font-black uppercase text-left tracking-widest opacity-60 mb-2">Total Expenses</p>
                <p className="text-4xl font-black text-foreground tracking-tighter text-left font-mono italic">₹{aushadStats.total.toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border/50 text-left">
                <div className="text-left">
                  <p className="text-[9px] text-muted-foreground font-black uppercase text-left tracking-widest opacity-40 mb-1">Paid</p>
                  <p className="text-lg font-black text-success text-left font-mono">₹{aushadStats.paid.toLocaleString()}</p>
                </div>
                <div className="text-left">
                  <p className="text-[9px] text-muted-foreground font-black uppercase text-left tracking-widest opacity-40 mb-1">Due</p>
                  <p className="text-lg font-black text-error text-left font-mono">₹{aushadStats.remaining.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Other Expenses Summary */}
          <motion.div 
            onClick={() => navigate('/analytics/other-expenses')}
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            className="premium-card rounded-[2.5rem] p-8 space-y-6 cursor-pointer relative overflow-hidden group"
          >
            <div className="flex items-center gap-3 text-indigo-500 relative z-10">
              <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/10 group-hover:scale-110 transition-transform">
                <ShoppingBag size={20} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">Other Expenses</span>
            </div>
            
            <div className="space-y-5 pt-2 text-left relative z-10">
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground font-black uppercase text-left tracking-widest opacity-60 mb-2">Total Assets/Misc</p>
                <p className="text-4xl font-black text-foreground tracking-tighter text-left font-mono italic">₹{otherStats.total.toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border/50 text-left">
                <div className="text-left">
                  <p className="text-[9px] text-muted-foreground font-black uppercase text-left tracking-widest opacity-40 mb-1">Paid</p>
                  <p className="text-lg font-black text-success text-left font-mono">₹{otherStats.paid.toLocaleString()}</p>
                </div>
                <div className="text-left">
                  <p className="text-[9px] text-muted-foreground font-black uppercase text-left tracking-widest opacity-40 mb-1">Due</p>
                  <p className="text-lg font-black text-error text-left font-mono">₹{otherStats.remaining.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Per Farm Breakdown */}
      <div className="space-y-6">
        <div className="flex justify-between items-end px-1">
          <div className="text-left">
            <h3 className="font-black text-muted-foreground text-[10px] uppercase tracking-[0.3em] text-left">Area Breakdown</h3>
            <p className="text-[18px] font-black text-foreground tracking-tight mt-1">Farm wise Weight</p>
          </div>
        </div>
        
        <div className="grid gap-4">
          {entriesPerFarm.length === 0 ? (
            <div className="bg-card p-16 rounded-[3rem] border-2 border-dashed border-border text-center text-muted-foreground/30 font-black uppercase tracking-[0.3em] text-[10px]">
              No farm record found.
            </div>
          ) : (
            entriesPerFarm.map((farm) => {
              const percentage = grandTotal > 0 ? (farm.total / grandTotal) * 100 : 0;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  key={farm.id}
                  className="premium-card p-6 rounded-[2.5rem] relative overflow-hidden text-left"
                >
                  <div className="flex justify-between items-start mb-4 text-left">
                    <div className="text-left">
                      <h4 className="font-black text-xl text-foreground text-left tracking-tight italic font-mono">{farm.name}</h4>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {farm.tractor > 0 && <p className="text-[8px] font-black text-accent uppercase bg-accent/5 px-2.5 py-1 rounded-full border border-accent/10 tracking-widest">Tractor: ₹{farm.tractor.toLocaleString()}</p>}
                        {farm.khat > 0 && <p className="text-[8px] font-black text-success uppercase bg-success/5 px-2.5 py-1 rounded-full border border-success/10 tracking-widest">Khat: ₹{farm.khat.toLocaleString()}</p>}
                        {farm.seed > 0 && <p className="text-[8px] font-black text-accent uppercase bg-accent/5 px-2.5 py-1 rounded-full border border-accent/10 tracking-widest">Seeds: ₹{farm.seed.toLocaleString()}</p>}
                        {farm.aushad > 0 && <p className="text-[8px] font-black text-error uppercase bg-error/5 px-2.5 py-1 rounded-full border border-error/10 tracking-widest">Aushad: ₹{farm.aushad.toLocaleString()}</p>}
                        {farm.worker > 0 && <p className="text-[8px] font-black text-[#f59e0b] uppercase bg-[#f59e0b]/5 px-2.5 py-1 rounded-full border border-[#f59e0b]/10 tracking-widest">Worker: ₹{farm.worker.toLocaleString()}</p>}
                        {farm.other > 0 && <p className="text-[8px] font-black text-indigo-500 uppercase bg-indigo-500/5 px-2.5 py-1 rounded-full border border-indigo-500/10 tracking-widest">Other: ₹{farm.other.toLocaleString()}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-foreground text-xl leading-none font-mono tracking-tighter">₹{farm.total.toLocaleString()}</p>
                      <p className="text-[10px] font-black text-muted-foreground mt-2 uppercase tracking-widest opacity-60 leading-none">{percentage.toFixed(1)}% weight</p>
                    </div>
                  </div>
                  <div className="w-full bg-card-secondary h-2 rounded-full overflow-hidden mt-2 border border-border/50">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${percentage}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, ease: "circOut" }}
                      className="bg-primary h-full rounded-full glow-primary"
                    />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
