import { ReactNode } from 'react';
import { Wallet, LogOut, Calendar, RefreshCw, MessageCircle, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';

export type AdminTab = 'appointments' | 'swaps' | 'chat' | 'settings';

const TABS: { id: AdminTab; label: string; icon: typeof Calendar }[] = [
  { id: 'appointments', label: 'Rezervimet', icon: Calendar },
  { id: 'swaps', label: 'Swaps', icon: RefreshCw },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'settings', label: 'Tarifat', icon: Settings },
];

interface AdminLayoutProps {
  active: AdminTab;
  onChangeTab: (tab: AdminTab) => void;
  userEmail: string | undefined;
  children: ReactNode;
}

export default function AdminLayout({ active, onChangeTab, userEmail, children }: AdminLayoutProps) {
  const handleLogout = () => {
    supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-sm text-slate-900 dark:text-white leading-none truncate">
                BlejCryptorh Admin
              </h1>
              {userEmail && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{userEmail}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg transition-colors flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            Dil
          </button>
        </div>

        <nav className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-sky-500 text-slate-900 dark:text-white'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
