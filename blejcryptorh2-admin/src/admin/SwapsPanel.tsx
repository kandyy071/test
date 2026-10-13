import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Phone, Wallet, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CryptoSwapRow, SWAP_STATUSES, SWAP_STATUS_LABELS_SQ } from './types';

const STATUS_BADGE: Record<CryptoSwapRow['status'], string> = {
  waiting: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50',
  detected: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900/50',
  confirming: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900/50',
  processing: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-900/50',
  completed: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50',
  expired: 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700',
  cancelled: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50',
};

type FilterValue = 'all' | CryptoSwapRow['status'];
type Draft = { deposit_address?: string; deposit_network?: string; transaction_hash?: string };

export default function SwapsPanel() {
  const [swaps, setSwaps] = useState<CryptoSwapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('crypto_swaps')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError('Swap-et nuk u ngarkuan dot.');
    } else {
      setSwaps((data ?? []) as CryptoSwapRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (id: string, status: CryptoSwapRow['status']) => {
    setSavingId(id);
    const { error } = await supabase
      .from('crypto_swaps')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      setSwaps((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    }
    setSavingId(null);
  };

  const handleSaveDraft = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id);
    const { error } = await supabase
      .from('crypto_swaps')
      .update({ ...draft, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      setSwaps((prev) => prev.map((s) => (s.id === id ? { ...s, ...draft } : s)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
    setSavingId(null);
  };

  const filtered = filter === 'all' ? swaps : swaps.filter((s) => s.status === filter);

  const counts: Record<FilterValue, number> = {
    all: swaps.length,
    waiting: swaps.filter((s) => s.status === 'waiting').length,
    detected: swaps.filter((s) => s.status === 'detected').length,
    confirming: swaps.filter((s) => s.status === 'confirming').length,
    processing: swaps.filter((s) => s.status === 'processing').length,
    completed: swaps.filter((s) => s.status === 'completed').length,
    expired: swaps.filter((s) => s.status === 'expired').length,
    cancelled: swaps.filter((s) => s.status === 'cancelled').length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Crypto Swaps</h2>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Rifresko
        </button>
      </div>

      <div className="flex gap-1.5 mb-5 overflow-x-auto">
        {(['all', ...SWAP_STATUSES] as FilterValue[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {f === 'all' ? 'Të gjitha' : SWAP_STATUS_LABELS_SQ[f]} ({counts[f]})
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {!loading && filtered.length === 0 && !error && (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-10 text-center">Nuk ka swap-e në këtë kategori.</p>
      )}

      <div className="space-y-3">
        {filtered.map((s) => {
          const draft = drafts[s.id] ?? {};
          return (
            <div
              key={s.id}
              className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{s.swap_id}</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{s.customer_name}</p>
                  <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <Phone className="w-3 h-3" /> {s.customer_phone}
                  </span>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_BADGE[s.status]}`}>
                  {SWAP_STATUS_LABELS_SQ[s.status]}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white mb-3">
                <span>{s.send_amount} {s.send_coin} ({s.send_network})</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span>{s.receive_amount.toFixed(6)} {s.receive_coin} ({s.receive_network})</span>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 mb-3">
                <p className="flex items-start gap-1.5">
                  <Wallet className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span className="break-all">Adresa e klientit: {s.customer_receiving_address}</span>
                </p>
                <p>Kursi: {s.exchange_rate.toFixed(6)} · Tarifa: {s.exchange_fee_pct}% + {s.coin_fee_pct}%</p>
              </div>

              <div className="grid sm:grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Adresa e depozitimit
                  </label>
                  <input
                    type="text"
                    value={draft.deposit_address ?? s.deposit_address ?? ''}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [s.id]: { ...prev[s.id], deposit_address: e.target.value } }))}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Rrjeti i depozitimit
                  </label>
                  <input
                    type="text"
                    value={draft.deposit_network ?? s.deposit_network ?? ''}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [s.id]: { ...prev[s.id], deposit_network: e.target.value } }))}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Tx hash
                  </label>
                  <input
                    type="text"
                    value={draft.transaction_hash ?? s.transaction_hash ?? ''}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [s.id]: { ...prev[s.id], transaction_hash: e.target.value } }))}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 mt-3">
                <select
                  value={s.status}
                  disabled={savingId === s.id}
                  onChange={(e) => handleStatusChange(s.id, e.target.value as CryptoSwapRow['status'])}
                  className="text-sm px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {SWAP_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {SWAP_STATUS_LABELS_SQ[st]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleSaveDraft(s.id)}
                  disabled={savingId === s.id || !drafts[s.id]}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 disabled:opacity-40 transition-opacity"
                >
                  Ruaj
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
