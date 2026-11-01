import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, User, LogOut, ShieldCheck, Zap, Menu, Activity } from 'lucide-react';
import { setAuthToken } from '../api/client';

export default function Navbar({ user, setUser, toggleMobileSidebar }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {toggleMobileSidebar && (
          <button
            type="button"
            onClick={toggleMobileSidebar}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
              ToneSense AI
            </span>
            <span className="block text-[10px] uppercase tracking-widest text-indigo-400 font-semibold">
              Attention Bi-LSTM Neural Engine
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <Link
          to="/insights"
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-emerald-500/30 text-xs font-medium text-emerald-300 hover:bg-emerald-950/20 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Bi-LSTM Engine Active (72.57% Acc)</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-200 font-medium px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>{user.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Get Started</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
