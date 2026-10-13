import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatEur, formatCrypto } from '../lib/crypto';
import type { ReservationData } from './Calculator';
import { ArrowLeft, Check, Calendar, Clock, User, Phone, MapPin, Loader2, AlertCircle, Instagram, Coins, Banknote, ArrowRight } from 'lucide-react';

interface BookingFormProps {
  data: ReservationData;
  onBack: () => void;
  onComplete: (appointmentId: string, details: BookingDetails) => void;
}

export interface BookingDetails {
  name: string;
  phone: string;
  socialHandle: string;
  date: string;
  timeSlot: string;
  location: string;
}

const TIME_SLOTS = [
  '07:00 - 10:00',
  '10:00 - 13:00',
  '13:00 - 16:00',
  '16:00 - 19:00',
  '19:00 - 22:00',
  '22:00 - 01:00',
];

const LOCATIONS = [
  'Zona te SHESHI',
  'Semaforat ne qytet',
  'Stacioni i Autobusëve',
  'Zgjidh vendin bashkërisht',
];

export default function BookingForm({ data, onBack, onComplete }: BookingFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [socialHandle, setSocialHandle] = useState('');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !socialHandle.trim() || !date || !timeSlot) {
      setError('Ju lutemi plotësoni të gjitha fushat e detyrueshme');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { data: inserted, error: insertError } = await supabase
        .from('appointments')
        .insert({
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          social_handle: socialHandle.trim(),
          crypto_type: data.cryptoType,
          mode: data.mode,
          fee_mode: data.feeMode,
          cash_amount_eur: data.cashAmount,
          crypto_amount: data.cryptoAmount,
          fee_percentage: data.feePercentage,
          fee_amount_eur: data.feeAmountEur,
          net_amount_eur: data.netAmountEur,
          crypto_price_eur: data.cryptoPriceEur,
          preferred_date: date,
          preferred_time: timeSlot,
          meeting_location: location,
          notes: notes.trim() || null,
          status: 'pending',
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      if (!inserted) throw new Error('Rezervimi nuk u krijua');

      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: inserted.id,
            name: name.trim(),
            phone: phone.trim(),
            socialHandle: socialHandle.trim(),
            mode: data.mode,
            feeMode: data.feeMode,
            cryptoType: data.cryptoType,
            cashAmount: data.cashAmount,
            cryptoAmount: data.cryptoAmount,
            feeAmount: data.feeAmountEur,
            netAmount: data.netAmountEur,
            date,
            timeSlot,
            location,
            notes: notes.trim(),
          }),
        });
      } catch {
        // Telegram notification failure should not block the booking
      }

      onComplete(inserted.id, {
        name: name.trim(),
        phone: phone.trim(),
        socialHandle: socialHandle.trim(),
        date,
        timeSlot,
        location,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim gjatë rezervimit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-scale-in">
      <div className="p-6 sm:p-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Kthehu te llogaritësi
        </button>

        <h2 className="font-display text-2xl font-bold text-slate-900 mb-2">
          Rezervo Takimin
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Plotësoni të dhënat tuaja dhe ne do t'ju kontaktojmë për konfirmimin.
        </p>

        {/* Summary — clear buy/sell direction */}
        <div className={`p-4 rounded-2xl border mb-6 ${data.mode === 'buy' ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100' : 'bg-gradient-to-br from-sky-50 to-blue-50 border-sky-100'}`}>
          <div className="flex items-center gap-2 mb-3">
            {data.mode === 'buy' ? <Coins className="w-4 h-4 text-emerald-600" /> : <Banknote className="w-4 h-4 text-sky-600" />}
            <span className="text-sm font-bold text-slate-900">
              {data.mode === 'buy' ? 'Blerje' : 'Shitje'} — {data.cryptoType}
            </span>
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap text-center">
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Ju jepni</p>
              <p className="text-sm font-bold text-slate-900">
                {data.mode === 'buy'
                  ? formatEur(data.feeMode === 'extra' ? data.cashAmount + data.feeAmountEur : data.cashAmount)
                  : formatCrypto(data.cryptoAmount, data.cryptoType)}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Ju merrni</p>
              <p className="text-sm font-bold text-slate-900">
                {data.mode === 'buy'
                  ? formatCrypto(data.cryptoAmount, data.cryptoType)
                  : formatEur(data.feeMode === 'included' ? data.cashAmount - data.feeAmountEur : data.cashAmount)}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-slate-200/60">
            <span className="text-slate-500">Tarifa e shërbimit</span>
            <span className="font-semibold text-amber-600">{formatEur(data.feeAmountEur)}</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-slate-500">Çmimi i {data.cryptoType}</span>
            <span className="font-semibold text-slate-600">{formatEur(data.cryptoPriceEur)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-2">
              <User className="w-4 h-4 text-slate-400" />
              Emër Mbiemër *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Emri juaj i plotë"
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-sky-500 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-2">
              <Phone className="w-4 h-4 text-slate-400" />
              Numri i Telefonit *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+383 4X XXX XXX"
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-sky-500 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-2">
              <Instagram className="w-4 h-4 text-slate-400" />
              Instagram ose Facebook *
            </label>
            <input
              type="text"
              value={socialHandle}
              onChange={(e) => setSocialHandle(e.target.value)}
              placeholder="@përdoruesi_yt"
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-sky-500 focus:bg-white focus:outline-none transition-all"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              Na tregoni Instagram-in ose Facebook-un tuaj për t'ju kontaktuar.
            </p>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Data e preferuar *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={today}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-sky-500 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Ora e preferuar *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTimeSlot(slot)}
                  className={`py-2.5 px-2 text-xs sm:text-sm font-semibold rounded-xl border-2 transition-all ${
                    timeSlot === slot
                      ? 'border-sky-500 bg-sky-50 text-sky-700'
                      : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              Vendi i takimit
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-sky-500 focus:bg-white focus:outline-none transition-all"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">
              Shënime shtesë (opsionale)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Çdo detaj që doni të na tregoni..."
              rows={2}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-sky-500 focus:bg-white focus:outline-none transition-all resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-bold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Duke rezervuar...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Konfirmo Rezervimin
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
