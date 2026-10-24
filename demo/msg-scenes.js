// msg-scenes.js — 2.25: нарисованные картинки к готовым сообщениям (рассылки и идеи в «Маркетинге»).
// Каждая сцена — своя иллюстрация вектором на canvas (без эмодзи и без интернета), в цветах заведения.
// drawScene(ctx, name, cx, cy, R, colors) рисует сцену в круге радиуса R вокруг (cx, cy).
(function () {
  const TAU = Math.PI * 2;
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function star(ctx, x, y, r, n = 5, inner = 0.45, rot = -Math.PI / 2) { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, rad = i % 2 ? r * inner : r; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } ctx.closePath(); }
  function heart(ctx, x, y, s) { ctx.beginPath(); ctx.moveTo(x, y + s * 0.35); ctx.bezierCurveTo(x - s * 1.1, y - s * 0.35, x - s * 0.45, y - s * 1.05, x, y - s * 0.45); ctx.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s * 1.1, y - s * 0.35, x, y + s * 0.35); ctx.closePath(); }
  function sparkle(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.closePath(); }
  function shadow(ctx, on) { if (on) { ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10; } else { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; } }
  function txt(ctx, s, x, y, size, color, weight = 900) { ctx.font = `${weight} ${size}px "Segoe UI","Inter",Arial,sans-serif`; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y); }
  function cup(ctx, x, y, s, body, ink) {
    ctx.fillStyle = body; rr(ctx, x - s * 0.5, y - s * 0.35, s, s * 0.8, s * 0.16); ctx.fill();
    ctx.lineWidth = s * 0.11; ctx.strokeStyle = body; ctx.beginPath(); ctx.arc(x + s * 0.55, y + s * 0.02, s * 0.2, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.strokeStyle = ink; ctx.lineWidth = s * 0.06; ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * s * 0.22, y - s * 0.5); ctx.bezierCurveTo(x + i * s * 0.22 + s * 0.1, y - s * 0.65, x + i * s * 0.22 - s * 0.1, y - s * 0.78, x + i * s * 0.22, y - s * 0.92); ctx.stroke(); }
  }
  function person(ctx, x, y, s, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y - s * 0.55, s * 0.32, 0, TAU); ctx.fill(); rr(ctx, x - s * 0.5, y - s * 0.12, s, s * 0.9, s * 0.45); ctx.fill(); }
  function clock(ctx, x, y, r, face, ink, accent) {
    ctx.fillStyle = face; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.lineWidth = r * 0.08; ctx.strokeStyle = accent; ctx.stroke();
    ctx.fillStyle = ink; for (let i = 0; i < 12; i++) { const a = i * TAU / 12; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78, r * (i % 3 ? 0.03 : 0.055), 0, TAU); ctx.fill(); }
    ctx.lineCap = 'round'; ctx.strokeStyle = ink; ctx.lineWidth = r * 0.07; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + r * 0.32, y - r * 0.38); ctx.stroke();
    ctx.lineWidth = r * 0.05; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - r * 0.6); ctx.stroke();
    ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(x, y, r * 0.07, 0, TAU); ctx.fill();
  }
  function tag(ctx, x, y, w, h, color, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-w / 2 + h * 0.4, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2, h / 2); ctx.lineTo(-w / 2 + h * 0.4, h / 2); ctx.lineTo(-w / 2, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.arc(-w / 2 + h * 0.42, 0, h * 0.1, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function confettiRing(ctx, cx, cy, R, cols, n = 14) { for (let i = 0; i < n; i++) { const a = i * TAU / n + 0.2, r = R * (0.86 + (i % 3) * 0.06); ctx.save(); ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.rotate(a * 2); ctx.fillStyle = cols[i % cols.length]; ctx.globalAlpha = 0.85; if (i % 2) ctx.fillRect(-9, -3, 18, 6); else { ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill(); } ctx.restore(); } }

  // ---- сцены ----
  const SCENES = {
    weekend(ctx, cx, cy, R, c) { // ценник «−15%» + солнце + календарь «Сб/Вс»
      ctx.fillStyle = c.b; ctx.globalAlpha = .9; ctx.beginPath(); ctx.arc(cx + R * .52, cy - R * .5, R * .26, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = c.b; ctx.lineWidth = 7; ctx.lineCap = 'round'; for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.beginPath(); ctx.moveTo(cx + R * .52 + Math.cos(a) * R * .34, cy - R * .5 + Math.sin(a) * R * .34); ctx.lineTo(cx + R * .52 + Math.cos(a) * R * .44, cy - R * .5 + Math.sin(a) * R * .44); ctx.stroke(); }
      shadow(ctx, true); ctx.fillStyle = '#fff'; rr(ctx, cx - R * .74, cy - R * .52, R * .64, R * .66, 18); ctx.fill(); shadow(ctx, false);
      ctx.fillStyle = c.a; rr(ctx, cx - R * .74, cy - R * .52, R * .64, R * .18, 18); ctx.fill(); ctx.fillRect(cx - R * .74, cy - R * .42, R * .64, R * .08);
      txt(ctx, c.L.sat, cx - R * .58, cy - R * .1, R * .16, c.ink); txt(ctx, c.L.sun, cx - R * .27, cy - R * .1, R * .16, c.ink);
      shadow(ctx, true); tag(ctx, cx + R * .12, cy + R * .42, R * .92, R * .46, c.prim, -0.14); shadow(ctx, false);
      ctx.save(); ctx.translate(cx + R * .18, cy + R * .41); ctx.rotate(-0.14); txt(ctx, '−15%', 0, 0, R * .27, c.onPrim); ctx.restore();
    },
    miss(ctx, cx, cy, R, c) { // большое сердце + машущая рука-силуэт + чашка
      shadow(ctx, true); ctx.fillStyle = c.a; heart(ctx, cx, cy + R * .1, R * .62); ctx.fill(); shadow(ctx, false);
      ctx.fillStyle = 'rgba(255,255,255,.22)'; heart(ctx, cx - R * .18, cy - R * .12, R * .2); ctx.fill();
      cup(ctx, cx + R * .55, cy + R * .55, R * .36, '#fff', c.b);
      ctx.fillStyle = c.b; for (const [dx, dy, s] of [[-.7, -.55, .12], [-.82, .2, .08], [.7, -.62, .1]]) { heart(ctx, cx + R * dx, cy + R * dy, R * s); ctx.fill(); }
    },
    new(ctx, cx, cy, R, c) { // бейдж «NEW» + блёстки
      shadow(ctx, true); ctx.fillStyle = c.prim; star(ctx, cx, cy, R * .78, 16, 0.84); ctx.fill(); shadow(ctx, false);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(cx, cy, R * .52, 0, TAU); ctx.fill();
      txt(ctx, c.L.neu, cx, cy + 4, R * .34, c.onPrim);
      ctx.fillStyle = '#fff'; sparkle(ctx, cx + R * .78, cy - R * .62, R * .16); ctx.fill(); ctx.fillStyle = c.a; sparkle(ctx, cx - R * .8, cy + R * .58, R * .12); ctx.fill(); ctx.fillStyle = c.b; sparkle(ctx, cx - R * .7, cy - R * .7, R * .09); ctx.fill();
    },
    happy(ctx, cx, cy, R, c) { // часы + «×2» штампы
      shadow(ctx, true); clock(ctx, cx - R * .12, cy - R * .05, R * .58, '#fff', c.ink, c.prim); shadow(ctx, false);
      shadow(ctx, true); ctx.fillStyle = c.a; ctx.beginPath(); ctx.arc(cx + R * .5, cy + R * .48, R * .3, 0, TAU); ctx.fill(); shadow(ctx, false);
      txt(ctx, '×2', cx + R * .5, cy + R * .5, R * .26, '#fff');
      for (let i = 0; i < 3; i++) { ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.setLineDash([9, 7]); ctx.beginPath(); ctx.arc(cx - R * .62 + i * R * .26, cy + R * .78, R * .1, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    },
    friend(ctx, cx, cy, R, c) { // два человека + сердце между
      shadow(ctx, true); person(ctx, cx - R * .32, cy + R * .2, R * .62, c.prim); person(ctx, cx + R * .34, cy + R * .24, R * .56, c.a); shadow(ctx, false);
      ctx.fillStyle = '#fff'; heart(ctx, cx, cy - R * .52, R * .2); ctx.fill();
      ctx.fillStyle = c.b; sparkle(ctx, cx + R * .7, cy - R * .5, R * .1); ctx.fill(); sparkle(ctx, cx - R * .74, cy - R * .42, R * .08); ctx.fill();
    },
    thanks(ctx, cx, cy, R, c) { // подарочная лента-бант + сердечки
      shadow(ctx, true); ctx.fillStyle = c.prim; rr(ctx, cx - R * .55, cy - R * .1, R * 1.1, R * .72, 20); ctx.fill(); shadow(ctx, false);
      ctx.fillStyle = c.a; ctx.fillRect(cx - R * .09, cy - R * .1, R * .18, R * .72); ctx.fillRect(cx - R * .55, cy + R * .14, R * 1.1, R * .16);
      ctx.fillStyle = c.a; ctx.beginPath(); ctx.ellipse(cx - R * .2, cy - R * .22, R * .22, R * .12, -0.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx + R * .2, cy - R * .22, R * .22, R * .12, 0.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; heart(ctx, cx - R * .62, cy - R * .55, R * .15); ctx.fill(); ctx.fillStyle = c.b; heart(ctx, cx + R * .6, cy - R * .62, R * .12); ctx.fill();
      confettiRing(ctx, cx, cy, R * .98, [c.a, c.b, '#fff'], 10);
    },
    photo(ctx, cx, cy, R, c) { // камера + полароид
      shadow(ctx, true); ctx.save(); ctx.translate(cx + R * .3, cy - R * .2); ctx.rotate(.14); ctx.fillStyle = '#fff'; rr(ctx, -R * .3, -R * .36, R * .6, R * .72, 10); ctx.fill(); ctx.fillStyle = c.b; ctx.fillRect(-R * .24, -R * .3, R * .48, R * .46); ctx.restore(); shadow(ctx, false);
      shadow(ctx, true); ctx.fillStyle = c.prim; rr(ctx, cx - R * .7, cy - R * .05, R * .95, R * .62, 22); ctx.fill(); rr(ctx, cx - R * .45, cy - R * .16, R * .3, R * .16, 8); ctx.fill(); shadow(ctx, false);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx - R * .22, cy + R * .26, R * .22, 0, TAU); ctx.fill(); ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(cx - R * .22, cy + R * .26, R * .14, 0, TAU); ctx.fill();
      ctx.fillStyle = c.a; ctx.beginPath(); ctx.arc(cx + R * .1, cy + R * .08, R * .05, 0, TAU); ctx.fill();
    },
    freefriend(ctx, cx, cy, R, c) { // две чашки + «0 €»
      shadow(ctx, true); cup(ctx, cx - R * .32, cy + R * .25, R * .5, c.prim, '#fff'); cup(ctx, cx + R * .35, cy + R * .3, R * .44, '#fff', c.a); shadow(ctx, false);
      shadow(ctx, true); tag(ctx, cx + R * .35, cy - R * .48, R * .62, R * .3, c.a, 0.12); shadow(ctx, false);
      ctx.save(); ctx.translate(cx + R * .39, cy - R * .48); ctx.rotate(.12); txt(ctx, c.L.free, 0, 0, R * .15, '#fff'); ctx.restore();
    },
    luckycheck(ctx, cx, cy, R, c) { // кубики + чек
      shadow(ctx, true); ctx.save(); ctx.translate(cx + R * .32, cy - R * .2); ctx.rotate(.08); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-R * .28, -R * .5); ctx.lineTo(R * .28, -R * .5); ctx.lineTo(R * .28, R * .45); for (let i = 0; i < 6; i++) ctx.lineTo(R * .28 - (i + .5) * R * .56 / 6, R * .45 + (i % 2 ? 0 : R * .06)); ctx.lineTo(-R * .28, R * .45); ctx.closePath(); ctx.fill(); ctx.restore(); shadow(ctx, false);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 4; i++) ctx.fillRect(cx + R * .12, cy - R * .5 + i * R * .16, R * .36, 7);
      txt(ctx, '10', cx + R * .32, cy + R * .2, R * .2, c.prim);
      for (const [dx, dy, rot, col] of [[-.42, .25, -.3, c.prim], [-.05, .58, .25, c.a]]) { shadow(ctx, true); ctx.save(); ctx.translate(cx + R * dx, cy + R * dy); ctx.rotate(rot); ctx.fillStyle = col; rr(ctx, -R * .22, -R * .22, R * .44, R * .44, 16); ctx.fill(); shadow(ctx, false); ctx.fillStyle = '#fff'; for (const [px, py] of [[-.1, -.1], [.1, .1], [0, 0], [.1, -.1], [-.1, .1]]) { ctx.beginPath(); ctx.arc(R * px, R * py, R * .035, 0, TAU); ctx.fill(); } ctx.restore(); }
    },
    surprise(ctx, cx, cy, R, c) { // коробка-сюрприз с крышкой и звёздами
      shadow(ctx, true); ctx.fillStyle = c.prim; rr(ctx, cx - R * .45, cy - R * .05, R * .9, R * .62, 16); ctx.fill(); ctx.save(); ctx.translate(cx, cy - R * .2); ctx.rotate(-0.18); rr(ctx, -R * .52, -R * .1, R * 1.04, R * .2, 10); ctx.fill(); ctx.restore(); shadow(ctx, false);
      ctx.fillStyle = c.a; ctx.fillRect(cx - R * .07, cy - R * .05, R * .14, R * .62);
      ctx.fillStyle = '#fff'; star(ctx, cx - R * .2, cy - R * .62, R * .14); ctx.fill(); ctx.fillStyle = c.b; star(ctx, cx + R * .25, cy - R * .72, R * .1); ctx.fill(); ctx.fillStyle = c.a; star(ctx, cx + R * .02, cy - R * .5, R * .08); ctx.fill();
      confettiRing(ctx, cx, cy - R * .3, R * .7, [c.a, c.b, '#fff'], 9);
    },
    review(ctx, cx, cy, R, c) { // облачко отзыва + звёзды
      shadow(ctx, true); ctx.fillStyle = '#fff'; rr(ctx, cx - R * .7, cy - R * .48, R * 1.4, R * .78, 28); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx - R * .3, cy + R * .28); ctx.lineTo(cx - R * .45, cy + R * .55); ctx.lineTo(cx - R * .05, cy + R * .28); ctx.fill(); shadow(ctx, false);
      for (let i = 0; i < 5; i++) { ctx.fillStyle = i < 5 ? c.prim : '#ddd'; star(ctx, cx - R * .48 + i * R * .24, cy - R * .1, R * .1); ctx.fill(); }
      shadow(ctx, true); ctx.fillStyle = c.a; ctx.beginPath(); ctx.arc(cx + R * .55, cy + R * .52, R * .26, 0, TAU); ctx.fill(); shadow(ctx, false); txt(ctx, '−15%', cx + R * .55, cy + R * .53, R * .14, '#fff');
    },
    early(ctx, cx, cy, R, c) { // рассвет: солнце над горизонтом + будильник
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R * .82, 0, TAU); ctx.clip();
      const g = ctx.createLinearGradient(0, cy - R, 0, cy + R * .25); g.addColorStop(0, '#5b4b8a'); g.addColorStop(.55, '#ff8a65'); g.addColorStop(1, '#ffd27a'); ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      const sg = ctx.createRadialGradient(cx, cy + R * .25, 0, cx, cy + R * .25, R * .7); sg.addColorStop(0, 'rgba(255,246,214,.9)'); sg.addColorStop(1, 'rgba(255,246,214,0)'); ctx.fillStyle = sg; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      ctx.fillStyle = '#fff6d6'; ctx.beginPath(); ctx.arc(cx, cy + R * .25, R * .3, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(20,14,8,.55)'; ctx.fillRect(cx - R, cy + R * .25, R * 2, R); ctx.fillStyle = 'rgba(255,214,140,.35)'; for (let i = 0; i < 4; i++) ctx.fillRect(cx - R * (.3 - i * .05), cy + R * (.32 + i * .1), R * (.6 - i * .1), 4); ctx.restore();
      shadow(ctx, true); clock(ctx, cx + R * .52, cy + R * .52, R * .26, '#fff', c.ink, c.a); shadow(ctx, false);
    },
    // 2.27: сцены для сегментов «Маркетинга» и для рассылки со своим текстом
    cake(ctx, cx, cy, R, c) { // торт со свечами
      shadow(ctx, true); ctx.fillStyle = '#fff'; rr(ctx, cx - R * .62, cy + R * .1, R * 1.24, R * .5, 18); ctx.fill(); shadow(ctx, false);
      ctx.fillStyle = c.prim; rr(ctx, cx - R * .62, cy + R * .1, R * 1.24, R * .16, 14); ctx.fill();
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(cx - R * .5 + i * R * .2, cy + R * .26, R * .07, 0, Math.PI); ctx.fill(); }
      shadow(ctx, true); ctx.fillStyle = c.a; rr(ctx, cx - R * .44, cy - R * .26, R * .88, R * .4, 16); ctx.fill(); shadow(ctx, false);
      ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(cx - R * .34 + i * R * .17, cy - R * .26, R * .06, 0, Math.PI); ctx.fill(); }
      for (let i = 0; i < 3; i++) { const x = cx - R * .2 + i * R * .2; ctx.fillStyle = [c.b, '#fff', c.b][i]; rr(ctx, x - R * .035, cy - R * .56, R * .07, R * .3, 4); ctx.fill(); ctx.fillStyle = '#ffd54a'; ctx.beginPath(); ctx.ellipse(x, cy - R * .64, R * .05, R * .09, 0, 0, TAU); ctx.fill(); }
      confettiRing(ctx, cx, cy, R * .95, [c.a, c.b, '#fff'], 12);
    },
    crown(ctx, cx, cy, R, c) { // корона с камнями
      shadow(ctx, true); ctx.fillStyle = c.prim; ctx.beginPath(); ctx.moveTo(cx - R * .62, cy + R * .34); ctx.lineTo(cx - R * .7, cy - R * .32); ctx.lineTo(cx - R * .3, cy - R * .02); ctx.lineTo(cx, cy - R * .5); ctx.lineTo(cx + R * .3, cy - R * .02); ctx.lineTo(cx + R * .7, cy - R * .32); ctx.lineTo(cx + R * .62, cy + R * .34); ctx.closePath(); ctx.fill(); rr(ctx, cx - R * .66, cy + R * .36, R * 1.32, R * .2, 10); ctx.fill(); shadow(ctx, false);
      for (const [x, y, col] of [[-.7, -.32, '#fff'], [0, -.5, c.a], [.7, -.32, '#fff']]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx + R * x, cy + R * y, R * .08, 0, TAU); ctx.fill(); }
      for (const [x, col] of [[-.34, c.a], [0, c.b], [.34, c.a]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx + R * x, cy + R * .46, R * .06, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#fff'; sparkle(ctx, cx + R * .78, cy - R * .7, R * .13); ctx.fill(); ctx.fillStyle = c.b; sparkle(ctx, cx - R * .8, cy - R * .66, R * .1); ctx.fill(); sparkle(ctx, cx + R * .5, cy + R * .78, R * .08); ctx.fill();
    },
    target(ctx, cx, cy, R, c) { // мишень + стрела: «почти у цели»
      const rings = ['#fff', c.prim, '#fff', c.a];
      shadow(ctx, true); for (let i = 0; i < 4; i++) { ctx.fillStyle = rings[i]; ctx.beginPath(); ctx.arc(cx - R * .08, cy + R * .06, R * (.7 - i * .17), 0, TAU); ctx.fill(); if (i === 0) shadow(ctx, false); }
      ctx.save(); ctx.translate(cx - R * .08, cy + R * .06); ctx.rotate(-0.75);
      ctx.fillStyle = c.ink; ctx.fillRect(0, -R * .025, R * .95, R * .05);
      ctx.fillStyle = c.b; ctx.beginPath(); ctx.moveTo(R * .78, 0); ctx.lineTo(R * 1.0, -R * .12); ctx.lineTo(R * .95, 0); ctx.lineTo(R * 1.0, R * .12); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#fff'; sparkle(ctx, cx + R * .7, cy + R * .55, R * .1); ctx.fill();
    },
    sprout(ctx, cx, cy, R, c) { // горшок с ростком: «новички»
      shadow(ctx, true); ctx.fillStyle = c.prim; ctx.beginPath(); ctx.moveTo(cx - R * .42, cy + R * .1); ctx.lineTo(cx + R * .42, cy + R * .1); ctx.lineTo(cx + R * .32, cy + R * .7); ctx.lineTo(cx - R * .32, cy + R * .7); ctx.closePath(); ctx.fill(); rr(ctx, cx - R * .5, cy + R * .02, R * 1, R * .16, 8); ctx.fill(); shadow(ctx, false);
      ctx.strokeStyle = '#6cc25a'; ctx.lineWidth = R * .06; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy + R * .04); ctx.quadraticCurveTo(cx - R * .04, cy - R * .3, cx, cy - R * .52); ctx.stroke();
      ctx.fillStyle = '#7ed36a'; ctx.beginPath(); ctx.ellipse(cx - R * .24, cy - R * .32, R * .26, R * .12, -0.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5aa84a'; ctx.beginPath(); ctx.ellipse(cx + R * .24, cy - R * .5, R * .28, R * .13, 0.5, 0, TAU); ctx.fill();
      ctx.fillStyle = c.b; sparkle(ctx, cx + R * .66, cy - R * .2, R * .12); ctx.fill(); ctx.fillStyle = '#fff'; sparkle(ctx, cx - R * .66, cy - R * .62, R * .09); ctx.fill();
    },
    hourglass(ctx, cx, cy, R, c) { // песочные часы + сердце: «давно не были»
      shadow(ctx, true); ctx.fillStyle = c.prim; rr(ctx, cx - R * .4, cy - R * .7, R * .8, R * .12, 6); ctx.fill(); rr(ctx, cx - R * .4, cy + R * .58, R * .8, R * .12, 6); ctx.fill(); shadow(ctx, false);
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(cx - R * .3, cy - R * .58); ctx.lineTo(cx + R * .3, cy - R * .58); ctx.quadraticCurveTo(cx + R * .3, cy - R * .2, cx + R * .05, cy); ctx.quadraticCurveTo(cx + R * .3, cy + R * .2, cx + R * .3, cy + R * .58); ctx.lineTo(cx - R * .3, cy + R * .58); ctx.quadraticCurveTo(cx - R * .3, cy + R * .2, cx - R * .05, cy); ctx.quadraticCurveTo(cx - R * .3, cy - R * .2, cx - R * .3, cy - R * .58); ctx.fill();
      ctx.fillStyle = c.a; ctx.beginPath(); ctx.moveTo(cx - R * .2, cy - R * .38); ctx.lineTo(cx + R * .2, cy - R * .38); ctx.lineTo(cx, cy - R * .08); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx - R * .26, cy + R * .58); ctx.quadraticCurveTo(cx, cy + R * .22, cx + R * .26, cy + R * .58); ctx.fill();
      shadow(ctx, true); ctx.fillStyle = c.b; heart(ctx, cx + R * .58, cy + R * .3, R * .26); ctx.fill(); shadow(ctx, false);
    },
    stamps(ctx, cx, cy, R, c) { // карта со штампами: «постоянные гости»
      shadow(ctx, true); ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.1); ctx.fillStyle = '#fff'; rr(ctx, -R * .72, -R * .42, R * 1.44, R * .84, 22); ctx.fill(); shadow(ctx, false);
      ctx.fillStyle = c.prim; rr(ctx, -R * .72, -R * .42, R * 1.44, R * .22, 22); ctx.fill(); ctx.fillRect(-R * .72, -R * .3, R * 1.44, R * .1);
      for (let i = 0; i < 8; i++) { const x = -R * .5 + (i % 4) * R * .33, y = -R * .02 + Math.floor(i / 4) * R * .26; ctx.beginPath(); ctx.arc(x, y, R * .1, 0, TAU); if (i < 6) { ctx.fillStyle = c.a; ctx.fill(); } else { ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]); } }
      ctx.restore();
      ctx.fillStyle = c.b; sparkle(ctx, cx + R * .74, cy - R * .62, R * .12); ctx.fill();
    },
    letter(ctx, cx, cy, R, c) { // конверт с сердцем — для рассылки со своим текстом
      shadow(ctx, true); ctx.fillStyle = '#fff'; rr(ctx, cx - R * .7, cy - R * .4, R * 1.4, R * .9, 18); ctx.fill(); shadow(ctx, false);
      ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.beginPath(); ctx.moveTo(cx - R * .7, cy + R * .5); ctx.lineTo(cx, cy + R * .02); ctx.lineTo(cx + R * .7, cy + R * .5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c.prim; ctx.beginPath(); ctx.moveTo(cx - R * .7, cy - R * .36); ctx.lineTo(cx, cy + R * .14); ctx.lineTo(cx + R * .7, cy - R * .36); ctx.lineTo(cx + R * .7, cy - R * .4); ctx.lineTo(cx - R * .7, cy - R * .4); ctx.closePath(); ctx.fill();
      shadow(ctx, true); ctx.fillStyle = c.a; heart(ctx, cx, cy + R * .08, R * .2); ctx.fill(); shadow(ctx, false);
      ctx.fillStyle = '#fff'; sparkle(ctx, cx + R * .72, cy - R * .66, R * .13); ctx.fill(); ctx.fillStyle = c.b; sparkle(ctx, cx - R * .78, cy - R * .6, R * .09); ctx.fill();
    },
    generic(ctx, cx, cy, R, c) { SCENES.letter(ctx, cx, cy, R, c); }
  };
  const LBL = { ru: { sat: 'Сб', sun: 'Вс', neu: 'NEW', free: '0 €' }, uk: { sat: 'Сб', sun: 'Нд', neu: 'NEW', free: '0 €' }, sk: { sat: 'So', sun: 'Ne', neu: 'NEW', free: '0 €' }, en: { sat: 'Sat', sun: 'Sun', neu: 'NEW', free: 'FREE' } };
  function drawScene(ctx, name, cx, cy, R, colors, lang) {
    const fn = SCENES[name] || SCENES.generic;
    ctx.save(); fn(ctx, cx, cy, R, { ...colors, L: LBL[lang] || LBL.en }); ctx.restore();
  }
  window.LoyaScenes = { drawScene, names: Object.keys(SCENES) };
})();
