# Dulza · Ventas y compras

App web instalable (PWA) para llevar las ventas a plazo, las compras, los cobros y las facturas de un emprendimiento de postres. Funciona sin internet, guarda los datos en el propio dispositivo y se adapta a teléfono, tableta y computadora. Las facturas se envían por WhatsApp.

HTML, CSS y JavaScript sin dependencias ni paso de compilación.

## Probarla en local

```bash
python .dev/serve.py 5173
```

Luego abre <http://localhost:5173>. Cualquier servidor de archivos estáticos sirve; el modo sin internet y la instalación necesitan `https` o `localhost`.

## Más información

La guía completa está en [LEEME.md](LEEME.md): cómo instalarla en el celular, respaldos, marca y personaje, íconos de postres, estados de ánimo de la mascota y cómo publicar una actualización (subir `VERSION` en `sw.js`).

Para pedir más imágenes de la marca en alta resolución: [PIEZAS-ALTA-RESOLUCION.md](PIEZAS-ALTA-RESOLUCION.md) y [GUIA-IMAGENES-GPT.md](GUIA-IMAGENES-GPT.md).

## Estructura

```
index.html · manifest.webmanifest · sw.js   entrada, instalación y modo sin internet
css/                                        estilos
js/                                         datos, vistas, factura, marca
assets/                                     íconos de la app y piezas de la marca (assets/brand/gpt/v3 es lo que usa la app)
.dev/                                       servidor local y herramientas para recortar láminas y armar entregables
```

Los datos de ejemplo del código son ficticios.
