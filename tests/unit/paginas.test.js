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
  const leer = () => ['sitemap.xml', 'glosario/spr/index.html', 'manos/aks/index.html', 'index.html'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('');
  const before = leer();
  execFileSync('node', [path.join(ROOT, 'scripts/build-seo.js')], { stdio: 'ignore' });
  const after = leer();
  assert.strictEqual(after, before);
});

test('hay una página por cada una de las 169 manos, con título propio', () => {
  const html = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
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
  const js = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(js, /const APP_VERSION = 'v\d+\.\d+'/);
  assert.doesNotMatch(html, /RÍO v\d/, 'hay una versión escrita a mano en el HTML');
});

test('portada: la dirección de la web solo está en sitio.json', () => {
  const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'sitio.json'), 'utf8')).url;
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, new RegExp(`<link rel="canonical" href="${site}/">`));
  assert.match(html, new RegExp(`<meta property="og:url" content="${site}/">`));
  const fuera = html.replace(/<!-- SEO: [\s\S]*?<!-- \/SEO -->/, '');
  assert.doesNotMatch(fuera, /https:\/\/[a-z0-9.-]*vercel\.app/, 'hay una dirección escrita a mano fuera del bloque SEO');
});

test('portada: datos para Google válidos y FAQ igual al que se ve', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const tipos = ld['@graph'].map(n => n['@type']);
  assert.deepStrictEqual(tipos, ['SoftwareApplication', 'FAQPage']);
  const faq = ld['@graph'][1].mainEntity;
  const visibles = [...html.matchAll(/<details class="faq-item"><summary>([^<]+)<\/summary>/g)].map(m => m[1]);
  assert.deepStrictEqual(faq.map(q => q.name), visibles);
  assert.ok(faq.every(q => q.acceptedAnswer.text.length > 20));
  assert.match(html, /<h1>RÍO <span class="h1-sub">Calculadora y entrenador de póker en español<\/span><\/h1>/);
  assert.strictEqual((html.match(/<h1[\s>]/g) || []).length, 1, 'la portada debe tener un solo H1');
});
