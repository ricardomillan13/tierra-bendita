import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const TWILIO_AUTH_TOKEN   = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const TWILIO_FROM         = Deno.env.get('TWILIO_WHATSAPP_FROM')!; // whatsapp:+14155238886

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, orderNumber, customerName } = await req.json();

    if (!to || !orderNumber) {
      return new Response(
        JSON.stringify({ error: 'Faltan parámetros: to, orderNumber' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone number → whatsapp:+521XXXXXXXXXX
    const clean = to.replace(/\D/g, '');
    // Mexico WhatsApp requires +521XXXXXXXXXX (10 digits → add 521 prefix)
    let phone: string;
    if (clean.startsWith('521') && clean.length === 13) {
      phone = `+${clean}`; // already correct
    } else if (clean.startsWith('52') && clean.length === 12) {
      phone = `+521${clean.slice(2)}`; // add missing 1
    } else if (clean.length === 10) {
      phone = `+521${clean}`; // just 10 digits
    } else {
      phone = `+${clean}`;
    }
    const toWhatsApp = `whatsapp:${phone}`;

    const greeting = customerName ? `Hola ${customerName} 👋` : 'Hola 👋';
    const body = `${greeting}\n\n☕ Tu pedido *#${orderNumber}* en *Tierra Bendita* ya está listo.\n\n¡Pasa a recogerlo, te esperamos!`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: toWhatsApp,
        From: TWILIO_FROM,
        Body: body,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Twilio error:', result);
      return new Response(
        JSON.stringify({ error: result.message || 'Error de Twilio' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, sid: result.sid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});