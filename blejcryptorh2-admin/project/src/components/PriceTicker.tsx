import { useState, useEffect, useRef } from 'react';
import { CRYPTOS, fetchAllPrices, formatPriceShort, type PriceResult } from '../lib/crypto';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function PriceTicker() {
  const [prices, setPrices] = useState<Record<string, PriceResult>>({});
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const data = await fetchAllPrices();
        if (mounted) {
          setPrices(data);
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 60_000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const items = CRYPTOS.filter((c) => prices[c.symbol]);

  return (
    <div className="bg-slate-900 text-white overflow-hidden border-b border-slate-800">
      <div className="flex items-center">
        <div className="flex-shrink-0 px-4 py-2 bg-slate-800 text-xs font-bold uppercase tracking-wider text-sky-400 border-r border-slate-700">
          Live
        </div>
        <div ref={scrollRef} className="overflow-hidden flex-1 relative">
          <div className="flex gap-8 py-2 animate-marquee whitespace-nowrap">
            {items.length === 0 && loading && (
              <span className="text-xs text-slate-500 px-4">Duke ngarkuar çmimet...</span>
            )}
            {items.length > 0 && [...items, ...items].map((crypto, i) => {
              const p = prices[crypto.symbol];
              return (
                <div key={`${crypto.symbol}-${i}`} className="flex items-center gap-2 text-sm flex-shrink-0">
                  <span className="font-bold" style={{ color: crypto.color }}>
                    {crypto.icon}
                  </span>
                  <span className="font-semibold text-slate-300">{crypto.symbol}</span>
                  <span className="text-slate-100 font-medium">{formatPriceShort(p.price)}</span>
                  <span
                    className={`flex items-center gap-0.5 text-xs font-semibold ${
                      p.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {p.change24h >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {Math.abs(p.change24h).toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
