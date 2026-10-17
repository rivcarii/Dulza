# Dulza · Piezas sueltas para pedirle a GPT en alta resolución

El personaje oficial es el que generó GPT. Las láminas que me pasaste ya están en la app, pero **cada pieza sale del tamaño que tenía en su lámina**: el personaje de cuerpo completo mide unos 650×1030 px, los logos unos 500 px, las expresiones unos 250 px, los íconos de postres unos 125 px y las poses de la hoja de recursos unos 155×205 px. Los stickers salen bien (550–740 px). Lo más chico, y lo primero que conviene rehacer, son los íconos de postres y las poses.

**La regla para ganar resolución:** GPT entrega como máximo 1536 px en el lado largo. Si pides **una pieza por imagen**, esa pieza usa todos los píxeles. Si pides una lámina con 12 piezas, cada una queda diminuta.

| Formato de GPT | Tamaño | Úsalo para |
| --- | --- | --- |
| Cuadrado | 1024×1024 | busto, ícono, expresión suelta, patrón |
| Vertical | 1024×1536 | personaje de cuerpo completo, pose suelta |
| Horizontal | 1536×1024 | logo, láminas de 2 a 4 piezas |

---

## Cómo pedirlo (aplica a todas)

1. **Un chat nuevo por serie** (personaje, logo, expresiones, poses, elementos). Si el personaje empieza a cambiar, abre otro chat y vuelve a adjuntar las referencias.
2. **Adjunta siempre** la lámina de referencia que se indica en cada pieza. La más importante es la **hoja de recursos** (la de logo, 5 poses y 7 expresiones) y el **tablero de identidad**.
3. **Pide fondo transparente (PNG).** Si GPT entrega fondo blanco o cuadriculado, pídele «fondo blanco liso, 100 % plano, sin degradados ni sombras» y yo lo recorto aquí.
4. **Sin texto en la imagen**, salvo el logo. GPT escribe mal las letras: en el tablero salió «Ceramelo» en vez de caramelo y los códigos hex de la piel no son fiables. El nombre «Dulza» y los demás textos los pongo yo con Titan One y Nunito.
5. **Pide 4 variantes** y elige la que conserve mejor el diseño. Corrige **una sola cosa por vuelta**.

**Prompt de arranque** (pégalo al inicio de cada chat):

```
Vas a generar ilustraciones de la mascota «Dulza», de una repostería. Reglas para TODO este chat:
- La imagen adjunta es el diseño OFICIAL del personaje: mantén exactamente su cara, ojos, tono de piel, cabello chocolate con puntas caramelo, gorro de panadera esponjoso con manchas moradas de mora, suéter y delantal blanco. No lo rediseñes.
- Estilo kawaii con influencia anime, contorno limpio y colores planos con sombreado suave.
- Fondo transparente (PNG), sin sombras en el piso.
- NO escribas texto, letras ni números dentro de la imagen (excepto cuando te pida el logo).
- Responde solo con la imagen. Si te pido una corrección, cambia solo eso y deja todo lo demás igual.
```

---

## Prioridad A · Lo que más mejora la app y el ícono

### 1. Personaje de cuerpo completo (1024×1536)

Reemplaza a `v3/personaje.png` (hoy 650×1030 px). Referencia: la lámina del personaje con las expresiones y la hoja de recursos.

```
Dibuja al personaje oficial de cuerpo completo, de pie, de frente con el cuerpo ligeramente girado, sonriendo y sosteniendo un cupcake de mora con una mano. Que se vea completo, con el cabello, el gorro y los zapatos sin recortar, y con aire alrededor. Imagen vertical 1024×1536, fondo transparente. Sin texto.
Genera 4 variantes.
```

### 2. Busto (1024×1024)

Reemplaza a `v3/busto.png`, que hoy es la mitad de arriba del cuerpo completo. Se usa en el encabezado de inicio, en la factura y como avatar.

```
Dibuja el busto del personaje oficial: cabeza con gorro completo y hombros, mirando al frente, sonrisa feliz, con el delantal y el logo del pecho visibles. Centrado, con margen alrededor, cuadrado 1024×1024, fondo transparente. Sin texto adicional.
Genera 4 variantes.
```

