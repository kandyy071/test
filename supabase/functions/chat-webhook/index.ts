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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Supabase credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const update = await req.json();

    // Telegram sends reply updates in update.message or update.channel_post
    const message = update.message || update.channel_post;
    if (!message) {
      return new Response(
        JSON.stringify({ success: true, note: "No message in update" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const replyToMessageId = message.reply_to_message?.message_id;
    const replyText = message.text;

    if (!replyToMessageId || !replyText) {
      return new Response(
        JSON.stringify({ success: true, note: "Not a reply or no text" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Find the original chat message by telegram_message_id
    const lookupRes = await fetch(
      `${supabaseUrl}/rest/v1/chat_messages?telegram_message_id=eq.${replyToMessageId}&select=session_id`,
      {
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
      },
    );

    if (!lookupRes.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to look up original message" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const lookupData: Array<{ session_id: string }> = await lookupRes.json();
    if (lookupData.length === 0) {
      return new Response(
        JSON.stringify({ success: true, note: "No matching chat message found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sessionId = lookupData[0].session_id;

    // Insert the support reply into chat_messages
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/chat_messages`, {
      method: "POST",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        sender: "support",
        message: replyText,
      }),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      return new Response(
        JSON.stringify({ error: `Failed to store reply: ${errText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
