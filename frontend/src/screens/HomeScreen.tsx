import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Sprout, Calendar, Edit3, X, Loader2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux';
import { fetchFarms, addFarm, updateFarm, deleteFarm } from '../redux/slices/farmSlice';
import { Farm } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';

export default function HomeScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { farms, loading, error } = useSelector((state: RootState) => state.farm);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  const [farmToDelete, setFarmToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', year: new Date().getFullYear().toString() });

  useEffect(() => {
    dispatch(fetchFarms());
  }, [dispatch]);

  const handleAddFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.year.trim()) {
      toast.error("Please fill all fields");
      return;
    }

    const toastId = toast.loading(editingFarm ? "Updating farm..." : "Saving farm...");
    try {
      if (editingFarm) {
        await dispatch(updateFarm({ id: editingFarm.id, name: formData.name, year: formData.year })).unwrap();
        setEditingFarm(null);
      } else {
        await dispatch(addFarm({ name: formData.name, year: formData.year })).unwrap();
      }
      setFormData({ name: '', year: new Date().getFullYear().toString() });
      setIsAdding(false);
      toast.success(editingFarm ? "Updated successfully ✏️" : "Farm saved successfully ✅", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Failed to save farm ❌", { id: toastId });
    }
  };

  const handleEdit = (farm: Farm, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingFarm(farm);
    setFormData({ name: farm.name, year: farm.year });
    setIsAdding(true);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Showing confirmation modal for farm ID:", id);
    setFarmToDelete(id);
  };

  const confirmDelete = async () => {
    if (!farmToDelete) return;
    
    const toastId = toast.loading("Deleting farm...");
    try {
      await dispatch(deleteFarm(farmToDelete)).unwrap();
      toast.success("Farm deleted successfully 🗑️", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete farm ❌", { id: toastId });
    } finally {
      setFarmToDelete(null);
    }
  };

  if (loading && farms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 p-4 animate-pulse">
        <Loader2 className="animate-spin text-green-600 mb-4" size={40} />
        <p className="text-slate-500 dark:text-slate-400 font-bold">Loading your farms...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 pb-20">
      <div className="flex flex-col items-center justify-center pt-2">
        <img src="/app_logo.svg" alt="Logo" className="h-20 w-20 object-contain drop-shadow-md mb-2" />
        <h2 className="text-2xl font-black text-foreground tracking-tight">Kheti Hisab</h2>
      </div>

      {error && (
        <div className="bg-error/10 text-error p-4 rounded-2xl text-sm font-bold border border-error/20 mx-1">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center px-1">
        <h3 className="text-lg font-bold text-muted-foreground uppercase tracking-widest text-[10px]">My Management Areas</h3>
        <button
          onClick={() => {
            setEditingFarm(null);
            setFormData({ name: '', year: new Date().getFullYear().toString() });
            setIsAdding(true);
          }}
          className="bg-primary text-white p-2 rounded-full shadow-lg h-10 w-10 flex items-center justify-center hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus size={20} />
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.form
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-card p-8 rounded-[2.5rem] shadow-2xl border border-border/50 w-full max-w-sm flex flex-col gap-6 relative overflow-hidden"
              onSubmit={handleAddFarm}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
              <div className="flex justify-between items-center px-1">
                <div className="text-left">
                  <h4 className="font-black text-foreground uppercase tracking-tight text-xl">{editingFarm ? 'Edit Farm' : 'New Management Area'}</h4>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Setup your field details</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsAdding(false);
                    setEditingFarm(null);
                  }}
                  className="bg-card-secondary text-muted-foreground p-2 hover:text-error hover:bg-error/10 rounded-xl transition-all active:scale-90"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-5">
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 text-left tracking-widest">Farm / Field Name</label>
                  <input
                    autoFocus
                    type="text"
                    placeholder="e.g., North Field"
                    className="w-full bg-card-secondary border border-border rounded-2xl px-5 py-4 focus:bg-card focus:ring-4 focus:ring-primary/10 border-border focus:border-primary transition-all shadow-inner outline-none text-foreground placeholder:text-muted-foreground/30 font-bold"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 text-left tracking-widest">Season Year (Hagam)</label>
                  <input
                    type="text"
                    placeholder="e.g., 2024-25"
                    className="w-full bg-card-secondary border border-border rounded-2xl px-5 py-4 focus:bg-card focus:ring-4 focus:ring-primary/10 border-border focus:border-primary transition-all shadow-inner outline-none text-foreground placeholder:text-muted-foreground/30 font-bold font-mono"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="bg-primary text-white w-full py-5 rounded-[2rem] font-black shadow-xl shadow-primary/20 active:scale-95 transition-all text-[11px] uppercase tracking-[0.2em] mt-2 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                <span className="relative z-10">{editingFarm ? 'Update Farm' : 'Create Farm Area'}</span>
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {farmToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-border w-full max-w-sm text-center"
            >
              <div className="bg-error/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-error">
                <Trash2 size={32} />
              </div>
              <h4 className="text-xl font-black text-foreground mb-2">Are you sure?</h4>
              <p className="text-muted-foreground font-bold mb-8 text-sm">
                This will delete the farm and all related records (tractor, khat, workers, etc.) permanently.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setFarmToDelete(null)}
                  className="flex-1 py-4 bg-background text-muted-foreground rounded-2xl font-black uppercase text-xs tracking-widest hover:brightness-95 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-4 bg-error text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:brightness-110 shadow-lg shadow-error/20 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {farms.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground bg-card rounded-[3rem] border-2 border-dashed border-border mx-1">
          <Sprout size={48} className="mx-auto mb-4 opacity-10" />
          <p className="font-black text-lg">No farms found</p>
          <p className="text-xs uppercase font-bold tracking-wider mt-1 px-10">Tap the + button to add your first field.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {farms.map((farm) => (
            <Link key={farm.id} to={`/farm/${farm.id}`}>
              <motion.div
                whileHover={{ scale: 1.01, translateY: -2 }}
                whileTap={{ scale: 0.98 }}
                className="premium-card p-6 flex justify-between items-center group overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all" />
                <div className="flex items-center gap-5 relative z-10">
                  <div className="bg-card-secondary p-4 rounded-2xl text-primary border border-border/50 group-hover:border-primary/20 transition-all group-hover:bg-primary/5 group-hover:scale-110">
                    <Sprout size={28} strokeWidth={2.5} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-black text-xl text-foreground tracking-tight text-left group-hover:text-primary transition-colors">{farm.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-black uppercase tracking-widest text-left font-mono opacity-60">
                      <Calendar size={12} strokeWidth={3} />
                      {farm.year}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 relative z-10 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300">
                  <button
                    onClick={(e) => handleEdit(farm, e)}
                    className="p-3.5 bg-card-secondary border border-border text-muted-foreground/60 hover:text-accent hover:bg-accent/5 hover:border-accent/20 rounded-xl transition-all active:scale-90"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteClick(farm.id, e)}
                    className="p-3.5 bg-card-secondary border border-border text-muted-foreground/60 hover:text-error hover:bg-error/5 hover:border-error/20 rounded-xl transition-all active:scale-90"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
