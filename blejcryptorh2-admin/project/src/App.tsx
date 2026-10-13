import { useState } from 'react';
import Calculator, { type ReservationData } from './components/Calculator';
import BookingForm from './components/BookingForm';
import Confirmation from './components/Confirmation';
import PriceTicker from './components/PriceTicker';
import FAQ from './components/FAQ';
import ChatWidget from './components/ChatWidget';
import {
  Shield, Zap, Handshake, Lock, TrendingUp, Wallet,
  MapPin, Mail, Clock, Eye, BadgeCheck, AlertCircle, Coins, Banknote,
} from 'lucide-react';

type Step = 'calculator' | 'booking' | 'confirmation';

interface BookingDetails {
  name: string;
  phone: string;
  socialHandle: string;
  date: string;
  timeSlot: string;
  location: string;
}

export default function App() {
  const [step, setStep] = useState<Step>('calculator');
  const [reservationData, setReservationData] = useState<ReservationData | null>(null);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [appointmentId, setAppointmentId] = useState<string>('');

  const handleReserve = (data: ReservationData) => {
    setReservationData(data);
    setStep('booking');
  };

  const handleBookingComplete = (id: string, details: BookingDetails) => {
    setAppointmentId(id);
    setBookingDetails(details);
    setStep('confirmation');
  };

  const handleNewBooking = () => {
    setStep('calculator');
    setReservationData(null);
    setBookingDetails(null);
    setAppointmentId('');
  };

  const handleNavClick = (sectionId: string) => {
    if (step !== 'calculator') {
      setStep('calculator');
      setReservationData(null);
      setBookingDetails(null);
      setAppointmentId('');
    }
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  return (
    <div className="min-h-screen bg-slate-50 grid-pattern">
      {/* Price ticker */}
      <PriceTicker />

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => handleNavClick('calculator')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h1 className="font-display font-bold text-lg text-slate-900 leading-none">
                BlejCryptorh.com
              </h1>
              <p className="text-[10px] text-slate-500 mt-0.5">Crypto për para në dorë</p>
            </div>
          </button>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button onClick={() => handleNavClick('calculator')} className="hover:text-slate-900 transition-colors cursor-pointer">Llogaritësi</button>
            <button onClick={() => handleNavClick('offers')} className="hover:text-slate-900 transition-colors cursor-pointer">Shërbimet</button>
            <button onClick={() => handleNavClick('trust')} className="hover:text-slate-900 transition-colors cursor-pointer">Besimi</button>
            <button onClick={() => handleNavClick('faq')} className="hover:text-slate-900 transition-colors cursor-pointer">FAQ</button>
            <button onClick={() => handleNavClick('contact')} className="hover:text-slate-900 transition-colors cursor-pointer">Kontakt</button>
          </nav>
          <button
            onClick={() => handleNavClick('calculator')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Fillo Tani
          </button>
        </div>
      </header>

      {/* Hero */}
      {step === 'calculator' && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-600 mb-6 animate-fade-in">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Shkëmbim i shpejtë dhe i sigurt në person në Rahovec
          </div>
          <h2 className="font-display text-4xl sm:text-6xl font-bold text-slate-900 mb-4 leading-tight animate-fade-up">
            Shkëmbeni <span className="gradient-text">kriptomonedha</span>
            <br />
            për para në dorë
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Llogaritni tarifat, shihni saktësisht sa para jepni dhe sa kripto merrni —
            ose anasjelltas — dhe rezervoni një takim për të bërë shkëmbimin ballë për ballë.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto mb-4 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            {[
              { value: '6', label: 'Kriptomonedha' },
              { value: '3-5%', label: 'Tarifa transparente' },
              { value: '+100', label: 'Transaksione te kryera' },
              { value: '100%', label: 'Në person, të sigurt' },
            ].map((stat) => (
              <div key={stat.label} className="p-4 bg-white rounded-2xl border border-slate-100">
                <p className="font-display text-2xl sm:text-3xl font-bold gradient-text">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main content */}
      <main id="calculator" className="max-w-2xl mx-auto px-4 sm:px-6 pb-20 scroll-mt-20">
        {step === 'calculator' && <Calculator onReserve={handleReserve} />}

        {step === 'booking' && reservationData && (
          <BookingForm
            data={reservationData}
            onBack={() => setStep('calculator')}
            onComplete={(id, details) => handleBookingComplete(id, details)}
          />
        )}

        {step === 'confirmation' && reservationData && bookingDetails && (
          <Confirmation
            appointmentId={appointmentId}
            data={reservationData}
            details={bookingDetails}
            onBack={handleNewBooking}
            onNewBooking={handleNewBooking}
          />
        )}
      </main>

      {/* Features / Offers */}
      {step === 'calculator' && (
        <section id="offers" className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 scroll-mt-20">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
              Pse të na zgjidhni?
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Ne jemi porta juaj lokale drejt botës së kriptomonedhave në Rahovec. Filloni udhëtimin tuaj sot!
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: Shield,
                title: 'Të sigurt',
                desc: 'Shkëmbim ballë për ballë pa rrezik. Çdo transaksion bëhet në prani të të dyja palëve.',
              },
              {
                icon: Handshake,
                title: 'Në person',
                desc: 'Takohemi në një vend publik në Rahovec të zgjedhur bashkërisht. Asgjë nuk bëhet online.',
              },
              {
                icon: TrendingUp,
                title: 'Tarifa të ulëta',
                desc: 'Tarifa të qarta pa kosto të fshehura. Blerje dhe Shitje nga 3-5%.',
              },
              {
                icon: Zap,
                title: 'I shpejtë',
                desc: 'Rezervoni në minuta, takohemi të njëjtën ditë. Pa pritje të gjata.',
              },
              {
                icon: Lock,
                title: 'Privat',
                desc: 'Të dhënat tuaja mbrohen dhe nuk ndahen me askënd. Privatësia juaj është prioritet.',
              },
              {
                icon: Wallet,
                title: '6 Kripto',
                desc: 'USDT, BTC, ETH, LTC, SOL, XRP. Zgjidhni atë që ju përshtatet.',
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className="p-6 bg-white rounded-2xl border border-slate-100 hover:shadow-lg hover:border-slate-200 transition-all duration-300 animate-fade-up"
                style={{ animationDelay: `${0.1 + i * 0.05}s` }}
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-50 to-teal-50 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-sky-600" />
                </div>
                <h3 className="font-display font-bold text-lg text-slate-900 mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div className="mt-12 p-8 bg-white rounded-3xl border border-slate-100">
            <h3 className="font-display text-2xl font-bold text-slate-900 mb-6 text-center">
              Si funksionon?
            </h3>
            <div className="grid sm:grid-cols-4 gap-6">
              {[
                { num: '1', title: 'Llogarit', desc: 'Zgjidh kripton dhe shumën e parave' },
                { num: '2', title: 'Rezervo', desc: 'Plotëso formularin me të dhënat e tua' },
                { num: '3', title: 'Konfirmo', desc: 'Të kontaktojmë për vendin dhe orën' },
                { num: '4', title: 'Shkëmbe', desc: 'Takohemi dhe bëjmë shkëmbimin' },
              ].map((item) => (
                <div key={item.num} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-white font-bold text-lg flex items-center justify-center mx-auto mb-3">
                    {item.num}
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">{item.title}</h4>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trust & Safety */}
      {step === 'calculator' && (
        <section id="trust" className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 scroll-mt-20">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
              Besimi dhe Siguria
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Çdo shkëmbim bëhet ballë për ballë në Rahovec. Asgjë nuk bëhet online.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                icon: Eye,
                title: 'Transaksion i Hapur',
                desc: 'Shihni çmimin dhe tarifat para se të takohemi. Asgjë e fshehur.',
              },
              {
                icon: Handshake,
                title: 'Në Person',
                desc: 'Takohemi në një vend publik në Rahovec. Verifikojmë transaksionin bashkë.',
              },
              {
                icon: Lock,
                title: 'Privatësi',
                desc: 'Të dhënat tuaja mbrohen dhe nuk ndahen me të tretë.',
              },
              {
                icon: BadgeCheck,
                title: 'Verifikim në Vend',
                desc: 'Konfirmoni çdo transaksion në blockchain para se të ndahemi.',
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className="p-6 bg-white rounded-2xl border border-slate-100 hover:shadow-lg transition-all duration-300 animate-fade-up"
                style={{ animationDelay: `${0.1 + i * 0.05}s` }}
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-50 to-teal-50 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-sky-600" />
                </div>
                <h3 className="font-display font-bold text-base text-slate-900 mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Rahovec SEO content */}
          <div className="p-8 bg-white rounded-3xl border border-slate-100">
            <h3 className="font-display text-xl font-bold text-slate-900 mb-3">
              Shkëmbim Kriptomonedhash në Rahovec
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              BlejCryptorh.com është shërbimi i parë i shkëmbimit të kriptomonedhave në Rahovec që
              funksionon ekskluzivisht në person. Nëse jetoni në Rahovec ose zonat përreth — dhe doni të blini ose shisni USDT, Bitcoin, Ethereum, Litecoin, Solana ose XRP për para në dorë, jemi këtu për t'ju ndihmuar.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Pa llogari online, pa transfer bankar, pa pritje. Thjesht rezervoni një takim përmes
              faqes, takohemi në një vend publik në Rahovec, dhe bëjmë shkëmbimin ballë për ballë.
              Çmimet tona janë live dhe të lidhura direkt me tregun global.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Shërbejmë klientë në të gjithë rajonin e Rahovecit. Kontaktoni sot për të rezervuar
              takimin tuaj.
            </p>
          </div>
        </section>
      )}

      {/* FAQ */}
      {step === 'calculator' && (
        <section id="faq" className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 scroll-mt-20">
          <FAQ />
        </section>
      )}

      {/* Footer */}
      <footer id="contact" className="bg-slate-900 text-slate-300 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid sm:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-display font-bold text-lg text-white">BlejCryptorh.com</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Shkëmbimi i parë fizik i kriptomonedhave në Rahovec. Bli dhe shit crypto për para në dorë.
              </p>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-white mb-4">Na Kontaktoni</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                  <span>Rahovec, Kosovë</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  <span>blejcryptorh@boxfi.uk</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  <div>
                    <span className="block text-slate-300">E Hënë - E Diel</span>
                    <span className="text-slate-500">24 / 7 me rezervim paraprak</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Service area */}
            <div>
              <h4 className="font-semibold text-white mb-4">Zona e Shërbimit</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>Rahovec dhe zonat përreth</li>
                <li>Me rezervim paraprak kudo në Rahovec</li>
              </ul>
            </div>
          </div>

          {/* Risk warning */}
          <div className="p-4 bg-slate-800/50 rounded-2xl mb-6 border border-slate-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-300 mb-1">Paralajmërim rreziqesh</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Kriptomonedhat janë investime me rrezik. Çmimi mund të rritë ose të bjerë ndjeshëm.
                  Shkëmbimi bëhet në person dhe BlejCryptorh.com nuk mban përgjegjësi për ndryshimet
                  e çmimit pas transaksionit. Bëni shkëmbime vetëm me shuma që mund t'i lejoni.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Lock className="w-4 h-4" />
              Të gjitha shkëmbimet bëhen në person dhe në mënyrë të sigurt
            </div>
            <p className="text-sm text-slate-500">
              © 2026 BlejCryptorh.com — Rahovec, Kosovë
            </p>
          </div>
        </div>
      </footer>
      <ChatWidget />
    </div>
  );
}
