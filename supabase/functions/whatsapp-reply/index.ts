import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const MENU_URL = Deno.env.get('MENU_URL') || 'https://tierrabendita.com/menu';

// Solo palabras exactas de opt-in — evita falsos positivos
const OPT_IN_KEYWORDS = ['sí', 'si', 'yes', 'start', 'ok', 'okay'];

serve(async (req) => {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    const from = params.get('From') || '';
    const message = (params.get('Body') || '').trim().toLowerCase();

    console.log(`Mensaje de ${from}: ${message}`);

    // Si el mensaje completo ES una palabra de opt-in, no responder nada
    const isOptIn = OPT_IN_KEYWORDS.includes(message);
    if (isOptIn) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

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
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }
});
