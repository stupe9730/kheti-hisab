import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Tractor, Flower2, Leaf, Bug, ChevronRight, Calendar, Users, TrendingUp, Milk, ShoppingBag } from 'lucide-react';
import { Farm } from '../types';
import { storage } from '../api/storage';
import { motion } from 'motion/react';

const MODULES = [
  { id: 'tractor', label: 'Tractor', icon: Tractor, color: 'bg-blue-500', active: true, desc: 'Diesel & Rental records' },
  { id: 'khat', label: 'Khat (Fertilizer)', icon: Flower2, color: 'bg-green-600', active: true, desc: 'DAP, Urea & more' },
  { id: 'seeds', label: 'Beej (Seeds)', icon: Leaf, color: 'bg-blue-600', active: true, desc: 'Sowing quantity & price' },
  { id: 'aushad', label: 'Aushad (Pesticides)', icon: Bug, color: 'bg-red-500', active: true, desc: 'Sprays & medicines' },
  { id: 'worker', label: 'Worker (Majdur)', icon: Users, color: 'bg-orange-600', active: true, desc: 'Attendance & daily wages' },
  { id: 'other-expenses', label: 'Other Expenses', icon: ShoppingBag, color: 'bg-indigo-600', active: true, desc: 'Assets & Misc investments' },
  { id: 'harvest', label: 'Profit / Harvest', icon: TrendingUp, color: 'bg-emerald-600', active: true, desc: 'Total sale & net profit' },
];

export default function FarmDetailScreen() {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const [farm, setFarm] = useState<Farm | null>(null);

  useEffect(() => {
    async function load() {
      if (farmId) {
        const farms = await storage.getFarms();
        const currentFarm = farms.find(f => f.id === farmId);
        if (currentFarm) {
          setFarm(currentFarm);
        } else {
          navigate('/');
        }
      }
    }
    load();
  }, [farmId, navigate]);

  if (!farm) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 pb-20">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/')} 
          className="p-2.5 bg-card rounded-2xl shadow-sm border border-border hover:bg-background active:scale-95 transition-all"
        >
          <ArrowLeft size={20} className="text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0 text-left">
          <h2 className="text-2xl font-black text-foreground truncate tracking-tight text-left">{farm.name}</h2>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-left">Hagam: {farm.year}</p>
        </div>
      </div>

      <div className="grid gap-4">
        {MODULES.map((module, idx) => {
          const Icon = module.icon;
          return (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link
                to={module.active ? `/farm/${farmId}/${module.id}` : '#'}
                className={`p-5 rounded-[2.5rem] border flex items-center justify-between transition-all group active:scale-[0.98] ${
                  module.active 
                    ? 'premium-card border-border shadow-sm group-hover:border-primary/40' 
                    : 'bg-card-secondary border-border opacity-60 cursor-not-allowed'
                }`}
                onClick={(e) => !module.active && e.preventDefault()}
              >
                <div className="flex items-center gap-4 text-left">
                  <div className={`p-4 rounded-2xl text-white shadow-xl group-hover:scale-110 transition-transform ${module.color} ${
                    module.id === 'tractor' ? 'glow-primary' : 
                    module.id === 'khat' ? 'glow-success' : 
                    module.id === 'seeds' ? 'glow-primary' :
                    module.id === 'aushad' ? 'glow-error' :
                    module.id === 'worker' ? 'glow-orange' :
                    'glow-success'
                  }`}>
                    <Icon size={28} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-black text-foreground text-lg leading-tight tracking-tight text-left">{module.label}</h3>
                    {module.active ? (
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide text-left">{module.desc}</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest text-left">Coming Soon</p>
                    )}
                  </div>
                </div>
                {module.active && <ChevronRight className="text-muted-foreground/30 group-hover:translate-x-1 group-hover:text-primary transition-all" size={24} />}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
