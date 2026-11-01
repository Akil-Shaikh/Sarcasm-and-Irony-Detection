import React from 'react';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ClassGauge({
  predictedClass = 'regular',
  score = 0.92,
  scores = { regular: 0.92, irony: 0.04, sarcasm: 0.04 },
}) {
  const currentScores = scores || {};
  const currentClass = (predictedClass || 'regular').toLowerCase();

  const formatPercentage = (val) => {
    if (val === undefined || val === null) return '0%';
    const pct = val * 100;
    if (pct < 0.1 && pct > 0) return '<0.1%';
    return `${pct.toFixed(1)}%`;
  };

  const getWidthPercent = (val) => {
    if (!val) return 2;
    return Math.max(Math.min(val * 100, 100), 2);
  };

  const classesConfig = [
    {
      id: 'regular',
      title: 'Regular Statement',
      rawScore: currentScores.regular ?? (currentClass === 'regular' ? score : 0.0),
      activeCard: 'bg-emerald-950/40 border-emerald-500/50 ring-1 ring-emerald-500/40 glow-emerald',
      inactiveCard: 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/40',
      barColor: 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-emerald-500/50 shadow-sm',
      textColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
      description: 'Literal, conversational, or objective expression without mock or contradictory tone',
      icon: CheckCircle2,
    },
    {
      id: 'irony',
      title: 'Irony Expression',
      rawScore: currentScores.irony ?? (currentClass === 'irony' ? score : 0.0),
      activeCard: 'bg-purple-950/40 border-purple-500/50 ring-1 ring-purple-500/40 glow-purple',
      inactiveCard: 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/40',
      barColor: 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-purple-500/50 shadow-sm',
      textColor: 'text-purple-400',
      badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
      description: 'Situational expectation inversion (e.g. fire station burning, police ticketed)',
      icon: Sparkles,
    },
    {
      id: 'sarcasm',
      title: 'Sarcasm Expression',
      rawScore: currentScores.sarcasm ?? (currentClass === 'sarcasm' ? score : 0.0),
      activeCard: 'bg-amber-950/40 border-amber-500/50 ring-1 ring-amber-500/40 glow-amber',
      inactiveCard: 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/40',
      barColor: 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/50 shadow-sm',
      textColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
      description: 'Mocking or satirical polarity clash (positive praise targeting a negative event)',
      icon: AlertCircle,
    },
  ];

  return (
    <div className="space-y-3">
      {classesConfig.map((item) => {
        const isWinner = currentClass === item.id;
        const Icon = item.icon;

        return (
          <div
            key={item.id}
            className={`p-4 rounded-2xl border transition-all duration-300 ${
              isWinner ? item.activeCard : item.inactiveCard
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`p-1.5 rounded-xl ${isWinner ? 'bg-white/10' : 'bg-slate-800/80'} ${item.textColor}`}>
                  <Icon className="w-4 h-4 shrink-0" />
                </span>
                <span className={`text-xs font-bold uppercase tracking-wider truncate ${item.textColor}`}>
                  {item.title}
                </span>
                {isWinner && (
                  <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md border ${item.badgeBg}`}>
                    Winner
                  </span>
                )}
              </div>
              <span className="text-sm font-extrabold text-white font-mono shrink-0">
                {formatPercentage(item.rawScore)}
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-950/90 rounded-full overflow-hidden p-0.5 border border-slate-800/90 my-2">
              <div
                className={`h-full rounded-full transition-all duration-700 ${item.barColor}`}
                style={{ width: `${getWidthPercent(item.rawScore)}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              {item.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
