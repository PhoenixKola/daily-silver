import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const candidates = process.platform === 'win32'
  ? ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']
  : process.platform === 'darwin'
    ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
    : ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/microsoft-edge'];
const executablePath = process.env.CHROME_PATH || candidates.find(existsSync);

export function launchBrowser() {
  return chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
}
