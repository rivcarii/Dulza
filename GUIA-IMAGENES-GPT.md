# Dulza · Loop para generar las imágenes en GPT

> **Actualización:** el personaje oficial ya es el que generó GPT. Para pedir piezas nuevas usa **`PIEZAS-ALTA-RESOLUCION.md`** y adjunta las láminas oficiales (carpeta `referencias-oficiales/`). Esta guía queda como referencia del método (el bucle y la lista de control); **ignora la «BIBLIA DEL PERSONAJE» y las imágenes de la carpeta antigua**, porque describen el dibujo vectorial anterior.

Esta guía es un **bucle de trabajo**: pegas un bloque fijo + el prompt de cada pieza, generas, evalúas con una lista de control, corriges **una cosa por vuelta** y guardas la ganadora. Después me traes los resultados aquí y yo los pongo en el portafolio, en la app y en los logos.

> **Regla de oro:** GPT dibuja bien personajes y escenas, pero **escribe mal las letras y se desvía de un diseño** entre imágenes. Por eso:
> 1. Siempre adjunta una **imagen de referencia** del personaje (ya te dejé las mías).
> 2. **No le pidas texto** en la imagen. El nombre «Dulza» (Titan One) y los textos los pongo yo aquí, con la tipografía exacta.

---

## 0. Antes de empezar (una sola vez)

**Sube a GPT estas imágenes de referencia** (están en `assets/brand/referencias-gpt/`):

| Archivo | Para qué |
| --- | --- |
| `01-personaje-completo.png` | Diseño exacto del personaje (cuerpo completo) |
| `02-personaje-busto.png` | Cara, gorro y cabello de cerca |
| `03-expresion-*.png` (4) | Cómo cambian los ojos y la boca |
| `04-logo-vertical.png` | Cómo se ve el logo actual (solo referencia de color y estilo) |
| `05-letras-dulza.png` | Letras de caramelo (solo referencia, no las copies) |

**Usa ChatGPT con generación de imágenes.** Abre un chat nuevo por cada serie (personaje, expresiones, poses, stickers, aplicaciones). Si el chat se alarga y el personaje empieza a cambiar, abre otro y adjunta de nuevo la hoja maestra aprobada.

**Pega esto al inicio de cada chat** (prompt de arranque):

```
Vas a generar ilustraciones de la mascota «Dulza», de una repostería. Reglas para TODO este chat:
- Responde solo con la imagen (sin explicaciones largas).
- Mantén EXACTAMENTE el diseño del personaje de la imagen adjunta y de la BIBLIA DEL PERSONAJE que te voy a dar.
- NO escribas texto, letras, números ni marcas de agua dentro de la imagen.
- Cuando te pida una corrección, cambia SOLO lo que pido y deja todo lo demás igual.
- Estilo: kawaii con influencia anime, contorno marrón oscuro limpio, colores planos con sombreado suave tipo cel-shading.
```

---

## 1. Bloque FIJO (pégalo en cada prompt)

### BIBLIA DEL PERSONAJE

```
PERSONAJE «Dulza»: pastelera kawaii de estilo anime, proporciones chibi (cabeza grande, cuerpo pequeño, cabeza ≈ 45% de la altura), joven y femenina.
- Piel: tez morena cálida, café con leche (#BF7C4E), con rubor rosado en las mejillas.
- Ojos: muy grandes y brillantes de anime, color miel/ámbar con degradado (oscuro arriba, caramelo claro abajo), dos brillos blancos y una chispa; pestañas marcadas; ambos ojos del mismo tamaño y simétricos; cejas pequeñas.
- Boca: pequeña, sonrisa abierta alegre. Nariz mínima.
- Cabello: largo color chocolate (#5A2E1B) con flequillo en picos y dos coletas bajas atadas con lazos color mora (#8F4DFF). Las puntas de las coletas se degradan suavemente a caramelo (#E2A24C).
- Gorro: gorro de panadera BOMBACHO (muy esponjoso, ancho, tipo nube), blanco, con manchas irregulares color mora (#8F4DFF y #5A1FC2) como si fueran manchas de moras, y un pequeño broche de tres moras con una hoja verde.
- Ropa: suéter de punto color fresa (#FF8FBB) con mangas amplias y puños acanalados; delantal blanco de peto con volante festoneado y un parche rosa (#D9366F) vacío en el pecho.
- Accesorio habitual: un cupcake de mora (papel morado, crema lila, tres moras encima).
- Zapatos chocolate con calcetines blancos.
Paleta: fresa #FF3D8B, fresa oscura #C4165F, mora #8F4DFF, mora oscura #5A1FC2, caramelo #E2A24C, chocolate #5A2E1B, contorno #3B1D10, algodón #FFE6F1, ciruela #3A1230.
```

### REGLAS FIJAS

```
REGLAS: sin texto ni letras en la imagen (el parche del delantal va vacío), sin marcas de agua, un solo personaje, manos simples estilo chibi (sin dedos extra), contorno limpio y grueso, colores planos, fondo liso y sin sombras en el piso, mismo diseño exacto que la imagen de referencia.
```

