import React, { useEffect, useState } from 'react';
import { getBatchList, deleteBatch } from '../api/client';
import { History as HistoryIcon, Layers, Download, Trash2, Calendar, FileSpreadsheet, Youtube, Search } from 'lucide-react';
import Swal from 'sweetalert2';

export default function History({ user }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBatches();
  }, [user]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await getBatchList();
      setBatches(res.data);
    } catch (err) {
      console.error('Error fetching history', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (batchId) => {
    window.open(`/api/analysis/export/${batchId}/`, '_blank');
  };

  const handleDelete = async (batchId, batchName) => {
    const result = await Swal.fire({
      title: 'Delete Batch Record?',
      text: `Are you sure you want to remove "${batchName}" and its classified comments?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#334155',
      confirmButtonText: 'Yes, delete',
      background: '#0f172a',
      color: '#f8fafc',
    });

    if (result.isConfirmed) {
      try {
        await deleteBatch(batchId);
        setBatches((prev) => prev.filter((b) => b.id !== batchId));
        Swal.fire({
          icon: 'success',
          title: 'Deleted',
          text: 'Batch record removed successfully.',
          background: '#0f172a',
          color: '#f8fafc',
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.response?.data?.error || 'Failed to delete batch.',
          background: '#0f172a',
          color: '#f8fafc',
        });
      }
    }
  };

  const getBatchName = (b) => b.batchname || b.batch_name || 'Untitled Batch';

  const getBatchDate = (b) => {
    const raw = b.date_created || b.created_at;
    if (!raw) return 'Recently';
    const d = new Date(raw);
    return isNaN(d.getTime())
      ? 'Recently'
      : d.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  const filteredBatches = batches.filter((b) =>
    getBatchName(b).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <HistoryIcon className="w-8 h-8 text-indigo-400" />
          History & Batch Analysis Logs
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Access all previously uploaded batch datasets, YouTube comment runs, and generated CSV exports.
        </p>
      </div>

      <div className="glass-card p-6 sm:p-7 rounded-3xl border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Processed Batches ({batches.length})
          </h3>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search batch name..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase bg-slate-900/90 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Batch Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-center">Total Rows</th>
                <th className="py-3 px-4 text-center">Dominant Tone</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredBatches.length > 0 ? (
                filteredBatches.map((batch) => {
                  const bName = getBatchName(batch);
                  const isYt = (bName + ' ' + (batch.comment_type || '')).toLowerCase().includes('youtube');
                  const domTone = (batch.overall_sentiment || batch.dominant_sentiment || 'regular').toLowerCase();

                  return (
                    <tr key={batch.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        {isYt ? (
                          <Youtube className="w-4 h-4 text-rose-500 shrink-0" />
                        ) : (
                          <FileSpreadsheet className="w-4 h-4 text-indigo-400 shrink-0" />
                        )}
                        <span className="truncate max-w-xs">{bName}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {batch.comment_type || (isYt ? 'YouTube Run' : 'CSV Batch')}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-white">
                        {batch.total_comments}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                            domTone === 'irony'
                              ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                              : domTone === 'sarcasm'
                              ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                              : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {domTone}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                        {getBatchDate(batch)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleExport(batch.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="Export CSV"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(batch.id, bName)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No batch history records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
