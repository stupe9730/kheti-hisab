import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../redux/slices/authSlice';
import { AppDispatch, RootState } from '../redux';
import { motion } from 'motion/react';
import { LogOut, User, Phone, AtSign, Calendar, ChevronRight, Camera, Bell, Shield, HelpCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const ProfileScreen = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Logged out successfully');
  };

  if (!user) return null;

  return (
    <div className="space-y-6 pb-4">
      {/* Profile Header */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-3xl p-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary/10 border-4 border-background overflow-hidden flex items-center justify-center text-primary shadow-lg">
              {user.profilePhoto ? (
                <img src={user.profilePhoto} alt={user.fullName} className="w-full h-full object-cover" />
              ) : (
                <User size={48} />
              )}
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg border border-background active:scale-90 transition-transform">
              <Camera size={16} />
            </button>
          </div>

          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">{user.fullName}</h2>
            <p className="text-muted-foreground text-sm flex items-center justify-center gap-1">
              <AtSign size={14} />
              {user.username}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Account Info */}
      <div className="space-y-3">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-4">Account Information</label>
        <div className="bg-card border border-border rounded-3xl overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <User size={18} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Full Name</p>
                <p className="text-sm font-bold">{user.fullName}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground/50" />
          </div>

          <div className="p-4 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <Phone size={18} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Mobile Number</p>
                <p className="text-sm font-bold">{user.mobileNumber || 'Not provided'}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground/50" />
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Joined On</p>
                <p className="text-sm font-bold">{format(new Date(), 'dd MMMM yyyy')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Settings */}
      <div className="space-y-3">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-4">App Settings</label>
        <div className="bg-card border border-border rounded-3xl overflow-hidden">
          {[
            { icon: <Bell size={18} />, label: "Notifications" },
            { icon: <Shield size={18} />, label: "Privacy & Security" },
            { icon: <HelpCircle size={18} />, label: "Help & Support" },
          ].map((item, i) => (
            <button key={i} className="w-full p-4 flex items-center justify-between border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="p-2.5 bg-muted rounded-xl">
                  {item.icon}
                </div>
                <p className="text-sm font-bold text-foreground">{item.label}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground/50" />
            </button>
          ))}
        </div>
      </div>

      {/* Logout Action */}
      <button 
        onClick={handleLogout}
        className="w-full p-5 bg-destructive/10 hover:bg-destructive/15 border border-destructive/20 text-destructive rounded-3xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-sm transition-all active:scale-[0.98]"
      >
        <LogOut size={20} />
        Logout Session
      </button>

      <div className="text-center opacity-30 py-4">
        <p className="text-[10px] font-black uppercase tracking-widest">Kheti Hisab v1.0.0</p>
      </div>
    </div>
  );
};

export default ProfileScreen;
