import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ChatMessage {
  id: string;
  sender: 'user' | 'support';
  message: string;
  created_at: string;
}

const WELCOME_MESSAGE =
  'Mirëdita! Mirë se erdhet në BlejCryptorh.com. Ju mund të na bëni çdo pyetje rreth shërbimit tonë dhe do t\'ju përgjigjemi sa më shpejt që të jetë e mundur.';

function getSessionId(): string {
  const KEY = 'blejcrypto_chat_session';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(getSessionId);
  const lastPollRef = useRef<string>(new Date().toISOString());
  const knownIdsRef = useRef<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const appendNew = useCallback((incoming: ChatMessage[]) => {
    const fresh = incoming.filter((m) => !knownIdsRef.current.has(m.id));
    if (fresh.length === 0) return;
    fresh.forEach((m) => knownIdsRef.current.add(m.id));
    if (fresh.length > 0) {
      lastPollRef.current = fresh[fresh.length - 1].created_at;
    }
    setMessages((prev) => [...prev, ...fresh]);
  }, []);

  const pollNewMessages = useCallback(async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('id, sender, message, created_at')
      .eq('session_id', sessionId)
      .gt('created_at', lastPollRef.current)
      .order('created_at', { ascending: true });

    if (!data || data.length === 0) return;
    appendNew(data);
  }, [sessionId, appendNew]);

  // Load existing messages on open
  useEffect(() => {
    if (!isOpen) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('id, sender, message, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      const existing = data || [];
      knownIdsRef.current = new Set(existing.map((m) => m.id));
      if (existing.length > 0) {
        lastPollRef.current = existing[existing.length - 1].created_at;
      }
      setMessages([
        { id: 'welcome', sender: 'support', message: WELCOME_MESSAGE, created_at: existing[0]?.created_at || new Date().toISOString() },
        ...existing,
      ]);
    };

    loadMessages();
  }, [isOpen, sessionId]);

  // Poll for new messages
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(pollNewMessages, 3000);
    return () => clearInterval(interval);
  }, [isOpen, pollNewMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);
    setInput('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-send`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, message: trimmed }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }

      // Fetch the message we just sent so it appears immediately
      const { data } = await supabase
        .from('chat_messages')
        .select('id, sender, message, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        appendNew([data]);
      }
    } catch {
      setError('Mesazhi nuk u dërgua. Ju lutemi provoni përsëri.');
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat button - bottom left */}
      {!isOpen && (
        <div className="fixed bottom-5 left-5 z-50 flex items-center gap-3">
          <button
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center group flex-shrink-0"
            aria-label="Hap chat-in e suportit"
          >
            <MessageCircle className="w-6 h-6 text-white" />
            <span className="absolute right-0 top-0 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
          </button>
          <div className="hidden sm:flex items-center px-3.5 py-2.5 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 max-w-[200px] animate-fade-in">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-snug">
              Pyetjet dhe kontakti me Admin-in mund të bëhen vetëm këtu.
            </p>
          </div>
        </div>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-5 left-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm animate-scale-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[28rem] max-h-[70vh] transition-colors duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm leading-none">Suporti BlejCrypto</h3>
                  <p className="text-xs text-white/80 mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-300 rounded-full" />
                    Online
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors p-1"
                aria-label="Mbyll chat-in"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50 dark:bg-slate-900">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-br from-sky-500 to-teal-500 text-white rounded-br-md'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-bl-md shadow-sm'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-end">
                  <div className="bg-sky-100 dark:bg-slate-700 text-slate-400 px-3.5 py-2.5 rounded-2xl rounded-br-md text-sm">
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              )}
              {error && (
                <div className="text-center">
                  <p className="text-xs text-rose-500">{error}</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Shkruani mesazhin tuaj..."
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white dark:focus:bg-slate-700 transition-all disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center hover:shadow-lg hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0"
                  aria-label="Dërgo mesazhin"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
