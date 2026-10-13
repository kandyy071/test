import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: 'Si funksionon shkëmbimi?',
    a: 'Rezervoni një takim përmes kësaj faqeje. Ne ju kontaktojmë për të konfirmuar orën dhe vendin e takimit në Rahovec. Takohemi në person, ju sillni paratë ose kripton, dhe bëjmë shkëmbimin ballë për ballë.',
  },
  {
    q: 'Çfarë kriptomonedhash ofroni?',
    a: 'Ne ofrojmë 6 kriptomonedha: USDT (Tether ose TRC20), USDT (BNB ose BEP20), Bitcoin (BTC), Ethereum (ETH), Litecoin (LTC), Solana (SOL) dhe XRP (Ripple). Zgjidhni njërën në llogaritës për të parë çmimin aktual.',
  },
  {
    q: 'A kam nevojë për llogari?',
    a: 'Jo. Nuk keni nevojë për asnjë llogari online. Thjesht rezervoni një takim, takohemi në person dhe bëjmë shkëmbimin drejt e (crypto - euro) ose (euro - crypto).',
  },
  {
    q: 'Sa është tarifa?',
    a: 'Tarifa varet nga shuma dhe lloji i transaksionit. Për blerje: tarifa është €6 e fiksuar deri €100, pastaj 5% (€100-€1,500), 4.5% (€1,500-€4,000) dhe 4% mbi €4,000. Për shitje: €6 e fiksuar deri €100, pastaj 5% (€100-€1,500), 4% (€1,500-€4,000) dhe 2.5% mbi €4,000. Sa më e madhe shuma, aq më e ulët tarifa.',
  },
  {
    q: 'A janë transaksionet e sigurta?',
    a: 'Po. Të gjitha transaksionet bëhen në person në një vend publik në Rahovec. Çdo shkëmbim kryhet në prani të të dyja palëve dhe ju mund të verifikoni transaksionin në blockchain para se të ndahemi.',
  },
  {
    q: 'Sa shpejt bëhet shkëmbimi?',
    a: 'Vetë shkëmbimi zgjat disa minuta. Pas rezervimit, ne ju kontaktojmë për të konfirmuar takimin, zakonisht brenda të njëjtës ditë.',
  },
  {
    q: 'Çfarë duhet të sjell në takim?',
    a: 'Për blerje: sillni shumën e parave në euro që keni llogaritur. Për shitje: sillni kriptomonedhën në telefonin ose portofolin tuaj digital. Ne verifikojmë transaksionin bashkë në vend.',
  },
  {
    q: 'A mund të zgjedh vendin e takimit?',
    a: 'Po. Mund të zgjidhni një nga vendet e ofruara në formularin e rezervimit ose mund të na shkruani për të zgjedhur një vend bashkërisht. Takimi bëhet gjithmonë në një vend publik.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
          Pyetjet më të Shpeshta
        </h2>
        <p className="text-slate-500">
          Gjeni përgjigje për pyetjet më të zakonshme rreth shërbimit tonë.
        </p>
      </div>

      <div className="space-y-3">
        {FAQS.map((faq, i) => (
          <div
            key={i}
            className={`bg-white rounded-2xl border transition-all overflow-hidden ${
              openIndex === i ? 'border-sky-200 shadow-md' : 'border-slate-100'
            }`}
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between p-5 text-left"
            >
              <span className="font-semibold text-slate-900 pr-4">{faq.q}</span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                  openIndex === i ? 'rotate-180' : ''
                }`}
              />
            </button>
            <div
              className={`grid transition-all duration-300 ${
                openIndex === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
