const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: '.', timeout: 120_000, reporter: 'list',
  use: { serviceWorkers: 'block', locale: 'es-ES', deviceScaleFactor: 2 },
  projects: [
    { name: 'movil', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
    { name: 'ordenador', use: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } }
  ]
});
