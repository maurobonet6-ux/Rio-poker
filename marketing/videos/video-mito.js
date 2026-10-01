// Formato «¿Mito o realidad?»: una afirmación, cuenta atrás de 3 s, la tarjeta se da la vuelta y RÍO da el veredicto con su explicación.
// Uso desde generar.js ("mito") o a mano: node video-mito.js   (SNAP=1,4,7 para sacar capturas en vez del vídeo)
const { grabar } = require('./motor.js');
const { resalta, documento, FIN } = require('./plantilla.js');
const { MITOS } = require('./mito-lista-datos.js');

const T = { card: 0.4, cuenta: 3.4, flip: 6.4, exp: 7.4, fin: 11.6, total: 15.2 };

function pagina(m){
  const css = `
#card{position:absolute;left:70px;right:70px;top:440px;height:880px;perspective:1600px;z-index:5}
#card .cara{position:absolute;inset:0;border-radius:48px;backface-visibility:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:60px;box-shadow:0 40px 100px rgba(0,0,0,.7)}
#card .frente{background:#141416;border:3px solid rgba(245,242,236,.14)}
#card .frente small{font-weight:700;font-size:34px;letter-spacing:.14em;color:#E8283F;margin-bottom:34px}
#card .frente .txt{font-family:'Bricolage Grotesque';font-weight:800;font-size:84px;line-height:1.12}
#card .dorso{transform:rotateY(180deg)}
#card .dorso.mito{background:linear-gradient(160deg,#3a0f16,#1a0a0d);border:4px solid #FF4757}
#card .dorso.real{background:linear-gradient(160deg,#0c3a22,#08170f);border:4px solid #3DDC7A}
#card .dorso .v{font-family:'Bricolage Grotesque';font-weight:800;font-size:128px;line-height:1}
#card .dorso.mito .v{color:#FF4757}#card .dorso.real .v{color:#3DDC7A}
#card .dorso .e{font-size:54px;line-height:1.28;margin-top:50px;color:#F5F2EC}
.tit{position:absolute;top:240px;left:40px;right:40px;text-align:center;font-family:'Bricolage Grotesque';font-weight:800;font-size:72px;z-index:6}
#ring{position:absolute;left:50%;top:1400px;width:300px;height:300px;margin-left:-150px;z-index:6}
#ring svg{position:absolute;inset:0;transform:rotate(-90deg)}#ring circle{fill:rgba(0,0,0,.4);stroke-width:12}#ring .track{stroke:rgba(255,255,255,.15)}#ring .prog{fill:none;stroke:#E8283F;stroke-linecap:round;stroke-dasharray:553}
#ring .num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-weight:800;font-size:150px}
#pill{position:absolute;left:50%;top:1730px;transform:translateX(-50%);font-size:44px;font-weight:700;background:#f5f2ec;color:#0d0d10;padding:20px 42px;border-radius:999px;z-index:9;white-space:nowrap}
`;
  const cuerpo = `<div class="brand">RÍO <i>¿Mito o realidad?</i></div>
<div class="tit" id="tit"></div>
<div id="card"><div class="cara frente" id="fr"><small>AFIRMACIÓN</small><div class="txt">${resalta(m.dice, 'y')}</div></div>
<div class="cara dorso ${m.verdad ? 'real' : 'mito'}" id="do"><div class="v">${m.verdad ? 'REALIDAD ✅' : 'MITO ❌'}</div><div class="e">${resalta(m.why, m.verdad ? 'g' : 'r')}</div></div></div>
<div id="ring"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" class="track"/><circle cx="100" cy="100" r="88" class="prog" id="prog"/></svg><div class="num" id="num">3</div></div>
<div id="pill">Comenta tu respuesta 👇</div>${FIN('¿Y tú, lo sabías? 🤔')}`;
  const js = `const T = ${JSON.stringify(T)};
function render(t){
  const pc = back(cl((t - T.card) / .6));
  $('card').style.opacity = cl(pc * 2); $('card').style.transform = 'translateY(' + (120 * (1 - pc)) + 'px) scale(' + (.85 + .15 * pc) + ')';
  const f = inOut(cl((t - T.flip) / .7));
  $('fr').style.transform = 'rotateY(' + (180 * f) + 'deg)'; $('do').style.transform = 'rotateY(' + (180 - 180 * f) + 'deg)';
  const exp = t >= T.flip;
  $('tit').innerHTML = exp ? 'RÍO responde…' : '¿Verdad o mentira?';
  const ti = back(cl((t - (exp ? T.flip : T.card + .3)) / .4)); $('tit').style.opacity = cl(ti * 2); $('tit').style.transform = 'scale(' + (.85 + .15 * ti) + ')';
  const cu = t >= T.cuenta && t < T.flip;
  $('ring').style.display = cu ? 'block' : 'none';
  const pl = t >= T.cuenta && t < T.fin; $('pill').style.display = pl ? 'block' : 'none';
  $('pill').textContent = t >= T.flip ? 'Guárdalo y compártelo 📌' : 'Comenta tu respuesta 👇';
  if (cu){ const k = cl((t - T.cuenta) / (T.flip - T.cuenta)); $('num').textContent = Math.max(1, 3 - Math.floor(k * 3)); $('prog').style.strokeDashoffset = 553 * k;
    $('ring').style.transform = 'scale(' + (1 + .06 * Math.max(0, 1 - ((t - T.cuenta) % 1) * 4)) + ')'; }
  $('card').style.zIndex = 5;
  document.querySelectorAll('.brand').forEach(b => b.style.opacity = t >= T.fin ? 0 : 1);
  renderFin(t, T);
}
window.render = render;`;
  return documento(css, cuerpo, js);
}

const eventos = () => [{ t: T.card, tipo: 'whoosh' }, ...[0, 1, 2].map(i => ({ t: T.cuenta + i, tipo: 'tick' })), { t: T.flip - 0.4, tipo: 'riser', dur: 0.4 }, { t: T.flip, tipo: 'ding' }, { t: T.fin, tipo: 'whoosh' }];

async function hacerMito({ m = MITOS[Math.floor(Math.random() * MITOS.length)], id = 'mito-' + Date.now().toString(36), snap } = {}){
  const f = await grabar({ html: pagina(m), nombre: id, total: T.total, eventos: eventos(), snap });
  if (f) console.log('LISTO ' + f + ' · mito');
  return { ok: true, id, archivo: f };
}
module.exports = { hacerMito, pagina, T };
if (require.main === module){
  const snap = (process.env.SNAP || '').split(',').filter(Boolean);
  hacerMito({ snap: snap.length ? snap : undefined }).catch(e => { console.error(e); process.exit(1); });
}
