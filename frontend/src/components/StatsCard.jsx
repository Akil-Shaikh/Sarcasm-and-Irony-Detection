import React from 'react';

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'indigo',
  badge = null
}) {
  const colorMap = {
    indigo: {
      border: 'border-indigo-500/30 hover:border-indigo-500/50',
      bg: 'from-indigo-950/40 via-slate-900/40 to-slate-950/40',
      glow: 'glow-indigo',
      iconBg: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
      valueText: 'text-indigo-200',
    },
    emerald: {
      border: 'border-emerald-500/30 hover:border-emerald-500/50',
      bg: 'from-emerald-950/40 via-slate-900/40 to-slate-950/40',
      glow: 'glow-emerald',
      iconBg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      valueText: 'text-emerald-200',
    },
    purple: {
      border: 'border-purple-500/30 hover:border-purple-500/50',
      bg: 'from-purple-950/40 via-slate-900/40 to-slate-950/40',
      glow: 'glow-purple',
      iconBg: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
      valueText: 'text-purple-200',
    },
    amber: {
      border: 'border-amber-500/30 hover:border-amber-500/50',
      bg: 'from-amber-950/40 via-slate-900/40 to-slate-950/40',
      glow: 'glow-amber',
      iconBg: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      valueText: 'text-amber-200',
    },
    cyan: {
      border: 'border-cyan-500/30 hover:border-cyan-500/50',
      bg: 'from-cyan-950/40 via-slate-900/40 to-slate-950/40',
      glow: 'glow-cyan',
      iconBg: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
      valueText: 'text-cyan-200',
    },
  };

  const currentTheme = colorMap[color] || colorMap.indigo;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-6 glass-card border bg-gradient-to-br transition-all duration-300 hover:-translate-y-1 ${currentTheme.border} ${currentTheme.bg}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
            {title}
          </span>
          <div className={`text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight text-white ${currentTheme.valueText}`}>
            {value}
          </div>
        </div>

        {Icon && (
          <div className={`p-3 rounded-2xl ${currentTheme.iconBg}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
        <span>{subtitle}</span>
        {badge && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300 border border-white/10">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
