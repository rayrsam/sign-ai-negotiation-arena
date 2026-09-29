/*!
 * DotMatrix — точечная графика и анимации на Canvas. Без зависимостей.
 *
 *   const dm = new DotMatrix(canvas, { cols: 48, shape: 'circle' });
 *   await dm.show({ type: 'svg', svg: '<svg …>' }, { pattern: 'radial', duration: 1.2 });
 *   dm.set({ effect: 'twinkle', hover: 'grow' });
 *
 * Источники: SVG-строка, картинка, текст, процедурный узор, готовое поле (JSON)
 * или своя функция (x, y, t) => ({ level, color }).
 */
(function (root, factory) {
  var DM = factory();
  if (typeof module === 'object' && module.exports) module.exports = DM;
  else root.DotMatrix = DM;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ------------------------------------------------------------------ утилиты
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (e0, e1, x) { var t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  var fract = function (x) { return x - Math.floor(x); };
  var hash = function (n) { return fract(Math.sin(n * 12.9898 + 78.233) * 43758.5453); };
  var hash2 = function (x, y) { return hash(x * 157.31 + y * 311.7); };
  var ease = {
    linear: function (t) { return t; },
    inOut: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    out: function (t) { return 1 - Math.pow(1 - t, 3); }
  };

  function hexToRgb(hex) {
    if (Array.isArray(hex)) return hex;
    var h = String(hex || '#000').replace('#', '').trim();
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase();
  }

  // Шум значений 3D — для узора «шум» и переходов
  function vnoise(x, y, z) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    var xf = x - xi, yf = y - yi, zf = z - zi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    function h(a, b, c) { return hash(a * 127.1 + b * 311.7 + c * 74.7); }
    var x00 = lerp(h(xi, yi, zi), h(xi + 1, yi, zi), u);
    var x10 = lerp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u);
    var x01 = lerp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u);
    var x11 = lerp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u);
    return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
  }

  function makeCanvas(w, h) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(Math.max(1, w), Math.max(1, h));
    var c = document.createElement('canvas');
    c.width = Math.max(1, w); c.height = Math.max(1, h);
    return c;
  }

  // ------------------------------------------------------------------ поле
  // level: 0..1 — насколько точка «включена»; rgb — её цвет; idx — номер цвета палитры (−1 = свой цвет)
  function Field(cols, rows) {
    this.cols = cols; this.rows = rows;
    var n = cols * rows;
    this.level = new Float32Array(n);
    this.rgb = new Uint8ClampedArray(n * 3);
    this.idx = new Int8Array(n).fill(-1);
  }

  // ------------------------------------------------------------------ загрузка картинок
  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Не удалось загрузить изображение')); };
      img.src = src;
    });
  }
  function svgToImage(svg) {
    var s = String(svg);
    if (!/xmlns=/.test(s)) s = s.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    // даём SVG явный размер, иначе браузер растеризует его в 300×150
    var vb = s.match(/viewBox="([^"]+)"/);
    if (vb && !/<svg[^>]*\swidth=/.test(s)) {
      var p = vb[1].trim().split(/[\s,]+/).map(Number);
      var k = 1024 / Math.max(p[2], p[3]);
      s = s.replace('<svg', '<svg width="' + Math.round(p[2] * k) + '" height="' + Math.round(p[3] * k) + '"');
    }
    return loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s));
  }

  // ------------------------------------------------------------------ палитра из изображения (k-means)
  function readPixels(image, maxSide) {
    var iw = image.naturalWidth || image.videoWidth || image.width;
    var ih = image.naturalHeight || image.videoHeight || image.height;
    var k = Math.min(1, (maxSide || 160) / Math.max(iw, ih));
    var w = Math.max(1, Math.round(iw * k)), h = Math.max(1, Math.round(ih * k));
    var c = makeCanvas(w, h), x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(image, 0, 0, w, h);
    return { data: x.getImageData(0, 0, w, h).data, w: w, h: h };
  }
  function cornerColor(px) {
    var d = px.data, w = px.w, h = px.h, pts = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
    var r = 0, g = 0, b = 0, a = 0;
    pts.forEach(function (p) { var i = (p[1] * w + p[0]) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; a += d[i + 3]; });
    return { rgb: [r / 4, g / 4, b / 4], alpha: a / 4 };
  }
  function isBackground(d, i, bg, tol) {
    if (d[i + 3] < 128) return true;
    if (!bg) return false;
    var dr = d[i] - bg[0], dg = d[i + 1] - bg[1], db = d[i + 2] - bg[2];
    return dr * dr + dg * dg + db * db < tol * tol;
  }
  function extractPalette(image, k, removeBg) {
    var px = readPixels(image, 140), d = px.data;
    var cc = cornerColor(px);
    var bg = removeBg === false ? null : (cc.alpha > 200 ? cc.rgb : null);
    var pts = [];
    for (var i = 0; i < d.length; i += 4) if (!isBackground(d, i, bg, 48)) pts.push([d[i], d[i + 1], d[i + 2]]);
    if (!pts.length) return [];
    k = Math.max(1, Math.min(k || 3, 8));
    // детерминированная инициализация: самые далёкие точки
    var cent = [pts[Math.floor(pts.length / 2)].slice()];
    while (cent.length < k) {
      var best = -1, bi = 0;
      for (var p = 0; p < pts.length; p += 3) {
        var md = Infinity;
        for (var c = 0; c < cent.length; c++) {
          var dr = pts[p][0] - cent[c][0], dg = pts[p][1] - cent[c][1], db = pts[p][2] - cent[c][2];
          md = Math.min(md, dr * dr + dg * dg + db * db);
        }
        if (md > best) { best = md; bi = p; }
      }
      if (best < 400) break; // цветов меньше, чем k
      cent.push(pts[bi].slice());
    }
    var counts;
    for (var it = 0; it < 12; it++) {
      var sums = cent.map(function () { return [0, 0, 0]; }); counts = cent.map(function () { return 0; });
      for (var q = 0; q < pts.length; q++) {
        var bestC = 0, bd = Infinity;
        for (var c2 = 0; c2 < cent.length; c2++) {
          var e0 = pts[q][0] - cent[c2][0], e1 = pts[q][1] - cent[c2][1], e2 = pts[q][2] - cent[c2][2];
          var dd = e0 * e0 + e1 * e1 + e2 * e2;
          if (dd < bd) { bd = dd; bestC = c2; }
        }
        sums[bestC][0] += pts[q][0]; sums[bestC][1] += pts[q][1]; sums[bestC][2] += pts[q][2]; counts[bestC]++;
      }
      cent = cent.map(function (c3, j) { return counts[j] ? [sums[j][0] / counts[j], sums[j][1] / counts[j], sums[j][2] / counts[j]] : c3; });
    }
    return cent.map(function (c4, j) { return { hex: rgbToHex(Math.round(c4[0]), Math.round(c4[1]), Math.round(c4[2])), share: counts[j] / pts.length }; })
      .filter(function (c5) { return c5.share > 0.004; })
      .sort(function (a, b) { return b.share - a.share; })
      .map(function (c6) { return c6.hex; });
  }

  // ------------------------------------------------------------------ сэмплеры источников
  // Каждый сэмплер: { animated, sample(cols, rows, opts, t) -> Field }

  function rasterSampler(draw, meta) {
    // draw(ctx, w, h, box) рисует источник в прямоугольник box = {x, y, w, h}
    var cache = { key: '', raster: null, field: null, fkey: '' };
    return {
      animated: false,
      meta: meta || {},
      srcOptions: {},
      // настройки конкретного источника (цвета, порог, масштаб) поверх общих
      setOptions: function (so) { Object.assign(this.srcOptions, so || {}); },
      sample: function (cols, rows, o0) {
        var o = Object.assign({}, o0, this.srcOptions);
        var S = cols <= 40 ? 10 : cols <= 80 ? 7 : cols <= 140 ? 5 : 3;
        var rkey = [cols, rows, S, o.padding, o.scale, o.offsetX, o.offsetY].join('|');
        if (cache.key !== rkey) {
          var W = cols * S, H = rows * S;
          var c = makeCanvas(W, H), x = c.getContext('2d', { willReadFrequently: true });
          var pad = (o.padding || 0) * Math.min(W, H);
          var box = { x: pad, y: pad, w: W - 2 * pad, h: H - 2 * pad };
          var sc = o.scale || 1;
          box.x += box.w * (1 - sc) / 2 + (o.offsetX || 0) * W; box.y += box.h * (1 - sc) / 2 + (o.offsetY || 0) * H;
          box.w *= sc; box.h *= sc;
          draw(x, W, H, box);
          cache.raster = { data: x.getImageData(0, 0, W, H).data, W: W, H: H, S: S };
          cache.key = rkey; cache.fkey = '';
        }
        var oo = meta && meta.override ? Object.assign({}, o, meta.override(o)) : o;
        var fkey = rkey + '|' + samplingKey(oo);
        if (cache.fkey !== fkey) { cache.field = classify(cache.raster, cols, rows, oo, cache.bg); cache.fkey = fkey; }
        return cache.field;
      },
      setBackground: function (rgb) { cache.bg = rgb; cache.fkey = ''; }
    };
  }

  function samplingKey(o) {
    return [o.colorMode, (o.palette || []).join(','), (o.colors || []).join(','), o.threshold, o.detail, o.sizeMode,
      o.invert, o.removeBg, o.bgTolerance].join('|');
  }

  // Классификация растра по ячейкам
  function classify(r, cols, rows, o, bgRgb) {
    var f = new Field(cols, rows), d = r.data, W = r.W, S = r.S, n = S * S;
    var mode = o.colorMode || 'palette';
    var colors = (o.colors && o.colors.length ? o.colors : o.palette || ['#FFFFFF']).map(hexToRgb);
    var pal = (o.palette && o.palette.length ? o.palette : o.colors || ['#FFFFFF']).map(hexToRgb);
    var thr = o.threshold == null ? 0.45 : o.threshold;
    var detail = o.detail == null ? 0.3 : o.detail;
    var bg = o.removeBg ? bgRgb : null, tol = o.bgTolerance || 40;
    var fixed = o.sizeMode !== 'coverage';
    var K = pal.length;
    var counts = new Float32Array(K);
    var total = new Float64Array(K);
    var perCell = mode === 'palette' ? new Float32Array(cols * rows * K) : null;
    var cov = new Float32Array(cols * rows);
    var avg = mode === 'source' ? new Float32Array(cols * rows * 3) : null;
    var lum = mode === 'mono' ? new Float32Array(cols * rows) : null;

    for (var cy = 0; cy < rows; cy++) {
      for (var cx = 0; cx < cols; cx++) {
        var ci = cy * cols + cx, covered = 0, sr = 0, sg = 0, sb = 0, sl = 0;
        if (perCell) counts.fill(0);
        for (var yy = 0; yy < S; yy++) {
          var row = ((cy * S + yy) * W + cx * S) * 4;
          for (var xx = 0; xx < S; xx++) {
            var i = row + xx * 4;
            if (mode === 'mono') {
              // яркость: тёмное = включено (или наоборот при invert), прозрачное = выключено
              var a = d[i + 3] / 255;
              var L = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
              var v = o.invert ? L : 1 - L;
              if (bg && isBackground(d, i, bg, tol)) v = 0;
              sl += v * a; continue;
            }
            if (isBackground(d, i, bg, tol)) continue;
            covered++;
            if (perCell) {
              var bi = 0, bd = Infinity;
              for (var k = 0; k < K; k++) {
                var e0 = d[i] - pal[k][0], e1 = d[i + 1] - pal[k][1], e2 = d[i + 2] - pal[k][2];
                var dd = e0 * e0 + e1 * e1 + e2 * e2;
                if (dd < bd) { bd = dd; bi = k; }
              }
              counts[bi]++;
            } else { sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; }
          }
        }
        if (mode === 'mono') { lum[ci] = sl / n; continue; }
        cov[ci] = covered / n;
        if (perCell) for (var k2 = 0; k2 < K; k2++) { perCell[ci * K + k2] = counts[k2] / n; total[k2] += counts[k2]; }
        else if (covered) { avg[ci * 3] = sr / covered; avg[ci * 3 + 1] = sg / covered; avg[ci * 3 + 2] = sb / covered; }
      }
    }

    var sum = 0; for (var t = 0; t < K; t++) sum += total[t];
    for (var c = 0; c < cols * rows; c++) {
      var lvl = 0, col = null, idx = -1;
      if (mode === 'mono') {
        var m = lum[c];
        lvl = fixed ? (m >= thr ? 1 : 0) : smooth(thr * 0.4, 1, m);
        idx = 0; col = colors[0];
      } else if (mode === 'source') {
        var cv = cov[c];
        lvl = fixed ? (cv >= thr ? 1 : 0) : smooth(thr * 0.4, 1, cv);
        col = [avg[c * 3], avg[c * 3 + 1], avg[c * 3 + 2]];
      } else {
        // палитра: побеждает цвет с наибольшим покрытием, но редкие детали (тонкие линии) получают приоритет
        var cvp = cov[c];
        if (cvp >= thr * 0.5 || !fixed) {
          var best = -1, bestScore = -1, bestRaw = -1, rawIdx = -1;
          for (var k3 = 0; k3 < K; k3++) {
            var s = perCell[c * K + k3];
            if (s > bestRaw) { bestRaw = s; rawIdx = k3; }
            if (s >= detail) {
              var share = sum ? total[k3] / sum : 1;
              var score = s / Math.sqrt(Math.max(share, 0.02));
              if (score > bestScore) { bestScore = score; best = k3; }
            }
          }
          idx = best >= 0 ? best : rawIdx;
          var covOK = best >= 0 || cvp >= thr;
          lvl = fixed ? (covOK ? 1 : 0) : smooth(thr * 0.4, 1, cvp);
          col = colors[idx % colors.length];
        }
      }
      f.level[c] = lvl;
      if (col) { f.rgb[c * 3] = col[0]; f.rgb[c * 3 + 1] = col[1]; f.rgb[c * 3 + 2] = col[2]; }
      f.idx[c] = idx;
    }
    return f;
  }

  function fitBox(box, iw, ih, fit) {
    var k = fit === 'cover' ? Math.max(box.w / iw, box.h / ih) : Math.min(box.w / iw, box.h / ih);
    var w = iw * k, h = ih * k;
    return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w: w, h: h };
  }

  function imageSampler(img, fit, meta) {
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    var s = rasterSampler(function (x, W, H, box) {
      var b = fitBox(box, iw, ih, fit);
      x.imageSmoothingQuality = 'high';
      x.drawImage(img, b.x, b.y, b.w, b.h);
    }, meta);
    s.image = img;
    // фон: угловой цвет непрозрачной картинки
    var px = readPixels(img, 64), cc = cornerColor(px);
    s.setBackground(cc.alpha > 200 ? cc.rgb.map(Math.round) : null);
    return s;
  }

  function textSampler(src) {
    var lines = String(src.text || '').split('\n');
    var weight = src.weight || 800, family = src.family || 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
    var s = rasterSampler(function (x, W, H, box) {
      var probe = 100;
      x.font = weight + ' ' + probe + 'px ' + family;
      var mw = 1;
      lines.forEach(function (l) { mw = Math.max(mw, x.measureText(l).width); });
      var lh = probe * (src.lineHeight || 1.05);
      var k = Math.min(box.w / mw, box.h / (lh * lines.length));
      var size = probe * k;
      x.font = weight + ' ' + size + 'px ' + family;
      x.fillStyle = '#FFFFFF';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      var total = lh * k * lines.length;
      lines.forEach(function (l, i) { x.fillText(l, box.x + box.w / 2, box.y + (box.h - total) / 2 + lh * k * (i + 0.5)); });
    }, {
      kind: 'text',
      // текст рисуется белым и распознаётся одним цветом; выводится первым цветом из настроек
      override: function (o) { return { colorMode: 'palette', palette: ['#FFFFFF'], colors: [(o.colors && o.colors[0]) || '#FFFFFF'], removeBg: false }; }
    });
    if (src.color) s.setOptions({ colors: [src.color] });
    return s;
  }

  // ------------------------------------------------------------------ процедурные узоры
  // Функция узора получает координаты ячейки относительно центра (в ячейках) и время.
  // Возвращает уровень 0..1; второй цвет — отрицательным числом (−1..0).
  var PATTERNS = {
    burst: {
      label: 'Лучи',
      params: { speed: 1, width: 1, length: 1 },
      fn: function (dx, dy, t, p, g) {
        var ax = Math.abs(dx), ay = Math.abs(dy), R = g.half;
        var w = p.width, onAxis = ax <= w - 0.5 || ay <= w - 0.5, onDiag = Math.abs(ax - ay) <= w - 0.5 + 0.01;
        var r = Math.max(ax, ay);
        if (!(onAxis || onDiag) || r < R * 0.12) return 0;
        var len = (onDiag && !onAxis ? 0.62 : 1) * R * p.length;
        var front = R * 0.12 + fract(t * 0.45 * p.speed) * 1.6 * len;
        if (r > len) return 0;
        var inside = r <= front && r >= front - len * 0.7;
        var dash = fract(r / (R * 0.22) - t * p.speed * 1.2) < 0.72;
        return inside && dash ? (r > front - 2.2 ? -1 : 1) : 0;
      }
    },
    rings: {
      label: 'Кольца',
      params: { speed: 1, width: 0.35, density: 1 },
      fn: function (dx, dy, t, p, g) {
        var r = Math.sqrt(dx * dx + dy * dy) / g.half;
        var k = fract(r * 3 * p.density - t * 0.7 * p.speed);
        if (r > 1.05) return 0;
        return k < p.width ? (k < p.width * 0.35 ? -1 : 1) : 0;
      }
    },
    wave: {
      label: 'Волна',
      params: { speed: 1, amplitude: 0.55, frequency: 1 },
      fn: function (dx, dy, t, p, g) {
        var u = dx / g.half, v = dy / g.half;
        var y1 = Math.sin(u * 2.4 * p.frequency + t * 2 * p.speed) * p.amplitude * Math.cos(u * 0.8);
        var y2 = Math.sin(u * 3.1 * p.frequency - t * 1.6 * p.speed + 1.4) * p.amplitude * 0.6;
        var th = 1.6 / g.half;
        if (Math.abs(v - y1) < th) return 1;
        if (Math.abs(v - y2) < th * 0.75) return -1;
        return 0;
      }
    },
    noise: {
      label: 'Шум',
      params: { speed: 1, scale: 1, fill: 0.5 },
      fn: function (dx, dy, t, p, g) {
        var s = 0.09 / p.scale;
        var n = vnoise(dx * s + 11, dy * s + 7, t * 0.35 * p.speed) * 0.65 + vnoise(dx * s * 2.3, dy * s * 2.3, t * 0.5 * p.speed + 9) * 0.35;
        var cut = 1 - p.fill * 0.9;
        return n > cut + 0.12 ? -1 : n > cut ? 1 : 0;
      }
    },
    equalizer: {
      label: 'Эквалайзер',
      params: { speed: 1, bars: 1 },
      fn: function (dx, dy, t, p, g) {
        var bw = Math.max(1, Math.round(2 / p.bars));
        var col = Math.floor((dx + g.cols / 2) / (bw + 1));
        if (fract((dx + g.cols / 2) / (bw + 1)) * (bw + 1) >= bw) return 0;
        var hgt = vnoise(col * 0.7, 3.3, t * 1.1 * p.speed) * 0.85 + 0.12;
        var y = (g.rows / 2 - dy) / g.rows; // 0 снизу, 1 сверху
        if (y > hgt) return 0;
        return y > hgt - 1.5 / g.rows ? -1 : 1;
      }
    },
    spiral: {
      label: 'Спираль',
      params: { speed: 1, arms: 3 },
      fn: function (dx, dy, t, p, g) {
        var r = Math.sqrt(dx * dx + dy * dy) / g.half;
        if (r > 1.02 || r < 0.08) return 0;
        var a = Math.atan2(dy, dx) / (Math.PI * 2);
        var k = fract(a * p.arms + r * 1.6 - t * 0.35 * p.speed);
        return k < 0.28 ? (k < 0.08 ? -1 : 1) : 0;
      }
    },
    rain: {
      label: 'Дождь',
      params: { speed: 1, density: 1 },
      fn: function (dx, dy, t, p, g) {
        var x = Math.round(dx + g.cols / 2), y = dy + g.rows / 2;
        if (hash(x * 7.13) > 0.55 * p.density + 0.2) return 0;
        var sp = 0.35 + hash(x * 3.7) * 0.65;
        var head = fract(t * 0.28 * sp * p.speed + hash(x * 1.9)) * (g.rows + 14) - 4;
        var dist = head - y;
        if (dist < 0 || dist > 10) return 0;
        return dist < 1 ? -1 : 1 - dist / 11;
      }
    },
    checker: {
      label: 'Шахматка',
      params: { speed: 1, size: 3 },
      fn: function (dx, dy, t, p, g) {
        var s = Math.max(1, Math.round(p.size));
        var cx = Math.floor((dx + g.cols / 2) / s), cy = Math.floor((dy + g.rows / 2) / s);
        var ph = Math.sin((cx + cy) * 0.55 - t * 2.2 * p.speed);
        return (cx + cy) % 2 === 0 ? (ph > 0.3 ? 1 : 0) : (ph < -0.55 ? -1 : 0);
      }
    }
  };

  function patternSampler(src) {
    var def = PATTERNS[src.name] || PATTERNS.burst;
    var params = Object.assign({}, def.params, src.params || {});
    var colors = src.colors;
    var field = null;
    return {
      animated: true,
      meta: { kind: 'pattern', name: src.name },
      setOptions: function (so) {
        if (!so) return;
        if (so.colors) colors = so.colors;
        if (so.params) Object.assign(params, so.params);
      },
      sample: function (cols, rows, o, t) {
        if (!field || field.cols !== cols || field.rows !== rows) field = new Field(cols, rows);
        var cs = (colors || o.colors || ['#FFE14D', '#FF6547']).map(hexToRgb);
        var c1 = cs[0], c2 = cs[1] || cs[0];
        var g = { cols: cols, rows: rows, half: Math.min(cols, rows) / 2 };
        for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
          var i = y * cols + x;
          var v = def.fn(x + 0.5 - cols / 2, y + 0.5 - rows / 2, t, params, g);
          var c = v < 0 ? c2 : c1;
          field.level[i] = Math.abs(v);
          field.rgb[i * 3] = c[0]; field.rgb[i * 3 + 1] = c[1]; field.rgb[i * 3 + 2] = c[2];
          field.idx[i] = v < 0 ? 1 : 0;
        }
        return field;
      }
    };
  }

  function functionSampler(fn) {
    var field = null;
    return {
      animated: true, meta: { kind: 'function' },
      sample: function (cols, rows, o, t) {
        if (!field || field.cols !== cols || field.rows !== rows) field = new Field(cols, rows);
        for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
          var i = y * cols + x, r = fn(x, y, t, cols, rows) || {};
          var c = hexToRgb(r.color || (o.colors && o.colors[0]) || '#FFFFFF');
          field.level[i] = clamp(r.level == null ? 0 : r.level, 0, 1);
          field.rgb[i * 3] = c[0]; field.rgb[i * 3 + 1] = c[1]; field.rgb[i * 3 + 2] = c[2];
        }
        return field;
      }
    };
  }

  // Готовое поле из JSON (см. toJSON): сетка не пересэмплируется, а вписывается по центру
  function fieldSampler(json) {
    var colors = (json.colors || []).map(hexToRgb);
    var fc = json.cols, fr = json.rows, cells = json.cells;
    var cache = null;
    return {
      animated: false, meta: { kind: 'field' },
      sample: function (cols, rows) {
        if (cache && cache.cols === cols && cache.rows === rows) return cache;
        var f = new Field(cols, rows), ox = Math.floor((cols - fc) / 2), oy = Math.floor((rows - fr) / 2);
        for (var y = 0; y < fr; y++) for (var x = 0; x < fc; x++) {
          var ch = cells[y].charAt(x);
          if (ch === '.' || ch === '') continue;
          var tx = x + ox, ty = y + oy;
          if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) continue;
          var i = ty * cols + tx, k = parseInt(ch, 36), c = colors[k] || [255, 255, 255];
          f.level[i] = 1; f.idx[i] = k;
          f.rgb[i * 3] = c[0]; f.rgb[i * 3 + 1] = c[1]; f.rgb[i * 3 + 2] = c[2];
        }
        cache = f;
        return f;
      }
    };
  }

  // ------------------------------------------------------------------ анимации, нарисованные кодом (рукопожатие и т. п.)
  // Определение: { label, group, params: { duration, ... }, colors: [..], colorNames: [..], draw(ctx, t, params, info) }.
  // draw рисует на холсте в единицах: центр (0, 0), 1 = половина меньшей стороны; info: { aspect, halfW, halfH, colors }.
  // t — время от начала кадра сценария (анимация начинается заново, когда до неё доходит сценарий).
  var ANIMS = {};
  function registerAnim(name, def) { ANIMS[name] = def; return def; }
  function animSampler(src) {
    var def = ANIMS[src.name];
    if (!def) throw new Error('Нет анимации «' + src.name + '» — подключите arena-anims.js');
    var params = Object.assign({}, def.params, src.params || {});
    var so = { colors: src.colors || def.colors, threshold: 0.4, scale: 1, offsetX: 0, offsetY: 0 };
    var cv = null, cx = null, field = null;
    return {
      animated: true, meta: { kind: 'anim', name: src.name },
      params: params,
      setOptions: function (o) {
        if (!o) return;
        if (o.params) Object.assign(params, o.params);
        ['colors', 'threshold', 'scale', 'offsetX', 'offsetY'].forEach(function (k) { if (o[k] != null) so[k] = o[k]; });
      },
      sample: function (cols, rows, o, t, lt) {
        var S = cols * rows > 9000 ? 3 : 4, W = cols * S, H = rows * S;
        if (!cv || cv.width !== W || cv.height !== H) { cv = makeCanvas(W, H); cx = cv.getContext('2d', { willReadFrequently: true }); }
        if (!field || field.cols !== cols || field.rows !== rows) field = new Field(cols, rows);
        var hex = (so.colors && so.colors.length ? so.colors : o.colors);
        var pal = hex.map(hexToRgb);
        cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, W, H);
        var u = Math.min(W, H) / 2 * (so.scale || 1);
        cx.setTransform(u, 0, 0, u, W / 2 + (so.offsetX || 0) * W, H / 2 + (so.offsetY || 0) * H);
        cx.lineCap = 'round'; cx.lineJoin = 'round';
        def.draw(cx, Math.max(0, lt == null ? t : lt), params, { aspect: W / H, halfW: W / 2 / u, halfH: H / 2 / u, colors: hex, px: 1 / u });
        var d = cx.getImageData(0, 0, W, H).data, thr = so.threshold == null ? 0.4 : so.threshold, n = S * S;
        var cnt = new Int32Array(pal.length);
        for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
          var cov = 0; cnt.fill(0);
          for (var sy = 0; sy < S; sy++) for (var sx = 0; sx < S; sx++) {
            var k = ((y * S + sy) * W + x * S + sx) * 4;
            if (d[k + 3] < 128) continue;
            cov++;
            var best = 0, bd = 1e9;
            for (var c = 0; c < pal.length; c++) { var dr = d[k] - pal[c][0], dg = d[k + 1] - pal[c][1], db = d[k + 2] - pal[c][2], dd = dr * dr + dg * dg + db * db; if (dd < bd) { bd = dd; best = c; } }
            cnt[best]++;
          }
          var i = y * cols + x, bi = 0;
          for (var c2 = 1; c2 < pal.length; c2++) if (cnt[c2] > cnt[bi]) bi = c2;
          field.level[i] = cov / n >= thr ? 1 : 0;
          var cc = pal[bi];
          field.rgb[i * 3] = cc[0]; field.rgb[i * 3 + 1] = cc[1]; field.rgb[i * 3 + 2] = cc[2];
          field.idx[i] = bi;
        }
        return field;
      }
    };
  }

  async function loadSource(src) {
    var s = await loadSourceRaw(src);
    if (src && typeof src === 'object' && !src.sample && src.options && s.setOptions) s.setOptions(src.options);
    if (src && src.type === 'anim' && src.colors && s.setOptions) s.setOptions({ colors: src.colors });
    return s;
  }

  async function loadSourceRaw(src) {
    if (src && src.sample) return src; // уже сэмплер
    if (typeof src === 'function') return functionSampler(src);
    if (typeof src === 'string') {
      if (/^\s*<svg/i.test(src)) return imageSampler(await svgToImage(src), 'contain', { kind: 'svg' });
      return imageSampler(await loadImage(src), 'contain', { kind: 'image' });
    }
    if (!src || src.type === 'empty') return { animated: false, meta: { kind: 'empty' }, sample: function (c, r) { return new Field(c, r); } };
    if (src.type === 'svg') return imageSampler(await svgToImage(src.svg), src.fit, { kind: 'svg' });
    if (src.type === 'image') {
      var img = typeof src.image === 'string' ? await loadImage(src.image) : src.image;
      return imageSampler(img, src.fit, { kind: 'image' });
    }
    if (src.type === 'text') return textSampler(src);
    if (src.type === 'pattern') return patternSampler(src);
    if (src.type === 'field') return fieldSampler(src.field || src);
    if (src.type === 'anim') return animSampler(src);
    throw new Error('Неизвестный источник');
  }

  // ------------------------------------------------------------------ переходы
  // Задержка ячейки 0..1: в каком порядке точки меняют состояние
  var TRANSITIONS = {
    radial: { label: 'Волна из центра', fn: function (x, y, g, o) { var ox = o.originX == null ? 0.5 : o.originX, oy = o.originY == null ? 0.5 : o.originY; var dx = (x - ox * g.cols) / g.cols, dy = (y - oy * g.rows) / g.cols; return clamp(Math.sqrt(dx * dx + dy * dy) / g.maxR(ox, oy), 0, 1); } },
    implode: { label: 'Волна к центру', fn: function (x, y, g, o) { return 1 - TRANSITIONS.radial.fn(x, y, g, o); } },
    diagonal: { label: 'Диагональ', fn: function (x, y, g) { return (x / Math.max(1, g.cols - 1) + y / Math.max(1, g.rows - 1)) / 2; } },
    rows: { label: 'Сверху вниз', fn: function (x, y, g) { return y / Math.max(1, g.rows - 1); } },
    cols: { label: 'Слева направо', fn: function (x, y, g) { return x / Math.max(1, g.cols - 1); } },
    random: { label: 'Случайно', fn: function (x, y) { return hash2(x, y); } },
    noise: { label: 'Пятнами', fn: function (x, y, g) { return clamp((vnoise(x * 0.12, y * 0.12, 3.1) - 0.2) / 0.6, 0, 1); } },
    spiral: { label: 'По спирали', fn: function (x, y, g) { var dx = x - g.cols / 2, dy = y - g.rows / 2; var a = (Math.atan2(dy, dx) / (Math.PI * 2) + 0.5); var r = Math.sqrt(dx * dx + dy * dy) / (Math.min(g.cols, g.rows) / 2); return fract(a + r * 0.35) * 0.75 + clamp(r, 0, 1) * 0.25; } },
    all: { label: 'Все сразу', fn: function () { return 0; } }
  };

  // ------------------------------------------------------------------ эффекты цикла
  // Возвращают модуляцию уровня (lm), размера (sm) и «искру» для выключенных точек (sp)
  var EFFECTS = {
    none: { label: 'Нет' },
    breathe: { label: 'Дыхание', fn: function (x, y, t, g, lvl, out) { var s = Math.sin(t * 2.4); out.lm = 0.82 + 0.18 * s; out.sm = 0.93 + 0.07 * s; } },
    twinkle: { label: 'Мерцание', fn: function (x, y, t, g, lvl, out) { var h = hash2(x, y), s = 0.5 + 0.5 * Math.sin(t * (1.5 + h * 3) + h * 40); out.lm = 0.5 + 0.5 * s * s; } },
    shine: { label: 'Блик', fn: function (x, y, t, g, lvl, out) { var b = fract(t / 3.2) * 1.8 - 0.4, d = (x / g.cols + y / g.rows) / 2; var k = Math.exp(-Math.pow((d - b) / 0.05, 2)); out.lm = 1 + 0.55 * k; out.sm = 1 + 0.22 * k; } },
    scan: { label: 'Сканер', fn: function (x, y, t, g, lvl, out) { var b = fract(t / 2.6) * 1.3 - 0.15; var k = Math.exp(-Math.pow((y / g.rows - b) / 0.035, 2)); out.lm = 0.62 + 0.7 * k; out.sp = k * 0.35; } },
    ripple: { label: 'Рябь', fn: function (x, y, t, g, lvl, out) { var dx = x - g.cols / 2, dy = y - g.rows / 2, r = Math.sqrt(dx * dx + dy * dy); var k = 0.5 + 0.5 * Math.sin(r * 0.55 - t * 4.2); out.sm = 0.72 + 0.34 * k; out.lm = 0.8 + 0.2 * k; } },
    sparkle: { label: 'Искры', fn: function (x, y, t, g, lvl, out) { var h = hash2(x + 3, y + 7); var s = Math.sin(t * (0.6 + h * 1.4) + h * 90); out.sp = Math.pow(Math.max(0, s), 40) * 0.9; } }
  };

  // ------------------------------------------------------------------ формы точек
  var SHAPES = {
    circle: 'Круг', square: 'Квадрат (LED)', rounded: 'Скруглённый', diamond: 'Ромб', ring: 'Кольцо', merge: 'Слияние'
  };

  var DEFAULTS = {
    cols: 48, rows: null,            // rows = null → по пропорциям холста
    shape: 'circle',
    dot: 0.82,                       // размер включённой точки, доля ячейки
    offDot: null,                    // размер выключенной точки (null = как dot; 0 = не рисовать)
    background: '#161413',           // null = прозрачный
    offColor: '#2E2A28',
    colors: ['#FF6547', '#CDDFF8'],  // цвета вывода
    palette: null,                   // цвета, по которым распознаётся источник (null = colors)
    colorMode: 'palette',            // palette | source | mono
    sizeMode: 'fixed',               // fixed | coverage (полутон: размер по заполнению)
    threshold: 0.45, detail: 0.3, invert: false,
    removeBg: true, bgTolerance: 40,
    padding: 0.06, scale: 1, offsetX: 0, offsetY: 0,
    glow: 0,                         // 0..1 — свечение включённых точек
    gridLines: false,                // тонкая сетка, как в шрифте nodes
    offOutline: false,               // выключенные точки — контуром, а не заливкой
    mergeDiagonal: true,             // в «слиянии» соединять и соседей по диагонали
    effect: 'none', effectStrength: 1,
    hover: 'none',                   // none | grow | light
    hoverRadius: 6, hoverColor: null,
    clickRipple: false,
    speed: 1,
    pixelRatio: null,
    autoplay: true,
    pauseOffscreen: true,
    reducedMotion: 'respect'         // respect | ignore
  };

  // ------------------------------------------------------------------ основной класс
  function DotMatrix(canvas, options) {
    if (!(this instanceof DotMatrix)) return new DotMatrix(canvas, options);
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.o = Object.assign({}, DEFAULTS, options || {});
    this.items = [{ sampler: null, hold: Infinity, tr: null }];
    this.loop = false;
    this.clock = 0; this.last = 0; this.running = false; this.frozen = null;
    this.from = null;
    this.pointer = { x: 0, y: 0, k: 0, target: 0, inside: false };
    this.pulses = [];
    this.fx = { lm: 1, sm: 1, sp: 0 };
    this.styleCache = new Map();
    this._visible = true;
    this._raf = this._raf.bind(this);
    this._resize();
    this._bind();
    if (this.o.autoplay) this.start();
  }

  DotMatrix.prototype = {
    constructor: DotMatrix,

    // --------- настройки
    set: function (opts) {
      var prevGrid = this.o.cols + 'x' + this.o.rows;
      Object.assign(this.o, opts || {});
      if (opts && ('cols' in opts || 'rows' in opts)) {
        if (this.o.cols + 'x' + this.o.rows !== prevGrid) this._resize();
      }
      this.styleCache.clear();
      this._dirty = true;
      return this;
    },
    get options() { return Object.assign({}, this.o); },

    // --------- содержимое
    // Показать один источник с переходом от текущего состояния
    show: async function (source, transition) {
      var s = await loadSource(source);
      this.from = this._snapshot();
      this.items = [{ sampler: s, hold: Infinity, tr: normTr(transition) }];
      this.loop = false;
      this.clock = 0; this._dirty = true;
      return s;
    },
    // Сценарий: [{ source, hold, transition }], переходы по кругу при loop
    play: async function (list, opts) {
      var items = [];
      for (var i = 0; i < list.length; i++) {
        items.push({ sampler: await loadSource(list[i].source), hold: list[i].hold == null ? 2 : list[i].hold, tr: normTr(list[i].transition) });
      }
      this.from = this._snapshot();
      this.items = items;
      this.loop = !opts || opts.loop !== false;
      if (!this.loop) items[items.length - 1].hold = Infinity;
      this.clock = 0; this._dirty = true;
      return this;
    },
    get duration() {
      var d = 0;
      this.items.forEach(function (it) { d += (it.tr ? it.tr.duration : 0) + it.hold; });
      return d;
    },

    // --------- время
    start: function () { if (this.running) return; this.running = true; this.last = 0; requestAnimationFrame(this._raf); return this; },
    stop: function () { this.running = false; return this; },
    // перерисовать после изменения настроек источника (sampler.setOptions)
    refresh: function () { this._dirty = true; if (!this.running) this.draw(); return this; },
    seek: function (t) { this.clock = t; this._dirty = true; this.draw(); return this; },
    // Детерминированный кадр на момент t (для экспорта). Не трогает часы.
    renderAt: function (t, target) { this._frame(t); this._paint(target || this.ctx, t); return this; },

    destroy: function () {
      this.stop();
      if (this._ro) this._ro.disconnect();
      if (this._io) this._io.disconnect();
      var c = this.canvas, h = this._handlers;
      if (h) Object.keys(h).forEach(function (k) { c.removeEventListener(k, h[k]); });
    },

    // --------- экспорт
    toPNG: function (opts) {
      opts = opts || {};
      var sc = opts.scale || 2, W = this.W, H = this.H;
      var c = makeCanvas(Math.round(W * sc), Math.round(H * sc)), x = c.getContext('2d');
      x.setTransform(sc, 0, 0, sc, 0, 0);
      this._frame(opts.t == null ? this.clock : opts.t);
      this._paint(x, opts.t == null ? this.clock : opts.t, W, H);
      if (c.convertToBlob) return c.convertToBlob({ type: 'image/png' });
      return new Promise(function (res) { c.toBlob(res, 'image/png'); });
    },
    toSVG: function (opts) {
      opts = opts || {};
      var t = opts.t == null ? this.clock : opts.t;
      this._frame(t);
      return buildSVG(this, opts);
    },
    // Карта точек текущего кадра: компактный JSON для приложения
    toJSON: function () {
      this._frame(this.clock);
      var cols = this.cols, rows = this.rows, b = this.buf;
      var map = new Map(), colors = [], cells = [];
      for (var y = 0; y < rows; y++) {
        var line = '';
        for (var x = 0; x < cols; x++) {
          var i = y * cols + x;
          if (b.level[i] < 0.5) { line += '.'; continue; }
          var hx = rgbToHex(b.rgb[i * 3], b.rgb[i * 3 + 1], b.rgb[i * 3 + 2]);
          if (!map.has(hx)) { if (colors.length >= 36) { line += (colors.length - 1).toString(36); continue; } map.set(hx, colors.length); colors.push(hx); }
          line += map.get(hx).toString(36);
        }
        cells.push(line);
      }
      var o = this.o;
      return { type: 'field', version: 1, cols: cols, rows: rows, colors: colors, cells: cells,
        style: { shape: o.shape, dot: o.dot, offDot: o.offDot, background: o.background, offColor: o.offColor, glow: o.glow, gridLines: o.gridLines } };
    },

    // ============================================================== внутреннее
    _bind: function () {
      var self = this, c = this.canvas;
      if (typeof ResizeObserver !== 'undefined') {
        this._ro = new ResizeObserver(function () { self._resize(); });
        this._ro.observe(c);
      }
      if (typeof IntersectionObserver !== 'undefined') {
        this._io = new IntersectionObserver(function (e) { self._visible = e[0].isIntersecting; });
        this._io.observe(c);
      }
      var pos = function (e) {
        var r = c.getBoundingClientRect();
        return { x: (e.clientX - r.left - self.ox) / self.cell, y: (e.clientY - r.top - self.oy) / self.cell };
      };
      this._handlers = {
        pointermove: function (e) { var p = pos(e); self.pointer.x = p.x; self.pointer.y = p.y; self.pointer.target = 1; self._dirty = true; },
        pointerleave: function () { self.pointer.target = 0; },
        pointerdown: function (e) { if (!self.o.clickRipple) return; var p = pos(e); self.pulses.push({ x: p.x, y: p.y, t0: self.clock }); self._dirty = true; }
      };
      Object.keys(this._handlers).forEach(function (k) { c.addEventListener(k, self._handlers[k]); });
    },

    _resize: function () {
      var c = this.canvas, r = c.getBoundingClientRect();
      var W = r.width || c.width || 600, H = r.height || c.height || 600;
      var dpr = this.o.pixelRatio || (typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1) || 1;
      this.W = W; this.H = H; this.dpr = dpr;
      if (r.width) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      this.cols = Math.max(2, Math.round(this.o.cols));
      this.cell = W / this.cols;
      this.rows = this.o.rows ? Math.max(2, Math.round(this.o.rows)) : Math.max(2, Math.floor(H / this.cell + 0.001));
      if (this.o.rows) this.cell = Math.min(W / this.cols, H / this.rows);
      this.ox = (W - this.cols * this.cell) / 2;
      this.oy = (H - this.rows * this.cell) / 2;
      var n = this.cols * this.rows;
      if (!this.buf || this.buf.level.length !== n) {
        this.buf = { level: new Float32Array(n), rgb: new Uint8ClampedArray(n * 3), smul: new Float32Array(n), flash: new Float32Array(n) };
        this.from = null;
        this._delays = {};
      }
      this._dirty = true;
      if (!this.running) this.draw();
    },

    _snapshot: function () {
      if (!this.buf) return null;
      var f = new Field(this.cols, this.rows);
      f.level.set(this.buf.level); f.rgb.set(this.buf.rgb);
      return f;
    },

    _raf: function (now) {
      if (!this.running) return;
      var dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
      this.last = now;
      var reduce = this.o.reducedMotion === 'respect' && typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      var active = this._visible || !this.o.pauseOffscreen;
      if (active && (typeof document === 'undefined' || !document.hidden)) {
        // при «уменьшить движение» переходы проскакивают сразу, эффекты цикла замирают
        this.clock += dt * (this.o.speed || 1) * (reduce ? 50 : 1);
        this.frozenFx = reduce;
        var p = this.pointer; p.k += (p.target - p.k) * Math.min(1, dt * 8);
        if (this._needsFrame() || this._dirty) { this.draw(); this._dirty = false; }
      }
      requestAnimationFrame(this._raf);
    },

    _needsFrame: function () {
      if (this.o.effect !== 'none' && !this.frozenFx) return true;
      if (this.o.hover !== 'none' && (this.pointer.k > 0.001 || this.pointer.target > 0)) return true;
      if (this.pulses.length) return true;
      var t = this.loop ? 0 : this.clock, acc = 0;
      for (var i = 0; i < this.items.length; i++) {
        var it = this.items[i], d = it.tr ? it.tr.duration : 0;
        if (it.sampler && it.sampler.animated) return true;
        if (this.loop) return true;
        if (t < acc + d + 0.05) return true;
        acc += d + it.hold;
      }
      return false;
    },

    draw: function () { this._frame(this.clock); this._paint(this.ctx, this.clock); },

    _delay: function (tr) {
      var key = tr.pattern + '|' + (tr.originX || '') + '|' + (tr.originY || '') + '|' + this.cols + 'x' + this.rows;
      var d = this._delays[key];
      if (d) return d;
      var cols = this.cols, rows = this.rows, fn = (TRANSITIONS[tr.pattern] || TRANSITIONS.radial).fn;
      var g = { cols: cols, rows: rows, maxR: function (ox, oy) { var w = 1, h = rows / cols; var dx = Math.max(ox, 1 - ox) * w, dy = Math.max(oy, 1 - oy) * h; return Math.sqrt(dx * dx + dy * dy); } };
      d = new Float32Array(cols * rows);
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) d[y * cols + x] = fn(x + 0.5, y + 0.5, g, tr);
      this._delays[key] = d;
      return d;
    },

    _sample: function (it, t, lt) {
      if (!it || !it.sampler) return null;
      return it.sampler.sample(this.cols, this.rows, this.o, t, lt);
    },

    // Вычисляет содержимое буфера (уровень, цвет, множитель размера) на момент t
    _frame: function (t) {
      var items = this.items, N = items.length, b = this.buf, n = this.cols * this.rows;
      var total = this.duration, tt = t, iter = 0;
      if (this.loop && isFinite(total) && total > 0) { iter = Math.floor(t / total); tt = t - iter * total; }
      var k = 0, acc = 0;
      for (; k < N; k++) {
        var len = (items[k].tr ? items[k].tr.duration : 0) + items[k].hold;
        if (tt < acc + len || k === N - 1) break;
        acc += len;
      }
      var it = items[k], u = tt - acc;
      this.parts = null;
      var cur = this._sample(it, t, u) || new Field(this.cols, this.rows);
      if (cur.level.length !== n) cur = new Field(this.cols, this.rows);
      var tr = it.tr;
      b.smul.fill(1); b.flash.fill(0);
      if (!tr || u >= tr.duration) {
        b.level.set(cur.level); b.rgb.set(cur.rgb);
        return;
      }
      var pit = k > 0 ? items[k - 1] : (iter > 0 ? items[N - 1] : null);
      var prev = pit ? this._sample(pit, t, (pit.tr ? pit.tr.duration : 0) + pit.hold) : this.from;
      if (!prev || prev.level.length !== n) prev = new Field(this.cols, this.rows);
      var delays = this._delay(tr), spread = clamp(tr.spread, 0, 0.95), P = u / tr.duration;
      var style = tr.style, e = ease[tr.ease] || ease.inOut;
      if (style === 'scatter') { this._scatter(prev, cur, tr, P, delays); return; }
      for (var i = 0; i < n; i++) {
        var q = clamp((P - delays[i] * spread) / (1 - spread), 0, 1);
        var la = prev.level[i], lb = cur.level[i], i3 = i * 3;
        var ra = prev.rgb[i3], ga = prev.rgb[i3 + 1], ba = prev.rgb[i3 + 2];
        var rb = cur.rgb[i3], gb = cur.rgb[i3 + 1], bb = cur.rgb[i3 + 2];
        var same = la === lb && ra === rb && ga === gb && ba === bb;
        if (style === 'flip') {
          var after = q >= 0.5;
          b.level[i] = after ? lb : la;
          b.rgb[i3] = after ? rb : ra; b.rgb[i3 + 1] = after ? gb : ga; b.rgb[i3 + 2] = after ? bb : ba;
          if (!same) b.flash[i] = Math.exp(-Math.pow((q - 0.5) / 0.1, 2)) * 0.7;
          continue;
        }
        var p = e(q);
        b.level[i] = lerp(la, lb, p);
        if (la < 0.01) { b.rgb[i3] = rb; b.rgb[i3 + 1] = gb; b.rgb[i3 + 2] = bb; }
        else if (lb < 0.01) { b.rgb[i3] = ra; b.rgb[i3 + 1] = ga; b.rgb[i3 + 2] = ba; }
        else { b.rgb[i3] = lerp(ra, rb, p); b.rgb[i3 + 1] = lerp(ga, gb, p); b.rgb[i3 + 2] = lerp(ba, bb, p); }
        if (style === 'pop' && !same) b.smul[i] = 1 + 0.45 * Math.sin(Math.PI * q);
      }
    },

    // «Рассыпаться и собраться»: горящие точки прошлого кадра разлетаются по экрану и собираются в новый кадр.
    // Точки движутся свободно (не по сетке); сетка в это время показывает только пустые точки.
    _scatter: function (prev, cur, tr, P, delays) {
      var cols = this.cols, rows = this.rows, n0 = cols * rows, b = this.buf;
      b.level.fill(0); b.smul.fill(1); b.flash.fill(0);
      var A = [], B = [], i;
      for (i = 0; i < n0; i++) { if (prev.level[i] >= 0.5) A.push(i); if (cur.level[i] >= 0.5) B.push(i); }
      var ccx = cols / 2, ccy = rows / 2;
      var ang = function (j) { var x = j % cols + 0.5 - ccx, y = Math.floor(j / cols) + 0.5 - ccy; return Math.atan2(y, x); };
      var key = function (j) { return ang(j) + hash(j * 0.731) * 0.35; };
      A.sort(function (p, q) { return key(p) - key(q); });
      B.sort(function (p, q) { return key(p) - key(q); });
      var n = Math.max(A.length, B.length);
      if (!n) return;
      var ps = this.parts;
      if (!ps || ps.x.length < n) ps = { x: new Float32Array(n), y: new Float32Array(n), s: new Float32Array(n), a: new Float32Array(n), col: new Uint8ClampedArray(n * 3) };
      ps.n = n;
      var spread = clamp(tr.spread, 0, 0.95) * 0.6, amt = tr.scatter == null ? 1 : tr.scatter, swirl = tr.swirl || 0;
      var R = Math.sqrt(cols * cols + rows * rows) / 2;
      for (var j = 0; j < n; j++) {
        var a = A.length ? A[Math.floor(j * A.length / n)] : -1, g = B.length ? B[Math.floor(j * B.length / n)] : -1;
        var h1 = hash(j * 1.371 + 0.5), h2 = hash(j * 7.13 + 2.3), h3 = hash(j * 3.31 + 9.1);
        var ref = a >= 0 ? a : g;
        var sx = a >= 0 ? a % cols + 0.5 : NaN, sy = a >= 0 ? Math.floor(a / cols) + 0.5 : NaN;
        var gx = g >= 0 ? g % cols + 0.5 : NaN, gy = g >= 0 ? Math.floor(g / cols) + 0.5 : NaN;
        if (a < 0) { sx = gx; sy = gy; } if (g < 0) { gx = sx; gy = sy; }
        // точка разлёта: наружу от центра + случайное место на всём экране
        var th = Math.atan2(sy - ccy, sx - ccx) + (h2 - 0.5) * 1.4;
        var rr = R * (0.35 + 0.75 * h3) * amt;
        var ox = ccx + Math.cos(th) * rr, oy = ccy + Math.sin(th) * rr;
        var mx = lerp(ox, h2 * cols, 0.35), my = lerp(oy, h3 * rows, 0.35);
        var d0 = (delays ? delays[ref] : h1) * spread + h1 * 0.08;
        var q = clamp((P - d0) / (1 - spread - 0.08), 0, 1);
        var x, y;
        if (q < 0.5) { var e1 = ease.out(q / 0.5); x = lerp(sx, mx, e1); y = lerp(sy, my, e1); }
        else { var e2 = ease.inOut((q - 0.5) / 0.5); x = lerp(mx, gx, e2); y = lerp(my, gy, e2); }
        if (swirl) {
          var rot = swirl * Math.PI * Math.sin(Math.PI * q), cs = Math.cos(rot), sn = Math.sin(rot), dx = x - ccx, dy = y - ccy;
          x = ccx + dx * cs - dy * sn; y = ccy + dx * sn + dy * cs;
        }
        ps.x[j] = x; ps.y[j] = y;
        ps.s[j] = 1 - 0.3 * Math.sin(Math.PI * q);
        var ca = a >= 0 ? a : g, cb = g >= 0 ? g : a, m = smooth(0.3, 0.8, q);
        ps.col[j * 3] = lerp(prev.rgb[ca * 3] || cur.rgb[cb * 3], cur.rgb[cb * 3] || prev.rgb[ca * 3], m);
        ps.col[j * 3 + 1] = lerp(prev.rgb[ca * 3 + 1] || cur.rgb[cb * 3 + 1], cur.rgb[cb * 3 + 1] || prev.rgb[ca * 3 + 1], m);
        ps.col[j * 3 + 2] = lerp(prev.rgb[ca * 3 + 2] || cur.rgb[cb * 3 + 2], cur.rgb[cb * 3 + 2] || prev.rgb[ca * 3 + 2], m);
        ps.a[j] = a < 0 ? smooth(0.2, 0.7, q) : g < 0 ? 1 - smooth(0.3, 0.8, q) : 1;
      }
      if (!A.length) for (j = 0; j < n; j++) { var c0 = B[Math.floor(j * B.length / n)] * 3; ps.col[j * 3] = cur.rgb[c0]; ps.col[j * 3 + 1] = cur.rgb[c0 + 1]; ps.col[j * 3 + 2] = cur.rgb[c0 + 2]; }
      if (!B.length) for (j = 0; j < n; j++) { var c1 = A[Math.floor(j * A.length / n)] * 3; ps.col[j * 3] = prev.rgb[c1]; ps.col[j * 3 + 1] = prev.rgb[c1 + 1]; ps.col[j * 3 + 2] = prev.rgb[c1 + 2]; }
      this.parts = ps;
    },

    _drawParts: function (ctx) {
      var ps = this.parts;
      if (!ps) return;
      var o = this.o, c = this.cell, ox = this.ox, oy = this.oy;
      var shape = o.shape === 'merge' || o.shape === 'ring' ? 'circle' : o.shape;
      var base = o.dot * c / 2;
      for (var j = 0; j < ps.n; j++) {
        if (ps.a[j] <= 0.01) continue;
        ctx.fillStyle = this._style(ps.col[j * 3], ps.col[j * 3 + 1], ps.col[j * 3 + 2], ps.a[j] >= 0.99 ? null : ps.a[j]);
        ctx.beginPath();
        pathShape(ctx, shape, ox + ps.x[j] * c, oy + ps.y[j] * c, base * ps.s[j]);
        ctx.fill();
      }
    },

    _style: function (r, g, bl, a) {
      var key = ((r & 255) << 24 | (g & 255) << 16 | (bl & 255) << 8 | Math.round((a == null ? 1 : a) * 255)) >>> 0;
      var s = this.styleCache.get(key);
      if (!s) { s = a == null || a >= 1 ? 'rgb(' + r + ',' + g + ',' + bl + ')' : 'rgba(' + r + ',' + g + ',' + bl + ',' + a.toFixed(3) + ')'; this.styleCache.set(key, s); if (this.styleCache.size > 20000) this.styleCache.clear(); }
      return s;
    },

    // Итоговая геометрия каждой точки: цвет и радиус — с учётом эффектов и курсора
    _resolve: function (t) {
      var o = this.o, cols = this.cols, rows = this.rows, n = cols * rows, b = this.buf;
      if (!this.out || this.out.r.length !== n) this.out = { r: new Float32Array(n), col: new Uint8ClampedArray(n * 3), lit: new Uint8Array(n) };
      var out = this.out;
      var off = hexToRgb(o.offColor || '#000000'), offA = o.offColor ? 1 : 0;
      var dot = o.dot, offDot = o.offDot == null ? dot : o.offDot;
      var effect = this.frozenFx ? null : (EFFECTS[o.effect] || {}).fn, fx = this.fx, str = o.effectStrength == null ? 1 : o.effectStrength;
      var g = { cols: cols, rows: rows };
      var p = this.pointer, hr = o.hoverRadius, hk = o.hover !== 'none' ? p.k : 0;
      var hc = hexToRgb(o.hoverColor || o.colors[0]);
      var sparkC = hexToRgb(o.colors[0]);
      var pulses = this.pulses;
      if (pulses.length) this.pulses = pulses = pulses.filter(function (q) { return t - q.t0 < 2.2 && t >= q.t0; });
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
        var i = y * cols + x, i3 = i * 3;
        var L = b.level[i], sm = b.smul[i], flash = b.flash[i];
        fx.lm = 1; fx.sm = 1; fx.sp = 0;
        if (effect) {
          effect(x + 0.5, y + 0.5, t, g, L, fx);
          fx.lm = lerp(1, fx.lm, str); fx.sm = lerp(1, fx.sm, str); fx.sp *= str;
        }
        var r = b.rgb[i3], gg = b.rgb[i3 + 1], bb = b.rgb[i3 + 2];
        var lvl = L * fx.lm, size = sm * fx.sm, hot = 0;
        if (hk > 0) {
          var dx = x + 0.5 - p.x, dy = y + 0.5 - p.y, dd = Math.sqrt(dx * dx + dy * dy);
          hot = hk * (1 - smooth(hr * 0.2, hr, dd));
        }
        for (var q = 0; q < pulses.length; q++) {
          var pu = pulses[q], age = t - pu.t0, ex = x + 0.5 - pu.x, ey = y + 0.5 - pu.y;
          var front = age * 22, dist = Math.abs(Math.sqrt(ex * ex + ey * ey) - front);
          var k = Math.exp(-dist * dist / 3) * (1 - age / 2.2);
          size *= 1 + 0.6 * k; if (L < 0.05) fx.sp = Math.max(fx.sp, k * 0.8);
        }
        if (o.hover === 'grow') size *= 1 + 0.9 * hot;
        var sp = fx.sp;
        if (o.hover === 'light' && L < 0.5) sp = Math.max(sp, hot * 0.9);
        else if (o.hover === 'light') lvl *= 1 + 0.35 * hot;
        // цвет: выключенная точка → цвет точки по уровню; сверх 1 — к белому; искры подсвечивают выключенные точки
        var lc = clamp(lvl, 0, 1);
        var cr, cg, cb, rad;
        if (sp > 0.01 && L < 0.05) {
          var sc = o.hover === 'light' && hot > sp * 0.9 ? hc : sparkC;
          cr = lerp(off[0], sc[0], sp); cg = lerp(off[1], sc[1], sp); cb = lerp(off[2], sc[2], sp);
          lc = sp;
          rad = lerp(offDot, dot, sp);
        } else {
          if (L < 0.001) { cr = off[0]; cg = off[1]; cb = off[2]; }
          else { cr = lerp(off[0], r, lc); cg = lerp(off[1], gg, lc); cb = lerp(off[2], bb, lc); }
          rad = lerp(offDot, dot, lc);
        }
        var over = Math.max(0, lvl - 1) + flash;
        if (over > 0) { var w = Math.min(0.85, over * 0.9); cr = lerp(cr, 255, w); cg = lerp(cg, 255, w); cb = lerp(cb, 255, w); }
        var visible = lc > 0.001 || offA;
        out.r[i] = visible ? Math.max(0, rad * size) * this.cell / 2 : 0;
        out.col[i3] = cr; out.col[i3 + 1] = cg; out.col[i3 + 2] = cb;
        out.lit[i] = lc > 0.5 ? 1 : 0;
      }
      return out;
    },

    _paint: function (ctx, t, W, H) {
      var o = this.o, isMain = ctx === this.ctx;
      W = W || this.W; H = H || this.H;
      if (isMain) ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (o.background) { ctx.fillStyle = o.background; ctx.fillRect(0, 0, W, H); }
      var out = this._resolve(t);
      if (o.gridLines) this._grid(ctx);
      if (o.glow > 0 && ctx.filter !== undefined) {
        // свечение: включённые точки рисуются в отдельный слой, слой размывается один раз
        var tr = ctx.getTransform(), pw = Math.ceil(W * tr.a), ph = Math.ceil(H * tr.d);
        var L = this._glowLayer;
        if (!L || L.width !== pw || L.height !== ph) { L = this._glowLayer = makeCanvas(pw, ph); this._glowCtx = L.getContext('2d'); }
        var g = this._glowCtx;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, pw, ph);
        g.setTransform(tr.a, 0, 0, tr.d, 0, 0);
        this._shapes(g, out, true);
        this._drawParts(g);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.filter = 'blur(' + (this.cell * tr.a * (0.35 + o.glow * 0.9)).toFixed(1) + 'px)';
        ctx.globalAlpha = 0.35 + o.glow * 0.5;
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(L, 0, 0);
        ctx.restore();
      }
      this._shapes(ctx, out, false);
      this._drawParts(ctx);
    },

    _grid: function (ctx) {
      var c = this.cell, cols = this.cols, rows = this.rows, ox = this.ox, oy = this.oy;
      ctx.save();
      ctx.strokeStyle = this.o.gridColor || 'rgba(255,255,255,0.28)';
      ctx.lineWidth = Math.max(0.5, c * 0.025);
      ctx.beginPath();
      for (var x = 0; x <= cols; x++) { ctx.moveTo(ox + x * c, oy); ctx.lineTo(ox + x * c, oy + rows * c); }
      for (var y = 0; y <= rows; y++) { ctx.moveTo(ox, oy + y * c); ctx.lineTo(ox + cols * c, oy + y * c); }
      ctx.stroke();
      ctx.restore();
    },

    _shapes: function (ctx, out, litOnly) {
      var o = this.o, cols = this.cols, rows = this.rows, c = this.cell, ox = this.ox, oy = this.oy;
      var shape = o.shape, last = '', open = false, stroked = false;
      if (shape === 'merge') return this._merge(ctx, out, litOnly);
      // точки одного цвета собираются в один путь и заливаются одним вызовом
      var flush = function () { if (!open) return; if (stroked) ctx.stroke(); else ctx.fill(); open = false; };
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
        var i = y * cols + x, r = out.r[i];
        if (r <= 0.05 || (litOnly && !out.lit[i])) continue;
        var ol = o.offOutline && !out.lit[i], st2 = shape === 'ring' || ol;
        var i3 = i * 3, st = this._style(out.col[i3], out.col[i3 + 1], out.col[i3 + 2]);
        if (st !== last || st2 !== stroked) {
          flush();
          ctx.fillStyle = st; ctx.strokeStyle = st; last = st; stroked = st2;
          if (ol) ctx.lineWidth = Math.max(0.6, c * 0.035);
        }
        if (!open) { ctx.beginPath(); open = true; }
        var cx = ox + (x + 0.5) * c, cy = oy + (y + 0.5) * c;
        if (ol) { var lw = Math.max(0.6, c * 0.035), rr = Math.max(0.1, r - lw / 2); ctx.moveTo(cx + rr, cy); ctx.arc(cx, cy, rr, 0, Math.PI * 2); continue; }
        if (shape === 'ring') { ctx.lineWidth = r * 0.42; flush(); ctx.beginPath(); open = true; ctx.moveTo(cx + r * 0.79, cy); ctx.arc(cx, cy, r * 0.79, 0, Math.PI * 2); flush(); continue; }
        pathShape(ctx, shape, cx, cy, r);
      }
      flush();
    },

    // «Слияние»: соседние включённые точки одного цвета соединяются в сплошную форму
    _merge: function (ctx, out, litOnly) {
      var cols = this.cols, rows = this.rows, c = this.cell, ox = this.ox, oy = this.oy, last = '';
      var same = function (a, b) { return out.lit[a] && out.lit[b] && out.col[a * 3] === out.col[b * 3] && out.col[a * 3 + 1] === out.col[b * 3 + 1] && out.col[a * 3 + 2] === out.col[b * 3 + 2]; };
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
        var i = y * cols + x, r = out.r[i];
        if (r <= 0.05) continue;
        if (litOnly && !out.lit[i]) continue;
        var i3 = i * 3, st = this._style(out.col[i3], out.col[i3 + 1], out.col[i3 + 2]);
        if (st !== last) { ctx.fillStyle = st; last = st; }
        var cx = ox + (x + 0.5) * c, cy = oy + (y + 0.5) * c;
        if (!out.lit[i]) {
          if (this.o.offOutline) { ctx.strokeStyle = st; outline(ctx, cx, cy, r, c); }
          else { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }
          continue;
        }
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        var right = x + 1 < cols && same(i, i + 1), down = y + 1 < rows && same(i, i + cols);
        if (right) { var h = Math.min(r, out.r[i + 1]); ctx.fillRect(cx, cy - h, c, 2 * h); }
        if (down) { var w = Math.min(r, out.r[i + cols]); ctx.fillRect(cx - w, cy, 2 * w, c); }
        if (right && down && x + 1 < cols && y + 1 < rows && same(i, i + cols + 1)) ctx.fillRect(cx, cy, c, c);
        if (this.o.mergeDiagonal && y + 1 < rows) {
          var left = x > 0 && same(i, i - 1);
          if (x + 1 < cols && same(i, i + cols + 1) && !(right && down) && !(same(i + 1, i + cols + 1) && same(i + cols, i + cols + 1)))
            capsule(ctx, cx, cy, cx + c, cy + c, Math.min(r, out.r[i + cols + 1]));
          if (x > 0 && same(i, i + cols - 1) && !(left && down) && !(same(i - 1, i + cols - 1) && same(i + cols, i + cols - 1)))
            capsule(ctx, cx, cy, cx - c, cy + c, Math.min(r, out.r[i + cols - 1]));
        }
      }
    }
  };

  function capsulePts(ax, ay, bx, by, w) {
    var dx = bx - ax, dy = by - ay, l = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / l * w, ny = dx / l * w;
    return [[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]];
  }
  function capsule(ctx, ax, ay, bx, by, w) {
    var p = capsulePts(ax, ay, bx, by, w);
    ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); ctx.lineTo(p[1][0], p[1][1]); ctx.lineTo(p[2][0], p[2][1]); ctx.lineTo(p[3][0], p[3][1]); ctx.closePath(); ctx.fill();
  }

  function outline(ctx, cx, cy, r, c) {
    var lw = Math.max(0.6, c * 0.035);
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.1, r - lw / 2), 0, Math.PI * 2); ctx.stroke();
  }

  // добавляет форму в текущий путь (без заливки)
  function pathShape(ctx, shape, cx, cy, r) {
    switch (shape) {
      case 'square': ctx.rect(cx - r, cy - r, 2 * r, 2 * r); break;
      case 'rounded':
        if (ctx.roundRect) { ctx.moveTo(cx + r, cy); ctx.roundRect(cx - r, cy - r, 2 * r, 2 * r, r * 0.45); }
        else ctx.rect(cx - r, cy - r, 2 * r, 2 * r);
        break;
      case 'diamond': ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy); ctx.closePath(); break;
      default: ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
  }

  function drawShape(ctx, shape, cx, cy, r) {
    switch (shape) {
      case 'square': ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r); break;
      case 'rounded':
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(cx - r, cy - r, 2 * r, 2 * r, r * 0.45); else ctx.rect(cx - r, cy - r, 2 * r, 2 * r);
        ctx.fill(); break;
      case 'diamond':
        ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy); ctx.closePath(); ctx.fill(); break;
      case 'ring':
        ctx.beginPath(); ctx.lineWidth = r * 0.42; ctx.arc(cx, cy, r * 0.79, 0, Math.PI * 2); ctx.stroke(); break;
      default:
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function f2(v) { return Math.round(v * 100) / 100; }

  function buildSVG(dm, opts) {
    var o = dm.o, cols = dm.cols, rows = dm.rows, c = dm.cell, ox = dm.ox, oy = dm.oy, W = dm.W, H = dm.H;
    var out = dm._resolve(opts.t == null ? dm.clock : opts.t);
    var parts = [], lit = [];
    var hex = function (i) { return rgbToHex(Math.round(out.col[i * 3]), Math.round(out.col[i * 3 + 1]), Math.round(out.col[i * 3 + 2])); };
    // группируем по цвету, чтобы файл был компактным и удобно правился в Figma
    var groups = new Map();
    var add = function (col, s, isLit) { if (!groups.has(col)) groups.set(col, { items: [], lit: isLit }); groups.get(col).items.push(s); };
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      var i = y * cols + x, r = out.r[i];
      if (r <= 0.05) continue;
      var cx = ox + (x + 0.5) * c, cy = oy + (y + 0.5) * c, col = hex(i), s;
      if (o.offOutline && !out.lit[i]) {
        var lw = Math.max(0.6, c * 0.035);
        add(col + '|o', '<circle cx="' + f2(cx) + '" cy="' + f2(cy) + '" r="' + f2(Math.max(0.1, r - lw / 2)) + '" fill="none" stroke-width="' + f2(lw) + '"/>', false);
        continue;
      }
      switch (o.shape) {
        case 'square': s = '<rect x="' + f2(cx - r) + '" y="' + f2(cy - r) + '" width="' + f2(2 * r) + '" height="' + f2(2 * r) + '"/>'; break;
        case 'rounded': s = '<rect x="' + f2(cx - r) + '" y="' + f2(cy - r) + '" width="' + f2(2 * r) + '" height="' + f2(2 * r) + '" rx="' + f2(r * 0.45) + '"/>'; break;
        case 'diamond': s = '<path d="M' + f2(cx) + ' ' + f2(cy - r) + 'L' + f2(cx + r) + ' ' + f2(cy) + 'L' + f2(cx) + ' ' + f2(cy + r) + 'L' + f2(cx - r) + ' ' + f2(cy) + 'Z"/>'; break;
        case 'ring': s = '<circle cx="' + f2(cx) + '" cy="' + f2(cy) + '" r="' + f2(r * 0.79) + '" fill="none" stroke-width="' + f2(r * 0.42) + '"/>'; break;
        default: s = '<circle cx="' + f2(cx) + '" cy="' + f2(cy) + '" r="' + f2(r) + '"/>';
      }
      if (o.shape === 'merge' && out.lit[i]) {
        var sameC = function (a, b) { return out.lit[a] && out.lit[b] && hex(a) === hex(b); };
        var right = x + 1 < cols && sameC(i, i + 1), down = y + 1 < rows && sameC(i, i + cols);
        if (right) { var h = Math.min(r, out.r[i + 1]); s += '<rect x="' + f2(cx) + '" y="' + f2(cy - h) + '" width="' + f2(c) + '" height="' + f2(2 * h) + '"/>'; }
        if (down) { var w = Math.min(r, out.r[i + cols]); s += '<rect x="' + f2(cx - w) + '" y="' + f2(cy) + '" width="' + f2(2 * w) + '" height="' + f2(c) + '"/>'; }
        if (right && down && sameC(i, i + cols + 1)) s += '<rect x="' + f2(cx) + '" y="' + f2(cy) + '" width="' + f2(c) + '" height="' + f2(c) + '"/>';
        if (o.mergeDiagonal && y + 1 < rows) {
          var left = x > 0 && sameC(i, i - 1);
          var poly = function (bx, by, j) { var p = capsulePts(cx, cy, bx, by, Math.min(r, out.r[j])); return '<path d="M' + p.map(function (q) { return f2(q[0]) + ' ' + f2(q[1]); }).join('L') + 'Z"/>'; };
          if (x + 1 < cols && sameC(i, i + cols + 1) && !(right && down) && !(sameC(i + 1, i + cols + 1) && sameC(i + cols, i + cols + 1))) s += poly(cx + c, cy + c, i + cols + 1);
          if (x > 0 && sameC(i, i + cols - 1) && !(left && down) && !(sameC(i - 1, i + cols - 1) && sameC(i + cols, i + cols - 1))) s += poly(cx - c, cy + c, i + cols - 1);
        }
      }
      add(col, s, !!out.lit[i]);
    }
    var svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="' + f2(W) + '" height="' + f2(H) + '" viewBox="0 0 ' + f2(W) + ' ' + f2(H) + '">'];
    if (o.glow > 0) svg.push('<defs><filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="' + f2(c * (0.35 + o.glow * 0.9) / 2) + '"/></filter></defs>');
    if (o.background) svg.push('<rect width="100%" height="100%" fill="' + o.background + '"/>');
    if (o.gridLines) {
      var gl = [];
      for (var gx = 0; gx <= cols; gx++) gl.push('M' + f2(ox + gx * c) + ' ' + f2(oy) + 'V' + f2(oy + rows * c));
      for (var gy = 0; gy <= rows; gy++) gl.push('M' + f2(ox) + ' ' + f2(oy + gy * c) + 'H' + f2(ox + cols * c));
      svg.push('<path d="' + gl.join('') + '" stroke="#FFFFFF" stroke-opacity="0.28" stroke-width="' + f2(Math.max(0.5, c * 0.025)) + '" fill="none"/>');
    }
    var attr = function (col) {
      if (/\|o$/.test(col)) return 'stroke="' + col.slice(0, -2) + '"';
      return o.shape === 'ring' ? 'stroke="' + col + '"' : 'fill="' + col + '"';
    };
    if (o.glow > 0) {
      var glowParts = [];
      groups.forEach(function (g, col) { if (g.lit) glowParts.push('<g ' + attr(col) + '>' + g.items.join('') + '</g>'); });
      svg.push('<g filter="url(#glow)" opacity="' + f2(0.35 + o.glow * 0.5) + '">' + glowParts.join('') + '</g>');
    }
    groups.forEach(function (g, col) { svg.push('<g ' + attr(col) + '>' + g.items.join('') + '</g>'); });
    var ps = dm.parts;
    if (ps && ps.n) {
      var pp = [];
      for (var j = 0; j < ps.n; j++) {
        if (ps.a[j] <= 0.01) continue;
        pp.push('<circle cx="' + f2(ox + ps.x[j] * c) + '" cy="' + f2(oy + ps.y[j] * c) + '" r="' + f2(o.dot * c / 2 * ps.s[j]) + '" fill="' + rgbToHex(ps.col[j * 3], ps.col[j * 3 + 1], ps.col[j * 3 + 2]) + '"' + (ps.a[j] < 0.99 ? ' fill-opacity="' + f2(ps.a[j]) + '"' : '') + '/>');
      }
      svg.push('<g id="particles">' + pp.join('') + '</g>');
    }
    svg.push('</svg>');
    return svg.join('');
  }

  function normTr(tr) {
    if (tr === false || tr === 'none') return null;
    tr = tr || {};
    return {
      pattern: tr.pattern || 'radial',
      duration: tr.duration == null ? 1.2 : Math.max(0.01, tr.duration),
      spread: tr.spread == null ? 0.7 : tr.spread,
      style: tr.style || 'fade',   // fade | flip | pop | scatter
      scatter: tr.scatter == null ? 1 : tr.scatter,   // scatter: насколько далеко разлетаются точки
      swirl: tr.swirl || 0,                           // scatter: закрутка вокруг центра (−1…1)
      ease: tr.ease || 'inOut',
      originX: tr.originX, originY: tr.originY
    };
  }

  DotMatrix.loadSource = loadSource;
  DotMatrix.extractPalette = extractPalette;
  DotMatrix.svgToImage = svgToImage;
  DotMatrix.patterns = PATTERNS;
  DotMatrix.anims = ANIMS;
  DotMatrix.registerAnim = registerAnim;
  DotMatrix.transitions = TRANSITIONS;
  DotMatrix.effects = EFFECTS;
  DotMatrix.shapes = SHAPES;
  DotMatrix.defaults = DEFAULTS;
  DotMatrix.Field = Field;
  DotMatrix.version = '1.1.0';
  return DotMatrix;
});
