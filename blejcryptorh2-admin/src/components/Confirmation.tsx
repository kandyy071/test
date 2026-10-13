import { formatEur, formatCrypto } from '../lib/crypto';
import type { ReservationData } from './Calculator';
import { CheckCircle2, Calendar, Clock, MapPin, Phone, ArrowRight, Bell, Instagram, ArrowLeft, Coins, Banknote } from 'lucide-react';

interface ConfirmationProps {
  appointmentId: string;
  data: ReservationData;
  details: {
    name: string;
    phone: string;
    socialHandle: string;
    date: string;
    timeSlot: string;
    location: string;
  };
  onBack: () => void;
  onNewBooking: () => void;
}

export default function Confirmation({ appointmentId, data, details, onBack, onNewBooking }: ConfirmationProps) {
  const formattedDate = new Date(details.date).toLocaleDateString('sq-AL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-100 dark:border-slate-700 overflow-hidden animate-scale-in transition-colors duration-300">
      {/* Back button */}
      <div className="p-6 sm:p-8 pb-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kthehu
        </button>
      </div>

      <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-8 text-center text-white">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h2 className="font-display text-2xl font-bold mb-2">Rezervimi u Krye!</h2>
        <p className="text-emerald-50 text-sm">
          Takimi juaj është regjistruar. Do t'ju kontaktojmë së shpejti.
        </p>
      </div>

      <div className="p-6 sm:p-8">
        {/* Notification banner */}
        <div className="flex items-start gap-3 p-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 rounded-2xl mb-6">
          <Bell className="w-5 h-5 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Çfarë ndodh tjetër?
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Do t'ju dërgojmë një mesazh në telefonin <span className="font-semibold">{details.phone}</span> për të konfirmuar
              takimin dhe për t'ju treguar vendin e saktë të takimit në <span className="font-semibold">{formattedDate}</span> rreth orës <span className="font-semibold">{details.timeSlot}</span>.
            </p>
          </div>
        </div>

        {/* Appointment details */}
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Detajet e Takimit
          </h3>

          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
            <Calendar className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Data</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white capitalize">{formattedDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
            <Clock className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ora</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{details.timeSlot}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
            <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Vendi</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{details.location}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
            <Phone className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Telefoni</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{details.phone}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
            <Instagram className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Instagram / Facebook</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{details.socialHandle}</p>
            </div>
          </div>
        </div>

        {/* Exchange summary — clear give/get direction */}
        <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-black dark:to-slate-900 rounded-2xl text-white mb-6">
          <div className="flex items-center gap-2 mb-4">
            {data.mode === 'buy' ? <Coins className="w-4 h-4 text-emerald-400" /> : <Banknote className="w-4 h-4 text-sky-400" />}
            <p className="text-xs text-slate-400 uppercase tracking-wide">
              {data.mode === 'buy' ? 'Blerje' : 'Shitje'} {data.cryptoType}
            </p>
          </div>
          <div className="flex items-center justify-center gap-4 flex-wrap text-center">
            <div>
              <p className="text-xs text-slate-400 mb-1">Ju jepni</p>
              <p className="text-lg font-bold font-display">
                {data.mode === 'buy'
                  ? formatEur(data.feeMode === 'extra' ? data.cashAmount + data.feeAmountEur : data.cashAmount)
                  : formatCrypto(data.cryptoAmount, data.cryptoType)}
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-500" />
            <div>
              <p className="text-xs text-slate-400 mb-1">Ju merrni</p>
              <p className="text-lg font-bold font-display gradient-text">
                {data.mode === 'buy'
                  ? formatCrypto(data.cryptoAmount, data.cryptoType)
                  : formatEur(data.feeMode === 'included' ? data.cashAmount - data.feeAmountEur : data.cashAmount)}
              </p>
            </div>
          </div>
          <div className="flex justify-between text-xs text-slate-400 pt-4 mt-4 border-t border-slate-700">
            <span>Tarifa e shërbimit</span>
            <span className="text-amber-400">{formatEur(data.feeAmountEur)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>Çmimi i {data.cryptoType}</span>
            <span>{formatEur(data.cryptoPriceEur)}</span>
          </div>
        </div>

        <div className="text-center mb-6">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Numri i rezervimit: <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">{appointmentId.slice(0, 8).toUpperCase()}</span>
          </p>
        </div>

        <button
          onClick={onNewBooking}
          className="w-full py-4 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-2xl transition-all"
        >
          Bëj Rezervim të Ri
        </button>
      </div>
    </div>
  );
}
