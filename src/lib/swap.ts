export interface SwapCoin {
  symbol: string;
  name: string;
  network: string;
  color: string;
  icon: string;
  coinGeckoId: string;
}

export const SWAP_COINS: SwapCoin[] = [
  { symbol: 'USDT_TRC20', name: 'USDT TRC20', network: 'TRC20', color: '#26A17B', icon: '₮', coinGeckoId: 'tether' },
  { symbol: 'USDT_BEP20', name: 'USDT BEP20', network: 'BEP20', color: '#F0B90B', icon: '₮', coinGeckoId: 'tether' },
  { symbol: 'BTC', name: 'Bitcoin', network: 'Bitcoin', color: '#F7931A', icon: '₿', coinGeckoId: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', network: 'ERC20', color: '#627EEA', icon: 'Ξ', coinGeckoId: 'ethereum' },
  { symbol: 'SOL', name: 'Solana', network: 'Solana', color: '#9945FF', icon: '◎', coinGeckoId: 'solana' },
  { symbol: 'LTC', name: 'Litecoin', network: 'Litecoin', color: '#345D9D', icon: 'Ł', coinGeckoId: 'litecoin' },
];

export const EXCHANGE_FEE_PCT = 5;
export const COIN_FEE_PCT = 0.6;
export const MIN_SWAP_EUR = 20;
const EUR_TO_USD = 1.08;

export function getMinAmountForCoin(coinPriceUsd: number): number {
  if (coinPriceUsd <= 0) return 0;
  const minUsd = MIN_SWAP_EUR * EUR_TO_USD;
  return minUsd / coinPriceUsd;
}

export type SwapStatus =
  | 'waiting'
  | 'detected'
  | 'confirming'
  | 'processing'
  | 'completed'
  | 'expired'
  | 'cancelled';

export const SWAP_STATUS_LABELS: Record<SwapStatus, string> = {
  waiting: 'DUKE PRITUR PAGESEN',
  detected: 'PAGESA U DETEKTUA',
  confirming: 'DUKE KONFIRMUAR',
  processing: 'DUKE PROCESUAR',
  completed: 'SHKËMBIMI U KRYE',
  expired: 'SKADUAR',
  cancelled: 'ANULUAR',
};

export const SWAP_STATUS_COLORS: Record<SwapStatus, string> = {
  waiting: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50',
  detected: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900/50',
  confirming: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900/50',
  processing: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-900/50',
  completed: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50',
  expired: 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700',
  cancelled: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50',
};

const priceCache: Record<string, { price: number; ts: number }> = {};
const CACHE_MS = 60_000;

export async function fetchSwapPrice(coinGeckoId: string): Promise<number> {
  const cached = priceCache[coinGeckoId];
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    return cached.price;
  }

  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=usd`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const entry = data[coinGeckoId];
  if (!entry || !entry.usd) throw new Error('Çmimi nuk është i disponueshëm');

  const price = entry.usd as number;
  priceCache[coinGeckoId] = { price, ts: Date.now() };
  return price;
}

export async function fetchAllSwapPrices(): Promise<Record<string, number>> {
  const ids = SWAP_COINS.map((c) => c.coinGeckoId).filter((v, i, a) => a.indexOf(v) === i).join(',');
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  const prices: Record<string, number> = {};
  for (const coin of SWAP_COINS) {
    const entry = data[coin.coinGeckoId];
    if (entry && entry.usd) {
      prices[coin.symbol] = entry.usd;
      priceCache[coin.coinGeckoId] = { price: entry.usd, ts: Date.now() };
    }
  }
  return prices;
}

export function calculateSwap(
  sendAmount: number,
  sendPriceUsd: number,
  receivePriceUsd: number,
  exchangeFeePct: number = EXCHANGE_FEE_PCT,
  coinFeePct: number = COIN_FEE_PCT
): { receiveAmount: number; exchangeRate: number } {
  if (sendAmount <= 0 || sendPriceUsd <= 0 || receivePriceUsd <= 0) {
    return { receiveAmount: 0, exchangeRate: 0 };
  }

  const exchangeRate = sendPriceUsd / receivePriceUsd;
  const afterExchangeFee = sendAmount * (1 - exchangeFeePct / 100);
  const afterCoinFee = afterExchangeFee * (1 - coinFeePct / 100);
  const receiveAmount = afterCoinFee * exchangeRate;

  return { receiveAmount, exchangeRate };
}

export function formatSwapAmount(value: number, symbol: string): string {
  if (symbol === 'BTC') return value.toFixed(8);
  if (symbol === 'ETH' || symbol === 'SOL') return value.toFixed(6);
  return value.toFixed(2);
}

export function generateSwapId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `SWAP-${dateStr}-${random}`;
}

export function getCoinByValue(value: string): SwapCoin | undefined {
  return SWAP_COINS.find((c) => `${c.symbol}_${c.network}` === value || c.symbol === value);
}

export function getCoinLabel(coin: SwapCoin): string {
  if (coin.symbol === 'USDT') return coin.network === 'TRC20' ? 'USDT TRC20' : 'USDT BEP20';
  return coin.name;
}

export function getNetworkLabel(coin: SwapCoin): string {
  if (coin.symbol === 'USDT' && coin.network === 'TRC20') return 'TRON (TRC20)';
  if (coin.symbol === 'USDT' && coin.network === 'BEP20') return 'BNB Smart Chain (BEP20)';
  if (coin.symbol === 'BTC') return 'Bitcoin Network';
  if (coin.symbol === 'ETH') return 'Ethereum (ERC20)';
  if (coin.symbol === 'SOL') return 'Solana Network';
  if (coin.symbol === 'LTC') return 'Litecoin Network';
  return coin.network;
}

export function validateWalletAddress(address: string, coin: SwapCoin): boolean {
  if (!address || address.trim().length < 5) return false;
  const addr = address.trim();

  if (coin.symbol === 'BTC') {
    return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(addr);
  }
  if (coin.symbol === 'ETH' || (coin.symbol === 'USDT' && coin.network === 'BEP20')) {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  }
  if (coin.symbol === 'USDT' && coin.network === 'TRC20') {
    return /^T[A-Za-z0-9]{33}$/.test(addr);
  }
  if (coin.symbol === 'SOL') {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
  }
  if (coin.symbol === 'LTC') {
    return /^(ltc1|[LM])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(addr);
  }
  return addr.length >= 10;
}

export function getAddressPlaceholder(coin: SwapCoin): string {
  if (coin.symbol === 'BTC') return 'bc1q... ose 1... ose 3...';
  if (coin.symbol === 'ETH') return '0x...';
  if (coin.symbol === 'USDT' && coin.network === 'TRC20') return 'T... (TRC20)';
  if (coin.symbol === 'USDT' && coin.network === 'BEP20') return '0x... (BEP20)';
  if (coin.symbol === 'SOL') return 'Adresa Solana...';
  if (coin.symbol === 'LTC') return 'ltc1... ose L...';
  return 'Adresa e portofolit...';
}
