import { useEffect, useState, useCallback, useRef } from 'react';
import { RefreshCw, Send, MessageCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ChatMessageRow } from './types';

interface SessionSummary {
  sessionId: string;
  lastMessage: string;
  lastSender: ChatMessageRow['sender'];
  lastAt: string;
}

const POLL_MS = 8000;

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      setError('Mesazhet nuk u ngarkuan dot.');
    } else {
      setError(null);
      setMessages((data ?? []) as ChatMessageRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedSession, messages]);

  const sessions: SessionSummary[] = (() => {
    const map = new Map<string, SessionSummary>();
    for (const m of messages) {
      map.set(m.session_id, {
        sessionId: m.session_id,
        lastMessage: m.message,
        lastSender: m.sender,
        lastAt: m.created_at,
      });
    }
    return Array.from(map.values()).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  })();

  useEffect(() => {
    if (!selectedSession && sessions.length > 0) {
      setSelectedSession(sessions[0].sessionId);
    }
  }, [sessions, selectedSession]);

  const thread = selectedSession ? messages.filter((m) => m.session_id === selectedSession) : [];

  const handleSend = async () => {
    const text = reply.trim();
    if (!text || !selectedSession) return;
    setSending(true);
    const { error } = await supabase.from('chat_messages').insert({
      session_id: selectedSession,
      sender: 'support',
      message: text,
    });
    if (!error) {
      setReply('');
      load();
    }
    setSending(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Chat Mbështetjeje</h2>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Rifresko
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {!loading && sessions.length === 0 && !error && (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-10 text-center">Nuk ka ende biseda.</p>
      )}

      {sessions.length > 0 && (
        <div className="grid sm:grid-cols-[260px_1fr] gap-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden" style={{ minHeight: '28rem' }}>
          {/* Session list */}
          <div className="border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-slate-700 max-h-64 sm:max-h-[28rem] overflow-y-auto">
            {sessions.map((s) => (
              <button
                key={s.sessionId}
                onClick={() => setSelectedSession(s.sessionId)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 dark:border-slate-900 transition-colors ${
                  selectedSession === s.sessionId
                    ? 'bg-slate-50 dark:bg-slate-900'
                    : 'hover:bg-slate-50/60 dark:hover:bg-slate-900/60'
                }`}
              >
                <p className="text-xs font-mono text-slate-400 dark:text-slate-500 mb-0.5 truncate">
                  {s.sessionId.slice(0, 8)}…
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 truncate">
                  {s.lastSender === 'support' ? 'Ju: ' : ''}
                  {s.lastMessage}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {new Date(s.lastAt).toLocaleString('sq-AL')}
                </p>
              </button>
            ))}
          </div>

          {/* Thread */}
          <div className="flex flex-col h-[28rem]">
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {thread.map((m) => (
                <div key={m.id} className={`flex ${m.sender === 'support' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${
                      m.sender === 'support'
                        ? 'bg-sky-500 text-white rounded-br-sm'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-sm'
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
              ))}
              <div ref={threadEndRef} />
            </div>

            <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-700 px-3 py-2.5">
              <input
                type="text"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
                placeholder="Shkruaj një përgjigje…"
                className="flex-1 text-sm px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                onClick={handleSend}
                disabled={sending || !reply.trim()}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-40 transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {sessions.length === 0 && loading && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <MessageCircle className="w-5 h-5 mr-2" /> Duke ngarkuar…
        </div>
      )}
    </div>
  );
}
