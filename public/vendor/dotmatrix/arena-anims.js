/*!
 * Анимации-источники для DotMatrix: варианты рукопожатия.
 * Подключается после dotmatrix.js (и arena-logo.js — для варианта «Линии логотипа»).
 * Источник в сцене: { type: 'anim', name: 'handshake-side', params: { duration: 3.2, shakes: 2 }, colors: ['#FF6547', '#CDDFF8'] }
 *
 * Как добавить свой вариант: DotMatrix.registerAnim('имя', { label, group, params, colors, colorNames, draw(ctx, t, p, info) }).
 * draw рисует обычным canvas 2D в единицах: центр (0, 0), 1 = половина меньшей стороны кадра.
 * info.halfW / info.halfH — половина ширины и высоты кадра в тех же единицах. Цвета берите из info.colors.
 */
(function (root) {
  var DM = root.DotMatrix;
  if (!DM || !DM.registerAnim) return;

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var sm = function (e0, e1, x) { var t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  var outC = function (t) { return 1 - Math.pow(1 - t, 3); };
  var outBack = function (t) { var c1 = 0.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

  // ---------------------------------------------------------------- тайминг рукопожатия
  // 0 … approach — руки идут навстречу; … grip — пальцы сжимаются; остальное — встряхивания, в конце покой.
  function timeline(t, p) {
    var D = Math.max(0.8, p.duration), ta = D * 0.46, tg = D * 0.14, ts = D - ta - tg;
    var approach = clamp(t / ta, 0, 1);
    var grip = clamp((t - ta) / tg, 0, 1);
    var sh = clamp((t - ta - tg) / Math.max(0.01, ts), 0, 1);
    var shakeY = 0, shakeR = 0;
    if (p.shakes > 0 && sh > 0 && sh < 1) {
      var env = Math.sin(Math.PI * sh);
      shakeY = Math.sin(sh * Math.PI * 2 * p.shakes) * p.swing * 0.16 * env;
      shakeR = Math.sin(sh * Math.PI * 2 * p.shakes + 0.6) * p.swing * 0.07 * env;
    }
    return { approach: outBack(approach), a0: approach, grip: sm(0, 1, grip), shakeY: shakeY, shakeR: shakeR };
  }

  // ---------------------------------------------------------------- кисть из простых форм
  // Локальные координаты: запястье в (0, 0), пальцы смотрят вправо (+x), большой палец сверху (−y).
  // Возвращает список фигур: капсулы (ломаные с толщиной) и скруглённые прямоугольники.
  var FINGERS = [ // смещение по y, длина фаланг (до сгиба, после), толщина
    { y: -0.150, l1: 0.20, l2: 0.17, w: 0.100 },
    { y: -0.050, l1: 0.23, l2: 0.19, w: 0.104 },
    { y: 0.050, l1: 0.21, l2: 0.18, w: 0.100 },
    { y: 0.145, l1: 0.16, l2: 0.14, w: 0.090 }
  ];
  function handParts(curl, thumb, opt) {
    opt = opt || {};
    var parts = [];
    var arm = opt.arm == null ? 3.4 : opt.arm;
    parts.push({ k: 'cap', w: 0.34, pts: [[-arm, 0.02], [-0.02, 0]] });                  // предплечье
    parts.push({ k: 'rr', x: -0.12, y: -0.225, w: 0.56, h: 0.44, r: 0.15 });           // ладонь
    var ta = -0.75 - 0.55 * (1 - thumb);                                               // большой палец: открыт → прижат
    var tb = [0.16, -0.17], tk = [tb[0] + Math.cos(ta) * 0.2, tb[1] + Math.sin(ta) * 0.2];
    var ta2 = ta + 0.35 * thumb;
    parts.push({ k: 'cap', w: 0.125, pts: [tb, tk, [tk[0] + Math.cos(ta2) * 0.15, tk[1] + Math.sin(ta2) * 0.15]] });
    FINGERS.forEach(function (f, i) {
      var b = [0.36, f.y], a1 = curl * 0.55, a2 = curl * (1.55 + i * 0.05);
      var k = [b[0] + Math.cos(a1) * f.l1, b[1] + Math.sin(a1) * f.l1];
      parts.push({ k: 'cap', w: f.w, pts: [b, k, [k[0] + Math.cos(a2) * f.l2, k[1] + Math.sin(a2) * f.l2]] });
    });
    if (opt.sleeve) parts.push({ k: 'cap', w: 0.5, pts: [[-arm, 0.02], [-0.5, 0.01]], sleeve: true });
    return parts;
  }
  function tracePart(ctx, q) {
    ctx.beginPath();
    if (q.k === 'rr') {
      if (ctx.roundRect) ctx.roundRect(q.x, q.y, q.w, q.h, q.r);
      else ctx.rect(q.x, q.y, q.w, q.h);
      return;
    }
    ctx.moveTo(q.pts[0][0], q.pts[0][1]);
    for (var i = 1; i < q.pts.length; i++) ctx.lineTo(q.pts[i][0], q.pts[i][1]);
  }
  // grow > 0 — фигура толще на grow со всех сторон (для контура)
  function paintParts(ctx, parts, color, grow) {
    ctx.fillStyle = color; ctx.strokeStyle = color;
    parts.forEach(function (q) {
      tracePart(ctx, q);
      if (q.k === 'rr') { ctx.fill(); if (grow > 0) { ctx.lineWidth = grow * 2; ctx.stroke(); } }
      else { ctx.lineWidth = q.w + grow * 2; ctx.stroke(); }
    });
  }
  // Одна рука: pose = { x, y, rot, mirror }. mode: 'fill' | 'outline'. Рисуется поверх уже нарисованного.
  function drawHand(ctx, pose, parts, color, mode, lw) {
    ctx.save();
    ctx.translate(pose.x, pose.y); ctx.rotate(pose.rot || 0); if (pose.mirror) ctx.scale(-1, 1);
    if (mode === 'outline') {
      var body = parts.filter(function (q) { return !q.sleeve; });
      paintParts(ctx, body, color, lw);                       // силуэт с запасом
      ctx.globalCompositeOperation = 'destination-out';
      paintParts(ctx, body, '#000', 0);                       // вынули середину — остался контур (и спрятали то, что сзади)
      ctx.globalCompositeOperation = 'source-over';
    } else {
      var sleeve = parts.filter(function (q) { return q.sleeve; });
      paintParts(ctx, parts.filter(function (q) { return !q.sleeve; }), color, 0);
      if (sleeve.length) {
        paintParts(ctx, sleeve, color, 0);
        // манжета — прозрачная полоска между рукавом и кистью
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 0.07; ctx.strokeStyle = '#000';
        ctx.beginPath(); ctx.moveTo(-0.5, -0.3); ctx.lineTo(-0.5, 0.32); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- общий сюжет «две руки навстречу»
  function handshake(ctx, t, p, info, style) {
    var tl = timeline(t, p);
    var c0 = info.colors[0], c1 = info.colors[1] || info.colors[0];
    var curl = lerp(0.12, 1, tl.grip), thumb = lerp(0, 1, tl.grip);
    var lw = style.lw || 0.07;
    var size = p.size || 1;
    var far = info.halfW / size + 1.2;          // старт за краем кадра
    var ang = style.angle || 0;                 // наклон рук (по диагонали — снизу вверх)
    var gap = style.gap == null ? 0.44 : style.gap;
    var off = (1 - tl.approach) * far;
    var dy = style.dy || 0;
    var sleeve = !!style.sleeve;
    ctx.save();
    ctx.translate(0, tl.shakeY + dy); ctx.rotate(tl.shakeR); ctx.scale(size, size);
    var back = { x: gap + Math.cos(ang) * off, y: 0.045 + Math.sin(ang) * off, rot: -ang, mirror: true };
    var front = { x: -gap - Math.cos(ang) * off, y: -0.035 + Math.sin(ang) * off, rot: ang };
    // правая рука (сзади): пальцы уходят под левую ладонь
    drawHand(ctx, back, handParts(curl * 0.85, thumb, { sleeve: sleeve }), c1, style.mode, lw);
    // левая рука (спереди): пальцы накрывают правую
    drawHand(ctx, front, handParts(curl, thumb, { sleeve: sleeve }), c0, style.mode, lw);
    ctx.restore();
  }

  var BASE = { duration: 3.2, shakes: 2, swing: 1, size: 1.25 };
  var HAND_NAMES = ['Левая рука', 'Правая рука'];

  DM.registerAnim('handshake-side', {
    label: 'Рукопожатие · сбоку', group: 'Рукопожатие',
    params: Object.assign({}, BASE), colors: ['#FF6547', '#CDDFF8'], colorNames: HAND_NAMES,
    draw: function (ctx, t, p, info) { handshake(ctx, t, p, info, { mode: 'fill' }); }
  });
  DM.registerAnim('handshake-outline', {
    label: 'Рукопожатие · контур', group: 'Рукопожатие',
    params: Object.assign({}, BASE), colors: ['#FF6547', '#CDDFF8'], colorNames: HAND_NAMES,
    draw: function (ctx, t, p, info) { handshake(ctx, t, p, info, { mode: 'outline', lw: 0.075 }); }
  });
  DM.registerAnim('handshake-diagonal', {
    label: 'Рукопожатие · снизу, с рукавами', group: 'Рукопожатие',
    params: Object.assign({}, BASE, { size: 1.05 }), colors: ['#FF6547', '#CDDFF8'], colorNames: HAND_NAMES,
    draw: function (ctx, t, p, info) { handshake(ctx, t, p, info, { mode: 'fill', angle: -0.5, gap: 0.4, dy: 0.1, sleeve: true }); }
  });

  // ---------------------------------------------------------------- линии логотипа
  // Длинная линия (рука с запястьем) приходит сверху слева, три «пальца» — снизу справа, и встают в логотип.
  function polyLen(pts) { var L = 0; for (var i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
  function parsePath(d) {
    var nums = d.match(/-?\d*\.?\d+/g).map(Number), pts = [];
    for (var i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
    return pts;
  }
  var LOGO = null;
  function logoGeo() {
    if (LOGO) return LOGO;
    var L = root.ArenaLogo;
    if (!L) return null;
    LOGO = { main: parsePath(L.paths.main), fingers: L.paths.fingers.map(parsePath), stroke: L.paths.stroke };
    return LOGO;
  }
  function strokePart(ctx, pts, frac) {
    var total = polyLen(pts), need = total * frac;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length && need > 0; i++) {
      var seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (seg <= need) { ctx.lineTo(pts[i][0], pts[i][1]); need -= seg; }
      else { var k = need / seg; ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)); need = 0; }
    }
    ctx.stroke();
  }
  DM.registerAnim('handshake-logo', {
    label: 'Рукопожатие · линии логотипа', group: 'Рукопожатие',
    params: Object.assign({}, BASE, { shakes: 1, size: 1 }), colors: ['#CDDFF8', '#FF6547'], colorNames: ['Рука с запястьем', 'Пальцы'],
    draw: function (ctx, t, p, info) {
      var g = logoGeo(); if (!g) return;
      var tl = timeline(t, p), k = 0.82 * (p.size || 1);
      var far = info.halfW + 1;
      var off = (1 - tl.approach) * far;
      ctx.save();
      ctx.translate(0, tl.shakeY); ctx.rotate(tl.shakeR); ctx.scale(k, k);
      ctx.lineWidth = g.stroke * 1.15;
      ctx.strokeStyle = info.colors[0];
      ctx.save(); ctx.translate(-off * 0.9, -off * 0.55); strokePart(ctx, g.main, clamp(tl.a0 * 1.4, 0.05, 1)); ctx.restore();
      ctx.strokeStyle = info.colors[1] || info.colors[0];
      ctx.save(); ctx.translate(off * 0.8, off * 0.6);
      // пальцы «сжимаются»: подходят раскрытыми и смыкаются на захвате
      g.fingers.forEach(function (f, i) {
        var spread = (1 - tl.grip) * 0.16 * (i - 1);
        ctx.save(); ctx.translate(-spread, spread); strokePart(ctx, f, clamp(tl.a0 * 1.6 - i * 0.1, 0.05, 1)); ctx.restore();
      });
      ctx.restore();
      ctx.restore();
    }
  });
})(typeof self !== 'undefined' ? self : this);
