import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquareText, Layers, Youtube, Cpu, History, ChevronRight } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Overview Dashboard', icon: LayoutDashboard },
  { path: '/single', label: 'Single Tweet Tone', icon: MessageSquareText },
  { path: '/batch', label: 'Batch CSV Analysis', icon: Layers },
  { path: '/youtube', label: 'YouTube Comment Tone', icon: Youtube },
  { path: '/insights', label: 'Bi-LSTM Architecture', icon: Cpu },
  { path: '/history', label: 'History & Batches', icon: History },
];

export default function Sidebar({ mobileOpen = false, setMobileOpen = () => {} }) {
  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      <aside
        className={`fixed md:static top-[65px] bottom-0 left-0 z-30 w-64 glass-panel border-r border-slate-800/80 p-4 flex flex-col justify-between transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-1.5">
          <p className="px-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-3">
            Core Modules
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/10 text-white border border-indigo-500/30 font-semibold shadow-inner'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
              </NavLink>
            );
          })}
        </div>

        {/* Dataset & Architecture Info Pill */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Trained Taxonomy</span>
            <span className="text-[10px] font-extrabold bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
              3-Class Native
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Powered by a 2-layer Bidirectional LSTM with Bahdanau Self-Attention evaluating <strong className="text-emerald-300">Regular</strong>, <strong className="text-purple-300">Irony</strong>, and <strong className="text-amber-300">Sarcasm</strong> intent.
          </p>
          <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/60 font-mono">
            <span>GloVe 100d</span>
            <span>Macro F1: 0.839</span>
          </div>
        </div>
      </aside>
    </>
  );
}
