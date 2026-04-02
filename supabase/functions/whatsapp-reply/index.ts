import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const MENU_URL = Deno.env.get('MENU_URL') || 'https://tierrabendita.com/menu';

// Twilio sends webhooks as application/x-www-form-urlencoded
serve(async (req) => {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    const from = params.get('From') || '';
    const message = params.get('Body') || '';

    console.log(`Mensaje de ${from}: ${message}`);

    // Auto-reply in TwiML format — Twilio reads this and sends it as WhatsApp message
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    ¡Hola! 👋 Gracias por escribirnos.

Los pedidos de *Tierra Bendita* se realizan exclusivamente a través de nuestra carta digital:

🔗 ${MENU_URL}

Si tienes alguna pregunta, con gusto te ayudamos. ¡Te esperamos! ☕
  </Message>
</Response>`;

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (err) {
    console.error('Error:', err);
    // Return empty TwiML on error so Twilio doesn't retry indefinitely
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }
});
