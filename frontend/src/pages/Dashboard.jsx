import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatsCard from '../components/StatsCard';
import { getDashboardStats } from '../api/client';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import {
  MessageSquare,
  Cpu,
  Layers,
  Sparkles,
  Youtube,
  ArrowRight,
  ShieldCheck,
  Activity,
  History,
  FileSpreadsheet
} from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Dashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await getDashboardStats();
      setStats(res.data);
    } catch (err) {
      console.error('Error loading dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  const hasData = stats && stats.total_predictions > 0;
  const regCount = stats?.class_distribution?.regular || 0;
  const ironyCount = stats?.class_distribution?.irony || 0;
  const sarcasmCount = stats?.class_distribution?.sarcasm || 0;

  const chartData = {
    labels: ['Regular Tone', 'Irony', 'Sarcasm'],
    datasets: [
      {
        data: hasData ? [regCount, ironyCount, sarcasmCount] : [50, 25, 25],
        backgroundColor: ['#10b981', '#a855f7', '#f59e0b'],
        borderColor: '#0f172a',
        borderWidth: 3,
        hoverOffset: 8,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#94a3b8',
          font: { family: 'Plus Jakarta Sans', size: 12, weight: 600 },
          padding: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            if (!hasData) return ` Sample Demo: ${context.raw}%`;
            return ` ${context.label}: ${context.raw} tweets`;
          },
        },
      },
    },
    cutout: '72%',
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-8 sm:p-10 glass-panel border border-indigo-500/20 bg-gradient-to-r from-indigo-950/70 via-purple-950/40 to-slate-950 shadow-2xl">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Attention-Enhanced Bi-LSTM Neural Pipeline Active</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            {user ? `Welcome Back, ${user.username}!` : 'Sarcasm & Irony Intelligence Platform'}
          </h1>
          <p className="text-slate-300 text-base sm:text-lg mt-3 leading-relaxed">
            High-precision NLP architecture distinguishing <strong className="text-emerald-300">Regular Praise</strong> from <strong className="text-amber-300">Sarcastic Contradiction</strong> and <strong className="text-purple-300">Situational Irony</strong>.
          </p>
          <div className="flex flex-wrap gap-4 mt-8">
            <Link
              to="/single"
              className="px-6 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 hover:-translate-y-0.5"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Test Single Tweet</span>
            </Link>
            <Link
              to="/batch"
              className="px-6 py-3 rounded-2xl font-bold text-sm glass-card hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-2 hover:-translate-y-0.5"
            >
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Upload CSV / Excel Batch</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          title="Total Predictions"
          value={stats ? stats.total_predictions.toLocaleString() : '0'}
          subtitle="Analyzed tweets & statements"
          icon={Activity}
          color="indigo"
          badge="Live"
        />
        <StatsCard
          title="Regular Expression"
          value={hasData ? `${((regCount / stats.total_predictions) * 100).toFixed(1)}%` : '0%'}
          subtitle={`${regCount.toLocaleString()} literal statements`}
          icon={ShieldCheck}
          color="emerald"
        />
        <StatsCard
          title="Irony Rate"
          value={hasData ? `${((ironyCount / stats.total_predictions) * 100).toFixed(1)}%` : '0%'}
          subtitle={`${ironyCount.toLocaleString()} situational reversals`}
          icon={Sparkles}
          color="purple"
        />
        <StatsCard
          title="Sarcasm Rate"
          value={hasData ? `${((sarcasmCount / stats.total_predictions) * 100).toFixed(1)}%` : '0%'}
          subtitle={`${sarcasmCount.toLocaleString()} mocking contradictions`}
          icon={Cpu}
          color="amber"
        />
      </div>

      {/* Middle Grid: Tone Distribution Chart + Architecture Callout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Chart Column */}
        <div className="lg:col-span-5 glass-card p-6 sm:p-7 rounded-3xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Tone Class Distribution</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {hasData ? 'Breakdown of your historical classifications' : 'Demo preview (No classifications run yet)'}
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-400 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
              3-Class
            </span>
          </div>

          <div className="relative h-64 my-auto">
            <Doughnut data={chartData} options={chartOptions} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-white font-mono">
                {stats ? stats.total_predictions : 0}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Total Texts
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-3 text-center text-xs">
            <div>
              <span className="text-emerald-400 font-bold block">{regCount}</span>
              <span className="text-slate-400 text-[11px]">Regular</span>
            </div>
            <div>
              <span className="text-purple-400 font-bold block">{ironyCount}</span>
              <span className="text-slate-400 text-[11px]">Irony</span>
            </div>
            <div>
              <span className="text-amber-400 font-bold block">{sarcasmCount}</span>
              <span className="text-slate-400 text-[11px]">Sarcasm</span>
            </div>
          </div>
        </div>

        {/* Quick Launchpad & Modules */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Platform Capabilities
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/single"
              className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/50 transition-all duration-200 group hover:-translate-y-0.5 block"
            >
              <div className="p-3 rounded-xl bg-indigo-500/15 text-indigo-400 w-fit mb-3 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                Single Sentence Detector
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Test custom sentences with instant confidence scoring and lexical token breakdowns.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 mt-3 group-hover:translate-x-1 transition-transform">
                Open Analyzer <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>

            <Link
              to="/batch"
              className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-purple-500/50 transition-all duration-200 group hover:-translate-y-0.5 block"
            >
              <div className="p-3 rounded-xl bg-purple-500/15 text-purple-400 w-fit mb-3 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                Batch CSV & Excel
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Upload entire datasets of tweets, filter by predicted sentiment, and download enriched CSVs.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-400 mt-3 group-hover:translate-x-1 transition-transform">
                Process Batch <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>

            <Link
              to="/youtube"
              className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-rose-500/50 transition-all duration-200 group hover:-translate-y-0.5 block"
            >
              <div className="p-3 rounded-xl bg-rose-500/15 text-rose-400 w-fit mb-3 group-hover:scale-105 transition-transform">
                <Youtube className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-rose-300 transition-colors">
                YouTube Comment Scanner
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Analyze public YouTube video comment threads to detect sarcastic reception and irony.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 mt-3 group-hover:translate-x-1 transition-transform">
                Scan Video <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>

            <Link
              to="/insights"
              className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-emerald-500/50 transition-all duration-200 group hover:-translate-y-0.5 block"
            >
              <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400 w-fit mb-3 group-hover:scale-105 transition-transform">
                <Cpu className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                Bi-LSTM Model Insights
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Inspect test accuracy (82.13%), Macro F1, confusion matrix, and layer architecture.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 mt-3 group-hover:translate-x-1 transition-transform">
                View Architecture <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
