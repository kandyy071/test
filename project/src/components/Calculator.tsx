import { useState, useEffect, useCallback } from 'react';
import { CRYPTOS, fetchCryptoPrice, formatEur, formatCrypto } from '../lib/crypto';
import { ArrowRight, RefreshCw, TrendingUp, TrendingDown, Wallet, Coins, Banknote, AlertCircle, Info, ChevronDown } from 'lucide-react';

interface CalculatorProps {
  onReserve: (data: ReservationData) => void;
}

export interface ReservationData {
  cryptoType: string;
  mode: 'buy' | 'sell';
  feeMode: 'included' | 'extra';
  cashAmount: number;
  cryptoAmount: number;
  feePercentage: number;
  feeAmountEur: number;
  netAmountEur: number;
  cryptoPriceEur: number;
}

const MIN_AMOUNT = 20;

const HIDDEN_FEE_USDT = 0.007;
const HIDDEN_FEE_OTHER = 0.01;

function getAdjustedPrice(basePrice: number, symbol: string, mode: 'buy' | 'sell'): number {
  const fee = symbol === 'USDT' ? HIDDEN_FEE_USDT : HIDDEN_FEE_OTHER;
  if (mode === 'buy') {
    return basePrice * (1 + fee);
  } else {
    return basePrice * (1 - fee);
  }
}

function getFee(amount: number, mode: 'buy' | 'sell'): { percentage: number; amount: number } {
  if (mode === 'buy') {
    if (amount <= 100) {
      return { percentage: 0, amount: 6 };
    }
    return { percentage: 2, amount: (amount * 2) / 100 };
  }
  if (amount < 100) {
    return { percentage: 0, amount: 6 };
  }
  let pct = 5;
  if (amount > 4000) {
    pct = 2.5;
  } else if (amount > 1500) {
    pct = 4;
  }
  return { percentage: pct, amount: (amount * pct) / 100 };
}

