// Pruebas de la web en un navegador de verdad (Chromium), en ordenador y en móvil.
// Se ejecutan con:  npm test   (o solo estas: npm run test:web)
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests/web',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { serviceWorkers: 'block', locale: 'es-ES' },
  projects: [
    { name: 'ordenador', use: { viewport: { width: 1100, height: 900 } } },
    { name: 'movil', use: { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true } }
  ]
});
