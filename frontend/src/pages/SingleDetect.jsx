import React, { useState } from 'react';
import { singlePredict, submitFeedback } from '../api/client';
import ClassGauge from '../components/ClassGauge';
import Swal from 'sweetalert2';
import {
  MessageSquare,
  Sparkles,
  Send,
  RefreshCw,
  CheckCircle,
  Copy,
  Check,
  HelpCircle,
  CornerDownRight,
  ShieldCheck,
  Terminal
} from 'lucide-react';

const PRESETS = [
  {
    label: 'Literal Praise',
    text: 'Today is a wonderful day to go for a walk in the park.',
    cls: 'regular',
  },
  {
    label: 'Casual Question',
    text: 'You like Game of Thrones? Which season was your favorite?',
    cls: 'regular',
  },
  {
    label: 'Sarcastic Contrast',
    text: 'Great job breaking my phone screen, you are an absolute genius!',
    cls: 'sarcasm',
  },
  {
    label: 'Situational Irony',
    text: 'A marriage counselor filed for divorce after twenty years of marriage.',
    cls: 'irony',
  },
  {
    label: 'Mocking Compliment',
    text: 'I just love waiting in 3-hour airport security lines. Best day ever!',
    cls: 'sarcasm',
  },
  {
    label: 'Ironic Reality',
    text: 'A billboard promoting safe driving was knocked down by a speeding driver.',
    cls: 'irony',
  },
];

