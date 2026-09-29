/*!
 * Логотип «рукопожатие» в векторе. Координаты нормированы: круг — центр (0, 0), радиус 1.
 * ArenaLogo.svg('full') — круг и светлые линии, как на тёмной версии логотипа.
 * ArenaLogo.svg('cut')  — только круг, линии вырезаны (как на светлой версии).
 */
(function (root) {
  var MAIN = 'M0.297 -1.109 L0.258 -1.078 L0.030 -0.907 L-0.604 -0.435 L-0.669 -0.383 L-0.688 -0.363 L-0.704 -0.341 L-0.716 -0.317 L-0.725 -0.292 L-0.730 -0.257 L-0.730 -0.230 L-0.726 -0.203 L-0.719 -0.178 L-0.707 -0.154 L-0.691 -0.132 L-0.672 -0.113 L-0.650 -0.098 L-0.626 -0.087 L-0.600 -0.079 L-0.574 -0.076 L-0.547 -0.075 L-0.503 -0.082 L-0.460 -0.094 L-0.155 -0.220 L-0.104 -0.237 L-0.052 -0.251 L0.012 -0.260 L0.068 -0.258 L0.131 -0.248 L0.190 -0.229 L0.223 -0.214 L0.254 -0.196 L0.284 -0.174 L0.319 -0.144 L0.965 0.496';
  var FINGERS = ['M0.412 0.353 L0.786 0.728', 'M0.200 0.565 L0.519 0.884', 'M-0.021 0.786 L0.199 1.007'];
  var STROKE = 0.128;
  var COLORS = { circle: '#FF6547', line: '#CDDFF8' };

  function lines(color, width) {
    return [MAIN].concat(FINGERS).map(function (d) {
      return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + width + '" stroke-linecap="round" stroke-linejoin="round"/>';
    }).join('');
  }

  function svg(variant, opts) {
    opts = opts || {};
    var c = opts.circle || COLORS.circle, l = opts.line || COLORS.line, w = opts.stroke || STROKE;
    var vb = '-1.2 -1.2 2.4 2.4';
    var head = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" width="1024" height="1024">';
    if (variant === 'cut') {
      return head + '<defs><mask id="m" maskUnits="userSpaceOnUse" x="-1.2" y="-1.2" width="2.4" height="2.4">' +
        '<rect x="-1.2" y="-1.2" width="2.4" height="2.4" fill="#fff"/>' + lines('#000', w) + '</mask></defs>' +
        '<circle r="1" fill="' + c + '" mask="url(#m)"/></svg>';
    }
    return head + '<circle r="1" fill="' + c + '"/>' + lines(l, w) + '</svg>';
  }

  root.ArenaLogo = { svg: svg, colors: COLORS, paths: { main: MAIN, fingers: FINGERS, stroke: STROKE } };
})(typeof self !== 'undefined' ? self : this);
