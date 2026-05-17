import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'motion/react';
import { KeyRound, User, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ForgotPasswordScreen = () => {
  const [usernameOrMobile, setUsernameOrMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [resetToken, setResetToken] = useState(''); // Only for simplified flow

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrMobile) {
      toast.error('Please enter username or mobile number');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/auth/forgot-password', { usernameOrMobile });
      setResetToken(response.data.resetToken);
      setIsSent(true);
      toast.success('User verified successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'User not found');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-xl"
      >
        {!isSent ? (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
                <KeyRound size={32} />
              </div>
              <h2 className="text-2xl font-black italic tracking-tighter uppercase">Forgot <span className="text-primary">Password</span></h2>
              <p className="text-muted-foreground text-sm mt-1">Enter your username or mobile to reset</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Account Info</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <User size={20} />
                  </span>
                  <input
                    type="text"
                    value={usernameOrMobile}
                    onChange={(e) => setUsernameOrMobile(e.target.value)}
                    className="w-full bg-background border border-border rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="Username or Mobile"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {loading ? "Verifying..." : (
                  <>
                    Continue
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 text-green-500 mb-6">
              <ShieldCheck size={40} />
            </div>
            <h3 className="text-xl font-bold mb-2">User Verified!</h3>
            <p className="text-muted-foreground text-sm mb-8 px-4">
              We've verified your account. You can now set a new password.
            </p>
            <button
              onClick={() => navigate(`/reset-password?token=${resetToken}`)}
              className="w-full bg-green-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-green-700 transition-colors shadow-lg shadow-green-500/20"
            >
              Reset Password
              <ArrowRight size={20} />
            </button>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/login" className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft size={14} />
            Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordScreen;
