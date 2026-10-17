# Dulza · Ventas y compras

App web instalable (PWA) para gestionar ventas, compras, cobros y facturas de un emprendimiento de postres.
Funciona en celular, tableta y computadora, y también **sin internet**.

## Qué incluye

| Módulo | Para qué sirve |
| --- | --- |
| **Inicio** | Cuánto te deben, ventas del mes, ganancia estimada, gráfico, próximos cobros, lo más vendido |
| **Ventas** | Historial con búsqueda y filtros; nueva venta de contado o a 15 / 30 días (u otro plazo) con abono inicial |
| **Cobros** | Lo que te deben (por venta o por cliente) y lo que debes a proveedores; recordatorios por WhatsApp |
| **Compras** | Insumos y materiales, con proveedor, plazo y pagos |
| **Clientes / Postres / Proveedores** | Catálogo con saldos, historial, costos y margen de ganancia |
| **Reportes** | Ganancia bruta, flujo de caja, ventas vs. compras, mejores clientes, antigüedad de deudas, exportar a Excel |
| **Facturas** | Imagen PNG y PDF con tu logo y colores; se envían por WhatsApp (mensaje con el detalle o archivo adjunto) |

## Cómo instalarla en el iPhone / Android

La app necesita estar publicada en internet (HTTPS) **una sola vez** para poder instalarse. Es gratis:

1. Entra a <https://app.netlify.com/drop> y arrastra **toda esta carpeta**. Te da un enlace.
2. Abre ese enlace en el celular (en iPhone, con **Safari**).
3. iPhone: botón **Compartir** → **Agregar a pantalla de inicio**. Android: menú ⋮ → **Instalar app**.

Otras opciones gratuitas: GitHub Pages, Cloudflare Pages o Vercel.

Para probarla en tu computadora (necesita Python): ejecuta `python .dev/serve.py` en esta carpeta y entra a <http://localhost:5173>.

## Tus datos

- Se guardan **en el dispositivo** (IndexedDB), no en un servidor. Funciona sin internet.
- Cada dispositivo tiene sus propios datos. Para pasarlos de uno a otro: **Ajustes → Guardar respaldo** y **Restaurar respaldo** en el otro.
- Haz un respaldo de vez en cuando. Si borras los datos del navegador, se pierden.

## Acceso con usuario y clave

- Al abrir la app pide **usuario y clave**. El usuario es `anaparr` (da igual si va en mayúsculas); la clave inicial se entrega aparte y **no está escrita en el código ni en este repositorio**.
- Se vuelve a pedir tras **10 minutos sin usarla**, al volver de segundo plano pasado ese tiempo y con **Ajustes → Seguridad → Bloquear ahora**. Recargar la página mientras se usa no la pide otra vez.
- **Cambiar la clave:** Ajustes → Seguridad → Cambiar clave (mínimo 8 caracteres, con letras y números). Mientras siga la clave inicial, la app lo recuerda con un aviso al entrar.
- **Intentos fallidos:** después de 5 seguidos hay una pausa de 30 segundos, que se duplica con cada 5 más (hasta 5 minutos).
- **Dónde vive la clave:** en `js/auth.js` solo está la huella (SHA-256 con sal y 30 000 vueltas) de la clave inicial. La clave que elija Ana se guarda como huella en este navegador (`localStorage`, entrada `dulza-auth`) y no viaja en los respaldos.
- **Alcance:** es un candado para el dispositivo. Frena a quien tome el celular o la computadora, pero los datos guardados no están cifrados: alguien con conocimientos técnicos podría leerlos.
- **Si se olvida la clave:** no hay recuperación por correo (la app no tiene servidor). Borrar los datos del sitio en el navegador restablece la clave inicial, pero también borra las ventas guardadas en ese dispositivo; por eso conviene guardar respaldos (Ajustes → Tus datos).

## Personalizar la marca