export default function Calculator({ onReserve }: CalculatorProps) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [feeMode, setFeeMode] = useState<'included' | 'extra'>('included');
  const [selectedCrypto, setSelectedCrypto] = useState('USDT');
  const [cashAmount, setCashAmount] = useState<string>('100');
  const [price, setPrice] = useState<number | null>(null);
  const [change24h, setChange24h] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPrice = useCallback(async (symbol: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCryptoPrice(symbol);
      setPrice(result.price);
      setChange24h(result.change24h);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim gjatë ngarkimit të çmimit');
      setPrice(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrice(selectedCrypto);
  }, [selectedCrypto, loadPrice]);

  const cash = parseFloat(cashAmount) || 0;
  const fee = getFee(cash, mode);
  const feeAmount = fee.amount;
  const feePercentage = fee.percentage;

  let netAmount: number;
  if (mode === 'buy') {
    netAmount = feeMode === 'included' ? cash - feeAmount : cash;
  } else {
    netAmount = feeMode === 'included' ? cash : cash + feeAmount;
  }
  const adjustedPrice = price && price > 0 ? getAdjustedPrice(price, selectedCrypto, mode) : null;
  const cryptoAmount = adjustedPrice && adjustedPrice > 0 ? netAmount / adjustedPrice : 0;

  const selectedCryptoInfo = CRYPTOS.find((c) => c.symbol === selectedCrypto);
  const belowMinimum = cash > 0 && cash < MIN_AMOUNT;

  const handleReserve = () => {
    if (cash < MIN_AMOUNT || !adjustedPrice) return;
    onReserve({
      cryptoType: selectedCrypto,
      mode,
      feeMode,
      cashAmount: cash,
      cryptoAmount,
      feePercentage: feePercentage > 0 ? feePercentage : 0,
      feeAmountEur: feeAmount,
      netAmountEur: netAmount,
      cryptoPriceEur: adjustedPrice,
    });
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
      {/* Buy/Sell toggle — color coded */}
      <div className="flex p-2 bg-slate-100 gap-2">
        <button
          onClick={() => setMode('buy')}
          className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            mode === 'buy'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Coins className="w-4 h-4" />
          Bli Kripto
        </button>
        <button
          onClick={() => setMode('sell')}
          className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            mode === 'sell'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Banknote className="w-4 h-4" />
          Shit Kripto
        </button>
      </div>

      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mode === 'buy' ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : 'bg-gradient-to-br from-sky-500 to-blue-500'}`}>
            {mode === 'buy' ? <Coins className="w-5 h-5 text-white" /> : <Banknote className="w-5 h-5 text-white" />}
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              {mode === 'buy' ? 'Bli Kriptomonedha' : 'Shit Kriptomonedha'}
            </h2>
            <p className="text-sm text-slate-500">
              {mode === 'buy' ? 'Sa para doni të jepni?' : 'Sa para doni të merrni?'}
            </p>
          </div>
        </div>

        {/* Exchange direction indicator */}
        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl mb-6 text-sm flex-wrap">
          {mode === 'buy' ? (
            <span className="text-slate-600">
              <span className="font-semibold text-emerald-600">Para</span>
              <ArrowRight className="w-3.5 h-3.5 inline mx-1.5 text-slate-400" />
              <span className="font-semibold text-sky-600">Kripto</span>
              <span className="text-slate-400 ml-2">— jepni para, merrni kripto</span>
            </span>
          ) : (
            <span className="text-slate-600">
              <span className="font-semibold text-sky-600">Kripto</span>
              <ArrowRight className="w-3.5 h-3.5 inline mx-1.5 text-slate-400" />
              <span className="font-semibold text-emerald-600">Para</span>
              <span className="text-slate-400 ml-2">— jepni kripto, merrni para</span>
            </span>
          )}
        </div>

        {/* Crypto selector */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            Zgjidh Kriptomonedhën
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {CRYPTOS.map((crypto) => (
              <button
                key={crypto.symbol}
                onClick={() => setSelectedCrypto(crypto.symbol)}
                className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-200 ${
                  selectedCrypto === crypto.symbol
                    ? 'border-sky-500 bg-sky-50 scale-105'
                    : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span
                  className="text-lg font-bold mb-0.5"
                  style={{ color: crypto.color }}
                >
                  {crypto.icon}
                </span>
                <span className="text-[10px] font-semibold text-slate-600">
                  {crypto.symbol}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Cash input */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {mode === 'buy' ? 'Shuma që jepni (EUR)' : 'Shuma që doni të merrni (EUR)'}
          </label>
          <div className="relative">
            <input
              type="number"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              min="0"
              step="10"
              placeholder="0"
              className={`w-full px-5 py-4 text-2xl font-bold bg-slate-50 border-2 rounded-2xl focus:outline-none transition-all ${
                belowMinimum
                  ? 'border-red-300 focus:border-red-400'
                  : 'border-slate-100 focus:border-sky-500 focus:bg-white'
              }`}
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">
              €
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-2 flex-1">
              {[50, 100, 500, 1000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setCashAmount(String(preset))}
                  className="flex-1 py-2 text-xs sm:text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  €{preset}
                </button>
              ))}
            </div>
          </div>
          {belowMinimum && (
            <p className="text-sm text-red-500 mt-2 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              Shuma minimale është €{MIN_AMOUNT}
            </p>
          )}
          {!belowMinimum && (
            <p className="text-xs text-slate-400 mt-2">
              Shuma minimale: €{MIN_AMOUNT}
            </p>
          )}
        </div>

        {/* Price display */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl mb-6">
          <div className="flex items-center gap-2">
            {loading ? (
              <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
            ) : (
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: selectedCryptoInfo?.color }}
              />
            )}
            <span className="text-sm font-medium text-slate-600">
              Çmimi i {selectedCrypto}
            </span>
          </div>
          <div className="text-right">
            {error ? (
              <span className="text-sm text-red-500">{error}</span>
            ) : adjustedPrice ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  {formatEur(adjustedPrice)}
                </span>
                <span
                  className={`flex items-center gap-0.5 text-xs font-semibold ${
                    change24h >= 0 ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {change24h >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {Math.abs(change24h).toFixed(2)}%
                </span>
              </div>
            ) : (
              <span className="text-sm text-slate-400">—</span>
            )}
          </div>
        </div>

        {/* Fee schedule — always available */}
        <details className="mb-6 group">
          <summary className="cursor-pointer text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-2 [&::-webkit-details-marker]:hidden">
            <Info className="w-4 h-4 text-slate-400" />
            Tabela e tarifave
            <ChevronDown className="w-4 h-4 ml-auto text-slate-400 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 text-xs">
            <div>
              <p className="font-bold text-slate-700 mb-1">Blerje (ju bli kripto):</p>
              <p className="text-slate-600">Deri €100: tarifa e fiksuar €6</p>
              <p className="text-slate-600">Mbi €100: 2% e shumës</p>
            </div>
            <div>
              <p className="font-bold text-slate-700 mb-1">Shitje (ju shisni kripto):</p>
              <p className="text-slate-600">Deri €100: tarifa e fiksuar €6</p>
              <p className="text-slate-600">€100 - €1,500: 5%</p>
              <p className="text-slate-600">€1,500 - €4,000: 4%</p>
              <p className="text-slate-600">Mbi €4,000: 2.5%</p>
            </div>
          </div>
        </details>

        {/* Fee mode toggle */}
        {cash > 0 && adjustedPrice && !belowMinimum && (
          <div className="mb-6 animate-fade-up">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              {mode === 'buy' ? 'Si dëshironi të paguani tarifën?' : 'Si dëshironi të merrni tarifën?'}
            </label>
            <div className="flex p-1.5 bg-slate-100 rounded-2xl gap-1.5">
              <button
                onClick={() => setFeeMode('included')}
                className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
                  feeMode === 'included'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {mode === 'buy' ? 'Përfshirë në shumë' : 'Përfshirë në shumë'}
              </button>
              <button
                onClick={() => setFeeMode('extra')}
                className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
                  feeMode === 'extra'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {mode === 'buy' ? 'Shtuar mbi shumë' : 'Zbritur nga shuma'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {mode === 'buy'
                ? feeMode === 'included'
                  ? 'Tarifa ndahet nga shuma që keni dhënë. Ju merrni më pak kripto.'
                  : 'Tarifa shtohet mbi shumën. Ju paguani cash + tarifa dhe merrni kripto për të gjithë shumën.'
                : feeMode === 'included'
                  ? 'Tarifa zbritet nga shuma që merrni në dorë. Ju merrni më pak para.'
                  : 'Tarifa shtohet mbi shumën e kriptos. Ju jepni kripto + tarifa dhe merrni shumën e plotë.'}
            </p>
          </div>
        )}

        {/* Results */}
        {cash > 0 && adjustedPrice && !belowMinimum && (
          <div className="space-y-3 animate-fade-up">
            {/* Exchange summary */}
            <div className="p-4 bg-slate-900 rounded-2xl text-white">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2 text-center">
                Shkëmbimi juaj
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <div className="text-center">
                  <p className="text-lg font-bold">
                    {mode === 'buy'
                      ? formatEur(feeMode === 'extra' ? cash + feeAmount : cash)
                      : formatCrypto(cryptoAmount, selectedCrypto)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {mode === 'buy' ? 'jepni para' : 'jepni kripto'}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
                <div className="text-center">
                  <p className="text-lg font-bold gradient-text">
                    {mode === 'buy'
                      ? formatCrypto(cryptoAmount, selectedCrypto)
                      : formatEur(feeMode === 'included' ? cash - feeAmount : cash)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {mode === 'buy' ? 'merrni kripto' : 'merrni para'}
                  </p>
                </div>
              </div>
            </div>

            {/* You give / You get cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* You give */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  {mode === 'buy' ? <Banknote className="w-4 h-4 text-slate-400" /> : <Coins className="w-4 h-4 text-slate-400" />}
                  <p className="text-xs font-semibold text-slate-500">Ju jepni</p>
                </div>
                {mode === 'buy' ? (
                  <>
                    <p className="text-xl font-bold text-slate-900">
                      {formatEur(feeMode === 'extra' ? cash + feeAmount : cash)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">në para (EUR)</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold text-slate-900">
                      {formatCrypto(cryptoAmount, selectedCrypto)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">në kripto</p>
                  </>
                )}
              </div>
              {/* You get */}
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-2 mb-2">
                  {mode === 'buy' ? <Coins className="w-4 h-4 text-emerald-500" /> : <Banknote className="w-4 h-4 text-emerald-500" />}
                  <p className="text-xs font-semibold text-emerald-600">Ju merrni</p>
                </div>
                {mode === 'buy' ? (
                  <>
                    <p className="text-xl font-bold text-slate-900">
                      {formatCrypto(cryptoAmount, selectedCrypto)}
                    </p>
                    <p className="text-xs text-emerald-500 mt-0.5">në kripto</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold text-slate-900">
                      {formatEur(feeMode === 'included' ? cash - feeAmount : cash)}
                    </p>
                    <p className="text-xs text-emerald-500 mt-0.5">në para (EUR)</p>
                  </>
                )}
              </div>
            </div>

            {/* Fee breakdown */}
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-amber-700">
                  Tarifa e shërbimit {feePercentage > 0 ? `(${feePercentage}%)` : '(e fiksuar)'}
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {formatEur(feeAmount)}
                </p>
              </div>
            </div>

            {/* Highlight box */}
            <div className={`p-5 rounded-2xl text-white ${mode === 'buy' ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : 'bg-gradient-to-br from-sky-500 to-blue-500'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white/80">
                  {mode === 'buy' ? 'Ju merrni kripto' : 'Ju merrni para'}
                </span>
                <Wallet className="w-4 h-4 text-white/80" />
              </div>
              {mode === 'buy' ? (
                <>
                  <p className="text-3xl font-bold font-display">
                    {formatCrypto(cryptoAmount, selectedCrypto)}
                  </p>
                  <p className="text-sm text-white/80 mt-1">
                    ≈ {formatEur(netAmount)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold font-display">
                    {formatEur(feeMode === 'included' ? cash - feeAmount : cash)}
                  </p>
                  <p className="text-sm text-white/80 mt-1">
                    për {formatCrypto(cryptoAmount, selectedCrypto)}
                  </p>
                </>
              )}
            </div>

            <button
              onClick={handleReserve}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 group hover:scale-[1.02] active:scale-[0.98]"
            >
              Bëj Rezervim për Takim
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
