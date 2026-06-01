import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, sheetId, sheetName, range, value } = await req.json();
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const connectionKey = Deno.env.get("GOOGLE_SHEETS_API_KEY_1");

    if (!lovableApiKey || !connectionKey) {
      throw new Error("Missing credentials in Edge Function environment.");
    }

    let url = "";
    let method = "GET";
    let body = undefined;

    if (action === "fetchNames") {
      url = `${GATEWAY_URL}/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`;
    } else if (action === "fetchValues") {
      url = `${GATEWAY_URL}/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}`;
    } else if (action === "updateValue") {
      url = `${GATEWAY_URL}/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
      method = "PUT";
      body = JSON.stringify({ values: [[value]] });
    } else {
      throw new Error(`Invalid action: ${action}`);
    }

    const response = await fetch(url, {
      method,
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "X-Connection-Api-Key": connectionKey,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body,
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Gateway error:", data);
      return new Response(JSON.stringify({ error: data.error?.message || "Gateway error" }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
