export interface CryptoInfo {
  symbol: string;
  name: string;
  color: string;
  icon: string;
  coinGeckoId: string;
}

export const CRYPTOS: CryptoInfo[] = [
  { symbol: 'USDT', name: 'Tether (USDT)', color: '#26A17B', icon: '₮', coinGeckoId: 'tether' },
  { symbol: 'BTC', name: 'Bitcoin (BTC)', color: '#F7931A', icon: '₿', coinGeckoId: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum (ETH)', color: '#627EEA', icon: 'Ξ', coinGeckoId: 'ethereum' },
  { symbol: 'LTC', name: 'Litecoin (LTC)', color: '#345D9D', icon: 'Ł', coinGeckoId: 'litecoin' },
  { symbol: 'SOL', name: 'Solana (SOL)', color: '#9945FF', icon: '◎', coinGeckoId: 'solana' },
  { symbol: 'XRP', name: 'Ripple (XRP)', color: '#23292F', icon: 'X', coinGeckoId: 'ripple' },
];

export interface PriceResult {
  price: number;
  change24h: number;
}

const priceCache: Record<string, { price: number; change24h: number; ts: number }> = {};
const CACHE_MS = 60_000;

const FALLBACK_PRICES: Record<string, PriceResult> = {
  USDT: { price: 0.92, change24h: 0 },
  BTC: { price: 95000, change24h: 1.5 },
  ETH: { price: 3200, change24h: 2.1 },
  LTC: { price: 95, change24h: 1.3 },
  SOL: { price: 180, change24h: 3.2 },
  XRP: { price: 2.1, change24h: 1.0 },
};

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;

      if (res.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000;
        await sleep(waitTime);
        continue;
      }

      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Network error');
      if (attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 500;
        await sleep(waitTime);
      }
    }
  }

  throw lastError || new Error('Failed after retries');
}

export async function fetchCryptoPrice(symbol: string): Promise<PriceResult> {
  const cached = priceCache[symbol];
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    return { price: cached.price, change24h: cached.change24h };
  }

  const crypto = CRYPTOS.find((c) => c.symbol === symbol);
  if (!crypto) throw new Error('Kriptomonedha nuk u gjet');

  try {
    const res = await fetchWithRetry(
      `https://api.coingecko.com/api/v3/simple/price?ids=${crypto.coinGeckoId}&vs_currencies=eur&include_24hr_change=true`
    );
    const data = await res.json();
    const entry = data[crypto.coinGeckoId];
    if (!entry) throw new Error('Çmimi nuk është i disponueshëm');

    const result = { price: entry.eur, change24h: entry.eur_24h_change ?? 0 };
    priceCache[symbol] = { ...result, ts: Date.now() };
    return result;
  } catch {
    const fallback = FALLBACK_PRICES[symbol];
    if (fallback) {
      priceCache[symbol] = { ...fallback, ts: Date.now() };
      return fallback;
    }
    throw new Error('Nuk u gjetën çmimet');
  }
}

export async function fetchAllPrices(): Promise<Record<string, PriceResult>> {
  const ids = CRYPTOS.map((c) => c.coinGeckoId).join(',');

  try {
    const res = await fetchWithRetry(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=eur&include_24hr_change=true`
    );
    const data = await res.json();

    const results: Record<string, PriceResult> = {};
    for (const crypto of CRYPTOS) {
      const entry = data[crypto.coinGeckoId];
      if (entry) {
        const result = { price: entry.eur, change24h: entry.eur_24h_change ?? 0 };
        results[crypto.symbol] = result;
        priceCache[crypto.symbol] = { ...result, ts: Date.now() };
      } else if (FALLBACK_PRICES[crypto.symbol]) {
        results[crypto.symbol] = FALLBACK_PRICES[crypto.symbol];
      }
    }
    return results;
  } catch {
    const results: Record<string, PriceResult> = {};
    for (const crypto of CRYPTOS) {
      if (FALLBACK_PRICES[crypto.symbol]) {
        results[crypto.symbol] = FALLBACK_PRICES[crypto.symbol];
        priceCache[crypto.symbol] = { ...FALLBACK_PRICES[crypto.symbol], ts: Date.now() };
      }
    }
    return results;
  }
}

export function formatEur(value: number): string {
  return new Intl.NumberFormat('sq-AL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCrypto(value: number, symbol: string): string {
  const decimals = symbol === 'USDT' ? 2 : 8;
  return `${value.toFixed(decimals)} ${symbol}`;
}

export function formatPriceShort(value: number): string {
  if (value >= 1000) return `€${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (value >= 1) return `€${value.toFixed(2)}`;
  return `€${value.toFixed(4)}`;
}
