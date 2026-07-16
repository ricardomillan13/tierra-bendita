import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const TWILIO_AUTH_TOKEN  = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const TWILIO_FROM        = Deno.env.get('TWILIO_WHATSAPP_FROM')!;

// ── Plantillas por estatus ────────────────────────────────────────────────────
const TEMPLATE_SIDS: Record<string, string | undefined> = {
  received:  Deno.env.get('TWILIO_RECEIVED_TEMPLATE_SID'),
  preparing: Deno.env.get('TWILIO_PREPARING_TEMPLATE_SID'),
  ready:     Deno.env.get('TWILIO_ORDER_READY_TEMPLATE_SID'),
};

const TEMPLATE_VARS: Record<string, (name: string, order: string) => Record<string, string>> = {
  received:  (name, order) => ({ '1': name || 'cliente', '2': order }),
  preparing: (_name, order) => ({ '1': order }),
  ready:     (name, order) => ({ '1': name || 'cliente', '2': order }),
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, orderNumber, customerName, status = 'ready', cancelReason } = await req.json();

    if (!to || !orderNumber) {
      return new Response(
        JSON.stringify({ error: 'Faltan parámetros: to, orderNumber' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone → whatsapp:+521XXXXXXXXXX
    const clean = to.replace(/\D/g, '');
    let phone: string;
    if (clean.startsWith('521') && clean.length === 13)     phone = `+${clean}`;
    else if (clean.startsWith('52') && clean.length === 12) phone = `+521${clean.slice(2)}`;
    else if (clean.length === 10)                           phone = `+521${clean}`;
    else                                                    phone = `+${clean}`;

    const toWhatsApp = `whatsapp:${phone}`;

    // 'cancelled' no tiene plantilla aprobada por Meta todavía → siempre texto libre,
    // nunca debe caer al fallback de la plantilla 'ready'.
    const contentSid = status === 'cancelled'
      ? undefined
      : (TEMPLATE_SIDS[status] || TEMPLATE_SIDS['ready']);
    const varsBuilder = TEMPLATE_VARS[status] || TEMPLATE_VARS['ready'];

    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const params = new URLSearchParams({ To: toWhatsApp, From: TWILIO_FROM });

    if (contentSid) {
      params.set('ContentSid', contentSid);
      params.set('ContentVariables', JSON.stringify(
        varsBuilder(customerName || 'cliente', String(orderNumber))
      ));
    } else if (status === 'cancelled') {
      const greeting = customerName ? `Hola ${customerName} 👋` : 'Hola 👋';
      const reasonLine = cancelReason ? `\n\nMotivo: ${cancelReason}` : '';
      params.set('Body', `${greeting}\n\n😔 Lamentamos informarte que tu pedido *#${orderNumber}* en *Tierra Bendita* fue cancelado.${reasonLine}\n\nSi tienes dudas, respóndenos por este medio.`);
    } else {
      const greeting = customerName ? `Hola ${customerName} 👋` : 'Hola 👋';
      params.set('Body', `${greeting}\n\n☕ Tu pedido *#${orderNumber}* en *Tierra Bendita*.\n\n¡Gracias por tu preferencia!`);
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
      JSON.stringify({ success: true, sid: result.sid, status }),
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
