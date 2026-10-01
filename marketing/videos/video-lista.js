// Formato «Top 3»: un título y tres puntos que van apareciendo con su número, y la pantalla final de RÍO.
// Uso desde generar.js ("lista") o a mano: node video-lista.js   (SNAP=1,5,9 para sacar capturas en vez del vídeo)
const { grabar } = require('./motor.js');
const { resalta, limpio, documento, FIN } = require('./plantilla.js');
const { LISTAS } = require('./mito-lista-datos.js');

const T = { titulo: 0.3, items: [2.4, 5.4, 8.4], fin: 11.8, total: 15.4 };

function pagina(l){
  const css = `
.tit{position:absolute;top:260px;left:60px;right:60px;text-align:center;font-family:'Bricolage Grotesque';font-weight:800;font-size:92px;line-height:1.08;z-index:6}
.fila{position:absolute;left:60px;right:60px;display:flex;align-items:center;gap:36px;background:#141416;border:2px solid rgba(245,242,236,.12);border-radius:44px;padding:36px 44px;z-index:5;box-shadow:0 24px 70px rgba(0,0,0,.6)}
.num{flex:none;width:130px;height:130px;border-radius:50%;background:linear-gradient(135deg,#E8283F,#ff6a5a);display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-weight:800;font-size:90px;box-shadow:0 12px 40px rgba(232,40,63,.5)}
.fila .t{font-family:'Bricolage Grotesque';font-weight:800;font-size:58px;line-height:1.1}
.fila .s{font-size:40px;color:rgba(245,242,236,.65);margin-top:12px;line-height:1.25}
`;
  const top = 640, alto = 290, hueco = 36;
  const cuerpo = `<div class="brand">RÍO <i>Top 3</i></div>
<div class="tit" id="tit">${resalta(l.titulo, 'y')}</div>
${l.items.map((it, i) => `<div class="fila" id="f${i}" style="top:${top + i * (alto + hueco)}px;height:${alto}px"><div class="num">${i + 1}</div><div><div class="t">${limpio(it.t)}</div><div class="s">${limpio(it.s)}</div></div></div>`).join('')}
${FIN('¿Y tus manos? 🃏')}`;
  const js = `const T = ${JSON.stringify(T)};
function render(t){
  const pt = back(cl((t - T.titulo) / .6)); $('tit').style.opacity = cl(pt * 2); $('tit').style.transform = 'scale(' + (.85 + .15 * pt) + ')';
  T.items.forEach((a, i) => { const el = $('f' + i), p = back(cl((t - a) / .55));
    el.style.opacity = t < a ? 0 : (t >= T.items[i + 1] ? .5 : 1);
    el.style.transform = 'translateX(' + (260 * (1 - Math.min(1, p))) + 'px) scale(' + (t >= T.items[i + 1] ? .97 : 1) + ')'; });
  document.querySelectorAll('.brand').forEach(b => b.style.opacity = t >= T.fin ? 0 : 1);
  renderFin(t, T);
}
window.render = render;`;
  return documento(css, cuerpo, js);
}

const eventos = () => [{ t: T.titulo, tipo: 'whoosh' }, ...T.items.flatMap(a => [{ t: a, tipo: 'whoosh' }, { t: a + .3, tipo: 'tick' }]), { t: T.fin, tipo: 'whoosh' }];

async function hacerLista({ l = LISTAS[Math.floor(Math.random() * LISTAS.length)], id = 'lista-' + Date.now().toString(36), snap } = {}){
  const f = await grabar({ html: pagina(l), nombre: id, total: T.total, eventos: eventos(), snap });
  if (f) console.log('LISTO ' + f + ' · lista');
  return { ok: true, id, archivo: f };
}
module.exports = { hacerLista, pagina, T };
if (require.main === module){
  const snap = (process.env.SNAP || '').split(',').filter(Boolean);
  hacerLista({ snap: snap.length ? snap : undefined }).catch(e => { console.error(e); process.exit(1); });
}
