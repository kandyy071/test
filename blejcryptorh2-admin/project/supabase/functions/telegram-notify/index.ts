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
    const body = await req.json();

    const {
      appointmentId,
      name,
      phone,
      socialHandle,
      mode,
      feeMode,
      cryptoType,
      cashAmount,
      cryptoAmount,
      feeAmount,
      netAmount,
      date,
      timeSlot,
      location,
      notes,
    } = body;

    const modeEmoji = mode === 'sell' ? '💰' : '🛒';
    const modeText = mode === 'sell' ? 'SHET KRIPTO' : 'BLER KRIPTO';
    const feeModeText = feeMode === 'extra'
      ? (mode === 'buy' ? 'shtuar mbi shumë' : 'zbritur nga shuma')
      : 'përfshirë në shumë';

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Supabase credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const secretsRes = await fetch(`${supabaseUrl}/rest/v1/app_secrets?select=key,value`, {
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
    });

    if (!secretsRes.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const secrets: Array<{ key: string; value: string }> = await secretsRes.json();
    const botToken = secrets.find((s) => s.key === "TELEGRAM_BOT_TOKEN")?.value;
    const chatId = secrets.find((s) => s.key === "TELEGRAM_CHAT_ID")?.value;

    if (!botToken || !chatId) {
      return new Response(
        JSON.stringify({ error: "Telegram credentials not found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const message = [
      "🔔 *Rezervim i Ri!*\n",
      `👤 *Emri:* ${name}`,
      `📞 *Telefoni:* ${phone}`,
      `📱 *Instagram/Facebook:* ${socialHandle}`,
      "",
      `${modeEmoji} *${modeText}*`,
      `💱 *Kripto:* ${cryptoType}`,
      `💵 *Shuma:* €${Number(cashAmount).toFixed(2)}`,
      `📉 *Tarifa:* -€${Number(feeAmount).toFixed(2)} (${feeModeText})`,
      `✅ *Neto:* €${Number(netAmount).toFixed(2)}`,
      `🪙 *Merr:* ${cryptoAmount} ${cryptoType}`,
      "",
      `📅 *Data:* ${date}`,
      `🕐 *Ora:* ${timeSlot}`,
      `📍 *Vendi:* ${location}`,
    ];

    if (notes) {
      message.push(`\n📝 *Shënime:* ${notes}`);
    }

    message.push(`\n🆔 *ID:* ${appointmentId?.slice(0, 8).toUpperCase() || "N/A"}`);

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const telegramRes = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message.join("\n"),
        parse_mode: "Markdown",
      }),
    });

    if (!telegramRes.ok) {
      const errText = await telegramRes.text();
      return new Response(
        JSON.stringify({ error: `Telegram API error: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
