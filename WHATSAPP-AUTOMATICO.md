# WhatsApp automático (API oficial de Meta)

La app ya trae todo el código. Falta la parte que solo puede hacer la dueña de la cuenta: crear la cuenta de WhatsApp Business en Meta, aprobar dos plantillas y guardar el token. Mientras no esté listo, el interruptor de **Ajustes → WhatsApp automático** no sirve y la app sigue usando el botón que abre WhatsApp.

## Cómo funciona

1. Al guardar una venta (o tocar «Recordar»), la app le pide a la función `waSend` de Firebase que envíe el mensaje.
2. La función, que guarda el token de Meta (nunca llega al navegador), sube la imagen de la factura y manda la **plantilla** aprobada al número del cliente.
3. Si algo falla, la app muestra el motivo y ofrece «Enviar a mano» (el método de antes).

Código: `functions/index.js` (servidor) y `js/invoice.js` + `js/cloud.js` (app).

## Qué cuesta

- **Firebase:** la función necesita el plan **Blaze** (pide tarjeta). Con poco uso queda dentro de la cuota gratis.
- **Meta:** cobra por cada conversación iniciada con plantilla, según el país (consulta la tarifa de «Utilidad» de tu país en la página de precios de WhatsApp Business Platform). Las respuestas del cliente dentro de 24 h no se cobran.

## Paso 1 · Meta

1. Entra a <https://developers.facebook.com/> → **Mis apps → Crear app** → tipo **Empresa** → agrega el producto **WhatsApp**.
2. En **WhatsApp → Configuración de la API** verás un número de prueba y su **ID del número de teléfono** (guárdalo). El número de prueba solo envía a hasta 5 destinatarios que verifiques; para clientes reales agrega **tu propio número** (no puede estar registrado en la app de WhatsApp normal; si es el de la tienda, se usa el modo de coexistencia con WhatsApp Business) y pasa la app a modo **Activo**.
3. En **WhatsApp Manager → Plantillas de mensajes** crea estas dos (categoría **Utilidad**, idioma **Español**). Los nombres deben ser exactos.

**`dulza_factura`** — Encabezado: **Imagen** (sube cualquier imagen de ejemplo). Cuerpo:

```
Hola {{1}} 👋 Aquí está tu factura {{2}} de {{3}}.

Pedido: {{4}}

Total: {{5}}
Saldo pendiente: {{6}}
{{7}}

¡Gracias por tu compra! 💖
```

Ejemplos de variables: Camila · D-0011 · Dulza · 3× Tres leches · $19.500 · $13.500 · 📅 Vence el 25 oct

**`dulza_recordatorio`** — Sin encabezado. Cuerpo:

```
Hola {{1}} 👋 Te escribe {{2}}. Un recordatorio amistoso: tienes un saldo pendiente de {{3}}.

Detalle: {{4}}
{{5}}

Si ya pagaste, ¡gracias y disculpa la molestia! 💖
```

Ejemplos: Camila · Dulza · $13.500 · D-0011: $13.500 · 📅 Vence el 25 oct

Meta las revisa en minutos u horas. Hasta que estén **Aprobadas** el envío falla con «la plantilla no existe o no está aprobada».

4. **Token permanente:** Configuración del negocio → **Usuarios del sistema** → agregar uno (rol Administrador) → asignarle la app y la cuenta de WhatsApp con control total → **Generar token** con los permisos `whatsapp_business_messaging` y `whatsapp_business_management`, sin vencimiento. Cópialo (solo se muestra una vez).
5. Para clientes reales, agrega un **método de pago** en WhatsApp Manager → Configuración de pagos.

## Paso 2 · Firebase

Hace falta Node.js 20 y `npm install -g firebase-tools` (ya lo tienes). En la carpeta del proyecto:

```bash
firebase login
firebase functions:secrets:set WA_TOKEN        # pega el token permanente
firebase functions:secrets:set WA_PHONE_ID     # pega el ID del número de teléfono
firebase deploy --only functions
```

Antes, en la consola de Firebase, pasa el proyecto `dulza-ab94d` al plan **Blaze** (Compilación → Funciones lo pide).

Si usas otros nombres de plantilla o idioma, ponlos en `functions/.env` (`WA_TPL_FACTURA`, `WA_TPL_RECORDATORIO`, `WA_LANG`) antes de desplegar.

## Paso 3 · Probar

1. En la app, **Ajustes → Datos compartidos**: el dispositivo debe estar conectado.
2. **Ajustes → WhatsApp automático → Probar conexión con WhatsApp**: debe mostrar tu número.
3. Activa **Enviar facturas y recordatorios solos**.
4. Registra una venta de un cliente con WhatsApp guardado (con el número de prueba, solo a los destinatarios verificados en Meta).

## Errores frecuentes

| Mensaje | Causa |
| --- | --- |
| El envío automático todavía no está activado | Falta `firebase deploy --only functions` |
| El token venció o no es válido | Usa un token de **usuario del sistema** sin vencimiento, no el temporal de 24 h |
| Ese número no está en la lista de prueba | Estás con el número de prueba: verifica al destinatario o pasa a producción |
| La plantilla no existe o no está aprobada | Nombre distinto o plantilla pendiente |
| Falta el método de pago | Agrégalo en WhatsApp Manager |

## Seguridad

- El token vive solo en los secretos de Firebase. No está en el repositorio ni llega al navegador.
- La función solo responde a quien tenga sesión de Firebase con correo `@dulza.app`.
- Siempre se envían plantillas aprobadas: así se cumple la política de WhatsApp (solo escribir a clientes que te dieron su número).
