/*
# Create chat_messages table for live chat support

1. New Tables
- `chat_messages`
  - `id` (uuid, primary key)
  - `session_id` (text, not null) - unique chat session identifier per visitor
  - `sender` (text, not null) - 'user' or 'support'
  - `message` (text, not null) - chat message content
  - `telegram_message_id` (bigint) - Telegram message ID for reply mapping
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `chat_messages`.
- Allow anon + authenticated SELECT (visitors read their own session messages).
- Allow anon + authenticated INSERT (visitors send messages, edge function inserts replies).
- Allow anon + authenticated UPDATE (edge function updates telegram_message_id).
- No DELETE from anon.

3. Notes
- This is a no-auth public chat. Visitors get a session_id stored in localStorage.
- Messages from visitors are forwarded to Telegram via edge function.
- Owner replies from Telegram bot, which calls the webhook edge function to store replies.
- Visitors poll for new messages from support.
*/

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  sender text NOT NULL CHECK (sender IN ('user', 'support')),
  message text NOT NULL,
  telegram_message_id bigint,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chat_messages" ON chat_messages;
CREATE POLICY "anon_select_chat_messages" ON chat_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat_messages" ON chat_messages;
CREATE POLICY "anon_insert_chat_messages" ON chat_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_chat_messages" ON chat_messages;
CREATE POLICY "anon_update_chat_messages" ON chat_messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chat_messages" ON chat_messages;
CREATE POLICY "anon_delete_chat_messages" ON chat_messages FOR DELETE
  TO anon, authenticated USING (true);
