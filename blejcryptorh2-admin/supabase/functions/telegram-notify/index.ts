import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function getTelegramCreds() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  const secretsRes = await fetch(`${supabaseUrl}/rest/v1/app_secrets?select=key,value`, {
    headers: {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
    },
  });

  if (!secretsRes.ok) return null;

  const secrets: Array<{ key: string; value: string }> = await secretsRes.json();
  const botToken = secrets.find((s) => s.key === "TELEGRAM_BOT_TOKEN")?.value;
  const chatId = secrets.find((s) => s.key === "TELEGRAM_CHAT_ID")?.value;

  if (!botToken || !chatId) return null;
  return { botToken, chatId };
}

async function sendTelegram(botToken: string, chatId: string, text: string, replyMarkup?: Record<string, unknown>) {
  const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  };
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }
  await fetch(telegramUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

const SWAP_STATUS_BUTTONS = {
  inline_keyboard: [
    [
      { text: "📦 Pagesa u mor", callback_data: "swap_detected" },
      { text: "⚙️ Duke procesuar", callback_data: "swap_processing" },
    ],
    [
      { text: "✅ U kompletua", callback_data: "swap_completed" },
      { text: "🚫 Anulo", callback_data: "swap_cancelled" },
    ],
    [
      { text: "❌ Skadoi", callback_data: "swap_expired" },
    ],
  ],
};

const STATUS_EMOJI: Record<string, string> = {
  waiting: "⏳",
  received: "📦",
  processing: "⚙️",
  completed: "✅",
  expired: "❌",
  cancelled: "🚫",
};

const STATUS_LABEL: Record<string, string> = {
  waiting: "Në pritje të pagesës",
  received: "Pagesa u mor",
  processing: "Duke procesuar",
  completed: "U kompletua",
  expired: "Skadoi",
  cancelled: "U anulua",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const type = body.type ?? "appointment";

    const creds = await getTelegramCreds();
    if (!creds) {
      return new Response(
        JSON.stringify({ error: "Telegram credentials not found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { botToken, chatId } = creds;

    if (type === "swap") {
      const {
        swapId,
        customerName,
        customerPhone,
        sendCoin,
        sendNetwork,
        sendAmount,
        receiveCoin,
        receiveNetwork,
        receiveAmount,
        exchangeRate,
        exchangeFeePct,
        receivingAddress,
        depositAddress,
        depositNetwork,
      } = body;

      const message = [
        "🔄 *Shkëmbim i Ri Crypto!*\n",
        `👤 *Emri:* ${customerName}`,
        `📞 *Telefoni:* ${customerPhone}`,
        "",
        `📤 *Shuma që jep:* ${sendAmount} ${sendCoin}`,
        `🌐 *Rrjeti dërgimit:* ${sendNetwork}`,
        "",
        `📥 *Shuma që merr:* ${receiveAmount} ${receiveCoin}`,
        `🌐 *Rrjeti marrjes:* ${receiveNetwork}`,
        "",
        `💱 *Kursi:* 1 ${sendCoin} = ${exchangeRate} ${receiveCoin}`,
        `📉 *Tarifa:* ${exchangeFeePct}% përfshirë`,
        "",
        `📬 *Adresa e marrjes:*`,
        `\`${receivingAddress}\``,
        "",
        depositAddress
          ? `🏦 *Adresa e depozitimit:*\n\`${depositAddress}\``
          : `🏦 *Adresa e depozitimit:* Nuk është konfiguruar`,
        `🌐 *Rrjeti i depozitimit:* ${depositNetwork}`,
        "",
        `🆔 *Swap ID:* ${swapId}`,
        `⏳ *Statusi:* Në pritje të pagesës`,
      ];

      await sendTelegram(botToken, chatId, message.join("\n"), {
        inline_keyboard: SWAP_STATUS_BUTTONS.inline_keyboard.map((row) =>
          row.map((btn) => ({
            text: btn.text,
            callback_data: `${btn.callback_data}:${swapId}`,
          }))
        ),
      });
    } else if (type === "swap_status") {
      const { swapId, status, sendCoin, sendAmount, receiveCoin, receiveAmount, customerName } = body;
      const emoji = STATUS_EMOJI[status] ?? "📋";
      const label = STATUS_LABEL[status] ?? status;

      const message = [
        `${emoji} *Përditësim Shkëmbimi*\n`,
        `🆔 *Swap ID:* ${swapId}`,
        `👤 *Klienti:* ${customerName ?? "—"}`,
        `📊 *Statusi:* ${label}`,
        `📤 *Shuma që jep:* ${sendAmount} ${sendCoin}`,
        `📥 *Shuma që merr:* ${receiveAmount} ${receiveCoin}`,
      ];

      await sendTelegram(botToken, chatId, message.join("\n"), {
        inline_keyboard: SWAP_STATUS_BUTTONS.inline_keyboard.map((row) =>
          row.map((btn) => ({
            text: btn.text,
            callback_data: `${btn.callback_data}:${swapId}`,
          }))
        ),
      });
    } else {
      // Appointment notification (existing behavior)
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

      await sendTelegram(botToken, chatId, message.join("\n"));
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
