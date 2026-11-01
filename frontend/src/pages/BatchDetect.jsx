import React, { useState, useRef } from 'react';
import { batchPredict, getBatchDetail } from '../api/client';
import Swal from 'sweetalert2';
import {
  Layers,
  UploadCloud,
  FileText,
  CheckCircle,
  Download,
  Search,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  Filter
} from 'lucide-react';

export default function BatchDetect() {
  const [file, setFile] = useState(null);
  const [batchName, setBatchName] = useState('');
  const [columnName, setColumnName] = useState('tweets');
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [batchSummary, setBatchSummary] = useState(null);
  const [batchDetails, setBatchDetails] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  const inspectFileHeaders = (fileObj) => {
    if (!fileObj) return;
    if (fileObj.name.toLowerCase().endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result || '';
        const firstLine = text.split(/\r\n|\n/)[0];
        if (firstLine) {
          const cols = firstLine
            .split(',')
            .map((c) => c.replace(/^["'\s]+|["'\s]+$/g, '').trim())
            .filter(Boolean);
          if (cols.length > 0) {
            setDetectedColumns(cols);
            const matched = cols.find((c) =>
              ['tweets', 'tweet', 'comment', 'comments', 'text', 'content', 'sentence', 'statement'].includes(c.toLowerCase())
            );
            if (matched) {
              setColumnName(matched);
            } else if (!cols.includes(columnName)) {
              setColumnName(cols[0]);
            }
          }
        }
      };
      reader.readAsText(fileObj.slice(0, 4096));
    } else {
      setDetectedColumns([]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      inspectFileHeaders(selected);
      if (!batchName) {
        setBatchName(selected.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      setFile(selected);
      inspectFileHeaders(selected);
      if (!batchName) {
        setBatchName(selected.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const downloadSampleCsv = () => {
    const csvContent =
      'tweets\n' +
      '"Today is a wonderful day to spend time outside with family."\n' +
      '"You like Game of Thrones? Which season was your favorite?"\n' +
      '"Great job breaking my laptop screen right before finals!"\n' +
      '"A marriage counselor filed for divorce after twenty years of marriage."\n' +
      '"I just love waiting in 3-hour airport security lines. Best day ever!"\n' +
      '"A billboard promoting safe driving was knocked down by a speeding driver."\n' +
      '"The coffee this morning was delicious and very hot."\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_tweets_to_analyze.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      Swal.fire({
        icon: 'warning',
        title: 'No File Selected',
        text: 'Please select a CSV or Excel (.xlsx) file to upload.',
        background: '#0f172a',
        color: '#f8fafc',
      });
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('batch_name', batchName.trim() || file.name);
      formData.append('column_name', columnName.trim() || 'tweets');

      const res = await batchPredict(formData);
      const batchData = res.data;
      setBatchSummary(batchData);

      const batchId = batchData.id || batchData.batch_id;
      if (batchData.comments && batchData.comments.length > 0) {
        setBatchDetails(batchData);
      } else if (batchId) {
        try {
          const detailRes = await getBatchDetail(batchId);
          setBatchDetails(detailRes.data);
        } catch (detailErr) {
          console.warn('Batch detail fallback error:', detailErr);
        }
      }

      Swal.fire({
        icon: 'success',
        title: 'Batch Analysis Complete',
        text: `Processed ${batchData.total_comments} rows into 3 tone classes!`,
        background: '#0f172a',
        color: '#f8fafc',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Batch Processing Error',
        text: err.response?.data?.error || 'Failed to analyze batch file.',
        background: '#0f172a',
        color: '#f8fafc',
      });
    } finally {
      setLoading(false);
    }
  };

  const getBatchDate = (b) => {
    const raw = b?.date_created || b?.created_at;
    if (!raw) return 'Processed Just Now';
    const d = new Date(raw);
    return isNaN(d.getTime())
      ? 'Processed Just Now'
      : d.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  const handleExport = (batchId) => {
    if (!batchId) return;
    window.open(`/api/analysis/export/${batchId}/`, '_blank');
  };

  // Filter and search comments
  const rawComments = batchDetails?.comments || batchSummary?.comments || [];
  const filteredComments = rawComments.filter((item) => {
    const textStr = (item.text || item.comment || '').toLowerCase();
    const textMatch = textStr.includes(searchTerm.toLowerCase());
    const sentimentStr = (item.predicted_sentiment || item.predicted_class || item.sentiment || '').toLowerCase();
    const classMatch = activeFilter === 'all' || sentimentStr === activeFilter.toLowerCase();
    return textMatch && classMatch;
  });

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <Layers className="w-8 h-8 text-indigo-400" />
          Batch CSV & Excel Tone Analyzer
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Upload bulk tweet datasets and automatically generate confidence-ranked predictions across Regular, Irony, and Sarcasm.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload Column */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleUpload} className="glass-card p-6 sm:p-7 rounded-3xl border border-slate-800 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Batch Name (Optional)
              </label>
              <input
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="e.g. Q4 Twitter Sentiment Analysis"
                className="w-full p-3.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
              />
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-3 ${
                isDragging
                  ? 'border-indigo-400 bg-indigo-950/40'
                  : file
                  ? 'border-emerald-500/50 bg-emerald-950/20'
                  : 'border-slate-700 hover:border-slate-500 bg-slate-950/40'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv, .xlsx, .xls"
                className="hidden"
              />

              <div className={`p-4 rounded-2xl ${file ? 'bg-emerald-500/20 text-emerald-300' : 'bg-indigo-500/10 text-indigo-400'}`}>
                {file ? <FileSpreadsheet className="w-8 h-8" /> : <UploadCloud className="w-8 h-8" />}
              </div>

              <div>
                <p className="text-sm font-bold text-white">
                  {file ? file.name : 'Click to select or drag & drop'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supported formats: CSV, Excel (.xlsx, .xls)
                </p>
              </div>

              {file && (
                <span className="text-[11px] font-mono font-bold text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                  Ready: {(file.size / 1024).toFixed(1)} KB
                </span>
              )}
            </div>

            {/* Target Column Name Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Text Column to Analyze
                </label>
                {detectedColumns.length > 0 && (
                  <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {detectedColumns.length} columns detected
                  </span>
                )}
              </div>

              {detectedColumns.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={columnName}
                      onChange={(e) => setColumnName(e.target.value)}
                      className="flex-1 p-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-xs font-mono cursor-pointer"
                    >
                      {detectedColumns.map((col) => (
                        <option key={col} value={col} className="bg-slate-900 text-white">
                          Column: "{col}"
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={columnName}
                      onChange={(e) => setColumnName(e.target.value)}
                      placeholder="Custom name"
                      className="w-36 p-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none text-xs font-mono"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 self-center mr-1">Quick pick:</span>
                    {detectedColumns.slice(0, 6).map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setColumnName(col)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          columnName === col
                            ? 'bg-indigo-600 text-white border-indigo-400'
                            : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {col}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  value={columnName}
                  onChange={(e) => setColumnName(e.target.value)}
                  placeholder="e.g. tweets, comment, text, review"
                  required
                  className="w-full p-3.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm font-mono"
                />
              )}
              <p className="text-[11px] text-slate-500 mt-1.5">
                Target header where tweet or review texts are stored (e.g. <code className="text-indigo-400">tweets</code>, <code className="text-indigo-400">comment</code>, or <code className="text-indigo-400">text</code>).
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !file}
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Batch...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Dataset</span>
                </>
              )}
            </button>
          </form>

          {/* Sample CSV Helper */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Need a test dataset?</span>
              <span className="text-[11px] text-slate-400">Download our formatted sample CSV with benchmark tweets</span>
            </div>
            <button
              type="button"
              onClick={downloadSampleCsv}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-600 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sample CSV</span>
            </button>
          </div>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-7 space-y-6">
          {batchSummary ? (
            <div className="space-y-6 animate-scaleUp">
              {/* Batch Identity Header */}
              <div className="p-5 rounded-2xl glass-card border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-slate-950/60">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-white">
                        {batchSummary.batchname || batchSummary.batch_name || batchName || 'Processed Batch'}
                      </h3>
                      <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30">
                        {batchSummary.comment_type || 'CSV File'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                      <span>Target Column: <strong className="text-indigo-300 font-mono">"{batchSummary.target_column || columnName}"</strong></span>
                      <span>•</span>
                      <span>{getBatchDate(batchSummary)}</span>
                    </p>
                  </div>
                </div>

                {(batchSummary.id || batchSummary.batch_id) && (
                  <button
                    type="button"
                    onClick={() => handleExport(batchSummary.id || batchSummary.batch_id)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </button>
                )}
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl glass-card border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Rows</span>
                  <span className="text-xl font-black text-white font-mono mt-0.5 block">
                    {batchSummary.total_comments}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block">Regular</span>
                  <span className="text-xl font-black text-emerald-200 font-mono mt-0.5 block">
                    {batchSummary.regular_count ?? batchSummary.counts?.regular ?? 0}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/40 text-center">
                  <span className="text-[10px] uppercase font-bold text-purple-400 block">Irony</span>
                  <span className="text-xl font-black text-purple-200 font-mono mt-0.5 block">
                    {batchSummary.irony_count ?? batchSummary.counts?.irony ?? 0}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-center">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block">Sarcasm</span>
                  <span className="text-xl font-black text-amber-200 font-mono mt-0.5 block">
                    {batchSummary.sarcasm_count ?? batchSummary.counts?.sarcasm ?? 0}
                  </span>
                </div>
              </div>

              {/* Filter and Export Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                  {['all', 'regular', 'irony', 'sarcasm'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setActiveFilter(f)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        activeFilter === f
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search text..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  </div>

                  {(batchSummary.id || batchSummary.batch_id) && (
                    <button
                      type="button"
                      onClick={() => handleExport(batchSummary.id || batchSummary.batch_id)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Results Table */}
              <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Analyzed Text Column: <strong className="text-indigo-300 font-mono">"{batchSummary.target_column || columnName}"</strong>
                  </span>
                  <span>
                    Showing {filteredComments.length} of {batchSummary.total_comments} entries
                  </span>
                </div>
                <div className="max-h-[460px] overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="text-[11px] uppercase bg-slate-900/90 text-slate-400 sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Tweet Text</th>
                        <th className="py-3 px-3 text-center">Classification</th>
                        <th className="py-3 px-3 text-right">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredComments.length > 0 ? (
                        filteredComments.map((row, idx) => {
                          const cls = (row.predicted_sentiment || row.predicted_class || row.sentiment || 'regular').toLowerCase();
                          const conf = row.confidence_score ?? row.score ?? 0.85;

                          return (
                            <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 px-4 text-slate-200 max-w-sm break-words font-sans">
                                {row.text || row.comment}
                              </td>
                              <td className="py-3 px-3 text-center">
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
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-slate-400">
                                {(conf * 100).toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-10 text-center text-slate-500">
                            No rows match your current filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 rounded-3xl border border-slate-800 text-center flex flex-col items-center justify-center min-h-[420px] space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                <FileSpreadsheet className="w-8 h-8 opacity-70" />
              </div>
              <h3 className="text-lg font-bold text-white">No Batch Dataset Processed</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Upload a CSV or Excel file containing a column named <code className="text-indigo-300">tweets</code> or <code className="text-indigo-300">text</code> to process thousands of entries in seconds.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
