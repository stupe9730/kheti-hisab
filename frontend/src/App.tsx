/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { Home, PieChart, Sprout, Settings, Terminal, User } from "lucide-react";
import { Navbar } from "./components/Navbar";
import { SettingsModal } from "./components/SettingsModal";
import { Toaster } from "react-hot-toast";
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "./redux";
import { fetchMe } from "./redux/slices/authSlice";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Screens
import HomeScreen from "./screens/HomeScreen";
import FarmDetailScreen from "./screens/FarmDetailScreen";
import TractorModuleScreen from "./screens/TractorModuleScreen";
import KhatModuleScreen from "./screens/KhatModuleScreen";
import KhatTransactionDetailScreen from "./screens/KhatTransactionDetailScreen";
import SeedModuleScreen from "./screens/SeedModuleScreen";
import SeedTransactionDetailScreen from "./screens/SeedTransactionDetailScreen";
import AushadModuleScreen from "./screens/AushadModuleScreen";
import AushadTransactionDetailScreen from "./screens/AushadTransactionDetailScreen";
import WorkerModuleScreen from "./screens/WorkerModuleScreen";
import WorkerTransactionDetailScreen from "./screens/WorkerTransactionDetailScreen";
import HarvestModuleScreen from "./screens/HarvestModuleScreen";
import DairyModuleScreen from "./screens/DairyModuleScreen";
import TransactionDetailScreen from "./screens/TransactionDetailScreen";
import SummaryScreen from "./screens/SummaryScreen";
import OtherExpenseScreen from "./screens/OtherExpenseScreen";
import CategoryDetailScreen from "./screens/CategoryDetailScreen";
import ProfileScreen from "./screens/ProfileScreen";
import DataExportScreen from "./screens/DataExportScreen";

// Auth Screens
import LoginScreen from "./screens/auth/LoginScreen";
import RegisterScreen from "./screens/auth/RegisterScreen";
import ForgotPasswordScreen from "./screens/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "./screens/auth/ResetPasswordScreen";

const AppContent = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, token } = useSelector(
    (state: RootState) => state.auth,
  );

  useEffect(() => {
    if (token && !isAuthenticated) {
      dispatch(fetchMe());
    }
  }, [dispatch, token, isAuthenticated]);

  const isAuthPage = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ].includes(location.pathname);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 font-sans selection:bg-success/20 transition-colors duration-300">
      <Toaster position="top-center" reverseOrder={false} />

      {!isAuthPage && isAuthenticated && (
        <header className="bg-card/80 backdrop-blur-md text-foreground p-4 border-b border-border sticky top-0 z-40 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/app_logo.svg"
              alt="Logo"
              className="h-10 w-10 object-contain rounded-lg shadow-sm"
            />
            <div className="flex flex-col items-start">
              <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">
                Kheti
                <span className="text-green-600 dark:text-green-500">
                  Hisab
                </span>
              </h1>
              <p className="text-[7.5px] font-black uppercase tracking-[0.25em] text-muted-foreground mt-1.5 flex items-center gap-1 opacity-60">
                <Terminal size={8} strokeWidth={3} className="text-primary" />
                Created By SHUBHAM TUPE
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 rounded-2xl bg-card text-foreground border border-border transition-all shadow-sm hover:border-primary/30 active:scale-90"
              aria-label="Settings"
            >
              <Settings size={22} strokeWidth={2.5} />
            </button>
            <Link
              to="/profile"
              className="p-2.5 rounded-2xl bg-card text-foreground border border-border transition-all shadow-sm hover:border-primary/30 active:scale-90"
            >
              <User size={22} strokeWidth={2.5} />
            </Link>
          </div>
        </header>
      )}

      {isAuthenticated && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      <main className={`p-4 max-w-md mx-auto ${isAuthPage ? "pt-0" : ""}`}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<RegisterScreen />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
          <Route path="/reset-password" element={<ResetPasswordScreen />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/farm/:farmId" element={<FarmDetailScreen />} />
            <Route
              path="/farm/:farmId/tractor"
              element={<TractorModuleScreen />}
            />
            <Route path="/farm/:farmId/khat" element={<KhatModuleScreen />} />
            <Route path="/farm/:farmId/seeds" element={<SeedModuleScreen />} />
            <Route
              path="/farm/:farmId/aushad"
              element={<AushadModuleScreen />}
            />
            <Route
              path="/farm/:farmId/worker"
              element={<WorkerModuleScreen />}
            />
            <Route
              path="/farm/:farmId/other-expenses"
              element={<OtherExpenseScreen />}
            />
            <Route
              path="/farm/:farmId/khat/:entryId"
              element={<KhatTransactionDetailScreen />}
            />
            <Route
              path="/farm/:farmId/seeds/:entryId"
              element={<SeedTransactionDetailScreen />}
            />
            <Route
              path="/farm/:farmId/aushad/:entryId"
              element={<AushadTransactionDetailScreen />}
            />
            <Route
              path="/farm/:farmId/worker/:entryId"
              element={<WorkerTransactionDetailScreen />}
            />
            <Route
              path="/farm/:farmId/harvest"
              element={<HarvestModuleScreen />}
            />
            <Route path="/dairy" element={<DairyModuleScreen />} />
            <Route
              path="/farm/:farmId/tractor/:entryId"
              element={<TransactionDetailScreen />}
            />
            <Route path="/summary" element={<SummaryScreen />} />
            <Route
              path="/analytics/:category"
              element={<CategoryDetailScreen />}
            />
            <Route path="/export" element={<DataExportScreen />} />
          </Route>
        </Routes>
      </main>
      <Navbar />
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
