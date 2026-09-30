// Todas las manos disponibles: las de manos.js y las generadas desde datos (salida/auto/<id>.json).
const fs = require('fs'), path = require('path');
const { construir } = require('./construir.js');
const AUTO = path.join(__dirname, 'salida', 'auto');

function cargar(){
  const todas = { ...require('./manos.js') };
  if (fs.existsSync(AUTO)){
    for (const f of fs.readdirSync(AUTO).filter(f => f.endsWith('.json'))){
      const id = f.slice(0, -5);
      todas[id] = construir({ ...JSON.parse(fs.readFileSync(path.join(AUTO, f), 'utf8')), id });
    }
  }
  return todas;
}

module.exports = { cargar, AUTO };
