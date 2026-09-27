// Las páginas para Google (glosario, tablas, guías y manos): existen, están en el sitemap y sus enlaces funcionan.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const fileFor = (url) => path.join(ROOT, url.endsWith('/') ? url + 'index.html' : url);

test('todas las URL del sitemap existen', () => {
  const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const urls = [...xml.matchAll(/<loc>https:\/\/rio-poker\.vercel\.app([^<]*)<\/loc>/g)].map(m => m[1]);
  assert.ok(urls.length > 40, 'el sitemap tiene pocas páginas');
  for (const u of urls) assert.ok(fs.existsSync(fileFor(u)), 'falta la página ' + u);
});

test('ninguna página para buscadores tiene enlaces internos rotos', () => {
  const pages = [];
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p); else if (e.name === 'index.html') pages.push(p);
  });
  ['glosario', 'tablas', 'guias', 'manos'].forEach(d => walk(path.join(ROOT, d)));
  const broken = [];
  for (const p of pages){
    const html = fs.readFileSync(p, 'utf8');
    for (const [, href] of html.matchAll(/href="(\/[^"#]*)/g)) if (!fs.existsSync(fileFor(href))) broken.push(path.relative(ROOT, p) + ' → ' + href);
  }
  assert.deepStrictEqual(broken, []);
});

test('las páginas generadas están al día con scripts/build-seo.js', () => {
  // Si falla: ejecuta  node scripts/build-seo.js  y sube los cambios.
  const { execFileSync } = require('child_process');
  const before = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8') + fs.readFileSync(path.join(ROOT, 'glosario/spr/index.html'), 'utf8') + fs.readFileSync(path.join(ROOT, 'manos/aks/index.html'), 'utf8');
  execFileSync('node', [path.join(ROOT, 'scripts/build-seo.js')], { stdio: 'ignore' });
  const after = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8') + fs.readFileSync(path.join(ROOT, 'glosario/spr/index.html'), 'utf8') + fs.readFileSync(path.join(ROOT, 'manos/aks/index.html'), 'utf8');
  assert.strictEqual(after, before);
});

test('hay una página por cada una de las 169 manos, con título propio', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const hands = html.match(/const HAND_RANKING = '([^']+)'/)[1].split(' ');
  assert.strictEqual(hands.length, 169);
  const titles = new Set();
  for (const h of hands){
    const page = fs.readFileSync(path.join(ROOT, 'manos', h.toLowerCase(), 'index.html'), 'utf8');
    titles.add(page.match(/<title>([^<]+)<\/title>/)[1]);
  }
  assert.strictEqual(titles.size, 169);
});

test('la versión de la app está en un solo sitio', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /const APP_VERSION = 'v\d+\.\d+'/);
  assert.doesNotMatch(html, /RÍO v\d/, 'hay una versión escrita a mano en el HTML');
});
