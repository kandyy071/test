import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Phone, AtSign, MapPin, Calendar, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  Appointment,
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
} from './types';

const STATUS_BADGE: Record<Appointment['status'], string> = {
  pending: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50',
  confirmed: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900/50',
  completed: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50',
  cancelled: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50',
};

function formatEur(value: number): string {
  return new Intl.NumberFormat('sq-AL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(value);
}

function formatCrypto(value: number, symbol: string): string {
  const decimals = symbol === 'USDT' ? 2 : 8;
  return `${value.toFixed(decimals)} ${symbol}`;
}

type FilterValue = 'all' | Appointment['status'];

export default function AppointmentsPanel() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [locationDrafts, setLocationDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError('Rezervimet nuk u ngarkuan dot.');
    } else {
      setAppointments((data ?? []) as Appointment[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (id: string, status: Appointment['status']) => {
    setSavingId(id);
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    if (!error) {
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    }
    setSavingId(null);
  };

  const handleSaveLocation = async (id: string) => {
    const value = locationDrafts[id];
    if (value === undefined) return;
    setSavingId(id);
    const { error } = await supabase.from('appointments').update({ meeting_location: value }).eq('id', id);
    if (!error) {
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, meeting_location: value } : a)));
    }
    setSavingId(null);
  };

  const filtered = filter === 'all' ? appointments : appointments.filter((a) => a.status === filter);

  const counts: Record<FilterValue, number> = {
    all: appointments.length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    completed: appointments.filter((a) => a.status === 'completed').length,
    cancelled: appointments.filter((a) => a.status === 'cancelled').length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Rezervimet</h2>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Rifresko
        </button>
      </div>

      <div className="flex gap-1.5 mb-5 overflow-x-auto">
        {(['all', ...APPOINTMENT_STATUSES] as FilterValue[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {f === 'all' ? 'Të gjitha' : APPOINTMENT_STATUS_LABELS[f]} ({counts[f]})
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
        <p className="text-sm text-slate-500 dark:text-slate-400 py-10 text-center">Nuk ka rezervime në këtë kategori.</p>
      )}

      <div className="space-y-3">
        {filtered.map((apt) => (
          <div
            key={apt.id}
            className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{apt.customer_name}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {apt.customer_phone}
                  </span>
                  {apt.social_handle && (
                    <span className="flex items-center gap-1">
                      <AtSign className="w-3 h-3" /> {apt.social_handle}
                    </span>
                  )}
                </div>
              </div>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_BADGE[apt.status]}`}>
                {APPOINTMENT_STATUS_LABELS[apt.status]}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-3">
              <div className="flex justify-between sm:block">
                <span className="text-slate-500 dark:text-slate-400">
                  {apt.mode === 'buy' ? 'Blerje' : 'Shitje'} {apt.crypto_type}
                </span>
              </div>
              <div className="flex justify-between sm:block">
                <span className="text-slate-900 dark:text-white font-medium">
                  {formatEur(apt.cash_amount_eur)} → {formatCrypto(apt.crypto_amount, apt.crypto_type)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5" /> {apt.preferred_date}
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5" /> {apt.preferred_time}
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                Tarifa: {apt.fee_percentage > 0 ? `${apt.fee_percentage}%` : 'fikse'} ({formatEur(apt.fee_amount_eur)}, {apt.fee_mode === 'included' ? 'e përfshirë' : 'ekstra'})
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                Neto: {formatEur(apt.net_amount_eur)} · Çmimi: {formatEur(apt.crypto_price_eur)}
              </div>
            </div>

            {apt.notes && (
              <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2 mb-3">
                {apt.notes}
              </p>
            )}

            <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Statusi
                </label>
                <select
                  value={apt.status}
                  disabled={savingId === apt.id}
                  onChange={(e) => handleStatusChange(apt.id, e.target.value as Appointment['status'])}
                  className="text-sm px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {APPOINTMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {APPOINTMENT_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[180px]">
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  <MapPin className="w-3 h-3 inline -mt-0.5" /> Vendtakimi
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={locationDrafts[apt.id] ?? apt.meeting_location ?? ''}
                    onChange={(e) => setLocationDrafts((prev) => ({ ...prev, [apt.id]: e.target.value }))}
                    placeholder="p.sh. Sheshi Rahovec"
                    className="flex-1 text-sm px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    onClick={() => handleSaveLocation(apt.id)}
                    disabled={savingId === apt.id || locationDrafts[apt.id] === undefined}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 disabled:opacity-40 transition-opacity"
                  >
                    Ruaj
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
