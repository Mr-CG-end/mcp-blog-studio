import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUTPUT_DIR = path.resolve('docs/yohaku-evidence/matrix');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const LOCAL_BASE = 'http://127.0.0.1:3000';
const REMOTE_BASE = 'https://innei.in';

const PAGES = [
  { key: 'home', localPath: '/', remotePath: '/' },
  { key: 'posts', localPath: '/posts', remotePath: '/posts' },
  { key: 'category', localPath: '/categories/tech', remotePath: '/categories/tech' },
  { key: 'post_detail', localPath: '/posts/electron-ota-updater', remotePath: '/posts/tech/electron-ota-updater' },
  { key: 'about', localPath: '/about', remotePath: '/about' },
];

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

const THEMES = ['light', 'dark'];

async function waitForImages(page) {
  await page.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll('img'));
    await Promise.all(
      imgs.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
          setTimeout(resolve, 2000);
        });
      })
    );
  });
}

async function captureSite(siteName, baseUrl) {
  console.log(`\n=== Starting capture for ${siteName} (${baseUrl}) ===`);
  const browser = await chromium.launch({ channel: 'chrome' });

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      console.log(`\n-> Setup context: ${siteName} | Viewport ${vp.name} (${vp.width}x${vp.height}) | Theme: ${theme}`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: theme,
      });

      // Pre-set localStorage theme preference
      await context.addInitScript((th) => {
        try {
          window.localStorage.setItem('payload-theme', th);
          window.localStorage.setItem('theme', th);
          window.localStorage.setItem('color-mode', th);
        } catch (e) {}
      }, theme);

      for (const p of PAGES) {
        const url = `${baseUrl}${siteName === 'local' ? p.localPath : p.remotePath}`;
        const page = await context.newPage();
        try {
          console.log(`Navigating to ${url}...`);
          await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

          // Ensure data-theme attribute is set properly
          await page.evaluate((th) => {
            document.documentElement.setAttribute('data-theme', th);
            if (th === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }, theme);

          await waitForImages(page);
          // Small pause for animations to settle
          await page.waitForTimeout(600);

          const fileName = `${siteName}-${p.key}-${vp.width}x${vp.height}-${theme}.png`;
          const filePath = path.join(OUTPUT_DIR, fileName);

          await page.screenshot({ path: filePath, fullPage: false });
          console.log(`Saved screenshot: ${fileName}`);
        } catch (err) {
          console.error(`Error capturing ${url}:`, err.message);
        } finally {
          await page.close();
        }
      }

      await context.close();
    }
  }

  await browser.close();
}

async function run() {
  const startTime = Date.now();
  try {
    await captureSite('local', LOCAL_BASE);
    await captureSite('remote', REMOTE_BASE);
    console.log(`\nAll captures completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  } catch (e) {
    console.error('Fatal error during capture:', e);
    process.exit(1);
  }
}

run();
