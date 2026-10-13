import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEPOSIT_ADDRESSES: Record<string, { address: string; network: string }> = {
  "USDT_TRC20": {
    address: Deno.env.get("DEPOSIT_USDT_TRC20") ?? "",
    network: "TRON (TRC20)",
  },
  "USDT_BEP20": {
    address: Deno.env.get("DEPOSIT_USDT_BEP20") ?? "",
    network: "BNB Smart Chain (BEP20)",
  },
  "BTC": {
    address: Deno.env.get("DEPOSIT_BTC") ?? "",
    network: "Bitcoin Network",
  },
  "ETH": {
    address: Deno.env.get("DEPOSIT_ETH") ?? "",
    network: "Ethereum (ERC20)",
  },
  "SOL": {
    address: Deno.env.get("DEPOSIT_SOL") ?? "",
    network: "Solana Network",
  },
  "LTC": {
    address: Deno.env.get("DEPOSIT_LTC") ?? "",
    network: "Litecoin Network",
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { swapId, sendCoin, sendNetwork } = await req.json();

    if (!swapId || !sendCoin) {
      return new Response(
        JSON.stringify({ error: "Mungojnë parametrat e detyrueshme" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const key = sendCoin === "USDT" ? `USDT_${sendNetwork}` : sendCoin;
    const depositInfo = DEPOSIT_ADDRESSES[key];

    if (!depositInfo || !depositInfo.address) {
      return new Response(
        JSON.stringify({
          swapId,
          depositAddress: "",
          depositNetwork: depositInfo?.network ?? sendNetwork,
          message: "Adresa e depozitimit nuk është konfiguruar ende. Ju lutemi na kontaktoni.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    await supabase
      .from("crypto_swaps")
      .update({
        deposit_address: depositInfo.address,
        deposit_network: depositInfo.network,
        updated_at: new Date().toISOString(),
      })
      .eq("swap_id", swapId);

    return new Response(
      JSON.stringify({
        swapId,
        depositAddress: depositInfo.address,
        depositNetwork: depositInfo.network,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