> **Fondo:** pide siempre «fondo transparente (PNG)». Si GPT entrega fondo blanco o cuadriculado, pídele «fondo blanco liso 100% plano, sin degradado ni sombras»; yo lo recorto aquí.

---

## 2. Prompts por pieza

### P1 · Hoja maestra (la más importante)

Adjunta `01-personaje-completo.png` y `02-personaje-busto.png`.

```
Usa la imagen adjunta como referencia exacta del personaje. Redibújala como ilustración final de alta calidad, con el mismo diseño, la misma paleta y las mismas proporciones, pero con más detalle en ojos, cabello (mechones y brillos) y telas.
Entrega una HOJA DE PERSONAJE horizontal (1536×1024) con 3 vistas del cuerpo completo: frente, tres cuartos y espalda, alineadas sobre fondo liso.
[pegar BIBLIA DEL PERSONAJE]
[pegar REGLAS FIJAS]
Genera 4 variantes.
```

*Si no tienes ganas de adjuntar:* cambia la primera línea por «Crea desde cero al siguiente personaje:» y deja la biblia.

### P2 · Expresiones (6 bustos)

Adjunta la hoja maestra aprobada (P1) y `03-expresion-*.png`.

```
Con el mismo personaje de la imagen adjunta, crea una lámina de 6 expresiones en cuadrícula 3×2, solo busto (cabeza, gorro y hombros), mismo tamaño y misma posición en cada casilla, fondo liso:
1) contenta (sonrisa abierta, por defecto)
2) radiante (ojos cerrados en arco ^ ^, sonrisa grande)
3) guiño (un ojo cerrado, sonrisa traviesa)
4) sorpresa (ojos más grandes, boca en «o»)
5) tranquila (ojos entrecerrados, sonrisa suave)
6) pensativa (mirada hacia arriba, un dedito en la barbilla, boca pequeña)
Cambia solo ojos, cejas y boca; todo lo demás idéntico.
[pegar REGLAS FIJAS]
```

### P3 · Poses de acción (una por imagen, cuerpo completo)

Adjunta la hoja maestra. Cambia la línea de la pose:

```
Mismo personaje de la imagen adjunta, cuerpo completo, en esta pose: [POSE].
[pegar REGLAS FIJAS]
Genera 2 variantes.
```

Poses (una por vuelta):
- entregando con las dos manos una caja rosa de postres atada con un lazo
- mostrando un celular con la pantalla en blanco (para facturas y WhatsApp), guiñando
- contando monedas rosadas sobre el mostrador, concentrada
- anotando un pedido en una libreta con un lápiz
- celebrando con los brazos arriba y confeti de colores
- durmiendo abrazada a un cupcake, con una «z» sin letras (solo burbujitas) — para pantallas vacías
- sacando una bandeja de brownies del horno con guantes de cocina
- cobrando con cariño: sonriendo, una mano extendida con la palma hacia arriba

### P4 · Stickers de WhatsApp (pack de 12)

```
Con el mismo personaje de la imagen adjunta, crea una lámina de 12 stickers (cuadrícula 4×3), cada uno con borde blanco grueso tipo pegatina y fondo transparente, cabeza y torso, expresiones y gestos distintos: saludando, gracias con las manos en el pecho, corazón con las manos, pulgar arriba, brindando con un cupcake, llorando de felicidad, enojada con cariño (mofletes inflados), cansada, enamorada (ojos de corazón), pensando, celebrando, mandando un beso.
SIN texto dentro de los stickers.
[pegar REGLAS FIJAS]
```

*(Si quieres palabras como «Gracias», lo hago yo aquí con Titan One para que no queden con errores.)*

### P5 · Ícono de la app (isotipo)

```
Con el personaje de la imagen adjunta, crea un ícono de app cuadrado de 1024×1024: cabeza y gorro bombacho centrados, hombros y parte del delantal cortados por el borde inferior; fondo en degradado diagonal de rosa (#FF8FBB a #C4165F) con 5 chispitas (sprinkles) pequeñas de color blanco, amarillo y lila. Sin esquinas redondeadas ni transparencia (la app aplica la máscara). Sin texto.
[pegar REGLAS FIJAS]
```

### P6 · Sello / emblema para etiquetas

```
Con el personaje de la imagen adjunta, crea un emblema circular (sello): busto del personaje en el centro, rodeado por una corona de moras, hojas verdes y sprinkles, con un anillo exterior rosa. Deja una banda curva VACÍA en la parte inferior para escribir el nombre más tarde. Fondo transparente. Sin texto.
[pegar REGLAS FIJAS]
```

### P7 · Letras «Dulza» (opcional: lo recomendado es que las haga yo)

Adjunta `05-letras-dulza.png` solo como referencia de estilo.

```
Escribe SOLO la palabra «Dulza» (cinco letras: D, u, l, z, a, exactamente así) como letras gruesas y redondeadas tipo caramelo duro rosa: degradado fresa (#FF9EC4 arriba, #FF3D8B al centro, #C4165F abajo), rayas diagonales blancas translúcidas, brillo de vidrio arriba, contorno grueso fresa oscura (#C4165F) y una leve inclinación juguetona en cada letra. Fondo transparente. Verifica la ortografía antes de entregar.
```

