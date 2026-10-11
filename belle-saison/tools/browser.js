// Lance Chromium via playwright-core. CHROMIUM_PATH permet de choisir un binaire précis.
const fs = require('fs');
const { chromium } = require('playwright-core');

const DEFAULT_PATH = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

module.exports = () => {
  const executablePath = process.env.CHROMIUM_PATH || (fs.existsSync(DEFAULT_PATH) ? DEFAULT_PATH : undefined);
  return chromium.launch(executablePath ? { executablePath } : {});
};
