/* Dulza · envío automático por WhatsApp (API oficial de WhatsApp Cloud, de Meta)
   La app llama a esta función con la sesión de Firebase; la función guarda el token de Meta (nunca llega al navegador),
   sube la imagen de la factura y manda la plantilla aprobada al número del cliente.
   Secretos (se guardan con `firebase functions:secrets:set`): WA_TOKEN y WA_PHONE_ID. */
'use strict';
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

const WA_TOKEN = defineSecret('WA_TOKEN');
const WA_PHONE_ID = defineSecret('WA_PHONE_ID');

const API = 'https://graph.facebook.com/v21.0';
const LANG = process.env.WA_LANG || 'es';
const TEMPLATES = {
  factura: process.env.WA_TPL_FACTURA || 'dulza_factura', // encabezado imagen + 7 variables
  recordatorio: process.env.WA_TPL_RECORDATORIO || 'dulza_recordatorio', // 5 variables
};
const VARS = { factura: 7, recordatorio: 5 };

// Meta no admite saltos de línea ni más de 3 espacios seguidos dentro de una variable
const clean = (s) => String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, 900) || '-';

async function graph(path, token, init = {}) {
  const res = await fetch(`${API}/${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  let body = null;
  try { body = await res.json(); } catch (e) {}
  if (!res.ok) {
    const err = (body && body.error) || {};
    throw new HttpsError('failed-precondition', explain(err), { code: err.code, subcode: err.error_subcode });
  }
  return body;
}

/* Errores de Meta en cristiano */
function explain(err) {
  const c = err.code, m = err.message || 'WhatsApp rechazó el envío.';
  if (c === 190) return 'El token de WhatsApp venció o no es válido. Genera uno permanente y vuelve a guardarlo.';
  if (c === 131030) return 'Ese número no está en la lista de destinatarios de prueba de Meta. Agrégalo o pasa la cuenta a producción.';
  if (c === 132001) return 'La plantilla de WhatsApp no existe o todavía no está aprobada.';
  if (c === 132000) return 'La plantilla recibió un número de variables distinto al esperado.';
  if (c === 131026) return 'Ese número no tiene WhatsApp o no pudo recibir el mensaje.';
  if (c === 131042) return 'Falta el método de pago en la cuenta de WhatsApp Business de Meta.';
  if (c === 130429 || c === 80007) return 'WhatsApp pide ir más despacio: se superó el límite de envíos.';
  return m;
}

exports.waSend = onCall(
  { region: 'southamerica-east1', secrets: [WA_TOKEN, WA_PHONE_ID], maxInstances: 3, timeoutSeconds: 60, memory: '256MiB' },
  async (req) => {
    const email = req.auth && req.auth.token && req.auth.token.email;
    if (!email || !String(email).endsWith('@dulza.app')) throw new HttpsError('unauthenticated', 'Entra con tu cuenta de Dulza para enviar mensajes.');
    const token = WA_TOKEN.value().trim();
    const phoneId = WA_PHONE_ID.value().trim();
    const { kind, to, params, image } = req.data || {};

    // «status» solo comprueba que el número y el token funcionan
    if (kind === 'status') {
      const r = await graph(`${phoneId}?fields=display_phone_number,verified_name,quality_rating`, token);
      return { ok: true, number: r.display_phone_number, name: r.verified_name, quality: r.quality_rating };
    }

    if (!TEMPLATES[kind]) throw new HttpsError('invalid-argument', 'Tipo de mensaje desconocido.');
    const digits = String(to || '').replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) throw new HttpsError('invalid-argument', 'El número de WhatsApp del cliente no es válido.');
    if (!Array.isArray(params) || params.length !== VARS[kind]) throw new HttpsError('invalid-argument', `La plantilla espera ${VARS[kind]} datos.`);

    const components = [];
    if (kind === 'factura') {
      if (!image || typeof image !== 'string' || image.length > 8 * 1024 * 1024) throw new HttpsError('invalid-argument', 'Falta la imagen de la factura.');
      const form = new FormData();
      form.append('messaging_product', 'whatsapp');
      form.append('type', 'image/jpeg');
      form.append('file', new Blob([Buffer.from(image, 'base64')], { type: 'image/jpeg' }), 'factura.jpg');
      const up = await graph(`${phoneId}/media`, token, { method: 'POST', body: form });
      components.push({ type: 'header', parameters: [{ type: 'image', image: { id: up.id } }] });
    }
    components.push({ type: 'body', parameters: params.map((p) => ({ type: 'text', text: clean(p) })) });

    const sent = await graph(`${phoneId}/messages`, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: digits,
        type: 'template',
        template: { name: TEMPLATES[kind], language: { code: LANG }, components },
      }),
    });
    return { ok: true, id: sent.messages && sent.messages[0] && sent.messages[0].id };
  }
);
