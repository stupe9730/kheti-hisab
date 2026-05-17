import { Link, useLocation } from 'react-router-dom';
import { Home, PieChart, Milk, User } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux';

export function Navbar() {
  const location = useLocation();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const isActive = (path: string) => location.pathname === path;

  // Hide navbar on auth pages or if not authenticated
  const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];
  if (authPages.includes(location.pathname) || !isAuthenticated) {
    return null;
  }

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-lg glass-effect rounded-[2.5rem] flex justify-around items-center h-20 z-50 shadow-2xl px-4 border border-white/10 dark:border-white/5 group">
      <Link 
        to="/" 
        className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-500 ${isActive('/') ? 'text-primary bg-primary/10 shadow-lg shadow-primary/20 scale-110' : 'text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100'}`}
      >
        <Home size={isActive('/') ? 24 : 22} strokeWidth={2.5} />
        <span className="text-[8px] font-black mt-1 uppercase tracking-tighter">Farms</span>
      </Link>
      <Link 
        to="/dairy" 
        className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-500 ${isActive('/dairy') ? 'text-accent bg-accent/10 shadow-lg shadow-accent/20 scale-110' : 'text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100'}`}
      >
        <Milk size={isActive('/dairy') ? 24 : 22} strokeWidth={2.5} />
        <span className="text-[8px] font-black mt-1 uppercase tracking-tighter">Dairy</span>
      </Link>
      <Link 
        to="/summary" 
        className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-500 ${isActive('/summary') ? 'text-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20 scale-110' : 'text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100'}`}
      >
        <PieChart size={isActive('/summary') ? 24 : 22} strokeWidth={2.5} />
        <span className="text-[8px] font-black mt-1 uppercase tracking-tighter">Stats</span>
      </Link>
      <Link 
        to="/profile" 
        className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-500 ${isActive('/profile') ? 'text-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/20 scale-110' : 'text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100'}`}
      >
        <User size={isActive('/profile') ? 24 : 22} strokeWidth={2.5} />
        <span className="text-[8px] font-black mt-1 uppercase tracking-tighter">Profile</span>
      </Link>
    </nav>
  );
}
