import { useEffect, useState } from 'react';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  FeeSettings,
  SETTINGS_LABELS,
  DEFAULT_FEE_SETTINGS,
  fetchFeeSettings,
  updateFeeSetting,
} from '../lib/settings';

const GROUPS: { title: string; keys: (keyof FeeSettings)[] }[] = [
  {
    title: 'Llogaritësi (Blerje / Shitje)',
    keys: [
      'calc_tier1_max_eur',
      'calc_tier1_fixed_fee_eur',
      'calc_tier2_max_eur',
      'calc_tier2_pct',
      'calc_tier3_max_eur',
      'calc_tier3_pct',
      'calc_tier4_pct',
      'calc_markup_other_pct',
    ],
  },
  {
    title: 'Crypto Swap',
    keys: ['swap_exchange_fee_pct', 'swap_coin_fee_pct'],
  },
];

export default function SettingsPanel() {
  const [values, setValues] = useState<FeeSettings>(DEFAULT_FEE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFeeSettings().then((v) => {
      setValues(v);
      setLoading(false);
    });
  }, []);

  const handleSave = async (key: keyof FeeSettings) => {
    setSavingKey(key);
    setError(null);
    try {
      await updateFeeSetting(key, values[key]);
      setSavedKey(key);
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      setError('Ndryshimi nuk u ruajt. Provo përsëri.');
    }
    setSavingKey(null);
  };

  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-1">Tarifat</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        Këto vlera përdoren drejtpërdrejt nga llogaritësi dhe swap-i publik në faqe.
      </p>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      ) : (
        <div className="space-y-6">
          {GROUPS.map((group) => (
            <div key={group.title} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 sm:p-5">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-3">{group.title}</h3>
              <div className="space-y-3">
                {group.keys.map((key) => (
                  <div key={key} className="flex items-center gap-3">
                    <label className="flex-1 text-sm text-slate-600 dark:text-slate-300">
                      {SETTINGS_LABELS[key]}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={values[key]}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [key]: e.target.value === '' ? 0 : Number(e.target.value) }))
                      }
                      className="w-24 text-sm px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      onClick={() => handleSave(key)}
                      disabled={savingKey === key}
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 disabled:opacity-40 transition-colors flex-shrink-0"
                      title="Ruaj"
                    >
                      {savedKey === key ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
