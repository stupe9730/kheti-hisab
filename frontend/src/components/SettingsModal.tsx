import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sun, Moon, Monitor, Settings, Info, RotateCcw, ChevronRight, FileDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all app settings? This will clear your theme preference.')) {
      setTheme('system');
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "relative w-full max-w-sm bg-card border-t sm:border border-border rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl p-8 overflow-hidden",
              "focus:outline-none"
            )}
          >
            {/* Header Strip for Mobile */}
            <div className="w-12 h-1.5 bg-border/50 rounded-full mx-auto mb-6 sm:hidden" />

            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                  <Settings size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Settings</h2>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mt-1">App Configuration</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-card-secondary text-muted-foreground hover:text-error hover:bg-error/10 rounded-xl transition-all active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-8">
              {/* Theme Settings */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Sun size={14} className="text-muted-foreground" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Appearance</h3>
                </div>
                
                <div className="grid grid-cols-3 gap-2 bg-card-secondary p-1.5 rounded-2xl border border-border">
                  {[
                    { id: 'light', label: 'Light', icon: Sun },
                    { id: 'dark', label: 'Dark', icon: Moon },
                    { id: 'system', label: 'System', icon: Monitor },
                  ].map((option) => {
                    const Icon = option.icon;
                    const isActive = theme === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => setTheme(option.id)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 relative",
                          isActive 
                            ? "bg-card text-primary shadow-sm border border-border" 
                            : "text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100"
                        )}
                      >
                        <Icon size={18} strokeWidth={isActive ? 3 : 2} />
                        <span className="text-[9px] font-black uppercase tracking-wider">{option.label}</span>
                        {isActive && (
                          <motion.div
                            layoutId="active-theme"
                            className="absolute inset-0 border-2 border-primary/20 rounded-xl"
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* App Settings */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                   <Info size={14} className="text-muted-foreground" />
                   <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Information</h3>
                </div>
                
                <div className="space-y-2">
                  <div className="premium-card p-4 flex justify-between items-center bg-card-secondary/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/5 rounded-lg text-primary/70">
                        <Monitor size={16} />
                      </div>
                      <span className="text-sm font-bold text-foreground">App Version</span>
                    </div>
                    <span className="text-xs font-mono font-black text-muted-foreground bg-card px-2 py-1 rounded-md border border-border">v1.2.0</span>
                  </div>

                  <button 
                    onClick={() => {
                       onClose();
                       navigate('/export');
                    }}
                    className="w-full premium-card p-4 flex justify-between items-center bg-card-secondary/30 hover:bg-primary/5 group transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/5 rounded-lg text-primary/70 group-hover:bg-primary/10 transition-colors">
                        <FileDown size={16} />
                      </div>
                      <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Data Export</span>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-all" />
                  </button>

                  <button 
                    onClick={handleReset}
                    className="w-full premium-card p-4 flex justify-between items-center bg-card-secondary/30 hover:bg-error/5 group transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-error/5 rounded-lg text-error/70 group-hover:bg-error/10 transition-colors">
                        <RotateCcw size={16} />
                      </div>
                      <span className="text-sm font-bold text-foreground group-hover:text-error transition-colors">Reset Settings</span>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground group-hover:text-error transition-all" />
                  </button>
                </div>
              </section>

              {/* About */}
              <section className="pt-4 border-t border-border/50 text-center">
                <p className="text-[10px] text-muted-foreground font-medium italic">
                  Made with ❤️ for Indian Farmers. Keep track of your fields and expenses efficiently.
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