export default function SingleDetect({ user }) {
  const [tweetText, setTweetText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async (textToAnalyze = tweetText) => {
    const text = textToAnalyze.trim();
    if (!text) {
      Swal.fire({
        icon: 'warning',
        title: 'Empty Input',
        text: 'Please enter a sentence or statement to analyze.',
        background: '#0f172a',
        color: '#f8fafc',
      });
      return;
    }

    try {
      setLoading(true);
      const res = await singlePredict(text);
      setResult(res.data);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Analysis Error',
        text: err.response?.data?.error || 'Failed to communicate with prediction backend.',
        background: '#0f172a',
        color: '#f8fafc',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (correctedClass) => {
    if (!result?.id) {
      Swal.fire({
        icon: 'info',
        title: 'Feedback Noted',
        text: `Marked as ${correctedClass.toUpperCase()} for this session. (Sign in to persist feedback to database).`,
        background: '#0f172a',
        color: '#f8fafc',
        timer: 2000,
        showConfirmButton: false,
      });
      setResult((prev) => ({ ...prev, predicted_class: correctedClass }));
      return;
    }

    try {
      await submitFeedback(result.id, correctedClass);
      Swal.fire({
        icon: 'success',
        title: 'Feedback Recorded',
        text: `Updated prediction label to ${correctedClass.toUpperCase()}.`,
        background: '#0f172a',
        color: '#f8fafc',
        timer: 1800,
        showConfirmButton: false,
      });
      setResult((prev) => ({ ...prev, predicted_class: correctedClass }));
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Feedback Error',
        text: err.response?.data?.error || 'Failed to update feedback.',
        background: '#0f172a',
        color: '#f8fafc',
      });
    }
  };

  const copyResultToClipboard = () => {
    if (!result) return;
    const summary = `Text: "${tweetText}"\nPredicted Tone: ${result.predicted_class.toUpperCase()} (${(result.score * 100).toFixed(1)}% confidence)\nRegular: ${(result.scores.regular * 100).toFixed(1)}% | Irony: ${(result.scores.irony * 100).toFixed(1)}% | Sarcasm: ${(result.scores.sarcasm * 100).toFixed(1)}%`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = tweetText.trim() ? tweetText.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Title Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
          <Terminal className="w-3.5 h-3.5" />
          <span>Real-time Neural Inference</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-indigo-400" />
          Single Tweet Tone Analyzer
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Evaluate whether a statement expresses <strong className="text-emerald-300">Regular</strong> literal meaning, <strong className="text-purple-300">Situational Irony</strong>, or <strong className="text-amber-300">Sarcastic Contradiction</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input Form & Presets */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-card p-6 sm:p-7 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-200">
                Enter Tweet or Statement
              </label>
              <div className="text-xs text-slate-500 font-mono">
                {wordCount} words · {tweetText.length} chars
              </div>
            </div>

            <div className="relative">
              <textarea
                rows={5}
                value={tweetText}
                onChange={(e) => setTweetText(e.target.value)}
                placeholder="Type or paste tweet text here... e.g., 'Today is a wonderful day to spend time outside'"
                className="w-full p-4 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm leading-relaxed transition-all resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setTweetText('');
                  setResult(null);
                }}
                className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-slate-800/40"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Clear Input
              </button>

              <button
                type="button"
                onClick={() => handleAnalyze()}
                disabled={loading || !tweetText.trim()}
                className="px-6 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Predict Tone</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Interactive Preset Buttons
          <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-black text-slate-400 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Benchmark Test Samples
              </span>
              <span className="text-[11px] text-slate-500">Click any card to analyze</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setTweetText(preset.text);
                    handleAnalyze(preset.text);
                  }}
                  className="p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 text-left transition-all duration-200 group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300">
                      {preset.label}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-black px-2 py-0.5 rounded border ${
                        preset.cls === 'irony'
                          ? 'bg-purple-950/80 text-purple-300 border-purple-800/80'
                          : preset.cls === 'sarcasm'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                          : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                      }`}
                    >
                      {preset.cls}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-sans">
                    "{preset.text}"
                  </p>
                </button>
              ))}
            </div>
          </div> */}
        </div>

        {/* Right Column: Prediction Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          {result ? (
            <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-6 animate-scaleUp">
              {/* Winner Header Banner */}
              <div
                className={`text-center p-6 rounded-2xl border relative overflow-hidden ${
                  result.predicted_class === 'regular'
                    ? 'bg-gradient-to-b from-emerald-950/60 to-slate-950 border-emerald-500/40'
                    : result.predicted_class === 'irony'
                    ? 'bg-gradient-to-b from-purple-950/60 to-slate-950 border-purple-500/40'
                    : 'bg-gradient-to-b from-amber-950/60 to-slate-950 border-amber-500/40'
                }`}
              >
                <span className="text-xs uppercase tracking-widest font-black text-slate-400">
                  Detected Dominant Tone
                </span>
                <h2 className="text-3xl font-extrabold uppercase tracking-wider text-white mt-1">
                  {result.predicted_class}
                </h2>
                <div className="inline-flex items-center gap-1.5 mt-2 px-3.5 py-1 rounded-full bg-white/10 text-white border border-white/20 text-xs font-bold font-mono">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Confidence: {(result.score * 100).toFixed(1)}%
                </div>

                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    onClick={copyResultToClipboard}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1 rounded-lg bg-black/30 hover:bg-black/50 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied Summary' : 'Copy Result'}</span>
                  </button>
                </div>
              </div>

              {/* Score Breakdown Gauge */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  Probability Distribution Across 3 Classes
                </h4>
                <ClassGauge
                  predictedClass={result.predicted_class}
                  score={result.score}
                  scores={result.scores}
                />
              </div>

              {/* Preprocessed Token Inspector */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
                <span className="font-bold text-slate-400 flex items-center gap-1.5">
                  <CornerDownRight className="w-3.5 h-3.5 text-indigo-400" />
                  NLP Token Sequence
                </span>
                <p className="font-mono text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 break-words text-[11px]">
                  {result.cleaned_text || 'No tokens remaining'}
                </p>
              </div>

              {/* Feedback Trigger */}
              <div className="pt-2 border-t border-slate-800">
                <p className="text-xs text-slate-400 mb-2 font-medium flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" /> Correct the classification:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {['regular', 'irony', 'sarcasm'].map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => handleFeedback(cls)}
                      className={`py-2 px-2 text-xs font-bold rounded-xl uppercase tracking-wider transition-all border cursor-pointer ${
                        result.predicted_class === cls
                          ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-60'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-indigo-500'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 rounded-3xl border border-slate-800 text-center flex flex-col items-center justify-center min-h-[420px] space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                <Sparkles className="w-8 h-8 opacity-70" />
              </div>
              <h3 className="text-lg font-bold text-white">Ready for Prediction</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Enter text on the left or click any benchmark test sample to see the neural probability distribution.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
