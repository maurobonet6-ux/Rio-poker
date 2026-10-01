// Piezas comunes de los formatos «mito» y «lista» (estilo de marca: negro, crema y rojo): cabecera, pantalla final y ayudas de animación.
const { FUENTES } = require('./motor.js');

const limpio = s => String(s).replace(/[<>&]/g, '');
const resalta = (s, cls) => limpio(s).replace(/\*([^*]+)\*/g, `<span class="${cls}">$1</span>`);

const CSS = `
*{box-sizing:border-box;margin:0}
html,body{width:1080px;height:1920px;overflow:hidden}
body{background:radial-gradient(1100px 800px at 50% -6%, rgba(232,40,63,.30), transparent 60%), radial-gradient(900px 700px at 50% 75%, rgba(232,40,63,.08), transparent 65%), #0A0A0B;color:#F5F2EC;font-family:'Space Grotesk',sans-serif;position:relative}
.brand{position:absolute;top:100px;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:18px;font-family:'Bricolage Grotesque';font-weight:800;font-size:46px;z-index:10}
.brand i{font-style:normal;font-size:28px;font-weight:700;color:#E8283F;background:rgba(232,40,63,.14);border:2px solid rgba(232,40,63,.5);padding:8px 18px;border-radius:999px;letter-spacing:.06em;text-transform:uppercase}
.y{color:#ffd45e}.r{color:#E8283F}.g{color:#3DDC7A}
.big{font-family:'Bricolage Grotesque';font-weight:800}
#fin{position:absolute;inset:0;z-index:20;background:radial-gradient(1100px 900px at 50% 0%, rgba(232,40,63,.35), transparent 60%),#0d0d10;display:none;flex-direction:column;align-items:center;justify-content:center}
#fin .t{font-family:'Bricolage Grotesque';font-weight:800;font-size:104px;text-align:center;padding:0 60px}
#fin .s{font-size:54px;color:#c9c4bb;margin-top:22px}#fin .s b{color:#fff}
#fin .url{margin-top:54px;font-family:'Bricolage Grotesque';font-weight:800;font-size:72px;background:linear-gradient(90deg,#e8283f,#ff6a5a);padding:30px 58px;border-radius:30px;color:#fff;box-shadow:0 20px 70px rgba(232,40,63,.5)}
#fin .a{margin-top:34px;font-size:42px;color:#c9c4bb}#fin .f{position:absolute;bottom:150px;font-size:32px;color:#8f8a82}
.pbar{position:absolute;left:0;bottom:0;height:14px;background:linear-gradient(90deg,#e8283f,#ff6a5a);z-index:40}
`;

const FIN = titulo => `<div id="fin"><div class="t">${titulo}</div><div class="s">Aprende poker con <b>RÍO</b></div><div class="url">riopoker.es</div><div class="a">👆 enlace en la bio</div><div class="f">Herramienta de estudio · +18</div></div><div class="pbar" id="pbar"></div>`;

// Ayudas de animación (se meten tal cual en la página) y la pantalla final, que arranca en T.fin.
const JS = `
const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, k) => a + (b - a) * k;
const out = t => 1 - Math.pow(1 - t, 3), back = t => { const a = 1.8, b = a + 1; return 1 + b * Math.pow(t - 1, 3) + a * Math.pow(t - 1, 2); };
const inOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const $ = id => document.getElementById(id);
function renderFin(t, T){
  const fe = out(cl((t - T.fin) / .4));
  $('fin').style.display = t >= T.fin ? 'flex' : 'none'; $('fin').style.opacity = fe;
  if (t >= T.fin){ [['.t', .1], ['.s', .4], ['.url', .7], ['.a', 1], ['.f', 1.2]].forEach(([q, a]) => { const e = $('fin').querySelector(q), p = out(cl((t - T.fin - a) / .5)); e.style.opacity = p; e.style.transform = 'translateY(' + (50 * (1 - p)) + 'px)'; }); }
  $('pbar').style.width = (100 * t / T.total) + '%';
}
`;

const documento = (css, cuerpo, js) => `<!doctype html><html><head><meta charset="utf-8">${FUENTES}<style>${CSS}${css}</style></head><body>${cuerpo}<script>${JS}${js}</script></body></html>`;

module.exports = { limpio, resalta, documento, FIN };
