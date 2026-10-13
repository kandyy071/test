import { supabase } from './supabase';

export interface FeeSettings {
  calc_tier1_max_eur: number;
  calc_tier1_fixed_fee_eur: number;
  calc_tier2_max_eur: number;
  calc_tier2_pct: number;
  calc_tier3_max_eur: number;
  calc_tier3_pct: number;
  calc_tier4_pct: number;
  calc_markup_other_pct: number;
  swap_exchange_fee_pct: number;
  swap_coin_fee_pct: number;
}

export const SETTINGS_LABELS: Record<keyof FeeSettings, string> = {
  calc_tier1_max_eur: 'Llogaritësi: pragu i tarifës fikse (EUR)',
  calc_tier1_fixed_fee_eur: 'Llogaritësi: tarifa fikse nën pragun 1 (EUR)',
  calc_tier2_max_eur: 'Llogaritësi: pragu i tarifës 5% (EUR)',
  calc_tier2_pct: 'Llogaritësi: tarifa % deri në pragun 2',
  calc_tier3_max_eur: 'Llogaritësi: pragu i tarifës 4.5% (EUR)',
  calc_tier3_pct: 'Llogaritësi: tarifa % deri në pragun 3',
  calc_tier4_pct: 'Llogaritësi: tarifa % mbi pragun 3',
  calc_markup_other_pct: 'Llogaritësi: shtesë çmimi për crypto jo-USDT (%)',
  swap_exchange_fee_pct: 'Swap: tarifa e shkëmbimit (%)',
  swap_coin_fee_pct: 'Swap: tarifa e rrjetit/monedhës (%)',
};

// Mirrors the values seeded by the app_settings migration. Used if the
// table is empty, a row is missing, or the fetch fails (offline, RLS
// misconfigured, etc.) — the public calculator/swap widgets must never
// hard-fail just because settings couldn't be read.
export const DEFAULT_FEE_SETTINGS: FeeSettings = {
  calc_tier1_max_eur: 100,
  calc_tier1_fixed_fee_eur: 6,
  calc_tier2_max_eur: 1500,
  calc_tier2_pct: 5,
  calc_tier3_max_eur: 4000,
  calc_tier3_pct: 4.5,
  calc_tier4_pct: 4,
  calc_markup_other_pct: 1,
  swap_exchange_fee_pct: 5,
  swap_coin_fee_pct: 0.6,
};

let cached: { value: FeeSettings; ts: number } | null = null;
const CACHE_MS = 60_000;

export async function fetchFeeSettings(): Promise<FeeSettings> {
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    return cached.value;
  }

  try {
    const { data, error } = await supabase.from('app_settings').select('key, value');
    if (error || !data || data.length === 0) {
      return DEFAULT_FEE_SETTINGS;
    }

    const result = { ...DEFAULT_FEE_SETTINGS };
    for (const row of data as { key: string; value: number }[]) {
      if (row.key in result) {
        (result as Record<string, number>)[row.key] = Number(row.value);
      }
    }
    cached = { value: result, ts: Date.now() };
    return result;
  } catch {
    return DEFAULT_FEE_SETTINGS;
  }
}

export function clearFeeSettingsCache(): void {
  cached = null;
}

export async function updateFeeSetting(key: keyof FeeSettings, value: number): Promise<void> {
  const { error } = await supabase
    .from('app_settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key);
  if (error) throw error;
  clearFeeSettingsCache();
}
