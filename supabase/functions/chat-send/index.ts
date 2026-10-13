import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { sessionId, message } = await req.json();

    if (!sessionId || !message) {
      return new Response(
        JSON.stringify({ error: "sessionId and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Supabase credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch Telegram credentials from app_secrets
    const secretsRes = await fetch(`${supabaseUrl}/rest/v1/app_secrets?select=key,value`, {
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
    });

    if (!secretsRes.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const secrets: Array<{ key: string; value: string }> = await secretsRes.json();
    const botToken = secrets.find((s) => s.key === "TELEGRAM_BOT_TOKEN")?.value;
    const chatId = secrets.find((s) => s.key === "TELEGRAM_CHAT_ID")?.value;

    if (!botToken || !chatId) {
      return new Response(
        JSON.stringify({ error: "Telegram credentials not found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Insert the user message into chat_messages
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/chat_messages`, {
      method: "POST",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify({
        session_id: sessionId,
        sender: "user",
        message: message,
      }),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      return new Response(
        JSON.stringify({ error: `Failed to store message: ${errText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const inserted: Array<{ id: string }> = await insertRes.json();
    const messageId = inserted[0]?.id;

    // Forward to Telegram with reply keyboard for the owner
    const shortSession = sessionId.slice(0, 8).toUpperCase();
    const telegramText = [
      `💬 *Mesazh i Ri nga Chat*\n`,
      `🆔 *Session:* ${shortSession}`,
      `👤 *Dërgues:* Vizitor`,
      `📝 *Mesazh:* ${message}`,
      `\n_Përgjigju me reply në këtë mesazh për t'i përgjigjur klientit._`,
    ].join("\n");

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const telegramRes = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: telegramText,
        parse_mode: "Markdown",
      }),
    });

    if (!telegramRes.ok) {
      const errText = await telegramRes.text();
      return new Response(
        JSON.stringify({ error: `Telegram API error: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const telegramData = await telegramRes.json();
    const telegramMessageId = telegramData?.result?.message_id;

    // Store the telegram_message_id on the chat message for reply mapping
    if (telegramMessageId && messageId) {
      await fetch(`${supabaseUrl}/rest/v1/chat_messages?id=eq.${messageId}`, {
        method: "PATCH",
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ telegram_message_id: telegramMessageId }),
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
