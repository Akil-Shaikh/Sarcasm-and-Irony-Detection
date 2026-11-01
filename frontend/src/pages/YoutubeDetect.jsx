import React, { useState, useEffect } from 'react';
import { youtubePredict, getBatchDetail } from '../api/client';
import Swal from 'sweetalert2';
import {
  Youtube,
  Play,
  RefreshCw,
  CheckCircle,
  Search,
  Key,
  Sparkles,
  ExternalLink,
  Info,
  ShieldAlert
} from 'lucide-react';

export default function YoutubeDetect({ user }) {
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('youtube_api_key') || '');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [comments, setComments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const SAMPLE_VIDEOS = [
    { title: 'Rick Astley - Never Gonna Give You Up', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { title: 'Tech / Gadget Review Discussion', url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk' },
    { title: 'Comedy & Satire Commentary Video', url: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
  ];

  const handleApiKeyChange = (val) => {
    setApiKey(val);
    localStorage.setItem('youtube_api_key', val.trim());
  };

  const handleAnalyze = async (e, videoUrl = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const targetUrl = (videoUrl || url).trim();

    if (!targetUrl) {
      Swal.fire({
        icon: 'warning',
        title: 'Empty URL',
        text: 'Please paste a valid YouTube video link.',
        background: '#0f172a',
        color: '#f8fafc',
      });
      return;
    }

    if (!apiKey.trim()) {
      Swal.fire({
        icon: 'info',
        title: 'YouTube API Key Required',
        html: `Google requires an API key to fetch live comments from YouTube's servers.<br/><br/>
               Please paste your <strong>YouTube Data API v3</strong> key in the field below.<br/>
               <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" style="color: #818cf8; text-decoration: underline;">
                 Get a free API key from Google Cloud Console
               </a>`,
        background: '#0f172a',
        color: '#f8fafc',
      });
      return;
    }

    try {
      setLoading(true);
      const res = await youtubePredict(targetUrl, apiKey.trim());
      setSummary(res.data);

      if (res.data.comments && res.data.comments.length > 0) {
        setComments(res.data.comments);
      } else if (res.data.batch_id || res.data.id) {
        const batchId = res.data.batch_id || res.data.id;
        const detailRes = await getBatchDetail(batchId);
        setComments(detailRes.data.comments || []);
      }

      Swal.fire({
        icon: 'success',
        title: 'Real Comments Classified',
        text: `Fetched and evaluated ${res.data.total_comments} live comments from the video!`,
        background: '#0f172a',
        color: '#f8fafc',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'YouTube Fetch Error',
        text: err.response?.data?.error || 'Failed to fetch comments. Please check your YouTube API key and video URL.',
        background: '#0f172a',
        color: '#f8fafc',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredComments = comments.filter((c) => {
    const textStr = (c.text || c.comment || '').toLowerCase();
    const textMatch = textStr.includes(searchTerm.toLowerCase());
    const sentimentStr = (c.predicted_sentiment || c.predicted_class || c.sentiment || '').toLowerCase();
    const classMatch = activeFilter === 'all' || sentimentStr === activeFilter.toLowerCase();
    return textMatch && classMatch;
  });

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <Youtube className="w-8 h-8 text-rose-500" />
          Live YouTube Comment Tone Scanner
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Fetch real public comment threads from any YouTube video and classify audience feedback with the Attention Bi-LSTM model.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Form */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleAnalyze} className="glass-card p-6 sm:p-7 rounded-3xl border border-slate-800 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                YouTube Video URL
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-sm"
                />
                <Youtube className="w-5 h-5 text-rose-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* API Key Input Section */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  YouTube Data API v3 Key
                </label>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  Get free key <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <input
                type="password"
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full p-3.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-xs font-mono"
              />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Google requires this key to fetch real video comments. Your key is saved locally in your browser.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Fetching Real YouTube Comments...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Scan Live YouTube Comments</span>
                </>
              )}
            </button>
          </form>

          {/* Preset Video Samples */}
          <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-3">
            <span className="text-xs uppercase font-black text-slate-400 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-rose-400" />
              Quick Video Presets
            </span>
            <div className="space-y-2">
              {SAMPLE_VIDEOS.map((item) => (
                <button
                  key={item.url}
                  type="button"
                  onClick={() => {
                    setUrl(item.url);
                    handleAnalyze(null, item.url);
                  }}
                  className="w-full p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-rose-500/40 text-left transition-all text-xs flex items-center justify-between group cursor-pointer"
                >
                  <span className="text-slate-200 group-hover:text-rose-300 font-medium truncate max-w-xs">
                    {item.title}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-7 space-y-6">
          {summary ? (
            <div className="space-y-6 animate-scaleUp">
              {/* Summary Metrics */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl glass-card border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Live</span>
                  <span className="text-xl font-black text-white font-mono mt-0.5 block">
                    {summary.total_comments}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block">Regular</span>
                  <span className="text-xl font-black text-emerald-200 font-mono mt-0.5 block">
                    {summary.regular_count ?? summary.counts?.regular ?? 0}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/40 text-center">
                  <span className="text-[10px] uppercase font-bold text-purple-400 block">Irony</span>
                  <span className="text-xl font-black text-purple-200 font-mono mt-0.5 block">
                    {summary.irony_count ?? summary.counts?.irony ?? 0}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-center">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block">Sarcasm</span>
                  <span className="text-xl font-black text-amber-200 font-mono mt-0.5 block">
                    {summary.sarcasm_count ?? summary.counts?.sarcasm ?? 0}
                  </span>
                </div>
              </div>

              {/* Filter and Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  {['all', 'regular', 'irony', 'sarcasm'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setActiveFilter(f)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        activeFilter === f
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-56">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search comment..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* Comments Stream */}
              <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
                <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-800/60">
                  {filteredComments.length > 0 ? (
                    filteredComments.map((item, idx) => {
                      const cls = (item.predicted_sentiment || item.predicted_class || item.sentiment || 'regular').toLowerCase();
                      const conf = item.confidence_score ?? item.score ?? 0.85;

                      return (
                        <div key={idx} className="p-4 hover:bg-slate-800/30 transition-colors space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                                cls === 'irony'
                                  ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                                  : cls === 'sarcasm'
                                  ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                              }`}
                            >
                              {cls}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {(conf * 100).toFixed(1)}% confidence
                            </span>
                          </div>
                          <p className="text-xs text-slate-200 leading-relaxed font-sans">
                            {item.text || item.comment}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      No comments match your filter.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 rounded-3xl border border-slate-800 text-center flex flex-col items-center justify-center min-h-[420px] space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-950/40 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-inner">
                <Youtube className="w-8 h-8 opacity-70" />
              </div>
              <h3 className="text-lg font-bold text-white">No YouTube Video Scanned</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Paste any YouTube video link and enter your free YouTube API key to fetch and analyze genuine audience comments in real time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
