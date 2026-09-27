// Sirve las fuentes de Google desde copias locales (el navegador de pruebas no llega a internet).
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, 'fonts');
const map = Object.fromEntries(fs.readFileSync(path.join(D, 'map.txt'), 'utf8').trim().split('\n').map(l => l.split(' ')));
module.exports = function fontRoute(route){
  const u = route.request().url();
  if (u.startsWith('https://fonts.googleapis.com/')) return route.fulfill({ status: 200, contentType: 'text/css', path: path.join(D, 'g.css') });
  if (map[u]) return route.fulfill({ status: 200, contentType: 'font/woff2', path: path.join(__dirname, map[u]) });
  return null;
};
