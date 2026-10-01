import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUTPUT_DIR = path.resolve('docs/yohaku-evidence/matrix');
const REMOTE_BASE = 'https://innei.in';

const PAGES = [
  { key: 'home', remotePath: '/' },
  { key: 'posts', remotePath: '/posts' },
  { key: 'category', remotePath: '/categories/tech' },
  { key: 'post_detail', remotePath: '/posts/tech/electron-ota-updater' },
  { key: 'about', remotePath: '/about' },
];

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

const THEMES = ['light', 'dark'];

async function run() {
  const browser = await chromium.launch({ channel: 'chrome' });

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      for (const p of PAGES) {
        const fileName = `remote-${p.key}-${vp.width}x${vp.height}-${theme}.png`;
        const filePath = path.join(OUTPUT_DIR, fileName);

        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
          console.log(`Skipping already captured: ${fileName}`);
          continue;
        }

        console.log(`Capturing missing remote: ${fileName}`);
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          colorScheme: theme,
        });

        const page = await context.newPage();
        try {
          const url = `${REMOTE_BASE}${p.remotePath}`;
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
          await page.waitForTimeout(2500);

          await page.evaluate((th) => {
            document.documentElement.setAttribute('data-theme', th);
            if (th === 'dark') document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
          }, theme);

          await page.screenshot({ path: filePath, fullPage: false });
          console.log(`Successfully saved: ${fileName}`);
        } catch (e) {
          console.error(`Failed to capture ${fileName}:`, e.message);
        } finally {
          await context.close();
        }
      }
    }
  }

  await browser.close();
  console.log('Finished capturing missing remote screenshots.');
}

run();