### 3. Ícono de la app (1024×1024)

Reemplaza a `v3/isotipo.png`, que hoy sale del cuerpo completo sobre un mosaico rosa. Con esto yo regenero los íconos de la app (192, 512, maskable, Apple y favicon).

```
Dibuja el ícono de una app: la cara del personaje oficial con su gorro de panadera, centrada y bien grande, sobre un fondo rosa fresa liso que cubra todo el cuadrado (sin esquinas redondeadas ni bordes). Deja un margen del 15 % alrededor del personaje para que no se recorte. Cuadrado 1024×1024. Sin texto.
Genera 4 variantes.
```

### 4. Logo principal (1536×1024)

Reemplaza a `v3/logos/logo-personaje.png` (hoy unos 500 px). Es lo único donde sí hay texto, así que **revisa la ortografía**: debe decir «Dulza», con ese orden de letras.

```
Dibuja el logo de la marca de repostería «Dulza»: el nombre «Dulza» en letras redondeadas, gruesas y de aspecto de caramelo, con el personaje oficial sentado o asomado junto al nombre. Debe leerse exactamente «Dulza» (cinco letras: D-u-l-z-a). Logo horizontal sobre fondo transparente, sin eslogan ni otros textos.
Genera 4 variantes.
```

Si GPT escribe mal el nombre en las cuatro, me traes la mejor ilustración sin el nombre y yo pongo «Dulza» con Titan One.

### 5. Logo en versiones (una por imagen, 1536×1024)

Pídelas con el logo ganador adjunto.

```
Con el logo adjunto, entrégalo en esta versión sin cambiar el dibujo ni las letras:
a) TODO EN BLANCO, silueta de una sola tinta, para fondos oscuros.
b) UNA SOLA TINTA en color ciruela oscuro, para sellos y papelería.
c) Solo el nombre «Dulza», sin el personaje.
Fondo transparente. Una versión por imagen.
```

---

## Prioridad B · Para completar portafolio y stickers

### 6. Expresiones sueltas (2×2 por imagen, 1536×1024)

Cada expresión queda en unos 750 px, tres veces más que los 250 px de ahora. La app usa 7 de las 16 expresiones en estados vacíos y avisos (feliz, radiante, guiño, sorpresa, dormida, enamorada y pensativa); pide primero esas.

```
Dibuja 4 expresiones del busto del personaje oficial en una cuadrícula 2×2, bien separadas entre sí, misma escala y mismo encuadre (cabeza con gorro y hombros): 
1) feliz con sonrisa abierta, 2) radiante con los ojos cerrados de felicidad y un corazón, 3) guiño con un ojo cerrado, 4) sorpresa con la boca en «o».
Fondo transparente, sin texto. Imagen horizontal 1536×1024.
```

Segunda imagen: **dormida con un cupcake**, **enamorada con ojos de corazón**, **con cupcake** y **pensativa con un signo de pregunta**. Las otras (llorando, enojada, besito, abrazando un corazón, saludando, con batidor, comiendo pastel y con el pastel y la señal de paz) se piden igual si las necesitas.

### 7. Poses sueltas (3 por imagen, 1536×1024)

Cada pose queda en unos 500×1000 px (hoy unos 155×205). Con 2 imágenes cubres las 5 que tienes y una más.

```
Dibuja 3 poses de cuerpo completo del personaje oficial, una al lado de la otra, bien separadas, misma escala:
1) guiñando un ojo y sosteniendo un cupcake, 2) con un batidor, 3) cargando una bandeja con un pastel decorado.
Fondo transparente, sin texto, sin recortar el cabello ni los zapatos. Imagen horizontal 1536×1024.
```

Segunda imagen: **sentada con las manos en las mejillas**, **sentada guiñando un ojo** y **saludando con la mano**.

### 8. Stickers para los estados de la app (1024×1024)

Los de postres ya están en buena resolución. Estos son nuevos y sirven para avisos y para enviar por WhatsApp. Uno por imagen, estilo «sticker» con borde blanco grueso.

