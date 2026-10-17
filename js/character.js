/* Dulza · personaje kawaii (estilo anime) dibujado en SVG.
   D.art.character({ mood, view, size, brand, wordmark })
   mood: 'happy' | 'joy' | 'wink' | 'wow'    view: 'full' | 'bust' | 'head' */
(function () {
  'use strict';
  const D = (window.D = window.D || {});
  D.art = D.art || {};

  /* Paleta fija del personaje (la ropa toma el color de marca) */
  const P = {
    line: '#3b1d10',
    skin: '#bf7c4e', skinShade: '#a4673c', skinLight: '#d89d6b', blush: '#ff6b81',
    hair: '#5a2e1b', hairDark: '#3f1f12', hairLight: '#86492c', caramel: '#e2a24c', caramelDeep: '#c9782a',
    hat: '#ffffff', hatShade: '#e9def3',
    mora: '#8f4dff', moraDeep: '#5a1fc2', moraLight: '#bd93ff',
    apron: '#ffffff', apronShade: '#ebe3ee',
    mouth: '#7a2a2a', tongue: '#ff8a96',
  };

  const VIEWS = {
    full: '0 -30 600 850',
    bust: '60 -30 480 600',
    head: '90 -30 420 500',
  };

  D.art.CHAR_VIEWS = VIEWS;
  D.art.character = function (o = {}) {
    const id = 'c' + Math.random().toString(36).slice(2, 7);
    const mood = o.mood || 'happy';
    const view = o.view || 'full';
    const brand = o.brand || (D.data && D.data.settings && D.data.settings.brand) || '#ff3d8b';
    const mix = D.color ? D.color.mix : (a) => a;
    const sw = mix(brand, '#ffffff', 0.38); // suéter
    const swShade = mix(brand, '#ffffff', 0.08);
    const swLight = mix(brand, '#ffffff', 0.6);
    const badge = mix(brand, '#000000', 0.05);
    const size = o.size ? `width="${o.size}"` : '';
    const L = P.line;
    const sk = P.skin;

    /* ---------- Ojos ---------- */
    const iris = (cx, cy) => `
      <ellipse cx="${cx}" cy="${cy}" rx="35" ry="43" fill="url(#${id}i)"/>
      <ellipse cx="${cx}" cy="${cy - 1}" rx="16" ry="22" fill="#2a1208"/>
      <path d="M${cx - 35} ${cy - 2} A35 43 0 0 1 ${cx + 35} ${cy - 2} Q${cx} ${cy - 32} ${cx - 35} ${cy - 2} Z" fill="#2a1208" opacity=".38"/>
      <ellipse cx="${cx}" cy="${cy + 25}" rx="22" ry="11" fill="#ffd98a" opacity=".6"/>
      <circle cx="${cx - 13}" cy="${cy - 16}" r="12" fill="#fff"/>
      <circle cx="${cx + 14}" cy="${cy + 17}" r="6" fill="#fff"/>
      <circle cx="${cx + 4}" cy="${cy + 1}" r="3" fill="#fff" opacity=".9"/>
      <path transform="translate(${cx + 17} ${cy - 20}) scale(.55)" d="M0 -14 C2 -4 4 -2 14 0 C4 2 2 4 0 14 C-2 4 -4 2 -14 0 C-4 -2 -2 -4 0 -14 Z" fill="#fff" opacity=".9"/>`;
    const openEye = (cx, outer) => `
      ${iris(cx, 330)}
      <path d="M${cx - 40} 334 C${cx - 38} 296 ${cx - 6} 284 ${cx + 8} 286 C${cx + 29} 288 ${cx + 40} 310 ${cx + 40} 334" fill="none" stroke="${L}" stroke-width="9.5" stroke-linecap="round" transform="${outer === 1 ? `translate(${2 * cx} 0) scale(-1 1)` : ''}"/>
      <path d="M${cx + outer * 38} 324 L${cx + outer * 51} 312 M${cx + outer * 38} 336 L${cx + outer * 51} 334" stroke="${L}" stroke-width="5" stroke-linecap="round"/>
      <path d="M${cx - 26} 366 Q${cx} 378 ${cx + 26} 366" fill="none" stroke="${P.skinShade}" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
    const closedEye = (cx, outer) => `
      <path d="M${cx - 32} 338 Q${cx} 298 ${cx + 32} 338" fill="none" stroke="${L}" stroke-width="9.5" stroke-linecap="round"/>
      <path d="M${cx + outer * 32} 332 L${cx + outer * 45} 321" stroke="${L}" stroke-width="5" stroke-linecap="round"/>`;

    const sleepyEye = (cx, outer) => `
      <path d="M${cx - 30} 326 Q${cx} 354 ${cx + 30} 326" fill="none" stroke="${L}" stroke-width="9.5" stroke-linecap="round"/>
      <path d="M${cx + outer * 30} 326 L${cx + outer * 42} 336" stroke="${L}" stroke-width="5" stroke-linecap="round"/>`;
    let eyes;
    if (mood === 'sleepy') eyes = sleepyEye(238, -1) + sleepyEye(362, 1);
    else if (mood === 'joy') eyes = closedEye(238, -1) + closedEye(362, 1);
    else if (mood === 'wink') eyes = openEye(238, -1) + closedEye(362, 1);
    else eyes = openEye(238, -1) + openEye(362, 1);

    /* ---------- Boca ---------- */
    const mouth =
      mood === 'sleepy'
        ? `<path d="M282 394 Q300 408 318 394" fill="none" stroke="${L}" stroke-width="4.5" stroke-linecap="round"/>`
        : mood === 'wow'
        ? `<ellipse cx="300" cy="396" rx="13" ry="16" fill="${P.mouth}" stroke="${L}" stroke-width="4"/><ellipse cx="300" cy="404" rx="8" ry="6" fill="${P.tongue}"/>`
        : mood === 'joy'
        ? `<path d="M276 384 Q300 390 324 384 Q322 418 300 418 Q278 418 276 384 Z" fill="${P.mouth}" stroke="${L}" stroke-width="4" stroke-linejoin="round"/><path d="M288 410 Q300 400 312 410 Q310 417 300 417 Q290 417 288 410 Z" fill="${P.tongue}"/>`
        : `<path d="M282 388 Q300 391 318 388 Q316 410 300 410 Q284 410 282 388 Z" fill="${P.mouth}" stroke="${L}" stroke-width="4" stroke-linejoin="round"/><path d="M291 404 Q300 396 309 404 Q307 410 300 410 Q293 410 291 404 Z" fill="${P.tongue}"/>`;

    /* ---------- Cabello ---------- */
    const pigtail = `
      <path d="M152 336 C104 344 66 402 74 478 C80 534 62 578 90 628 C104 604 118 632 134 616 C148 596 158 606 170 586 C196 520 186 410 172 340 Z" fill="url(#${id}h)" stroke="${P.hairDark}" stroke-width="4.5" stroke-linejoin="round"/>
      <path d="M128 372 C108 420 104 480 110 540 M150 380 C140 440 142 500 150 560 M96 440 C92 500 98 560 108 600" fill="none" stroke="${P.hairDark}" stroke-width="3.2" stroke-linecap="round" opacity=".55"/>
      <path d="M118 352 C94 392 86 440 90 484" fill="none" stroke="${P.hairLight}" stroke-width="7" stroke-linecap="round" opacity=".6"/>`;
    const tie = `
      <ellipse cx="156" cy="350" rx="26" ry="19" fill="${P.mora}" stroke="${L}" stroke-width="4.5" transform="rotate(-24 156 350)"/>
      <path d="M132 346 C140 340 150 342 156 350" fill="none" stroke="${P.moraLight}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="170" cy="362" r="5" fill="${P.moraDeep}"/>`;

    /* ---------- Gorro bombacho con manchas de mora ---------- */
    const blob = (x, y, s = 1, r = 0) => `<g transform="translate(${x} ${y}) scale(${s}) rotate(${r})">
      <path d="M-22 -4 C-20 -24 14 -28 22 -8 C28 8 6 26 -10 20 C-24 16 -26 6 -22 -4 Z" fill="${P.moraDeep}"/>
      <path d="M-14 -6 C-12 -18 10 -20 15 -8 C18 2 4 12 -6 9 C-14 6 -16 0 -14 -6 Z" fill="${P.mora}"/>
      <ellipse cx="-6" cy="-9" rx="6" ry="3" fill="${P.moraLight}" opacity=".85" transform="rotate(-20 -6 -9)"/></g>`;
    const berry = (x, y, r = 10) => `<g><circle cx="${x}" cy="${y}" r="${r}" fill="#3b1670" stroke="${L}" stroke-width="3"/>
      <circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.3}" fill="${P.moraLight}"/>
      <circle cx="${x + r * 0.2}" cy="${y + r * 0.35}" r="${r * 0.18}" fill="${P.moraLight}" opacity=".7"/></g>`;
    const hat = `
      <path d="M170 176 C120 164 92 104 138 70 C122 22 196 -8 238 18 C262 -16 340 -16 364 18 C406 -8 478 22 462 70 C508 104 480 164 430 176 C384 190 216 190 170 176 Z" fill="${P.hat}" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M186 168 C224 186 376 186 414 168 C384 150 216 150 186 168 Z" fill="${P.hatShade}" opacity=".9"/>
      <path d="M238 20 C226 70 224 120 236 160 M364 20 C376 70 378 120 366 160 M300 -6 C292 50 292 110 300 162" fill="none" stroke="${P.hatShade}" stroke-width="5" stroke-linecap="round"/>
      <path d="M142 74 C128 100 140 138 168 158 M458 74 C472 100 460 138 432 158" fill="none" stroke="${P.hatShade}" stroke-width="4.5" stroke-linecap="round" opacity=".8"/>
      ${blob(208, 66, 1.15, -12)}${blob(338, 36, 0.95, 20)}${blob(420, 108, 1.1, 8)}${blob(160, 126, 0.7, 30)}${blob(300, 124, 0.62, -10)}${blob(262, 28, 0.5, 0)}
      <ellipse cx="238" cy="80" rx="22" ry="9" fill="#fff" opacity=".55" transform="rotate(-18 238 80)"/>
      <path d="M170 176 C216 190 384 190 430 176 L430 200 C384 214 216 214 170 200 Z" fill="${P.hat}" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M182 196 C230 208 370 208 418 196" fill="none" stroke="${P.hatShade}" stroke-width="5" stroke-linecap="round"/>
      <g>${berry(440, 168, 11)}${berry(458, 186, 10)}${berry(430, 190, 9)}
      <path d="M446 158 C456 140 478 142 482 152 C470 160 456 162 446 158 Z" fill="#59c58b" stroke="${L}" stroke-width="3" stroke-linejoin="round"/></g>`;

    /* ---------- Cuerpo ---------- */
    const body = `
      <!-- piernas y zapatos -->
      <path d="M262 748 L262 788 L296 788 L296 748 Z M304 748 L304 788 L338 788 L338 748 Z" fill="${sk}" stroke="${L}" stroke-width="4.5" stroke-linejoin="round"/>
      <path d="M260 770 L298 770 L298 792 L260 792 Z M302 770 L340 770 L340 792 L302 792 Z" fill="#fff" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M250 806 C250 786 262 790 296 790 L298 806 Z M350 806 C350 786 338 790 304 790 L302 806 Z" fill="${P.hair}" stroke="${L}" stroke-width="4.5" stroke-linejoin="round"/>
      <path d="M254 800 L294 800 M306 800 L346 800" stroke="${P.hairLight}" stroke-width="4" stroke-linecap="round"/>
      <!-- cuello -->
      <path d="M268 420 L268 468 C268 482 332 482 332 468 L332 420 Z" fill="${P.skinShade}" stroke="${L}" stroke-width="4.5" stroke-linejoin="round"/>
      <!-- suéter -->
      <path d="M208 486 C204 468 238 456 268 456 L332 456 C362 456 396 468 392 486 C408 548 402 604 394 652 L206 652 C198 604 192 548 208 486 Z" fill="${sw}" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M250 466 C266 492 334 492 350 466 L350 480 C334 506 266 506 250 480 Z" fill="${swLight}" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M262 478 L264 492 M276 484 L277 498 M290 488 L290 502 M310 488 L310 502 M324 484 L323 498 M338 478 L336 492" stroke="${swShade}" stroke-width="3" stroke-linecap="round"/>
      <!-- delantal -->
      <path d="M244 470 C262 484 338 484 356 470 L378 604 C398 646 408 706 420 742 A20 15 0 0 1 380 742 A20 15 0 0 1 340 742 A20 15 0 0 1 300 742 A20 15 0 0 1 260 742 A20 15 0 0 1 220 742 A20 15 0 0 1 180 742 C192 706 202 646 222 604 Z" fill="${P.apron}" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M222 604 C250 616 350 616 378 604 L384 626 C350 640 250 640 216 626 Z" fill="${P.apronShade}" opacity=".85"/>
      <path d="M196 700 C196 712 204 724 214 732 M404 700 C404 712 396 724 386 732" fill="none" stroke="${P.apronShade}" stroke-width="5" stroke-linecap="round"/>
      <path d="M244 470 C246 456 256 448 270 444 M356 470 C354 456 344 448 330 444" fill="none" stroke="${L}" stroke-width="12" stroke-linecap="round"/>
      <path d="M244 470 C246 456 256 448 270 444 M356 470 C354 456 344 448 330 444" fill="none" stroke="${P.apron}" stroke-width="6" stroke-linecap="round"/>
      <!-- logo de Dulza en el delantal -->
      <g ${o.badge === false ? 'display="none"' : ''}>
        <rect x="252" y="512" width="96" height="38" rx="19" fill="${badge}" stroke="${L}" stroke-width="4"/>
        <path d="M264 522 C274 517 294 516 304 519" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".5"/>
        ${o.wordmark === false ? '' : `<text x="300" y="539" text-anchor="middle" font-family="'Titan One','Arial Rounded MT Bold','Trebuchet MS',sans-serif" font-size="21" fill="#fff" letter-spacing=".3">Dulza</text>`}
      </g>
      <!-- lazos de la cintura -->
      <path d="M222 606 C196 596 186 612 192 626 C204 624 216 620 224 612 Z M378 606 C404 596 414 612 408 626 C396 624 384 620 376 612 Z" fill="${P.apron}" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>
      <!-- cupcake de mora -->
      <g transform="translate(0 18)">
        <path d="M258 606 L342 606 L332 668 Q331 676 323 676 L277 676 Q269 676 268 668 Z" fill="${P.moraDeep}" stroke="${L}" stroke-width="4.5" stroke-linejoin="round"/>
        <path d="M276 610 L280 672 M300 610 L300 672 M324 610 L320 672" stroke="${P.mora}" stroke-width="5" stroke-linecap="round"/>
        <path d="M254 612 C246 594 262 584 280 586 C276 568 296 560 308 568 C324 560 344 572 336 588 C352 590 356 608 346 612 C326 620 274 620 254 612 Z" fill="#e6cdff" stroke="${L}" stroke-width="4.5" stroke-linejoin="round"/>
        <path d="M268 592 C282 598 318 598 332 592" fill="none" stroke="${P.moraLight}" stroke-width="4" stroke-linecap="round"/>
        <ellipse cx="282" cy="580" rx="8" ry="4" fill="#fff" opacity=".7" transform="rotate(-20 282 580)"/>
        ${berry(300, 556, 12)}${berry(318, 566, 10)}${berry(284, 568, 9)}
        <path d="M303 546 C312 532 330 534 334 542 C324 550 312 552 303 546 Z" fill="#59c58b" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>
      </g>
      <!-- brazos (mangas de suéter) y manos -->
      <path d="M214 480 C168 506 154 598 210 656 C224 666 250 658 264 642 C236 612 236 540 258 498 Z" fill="${sw}" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M386 480 C432 506 446 598 390 656 C376 666 350 658 336 642 C364 612 364 540 342 498 Z" fill="${sw}" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M186 540 C180 570 186 610 206 640 M414 540 C420 570 414 610 394 640" fill="none" stroke="${swShade}" stroke-width="3.5" stroke-linecap="round" opacity=".8"/>
      <path d="M210 652 C222 666 252 662 266 644 L254 632 C244 644 226 644 214 636 Z M390 652 C378 666 348 662 334 644 L346 632 C356 644 374 644 386 636 Z" fill="${swLight}" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M244 656 C230 652 222 668 236 678 C252 686 270 678 274 662 C268 652 254 650 244 656 Z M356 656 C370 652 378 668 364 678 C348 686 330 678 326 662 C332 652 346 650 356 656 Z" fill="${sk}" stroke="${L}" stroke-width="4.5" stroke-linejoin="round"/>`;

    /* ---------- Cabeza ---------- */
    const head = `
      <!-- orejas -->
      <ellipse cx="160" cy="334" rx="15" ry="24" fill="${sk}" stroke="${L}" stroke-width="4.5"/>
      <ellipse cx="440" cy="334" rx="15" ry="24" fill="${sk}" stroke="${L}" stroke-width="4.5"/>
      <!-- cara -->
      <path d="M158 292 C158 205 222 160 300 160 C378 160 442 205 442 292 C442 364 392 418 322 434 Q300 440 278 434 C208 418 158 364 158 292 Z" fill="${sk}" stroke="${L}" stroke-width="5"/>
      <path d="M170 332 C176 380 220 420 300 424 C262 410 214 384 190 336 Z" fill="${P.skinShade}" opacity=".35"/>
      <ellipse cx="300" cy="268" rx="120" ry="42" fill="${P.skinShade}" opacity=".22"/>
      <ellipse cx="236" cy="188" rx="40" ry="12" fill="${P.skinLight}" opacity=".5" transform="rotate(-14 236 188)"/>
      <!-- mejillas -->
      <ellipse cx="204" cy="374" rx="27" ry="15" fill="${P.blush}" opacity=".55"/>
      <ellipse cx="396" cy="374" rx="27" ry="15" fill="${P.blush}" opacity=".55"/>
      <path d="M190 372 l8 -8 M202 376 l8 -8 M214 376 l8 -8 M378 376 l8 -8 M390 376 l8 -8 M402 372 l8 -8" stroke="#ff9aa8" stroke-width="3" stroke-linecap="round" opacity=".7"/>
      <!-- cejas -->
      <path d="M208 284 Q238 270 266 280 M334 280 Q362 270 392 284" fill="none" stroke="${P.hairDark}" stroke-width="6" stroke-linecap="round"/>
      <g class="mascot-eyes">${eyes}</g>
      <!-- nariz y boca -->
      <path d="M294 370 Q300 376 306 370" fill="none" stroke="${P.skinShade}" stroke-width="4" stroke-linecap="round"/>
      ${mouth}`;

    const hairBack = `<path d="M140 300 C124 190 206 116 300 116 C394 116 476 190 460 300 C468 366 452 410 438 440 C410 458 342 446 300 430 C258 446 190 458 162 440 C148 410 132 366 140 300 Z" fill="${P.hair}" stroke="${P.hairDark}" stroke-width="5" stroke-linejoin="round"/>`;

    const hairFront = `
      <path d="M166 296 C146 204 214 164 300 162 C386 164 454 204 434 296 C428 266 418 244 404 232 C404 256 394 272 378 284 C372 258 358 242 340 236 C336 256 324 270 308 276 C298 256 282 242 264 238 C262 258 248 272 232 278 C222 258 208 248 192 248 C182 260 172 274 166 296 Z" fill="${P.hair}" stroke="${P.hairDark}" stroke-width="4.5" stroke-linejoin="round"/>
      <path d="M170 290 C160 340 166 390 188 436 C194 394 196 346 196 298 Z" fill="${P.hair}" stroke="${P.hairDark}" stroke-width="4.5" stroke-linejoin="round"/>
      <path d="M430 290 C440 340 434 390 412 436 C406 394 404 346 404 298 Z" fill="${P.hair}" stroke="${P.hairDark}" stroke-width="4.5" stroke-linejoin="round"/>
      <path d="M200 232 C222 214 262 208 300 208 C338 208 378 214 400 232" fill="none" stroke="${P.hairLight}" stroke-width="9" stroke-linecap="round" opacity=".55"/>
      <path d="M230 246 C240 252 246 258 248 266 M300 240 C306 250 308 258 306 266 M372 248 C364 254 360 260 360 268" fill="none" stroke="${P.hairDark}" stroke-width="3" stroke-linecap="round" opacity=".5"/>
      <path d="M184 320 C182 364 190 400 200 426 M416 320 C418 364 410 400 400 426" fill="none" stroke="${P.hairLight}" stroke-width="5" stroke-linecap="round" opacity=".55"/>`;

    const sparkle = (x, y, s, c) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -14 C2 -4 4 -2 14 0 C4 2 2 4 0 14 C-2 4 -4 2 -14 0 C-4 -2 -2 -4 0 -14 Z" fill="${c}"/>`;

    const inner = `
<defs>
  <linearGradient id="${id}h" gradientUnits="userSpaceOnUse" x1="0" y1="380" x2="0" y2="632">
    <stop offset="0" stop-color="${P.hair}"/><stop offset=".42" stop-color="${P.hair}"/><stop offset=".72" stop-color="#a8622c"/><stop offset="1" stop-color="${P.caramel}"/>
  </linearGradient>
  <linearGradient id="${id}i" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3b1c0e"/><stop offset=".55" stop-color="#9a5420"/><stop offset="1" stop-color="#f0b258"/>
  </linearGradient>
</defs>
${view === 'full' ? `<ellipse cx="300" cy="808" rx="150" ry="14" fill="#000" opacity=".12"/>` : ''}
<g>${hairBack}</g>
<g>${pigtail}</g><g transform="matrix(-1 0 0 1 600 0)">${pigtail}</g>
<g>${view === 'head' ? '' : body}</g>
<g>${head}</g>
<g>${hairFront}</g>
<g>${tie}</g><g transform="matrix(-1 0 0 1 600 0)">${tie}</g>
<g transform="translate(0 30) scale(1 .85)">${hat}</g>
${o.sparkles ? sparkle(96, 120, 1.1, '#ffd43b') + sparkle(514, 220, 0.9, P.moraLight) + sparkle(70, 250, 0.6, '#fff') : ''}`;
    if (o.raw) return inner;
    // el busto se desvanece abajo en lugar de cortarse en seco
    const fade = view === 'bust' && o.fade !== false;
    const body2 = fade
      ? `<defs><linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".8" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient><mask id="${id}m" maskUnits="userSpaceOnUse" x="40" y="-40" width="520" height="620"><rect x="40" y="-40" width="520" height="620" fill="url(#${id}f)"/></mask></defs><g mask="url(#${id}m)">${inner}</g>`
      : inner;
    return `<svg class="character ${o.cls || ''}" viewBox="${VIEWS[view] || VIEWS.full}" ${size} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Personaje de ${D.esc ? D.esc((D.data && D.data.settings && D.data.settings.name) || 'Dulza') : 'Dulza'}">${body2}</svg>`;
  };
})();
