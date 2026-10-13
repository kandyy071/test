import { useState, useEffect, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import { supabase } from '../lib/supabase';
import { FeeSettings, DEFAULT_FEE_SETTINGS, fetchFeeSettings } from '../lib/settings';
import {
  SWAP_COINS, MIN_SWAP_EUR, getMinAmountForCoin,
  fetchAllSwapPrices, calculateSwap, formatSwapAmount,
  generateSwapId, getCoinByValue, getCoinLabel, getNetworkLabel,
  validateWalletAddress, getAddressPlaceholder,
  type SwapCoin, type SwapStatus,
  SWAP_STATUS_LABELS, SWAP_STATUS_COLORS,
} from '../lib/swap';
import {
  ArrowRight, ArrowLeft, ArrowDown, RefreshCw, AlertCircle,
  Check, Copy, Loader2, Wallet, Clock, QrCode,
  CheckCircle2, Info, User, Phone,
} from 'lucide-react';

type Step = 'swap' | 'details' | 'confirm' | 'send' | 'complete';

const STEPS: { key: Step; label: string }[] = [
  { key: 'swap', label: 'Shkëmbim' },
  { key: 'details', label: 'Detajet' },
  { key: 'confirm', label: 'Konfirmo' },
  { key: 'send', label: 'Dërgo' },
  { key: 'complete', label: 'U krye' },
];

interface SwapRecord {
  swapId: string;
  sendCoin: SwapCoin;
  receiveCoin: SwapCoin;
  sendAmount: number;
  receiveAmount: number;
  exchangeRate: number;
  customerName: string;
  customerPhone: string;
  receivingAddress: string;
  depositAddress: string;
  depositNetwork: string;
  status: SwapStatus;
}

export default function CryptoSwap() {
  const [step, setStep] = useState<Step>('swap');
  const [sendValue, setSendValue] = useState('USDT_TRC20');
  const [receiveValue, setReceiveValue] = useState('BTC_Bitcoin');
  const [amount, setAmount] = useState('0');
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [priceError, setPriceError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feeSettings, setFeeSettings] = useState<FeeSettings>(DEFAULT_FEE_SETTINGS);

  useEffect(() => {
    fetchFeeSettings().then(setFeeSettings);
  }, []);

  // Details step
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [receivingAddress, setReceivingAddress] = useState('');

  // Confirm step
  const [confirmed, setConfirmed] = useState(false);

  // Send/complete step
  const [swapRecord, setSwapRecord] = useState<SwapRecord | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<SwapStatus>('waiting');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendCoin = getCoinByValue(sendValue)!;
  const receiveCoin = getCoinByValue(receiveValue)!;

  const loadPrices = useCallback(async () => {
    setLoadingPrices(true);
    setPriceError(false);
    try {
      const result = await fetchAllSwapPrices();
      setPrices(result);
    } catch {
      setPriceError(true);
    } finally {
      setLoadingPrices(false);
    }
  }, []);

  useEffect(() => {
    loadPrices();
  }, [loadPrices]);

  const sendPrice = prices[sendCoin.symbol] ?? 0;
  const receivePrice = prices[receiveCoin.symbol] ?? 0;
  const sendAmount = parseFloat(amount) || 0;
  const { receiveAmount, exchangeRate } = calculateSwap(
    sendAmount,
    sendPrice,
    receivePrice,
    feeSettings.swap_exchange_fee_pct,
    feeSettings.swap_coin_fee_pct
  );

  const sameCoin = sendCoin.symbol === receiveCoin.symbol &&
    (sendCoin.symbol !== 'USDT' || sendCoin.network === receiveCoin.network);
  const minAmount = sendPrice > 0 ? getMinAmountForCoin(sendPrice) : 0;
  const belowMinimum = sendAmount > 0 && minAmount > 0 && sendAmount < minAmount;
  const canContinue = minAmount > 0 && sendAmount >= minAmount && !sameCoin && receiveAmount > 0 && !loadingPrices && !priceError;

  const handleSwap = () => {
    setError(null);
    if (sameCoin) {
      setError('Nuk mund të shkëmbeni të njëjtën kriptomonedhë me veten e saj.');
      return;
    }
    if (minAmount > 0 && sendAmount < minAmount) {
      setError(`Shuma minimale është ${formatSwapAmount(minAmount, sendCoin.symbol)} ${sendCoin.symbol} (≈ €${MIN_SWAP_EUR}).`);
      return;
    }
    if (receiveAmount <= 0) {
      setError('Çmimet nuk janë të ngarkuara. Ju lutemi provoni përsëri.');
      return;
    }
    setStep('details');
  };

  const handleDetailsContinue = () => {
    setError(null);
    if (!customerName.trim() || !customerPhone.trim() || !receivingAddress.trim()) {
      setError('Ju lutemi plotësoni të gjitha fushat.');
      return;
    }
    if (!validateWalletAddress(receivingAddress, receiveCoin)) {
      setError(`Adresa e portofolit nuk është e vlefshme për ${getCoinLabel(receiveCoin)}. Kontrolloni rrjetin dhe formatin.`);
      return;
    }
    setStep('confirm');
  };

  const handleConfirmSwap = async () => {
    if (!confirmed) {
      setError('Ju duhet të konfirmoni që adresa dhe rrjeti janë të sakta.');
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const swapId = generateSwapId();

      const { data: inserted, error: insertError } = await supabase
        .from('crypto_swaps')
        .insert({
          swap_id: swapId,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          send_coin: sendCoin.symbol,
          send_network: sendCoin.network,
          send_amount: sendAmount,
          receive_coin: receiveCoin.symbol,
          receive_network: receiveCoin.network,
          receive_amount: receiveAmount,
          exchange_rate: exchangeRate,
          exchange_fee_pct: feeSettings.swap_exchange_fee_pct,
          coin_fee_pct: feeSettings.swap_coin_fee_pct,
          customer_receiving_address: receivingAddress.trim(),
          status: 'waiting',
        })
        .select('id')
        .maybeSingle();

      if (insertError) throw insertError;
      if (!inserted) throw new Error('Shkëmbimi nuk u krijua.');

      // Fetch deposit address from edge function
      let depositAddress = '';
      let depositNetwork = getNetworkLabel(sendCoin);
      try {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/swap-create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            swapId,
            sendCoin: sendCoin.symbol,
            sendNetwork: sendCoin.network,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          depositAddress = data.depositAddress ?? '';
          if (data.depositNetwork) depositNetwork = data.depositNetwork;
        }
      } catch {
        // Non-blocking — swap still stored
      }

      const record: SwapRecord = {
        swapId,
        sendCoin,
        receiveCoin,
        sendAmount,
        receiveAmount,
        exchangeRate,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        receivingAddress: receivingAddress.trim(),
        depositAddress,
        depositNetwork,
        status: 'waiting',
      };
      setSwapRecord(record);
      setCurrentStatus('waiting');

      // Generate QR code
      if (depositAddress) {
        const qr = await QRCode.toDataURL(depositAddress, {
          width: 240,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        setQrDataUrl(qr);
      }

      // Send Telegram notification with full swap invoice
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'swap',
            swapId,
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            sendCoin: sendCoin.symbol,
            sendNetwork: getNetworkLabel(sendCoin),
            sendAmount: formatSwapAmount(sendAmount, sendCoin.symbol),
            receiveCoin: receiveCoin.symbol,
            receiveNetwork: getNetworkLabel(receiveCoin),
            receiveAmount: formatSwapAmount(receiveAmount, receiveCoin.symbol),
            exchangeRate: formatSwapAmount(exchangeRate, receiveCoin.symbol),
            exchangeFeePct: feeSettings.swap_exchange_fee_pct,
            receivingAddress: receivingAddress.trim(),
            depositAddress,
            depositNetwork,
          }),
        });
      } catch {
        // Non-blocking
      }

      setStep('send');

      // Poll for status updates and send Telegram notification on change
      let lastNotifiedStatus = 'waiting';
      pollingRef.current = setInterval(async () => {
        const { data: row } = await supabase
          .from('crypto_swaps')
          .select('status')
          .eq('swap_id', swapId)
          .maybeSingle();
        if (row?.status) {
          setCurrentStatus(row.status as SwapStatus);
          if (row.status !== lastNotifiedStatus) {
            lastNotifiedStatus = row.status;
            try {
              await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-notify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'swap_status',
                  swapId,
                  status: row.status,
                  sendCoin: sendCoin.symbol,
                  sendAmount: formatSwapAmount(sendAmount, sendCoin.symbol),
                  receiveCoin: receiveCoin.symbol,
                  receiveAmount: formatSwapAmount(receiveAmount, receiveCoin.symbol),
                  customerName: customerName.trim(),
                }),
              });
            } catch {
              // Non-blocking
            }
          }
          if (row.status === 'completed' || row.status === 'expired' || row.status === 'cancelled') {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            if (row.status === 'completed') {
              setStep('complete');
            }
          }
        }
      }, 10000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim gjatë krijimit të shkëmbimit.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  const handleCopy = async () => {
    if (!swapRecord?.depositAddress) return;
    try {
      await navigator.clipboard.writeText(swapRecord.depositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleReset = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setStep('swap');
    setCustomerName('');
    setCustomerPhone('');
    setReceivingAddress('');
    setConfirmed(false);
    setSwapRecord(null);
    setQrDataUrl('');
    setError(null);
  };

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  const inputClass = 'w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-sky-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition-all';

  const coinSelectClass = 'w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-sky-500 focus:outline-none transition-all font-semibold cursor-pointer';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
      {/* Header */}
      <div className="p-6 sm:p-8 pb-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Crypto Swap
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Shkëmbeni një kriptomonedhë me një tjetër shpejt dhe sigurt
            </p>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="px-6 sm:px-8 pb-4">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i <= currentStepIndex
                    ? 'bg-gradient-to-br from-sky-500 to-teal-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-400'
                }`}>
                  {i < currentStepIndex ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[10px] mt-1 hidden sm:block ${i <= currentStepIndex ? 'text-slate-700 dark:text-slate-200 font-semibold' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 rounded transition-all ${
                  i < currentStepIndex ? 'bg-sky-500' : 'bg-slate-100 dark:bg-slate-700'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 sm:p-8 pt-2">
        {/* STEP 1: SWAP CALCULATOR */}
        {step === 'swap' && (
          <div className="space-y-5 animate-fade-up">
            {/* Price error banner */}
            {priceError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 rounded-xl text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Çmimet nuk u ngarkuan. Ju lutemi provoni përsëri.
                <button onClick={loadPrices} className="ml-auto font-semibold underline cursor-pointer">Provo</button>
              </div>
            )}

            {/* YOU SEND */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Shuma që jepni ({getCoinLabel(sendCoin)})
              </label>
              <div className="relative">
                <select
                  value={sendValue}
                  onChange={(e) => setSendValue(e.target.value)}
                  className={coinSelectClass}
                >
                  {SWAP_COINS.map((coin) => (
                    <option key={`${coin.symbol}_${coin.network}`} value={`${coin.symbol}_${coin.network}`}>
                      {getCoinLabel(coin)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative mt-3">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="any"
                  placeholder="0"
                  className={`w-full px-5 py-4 text-2xl font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border-2 rounded-2xl focus:outline-none transition-all ${
                    belowMinimum
                      ? 'border-red-300 dark:border-red-800 focus:border-red-400'
                      : 'border-slate-100 dark:border-slate-700 focus:border-sky-500 focus:bg-white dark:focus:bg-slate-800'
                  }`}
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  {sendCoin.symbol}
                </span>
              </div>
              {belowMinimum && (
                <p className="text-sm text-red-500 dark:text-red-400 mt-2 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Shuma minimale: {minAmount > 0 ? formatSwapAmount(minAmount, sendCoin.symbol) : '—'} {sendCoin.symbol} (≈ €{MIN_SWAP_EUR})
                </p>
              )}
            </div>

            {/* Swap direction indicator */}
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center">
                <ArrowDown className="w-5 h-5 text-slate-400" />
              </div>
            </div>

            {/* YOU RECEIVE */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Shuma që merrni ({getCoinLabel(receiveCoin)})
              </label>
              <select
                value={receiveValue}
                onChange={(e) => setReceiveValue(e.target.value)}
                className={coinSelectClass}
              >
                {SWAP_COINS.map((coin) => (
                  <option key={`r-${coin.symbol}_${coin.network}`} value={`${coin.symbol}_${coin.network}`}>
                    {getCoinLabel(coin)}
                  </option>
                ))}
              </select>
              <div className="mt-3 p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Shuma që merrni ({receiveCoin.symbol})</span>
                  {loadingPrices && <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {receiveAmount > 0 ? formatSwapAmount(receiveAmount, receiveCoin.symbol) : '—'}
                  <span className="text-sm font-semibold text-slate-400 ml-2">{receiveCoin.symbol}</span>
                </p>
              </div>
            </div>

            {/* Exchange rate + fee info */}
            {receiveAmount > 0 && !sameCoin && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Kursi i këmbimit</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    1 {sendCoin.symbol} = {exchangeRate > 0 ? formatSwapAmount(exchangeRate, receiveCoin.symbol) : '—'} {receiveCoin.symbol}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Tarifa e shkëmbimit</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">Përfshirë ({feeSettings.swap_exchange_fee_pct}%)</span>
                </div>
              </div>
            )}

            {sameCoin && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-sm text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Zgjidhni dy kriptomonedha të ndryshme.
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 rounded-xl text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleSwap}
              disabled={!canContinue}
              className="w-full py-4 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-bold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              Vazhdo
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STEP 2: CUSTOMER DETAILS */}
        {step === 'details' && (
          <div className="space-y-5 animate-fade-up">
            <button
              onClick={() => setStep('swap')}
              className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kthehu te llogaritësi
            </button>

            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Informacionet e Klientit
            </h3>

            {/* Swap summary */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-center gap-3 flex-wrap text-center">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Shuma që jepni ({sendCoin.symbol})</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatSwapAmount(sendAmount, sendCoin.symbol)} {sendCoin.symbol}
                  </p>
                  <p className="text-[10px] text-slate-400">{getCoinLabel(sendCoin)}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Shuma që merrni ({receiveCoin.symbol})</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatSwapAmount(receiveAmount, receiveCoin.symbol)} {receiveCoin.symbol}
                  </p>
                  <p className="text-[10px] text-slate-400">{getCoinLabel(receiveCoin)}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <User className="w-4 h-4 text-slate-400" />
                Emër Mbiemër *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Emri juaj i plotë"
                className={inputClass}
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <Phone className="w-4 h-4 text-slate-400" />
                Numri i Telefonit *
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+383 4X XXX XXX"
                className={inputClass}
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <Wallet className="w-4 h-4 text-slate-400" />
                Adresa e Portofolit për {getCoinLabel(receiveCoin)} *
              </label>
              <input
                type="text"
                value={receivingAddress}
                onChange={(e) => setReceivingAddress(e.target.value)}
                placeholder={getAddressPlaceholder(receiveCoin)}
                className={inputClass}
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                Rrjeti: <span className="font-semibold text-slate-600 dark:text-slate-300">{getNetworkLabel(receiveCoin)}</span>
              </p>
            </div>

            {/* Network warning */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 rounded-xl">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                Sigurohuni që adresa e marrjes i përket kriptomonedhës dhe rrjetit të zgjedhur.
                Dërgimi në rrjetin e gabuar mund të rezultojë në humbje të përhershme të fondeve.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 rounded-xl text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleDetailsContinue}
              className="w-full py-4 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-bold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              Vazhdo
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STEP 3: REVIEW / CONFIRM */}
        {step === 'confirm' && (
          <div className="space-y-5 animate-fade-up">
            <button
              onClick={() => setStep('details')}
              className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kthehu
            </button>

            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Konfirmoni Shkëmbimin
            </h3>

            {/* Review summary */}
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Shuma që jepni ({sendCoin.symbol})</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatSwapAmount(sendAmount, sendCoin.symbol)} {sendCoin.symbol}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Shuma që merrni ({receiveCoin.symbol})</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatSwapAmount(receiveAmount, receiveCoin.symbol)} {receiveCoin.symbol}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Kursi i këmbimit</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    1 {sendCoin.symbol} = {formatSwapAmount(exchangeRate, receiveCoin.symbol)} {receiveCoin.symbol}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Tarifa</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">Përfshirë</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Adresa e marrjes</span>
                    <span className="font-mono text-xs text-slate-700 dark:text-slate-200 max-w-[180px] truncate">
                      {receivingAddress}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Rrjeti i marrjes</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {getNetworkLabel(receiveCoin)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Emri</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{customerName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Telefoni</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{customerPhone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirmation checkbox */}
            <label className="flex items-start gap-3 p-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded accent-sky-500 cursor-pointer"
              />
              <span className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                Konfirmoj që adresa e portofolit dhe rrjeti i zgjedhur janë të sakta.
              </span>
            </label>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 rounded-xl text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleConfirmSwap}
              disabled={!confirmed || submitting}
              className="w-full py-4 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-bold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Duke krijuar shkëmbimin...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Konfirmo Shkëmbimin
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 4: SEND PAYMENT */}
        {step === 'send' && swapRecord && (
          <div className="space-y-5 animate-fade-up">
            {/* Status badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold ${SWAP_STATUS_COLORS[currentStatus]}`}>
              <Clock className="w-4 h-4" />
              {SWAP_STATUS_LABELS[currentStatus]}
            </div>

            {/* Swap ID */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Swap ID</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{swapRecord.swapId}</span>
            </div>

            {/* Send amount */}
            <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-black dark:to-slate-900 rounded-2xl text-white text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Dërgoni saktësisht</p>
              <p className="text-3xl font-bold font-display">
                {formatSwapAmount(swapRecord.sendAmount, swapRecord.sendCoin.symbol)}
                <span className="text-lg ml-2 text-slate-400">{swapRecord.sendCoin.symbol}</span>
              </p>
              <p className="text-sm text-slate-400 mt-2">{getCoinLabel(swapRecord.sendCoin)}</p>
            </div>

            {/* Network */}
            <div className="p-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 rounded-xl">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Rrjeti</p>
              <p className="text-sm font-bold text-sky-700 dark:text-sky-300">{swapRecord.depositNetwork}</p>
            </div>

            {/* Deposit address */}
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Adresa e depozitimit BlejCryptoRH
              </p>
              {swapRecord.depositAddress ? (
                <>
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-700 break-all">
                    <p className="font-mono text-sm text-slate-900 dark:text-white">
                      {swapRecord.depositAddress}
                    </p>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="w-full mt-3 py-3 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'U kopjua!' : 'Kopjo Adresën'}
                  </button>
                </>
              ) : (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-sm text-amber-700 dark:text-amber-400">
                  Adresa e depozitimit do t'ju dërgohet pas konfirmimit. Ju lutemi na kontaktoni për të marrë adresën.
                </div>
              )}
            </div>

            {/* QR Code */}
            {qrDataUrl && (
              <div className="flex flex-col items-center p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <QrCode className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Skano nga portofoli</span>
                </div>
                <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 rounded-xl" />
              </div>
            )}

            {/* Instructions */}
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 rounded-xl">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed space-y-1">
                  <p>Dërgoni saktësisht shumën e treguar më lart në adresën e dhënë.</p>
                  <p>Shkëmbimi juaj do të procesohet pasi pagesa të detektohet dhe të konfirmohet në blockchain.</p>
                </div>
              </div>
            </div>

            {/* Swap details */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Shuma që jepni ({swapRecord.sendCoin.symbol})</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {formatSwapAmount(swapRecord.sendAmount, swapRecord.sendCoin.symbol)} {swapRecord.sendCoin.symbol}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Shuma që merrni ({swapRecord.receiveCoin.symbol})</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {formatSwapAmount(swapRecord.receiveAmount, swapRecord.receiveCoin.symbol)} {swapRecord.receiveCoin.symbol}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Adresa e marrjes</span>
                <span className="font-mono text-xs text-slate-600 dark:text-slate-300 max-w-[160px] truncate">
                  {swapRecord.receivingAddress}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Statusi</span>
                <span className={`font-bold ${SWAP_STATUS_COLORS[currentStatus].split(' ')[0]}`}>
                  {SWAP_STATUS_LABELS[currentStatus]}
                </span>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold rounded-xl transition-all cursor-pointer"
            >
              Shkëmbim i ri
            </button>
          </div>
        )}

        {/* STEP 5: COMPLETE */}
        {step === 'complete' && swapRecord && (
          <div className="space-y-5 animate-fade-up text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto animate-scale-in">
              <CheckCircle2 className="w-9 h-9 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Shkëmbimi u Krye!
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {formatSwapAmount(swapRecord.receiveAmount, swapRecord.receiveCoin.symbol)} {swapRecord.receiveCoin.symbol}
              {' '}është dërguar në adresën tuaj të marrjes.
            </p>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2 text-sm text-left">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Swap ID</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{swapRecord.swapId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Shuma që dërguat ({swapRecord.sendCoin.symbol})</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {formatSwapAmount(swapRecord.sendAmount, swapRecord.sendCoin.symbol)} {swapRecord.sendCoin.symbol}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Shuma që morët ({swapRecord.receiveCoin.symbol})</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatSwapAmount(swapRecord.receiveAmount, swapRecord.receiveCoin.symbol)} {swapRecord.receiveCoin.symbol}
                </span>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-4 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-bold rounded-2xl transition-all cursor-pointer"
            >
              Bëj Shkëmbim të Ri
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
