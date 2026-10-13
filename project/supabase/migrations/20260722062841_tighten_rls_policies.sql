/*
# Tighten RLS policies on app_secrets, appointments, chat_messages

## Problem
Multiple RLS policies used USING (true) / WITH CHECK (true) for DELETE, UPDATE,
and INSERT, allowing unrestricted modification or deletion of rows by any anon
or authenticated user. This bypasses row-level security entirely for those verbs.

## Changes

### app_secrets
- DROP all anon/authenticated policies (SELECT, INSERT, UPDATE, DELETE).
- This table stores Telegram bot tokens and chat IDs — no client should ever
  read or write it. Edge functions access it via the service role key, which
  bypasses RLS, so no policies are needed.

### appointments
- Keep SELECT (public, no-auth booking app — visitors view confirmations).
- Keep INSERT but restrict WITH CHECK to status = 'pending' so anon can only
  create new pending bookings, not arbitrary rows.
- DROP UPDATE and DELETE policies for anon/authenticated. Only the service
  role (owner dashboard) can modify or delete appointments.

### chat_messages
- Keep SELECT (visitors poll for new messages in their session).
- DROP INSERT, UPDATE, DELETE policies for anon/authenticated. All writes are
  performed by edge functions (chat-send, chat-webhook) using the service role
  key, which bypasses RLS, so no client-side write policies are needed.

## Security Impact
- app_secrets is now fully locked down from client access.
- appointments can no longer be modified or deleted by visitors.
- chat_messages can no longer be inserted, modified, or deleted by visitors
  directly — only through authenticated edge functions.
*/

-- app_secrets: drop all client access
DROP POLICY IF EXISTS "anon_read_secrets" ON app_secrets;
DROP POLICY IF EXISTS "anon_insert_secrets" ON app_secrets;
DROP POLICY IF EXISTS "anon_update_secrets" ON app_secrets;
DROP POLICY IF EXISTS "anon_delete_secrets" ON app_secrets;

-- appointments: keep SELECT + restricted INSERT, drop UPDATE/DELETE
DROP POLICY IF EXISTS "anon_update_appointments" ON appointments;
DROP POLICY IF EXISTS "anon_delete_appointments" ON appointments;

DROP POLICY IF EXISTS "anon_insert_appointments" ON appointments;
CREATE POLICY "anon_insert_appointments" ON appointments FOR INSERT
  TO anon, authenticated WITH CHECK (status = 'pending');

-- chat_messages: keep SELECT only, drop INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "anon_insert_chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "anon_update_chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "anon_delete_chat_messages" ON chat_messages;