### P8 · Aplicaciones (maquetas con espacio para texto vacío)

```
Maqueta fotográfica limpia de [PIEZA] de una repostería kawaii en rosa fresa, mora y caramelo, con la mascota del personaje adjunto ilustrada en [DÓNDE]. Deja el espacio del nombre VACÍO (sin texto). Fondo claro y suave.
```

Piezas: caja de cupcakes con ventana · bolsa kraft con lazo · etiqueta redonda sobre un frasco · vaso de postre con tapa · banner para el perfil de WhatsApp Business (16:9).

### P9 · Patrón repetible (fondos de la app y empaques)

```
Patrón repetible sin costuras (seamless) de moras, hojas verdes, sprinkles y cupcakes pequeños, estilo kawaii plano, sobre fondo algodón (#FFE6F1), paleta fresa, mora y caramelo, 1024×1024. Sin texto ni personajes.
```

---

## 3. El loop (qué hacer con cada pieza)

```
PARA CADA PIEZA (máximo 3 vueltas):
  1. Pega: prompt de arranque (solo al abrir el chat) + prompt de la pieza + bloque FIJO + imagen de referencia.
  2. Pide 2–4 variantes.
  3. Evalúa con la LISTA DE CONTROL (abajo) y elige la mejor.
  4. Si falla algo → toma la imagen elegida y escribe UNA frase de corrección (banco de frases).
     Ejemplo: «Misma imagen, cambia solo el tono de piel: más oscuro y cálido (#BF7C4E).»
  5. Si pasa todo → guarda con el nombre acordado y pasa a la siguiente pieza.
  6. Si tras 3 vueltas no pasa → cambia de enfoque: pide busto en vez de cuerpo, quita el delantal con parche,
     o dibuja las manos bajo el cupcake.
```

### Lista de control (todo debe estar en ✓)

1. Piel morena cálida (no pálida, no gris ni naranja intenso).
2. Cabello chocolate con **puntas caramelo** visibles, degradado limpio (no rayas).
3. Gorro **bombacho** blanco con **manchas moradas** (no un gorro de chef alto y liso).
4. Suéter rosa visible en las mangas y delantal blanco con parche vacío.
5. Ojos anime grandes, simétricos, con dos brillos.
6. Manos simples, sin dedos de más.
7. Proporciones chibi (cabeza grande).
8. Sin texto, letras raras ni marcas de agua.
9. Contorno limpio y colores planos (que se pueda vectorizar o hacer sticker).
10. Fondo liso o transparente, con recorte limpio.

### Banco de frases de corrección (una por vuelta)

- «Misma imagen, cambia solo el tono de piel: más oscuro y cálido, café con leche (#BF7C4E).»
- «Misma imagen, haz que las puntas de las coletas se degraden a caramelo (#E2A24C) de forma suave.»
- «Misma imagen, el gorro debe ser más bombacho y esponjoso, ancho como una nube, con más manchas moradas irregulares.»
- «Misma imagen, quita todo el texto y deja el parche del delantal vacío.»
- «Misma imagen, ojos más grandes y simétricos, con dos brillos blancos y una chispa.»
- «Misma imagen, dibuja las manos más simples, estilo chibi, sin dedos separados.»
- «Misma imagen, el suéter debe ser rosa fresa (#FF8FBB) y se tiene que ver en las mangas.»
- «Misma imagen, contorno marrón oscuro más grueso y limpio, colores más planos.»
- «Misma imagen, más proporción chibi: cabeza más grande y cuerpo más pequeño.»
- «Misma imagen, fondo blanco liso 100% plano, sin sombras en el piso.»
- «Misma imagen, mantén exactamente el diseño de la referencia adjunta; no inventes accesorios.»

---

## 4. Cómo guardar y entregarme los resultados

**Nombres de archivo:** `dulza_01_hoja-maestra_v3.png`, `dulza_02_expresiones_v2.png`, `dulza_03_pose-entrega_v1.png`, `dulza_04_stickers_v2.png`, `dulza_05_icono_v1.png`…

**Tráeme aquí (en este chat):**
1. Las imágenes **ganadoras** (adjuntas, una por pieza).
2. Si algo no pasó la lista de control, dime cuál punto falla.
3. Dime dónde las quieres: portada, personaje, expresiones, ícono de la app, factura…

**Yo me encargo de:**
- recortar fondos y ajustar tamaños;
- poner la tipografía exacta («Dulza» en Titan One, textos en Nunito) encima de tus imágenes;
- actualizar el portafolio con las imágenes de GPT;
- reemplazar el personaje de la app y el ícono, si quieres usar tu versión de GPT en lugar del dibujo vectorial.

**Para ver una imagen en la app de inmediato:** Ajustes → *Logo y mascota* → *Subir*. Se usa en pantallas vacías, bienvenida y factura.

**Tamaños útiles para pedir:** hoja maestra 1536×1024 · personaje solo 1024×1536 · ícono 1024×1024 · stickers 512×512 (WhatsApp los pide en WebP, con fondo transparente y menos de 100 KB: eso lo convierto yo) · banner 1920×1080.