- **Colores:** Ajustes → Apariencia (paletas listas o dos colores propios). Todo se recalcula: botones, factura, ícono, modo oscuro y contraste del texto.
- **Logo y mascota:** por defecto la app usa el personaje y el logo de GPT (ver «Marca»). En Ajustes → Logo y mascota se puede subir otra imagen; se usa en la factura, el menú y las pantallas vacías.
- **Valores por defecto de la marca** (para cuando ya tengan su paleta definitiva): `js/store.js` (`D.PALETTES`, `D.defaults`) y `css/theme.css` (`--brand`, `--accent`).
- **Ícono de la app** (`assets/icon-*.png`, `apple-touch-icon.png`, `favicon-*.png`): están hechos a partir del personaje (`assets/brand/gpt/v3/personaje.png`) sobre un mosaico rosa. Si cambias esa imagen hay que regenerarlos (`P.makeBrand()` de `.dev/proc.js`); no se actualizan solos.

## Publicar en GitHub Pages

La app es un sitio estático, así que GitHub Pages la sirve tal cual:

1. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.
2. Al cabo de uno o dos minutos queda en `https://rivcarii.github.io/Dulza/` (la dirección aparece arriba en esa misma pantalla).
3. En el celular se abre esa dirección y se instala (iPhone: Compartir → Agregar a inicio; Android: menú → Instalar app). La dirección debe ser `https`, y Pages ya lo es.

Todas las rutas de la app son relativas, por eso funciona en la subcarpeta `/Dulza/`. `.nojekyll` evita que Pages procese los archivos y `robots.txt` junto con la etiqueta `noindex` piden a los buscadores que no la indexen. Los datos siguen guardándose en cada dispositivo (ver «Tus datos»).

## Al publicar una actualización

1. Sube la versión en los dos lugares con un solo comando: `python .dev/version.py 1.7.0` (cambia `VERSION` en `sw.js` y `D.version` en `js/core.js`).
2. `git add -A`, `git commit` y `git push`. Pages tarda uno o dos minutos en publicar.
3. Las apps instaladas buscan versión nueva al abrirse, al volver a primer plano y cada media hora. Cuando la encuentran avisan «Hay una versión nueva de Dulza» con el botón **Actualizar**; al tocarlo se recarga sin pedir la clave otra vez.

Si no se sube el número de versión, los dispositivos conservan los archivos guardados y no se enteran del cambio.

## Estructura

```
index.html            Entrada de la app
manifest.webmanifest  Datos de instalación (nombre, íconos, accesos rápidos)
sw.js                 Modo sin internet y actualizaciones
css/                  theme (colores y tokens) · base · components · app (estructura y pantallas)
js/                   core · store (datos y cálculos) · theme · art (íconos, logo, mascota) · ui (hojas, avisos)
                      forms / entities (formularios y detalles) · invoice (factura, PDF, WhatsApp) · views/ (pantallas)
assets/               Íconos de la app
assets/brand/gpt/     Personaje, logo, expresiones, stickers y demás piezas oficiales (GPT)
assets/brand/         Versión vectorial anterior (logos y personaje en SVG/PNG); queda de respaldo
```

## Notas importantes

- La factura es un **comprobante comercial**, no una factura electrónica válida ante la autoridad tributaria de tu país.
- «Enviar por WhatsApp» abre el chat del cliente con el mensaje listo (WhatsApp no permite adjuntar archivos automáticamente). Para enviar el PDF o la imagen, usa «Compartir PDF/imagen» y elige WhatsApp.
- Atajos de teclado en computadora: `N` nueva venta · `Shift+N` nueva compra · `/` buscar.

## Marca: logo, personaje y portafolio

