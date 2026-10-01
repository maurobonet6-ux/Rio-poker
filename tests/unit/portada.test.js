// La portada (/) es la landing y la app vive en /app/: redirecciones, SEO y PWA.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const leer = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('/descubre y /descubre/ redirigen con 301 a la portada', () => {
  const { redirects } = JSON.parse(leer('vercel.json'));
  for (const s of ['/descubre', '/descubre/']){
    const r = redirects.find(x => x.source === s);
    assert.ok(r, 'falta la redirección de ' + s);
    assert.strictEqual(r.destination, '/');
    assert.strictEqual(r.permanent, true);
  }
});

test('portada: título, canonical, og, JSON-LD WebSite y verificación de Google', () => {
  const h = leer('index.html');
  assert.match(h, /<title>RÍO Poker — Tu coach de póker con IA, en español<\/title>|<title>RÍO — Tu coach de póker con IA, en español<\/title>/);
  assert.match(h, /<link rel="canonical" href="https:\/\/riopoker\.es\/">/);
  assert.match(h, /<meta property="og:url" content="https:\/\/riopoker\.es\/">/);
  assert.match(h, /<meta property="og:site_name" content="RÍO Poker">/);
  assert.match(h, /"@type":"WebSite","name":"RÍO Poker"/);
  assert.match(h, /google-site-verification" content="5Jb1JVNjgTQIfLwJ1bwyH3I1LJ4JpQxOFmUyAJRoSug"/);
  assert.match(h, /rel="icon" href="\/favicon\.ico"/);
  // el script de los enlaces viejos va antes del título y de las hojas de estilo
  assert.ok(h.indexOf("location.replace('/app/'") > 0 && h.indexOf("location.replace('/app/'") < h.indexOf('<title>'));
});

test('app: canonical a /app/, indexable, y la portada ya no enlaza a /descubre ni a /#/', () => {
  const a = leer('app/index.html');
  assert.match(a, /<link rel="canonical" href="https:\/\/riopoker\.es\/app\/">/);
  assert.doesNotMatch(a, /noindex/);
  const l = leer('index.html');
  assert.doesNotMatch(l, /href="\/descubre|href="\/#\/|href="\/"[^>]*>(Empezar|Entrar|Elegir)/);
});

test('sitemap: incluye / y /app/ y no incluye /descubre/', () => {
  const x = leer('sitemap.xml');
  assert.ok(x.includes('<loc>https://riopoker.es/</loc>') && x.includes('<loc>https://riopoker.es/app/</loc>'));
  assert.ok(!x.includes('descubre'));
});

test('PWA: manifest y service worker apuntan a /app/ y la caché vieja se borra', () => {
  const m = JSON.parse(leer('manifest.webmanifest'));
  assert.strictEqual(m.start_url, '/app/');
  assert.strictEqual(m.scope, '/app/');
  assert.strictEqual(m.id, '/'); // la identidad de la app ya instalada no cambia
  const sw = leer('sw.js');
  assert.match(sw, /const CACHE = 'rio-v(\d+)'/);
  assert.ok(+sw.match(/rio-v(\d+)/)[1] >= 5);
  assert.ok(sw.includes("'/app/'") && !/SHELL = \['\/'/.test(sw) && sw.includes("caches.match('/app/')"));
});

test('ninguna página enlaza ya a la app en «/» o «/#/…» (salvo la portada para quienes llegan de fuera)', () => {
  const malos = [];
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!['node_modules', 'tests', 'marketing', '.git', 'test-results'].includes(e.name)) walk(p); }
    else if (e.name.endsWith('.html')){
      const h = fs.readFileSync(p, 'utf8');
      if (/href="\/#\//.test(h) || /riopoker\.es\/#/.test(h) || /href="\/descubre/.test(h)) malos.push(path.relative(ROOT, p));
    }
  });
  walk(ROOT);
  assert.deepStrictEqual(malos, []);
});
