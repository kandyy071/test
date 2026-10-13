import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import AdminLogin from './AdminLogin';
import AdminLayout, { type AdminTab } from './AdminLayout';
import AppointmentsPanel from './AppointmentsPanel';
import SwapsPanel from './SwapsPanel';
import ChatPanel from './ChatPanel';
import SettingsPanel from './SettingsPanel';

export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [tab, setTab] = useState<AdminTab>('appointments');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AdminLogin />;
  }

  return (
    <AdminLayout active={tab} onChangeTab={setTab} userEmail={session.user.email}>
      {tab === 'appointments' && <AppointmentsPanel />}
      {tab === 'swaps' && <SwapsPanel />}
      {tab === 'chat' && <ChatPanel />}
      {tab === 'settings' && <SettingsPanel />}
    </AdminLayout>
  );
}