- **Personaje oficial:** el que generó GPT: pastelera kawaii de estilo anime, tez morena, cabello chocolate con puntas caramelo, gorro de panadera bombacho con manchas de mora, suéter y delantal blanco con el logo de Dulza. La app lo usa en el menú, la bienvenida, las pantallas vacías, la venta registrada, el ícono y la factura.
- **Dónde está cada pieza:** todo en `assets/brand/gpt/v3/` (la app las lee desde `D.gpt` en `js/brand.js`):

  | Pieza | Archivo | Dónde se usa |
  | --- | --- | --- |
  | Personaje de cuerpo completo | `personaje.png` | menú «Más», pantallas con el personaje grande |
  | Busto (mitad de arriba del anterior) | `busto.png` | encabezado de inicio, factura, avatar |
  | Mosaico del personaje | `isotipo.png` | marca pequeña de la barra y del menú |
  | Logo con personaje | `logos/logo-personaje.png` | bienvenida y encabezado de la factura |
  | Letras «Dulza» | `logos/logo-nombre.png` | barra lateral en computadora |
  | Otros logos | `logos/logo-insignia-circulo.png`, `logo-insignia-corazon.png`, `logo-cupcake.png`, `logo-gorro.png` | listos para redes y empaques |
  | 16 expresiones | `expresiones/expresion-01..16.png` | pantallas vacías y avisos (`D.gpt.moods`) |
  | 52 íconos de postres (42 + 10 galletas) | `postres/postre-01..52.png` | íconos de los postres en el catálogo, las ventas y la factura |
  | 33 íconos de interfaz y decoración | `iconos/ui-01..10.png`, `deco-01..13.png`, `tienda-01..10.png` | barra de pestañas, menú lateral, buscador, calendario, ajustes, corona del más vendido… |
  | 16 elementos sueltos | `elementos/elemento-01..16.png` | corazón, corona, moño, perla, flor, manga, goteo, estrella, moras, galleta |

  Los stickers de las pantallas vacías siguen en `v2/sticker-*-b.png`. **Para cambiar una pieza basta con copiar un PNG con el mismo nombre encima**; después sube `VERSION` en `sw.js`.
- **Íconos de postres:** cada postre guarda su ícono como `p:NN` (por ejemplo `p:20` es el cupcake rosa) en el campo `emoji`; los postres que ya tenían un emoji siguen mostrándolo. En «Nuevo postre» se elige entre los 52 íconos o los emojis.
- **Íconos dulces de la interfaz:** `D.CANDY` (en `js/brand.js`) dice qué ícono de trazo se reemplaza por una imagen: inicio, ventas (comprobante), cobros (tarjeta), compras (carrito), clientes, postres, proveedores (moto), reportes (medalla), ajustes (engrane), más, buscador y calendario. Para volver a un ícono de trazo basta con borrar su nombre de `D.CANDY`.
- **Estados de ánimo:** la mascota cambia de cara según el estado. En la factura y en el detalle de cada venta: pagada = riendo, por cobrar = saludando, abonada = guiño, vencida = llorando (`D.SALE_MOOD`); cada fila de venta lleva la carita pequeña. También: el inicio (pensativa si hay vencidas, feliz si todo está al día), los avisos, los diálogos de confirmación y la corona del postre más vendido.
- **Factura:** hoja tamaño carta con emisor, número y fechas, recuadros de cliente y condiciones, tabla numerada con el ícono del postre, totales, sello de estado, firmas («Elaboró» y «Recibí conforme») y pie con la mascota. Es un comprobante, no una factura electrónica.
- **Láminas originales de GPT** (con todas las piezas juntas): en `v3/`, `personaje-y-expresiones.webp`, `postres-y-elementos.webp` y `logos.webp`; antes, `tablero-identidad-gpt-v1.webp` y, en `v2/`, la hoja de recursos y las dos hojas de stickers. Las piezas salen recortadas de ahí: el personaje mide unos 650×1030 px, los logos unos 500 px, las expresiones unos 250 px y los íconos de postres unos 125 px. En `PIEZAS-ALTA-RESOLUCION.md` están los prompts para pedir una pieza por imagen a mayor tamaño.
- **Recortar láminas nuevas:** `.dev/proc.js` (se carga desde el navegador con el servidor `.dev/serve.py`) separa las piezas de una lámina transparente, quita los restos de las rayas punteadas y genera busto, mosaico e íconos de la app.
- **Versión vectorial anterior:** el personaje dibujado en código (`js/character.js`) y los logos en SVG/PNG de `assets/brand/` quedan de respaldo; la app ya no los muestra.
- **Portafolio de imagen:** presentación de 14 láminas (idea, tablero de GPT, logo, elementos, personaje, hoja, expresiones, poses, stickers, colores, tipografía, aplicaciones y reglas de uso).
- La app usa Nunito para el texto y Titan One para títulos y cifras grandes; ambas se guardan en el dispositivo la primera vez que se abre con internet, para que funcionen sin conexión.
- Cuando se defina la paleta definitiva, hay que cambiar el color de marca de la app (Ajustes → Apariencia o `js/store.js`) y revisar que el ícono y el logo de GPT combinen. Los PNG de GPT no cambian de color solos.
- El logo de GPT trae sus propias letras; Titan One se usa en los títulos y las cifras de la app y en la factura.