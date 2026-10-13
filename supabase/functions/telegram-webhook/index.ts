import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const STATUS_LABELS: Record<string, string> = {
  waiting: "Në pritje të pagesës",
  detected: "Pagesa u detektua",
  confirming: "Duke konfirmuar",
  processing: "Duke procesuar",
  completed: "U kompletua",
  expired: "Skadoi",
  cancelled: "U anulua",
};

const STATUS_EMOJI: Record<string, string> = {
  waiting: "⏳",
  detected: "📦",
  confirming: "🔍",
  processing: "⚙️",
  completed: "✅",
  expired: "❌",
  cancelled: "🚫",
};

const TERMINAL_STATUSES = ["completed", "expired", "cancelled"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const callbackQuery = body.callback_query;

    if (!callbackQuery) {
      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data: string = callbackQuery.data ?? "";
    const chatId = callbackQuery.message?.chat?.id;
    const messageId = callbackQuery.message?.message_id;

    // Format: "swap_<status>:<swapId>"
    const colonIdx = data.indexOf(":");
    if (colonIdx === -1) {
      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const action = data.substring(0, colonIdx);
    const swapId = data.substring(colonIdx + 1);

    const newStatus = action.replace("swap_", "");

    if (!STATUS_LABELS[newStatus]) {
      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: swapRow, error: fetchError } = await supabase
      .from("crypto_swaps")
      .select("swap_id, status, send_coin, send_amount, receive_coin, receive_amount, customer_name")
      .eq("swap_id", swapId)
      .maybeSingle();

    if (fetchError || !swapRow) {
      if (botToken && chatId) {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: callbackQuery.id,
            text: "Shkëmbimi nuk u gjet.",
            show_alert: true,
          }),
        });
      }
      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const currentStatus = swapRow.status as string;

    if (TERMINAL_STATUSES.includes(currentStatus)) {
      if (botToken && chatId) {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: callbackQuery.id,
            text: `Ky shkëmbim është tashmë: ${STATUS_LABELS[currentStatus]}`,
            show_alert: true,
          }),
        });
      }
      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: updateError } = await supabase
      .from("crypto_swaps")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("swap_id", swapId);

    if (updateError) {
      if (botToken && chatId) {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: callbackQuery.id,
            text: "Gabim gjatë përditësimit.",
            show_alert: true,
          }),
        });
      }
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const emoji = STATUS_EMOJI[newStatus] ?? "📋";
    const label = STATUS_LABELS[newStatus];

    const statusMessage = [
      `${emoji} *Statusi u përditësua*\n`,
      `🆔 *Swap ID:* ${swapId}`,
      `👤 *Klienti:* ${swapRow.customer_name ?? "—"}`,
      `📊 *Statusi i ri:* ${label}`,
      `📤 *Shuma që jep:* ${swapRow.send_amount} ${swapRow.send_coin}`,
      `📥 *Shuma që merr:* ${swapRow.receive_amount} ${swapRow.receive_coin}`,
    ];

    const buttons = TERMINAL_STATUSES.includes(newStatus)
      ? undefined
      : {
          inline_keyboard: [
            [
              { text: "📦 Pagesa u mor", callback_data: `swap_detected:${swapId}` },
              { text: "⚙️ Duke procesuar", callback_data: `swap_processing:${swapId}` },
            ],
            [
              { text: "✅ U kompletua", callback_data: `swap_completed:${swapId}` },
              { text: "🚫 Anulo", callback_data: `swap_cancelled:${swapId}` },
            ],
            [
              { text: "❌ Skadoi", callback_data: `swap_expired:${swapId}` },
            ],
          ],
        };

    if (botToken && chatId && messageId) {
      await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: statusMessage.join("\n"),
          parse_mode: "Markdown",
          ...(buttons ? { reply_markup: buttons } : {}),
        }),
      });

      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callbackQuery.id,
          text: `Statusi: ${label}`,
        }),
      });
    }

    return new Response(
      JSON.stringify({ ok: true, swapId, status: newStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
