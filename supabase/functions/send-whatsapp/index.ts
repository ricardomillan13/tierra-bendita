import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'; 

const TWILIO_ACCOUNT_SID  = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const TWILIO_AUTH_TOKEN   = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const TWILIO_FROM         = Deno.env.get('TWILIO_WHATSAPP_FROM')!; // whatsapp:+14155238886 (sandbox) o whatsapp:+52... (prod)

// ── Modo plantilla (producción con WhatsApp Business aprobado) ───────────────
// Si configuras este secret, la función cambia automáticamente a usar la
// plantilla aprobada por Meta en lugar de texto libre. No requiere tocar
// código de nuevo cuando termines el alta del Sender + Template en Twilio.
const TWILIO_CONTENT_SID  = Deno.env.get('TWILIO_ORDER_READY_TEMPLATE_SID'); // ej. HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

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

    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    // ── Construir el cuerpo del request según el modo ──────────────────────
    const params = new URLSearchParams({
      To: toWhatsApp,
      From: TWILIO_FROM,
    });

    if (TWILIO_CONTENT_SID) {
      // MODO PRODUCCIÓN: plantilla aprobada por Meta (HSM).
      // El número y el orden de las variables ({{1}}, {{2}}...) deben coincidir
      // EXACTAMENTE con cómo registraste la plantilla en Twilio Content Editor.
      // Ejemplo de plantilla:
      //   "Hola {{1}} 👋 Tu pedido #{{2}} en Tierra Bendita ya está listo. ¡Pasa a recogerlo!"
      params.set('ContentSid', TWILIO_CONTENT_SID);
      params.set('ContentVariables', JSON.stringify({
        '1': customerName || 'cliente',
        '2': String(orderNumber),
      }));
    } else {
      // MODO SANDBOX / DESARROLLO: texto libre (no funciona fuera del Sandbox
      // de Twilio una vez que el negocio esté en producción con WhatsApp Business).
      const greeting = customerName ? `Hola ${customerName} 👋` : 'Hola 👋';
      const body = `${greeting}\n\n☕ Tu pedido *#${orderNumber}* en *Tierra Bendita* ya está listo.\n\n¡Pasa a recogerlo, te esperamos!`;
      params.set('Body', body);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
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
      JSON.stringify({ success: true, sid: result.sid, mode: TWILIO_CONTENT_SID ? 'template' : 'freeform' }),
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