```
Dibuja un sticker del personaje oficial con borde blanco grueso alrededor de la silueta, sobre fondo transparente. Cuadrado 1024×1024, sin texto:
a) «Pagado»: feliz, haciendo un gesto de OK con una mano y un corazón.
b) «Por cobrar»: tierna, con las manos juntas pidiendo con cariño, y una libreta pequeña.
c) «Gracias»: haciendo una reverencia con un corazón.
d) «En camino»: llevando una caja de postres.
e) «Cumpleaños»: con un pastel con velitas.
```

Cuando los tengas, me dices qué palabras quieres escribir (Pagado, Gracias…) y yo se las pongo con Nunito o Titan One, para que no salgan con errores.

---

## Prioridad C · Decoración y empaques

### 9. Elementos sueltos (3×3, 1536×1024)

```
Dibuja 9 elementos decorativos de repostería, cada uno solo, bien separados, misma escala, en el mismo estilo kawaii del personaje oficial: cupcake de mora, corazón rosa, estrella dorada, moño rosa, perlas doradas, goteo de glaseado, corazón de caramelo, ramita de moras y manga pastelera. Fondo transparente, sin texto. Horizontal 1536×1024.
```

### 10. Íconos de postres (3×3, 1536×1024)

Hoy miden unos 125 px: alcanzan para el catálogo y la factura, pero se ven blandos en empaques o impresos. Con 9 por imagen cada uno queda en unos 500 px; son 42 en total, así que pide primero los que más vendes.

```
Dibuja 9 íconos de postres en una cuadrícula 3×3, cada uno solo, bien separados, misma escala y mismo estilo kawaii del personaje oficial, con contorno marrón oscuro limpio y un corazón rosa pequeño: torta de fresa, porción de torta de chocolate, brownie, flan de caramelo, cupcake rosa, cono de helado, vaso de postre con fresas, paleta de chocolate y ensalada de frutas en vaso. Fondo transparente, sin texto. Horizontal 1536×1024.
```

### 11. Patrones que se repiten (1024×1024, uno por imagen)

```
Dibuja un patrón sin costuras (seamless, que se repita sin que se noten los bordes) de moras y cupcakes pequeños sobre fondo rosa muy pálido, estilo kawaii, sin texto. Cuadrado 1024×1024.
```

Otras dos versiones: **corazones y perlas doradas**, y **cuadros vichy rosa con moras**.

### 12. Aplicaciones (una por imagen, 1024×1024)

```
Dibuja en vista frontal, sobre fondo transparente y sin texto: a) una caja de postres rosa con una etiqueta en blanco, b) un vaso de postre con crema y moras, c) un frasco de postre con tapa, d) una bolsa de papel pequeña. Con el estilo del personaje oficial, bien centrados y sin cortar.
```

---

## Cuando tengas las piezas

- **Guárdalas con estos nombres** y arrástralas a este chat; yo las recorto, las integro y actualizo el portafolio.
- **Si prefieres hacerlo tú:** copia el PNG con el mismo nombre en `assets/brand/gpt/` y la app lo usa sin tocar código.

| Pieza | Nombre del archivo |
| --- | --- |
| Cuerpo completo | `v3/personaje.png` |
| Busto | `v3/busto.png` |
| Ícono | `v3/isotipo.png` (los íconos de la app se regeneran aparte) |
| Logo con personaje | `v3/logos/logo-personaje.png` |
| Solo el nombre | `v3/logos/logo-nombre.png` |
| Expresiones | `v3/expresiones/expresion-01.png` a `expresion-16.png` |
| Íconos de postres | `v3/postres/postre-01.png` a `postre-42.png` |
| Stickers de postres | `v2/sticker-pastel-b.png`, `v2/sticker-helado-b.png`, `v2/sticker-flan-b.png`, `v2/sticker-postres-frios-b.png` |

Todo dentro de `assets/brand/gpt/`. Los íconos de la app (192, 512, maskable, Apple y favicon) **no se actualizan solos** al cambiar el personaje o el isotipo: pásame el nuevo y yo los regenero.

Después de cambiar archivos, sube la versión de la caché en `sw.js` (`VERSION`) para que quien ya instaló la app reciba las imágenes nuevas.
