import { chromium } from '@playwright/test';
import fs from 'node:fs';

const LOCAL_BASE = 'http://127.0.0.1:3000';
const REMOTE_BASE = 'https://innei.in';

async function inspectHome(page, site) {
  return await page.evaluate((s) => {
    const cs = (el) => el ? window.getComputedStyle(el) : null;
    
    // Hero container
    const h1 = document.querySelector('h1');
    const heroSection = h1 ? h1.closest('section') || h1.parentElement : null;
    const heroCS = cs(heroSection);
    
    // Avatar
    const avatarImg = document.querySelector('img[alt*="Innei"], header img, section img');
    const avatarCS = cs(avatarImg);
    
    // H1
    const h1CS = cs(h1);
    
    // Bio
    const bioP = h1 ? h1.nextElementSibling : null;
    const bioCS = cs(bioP);
    
    // Social icons
    const socialLinks = Array.from(document.querySelectorAll('a[href*="github"], a[href*="twitter"], a[href*="x.com"], a[href*="telegram"], a[href*="bilibili"]'));
    const socialSVGs = socialLinks.map(a => a.querySelector('svg')).filter(Boolean);
    const socialSvgCS = socialSVGs[0] ? cs(socialSVGs[0]) : null;
    
    // Stats snapshot: looking for 384 or 164 or 2948 or similar text
    const textAll = document.body.innerText;
    const statMatches = textAll.match(/\d+[\u4e00-\u9fa5\w\s/]+(?:篇|字|天|万)/g) || [];
    
    // Recent posts
    const recentHeading = Array.from(document.querySelectorAll('h2, h3')).find(h => /近期|笔墨|Recent/i.test(h.innerText));
    const recentHCS = cs(recentHeading);
    
    return {
      site: s,
      hero: {
        textAlign: heroCS?.textAlign,
        padding: heroCS?.padding,
        maxWidth: heroCS?.maxWidth,
      },
      avatar: {
        width: avatarCS?.width,
        height: avatarCS?.height,
        borderRadius: avatarCS?.borderRadius,
        boxShadow: avatarCS?.boxShadow,
      },
      title: {
        text: h1?.innerText?.trim(),
        fontFamily: h1CS?.fontFamily,
        fontSize: h1CS?.fontSize,
        lineHeight: h1CS?.lineHeight,
        fontWeight: h1CS?.fontWeight,
        color: h1CS?.color,
      },
      bio: {
        text: bioP?.innerText?.trim(),
        fontSize: bioCS?.fontSize,
        lineHeight: bioCS?.lineHeight,
        color: bioCS?.color,
      },
      social: {
        count: socialLinks.length,
        svgWidth: socialSvgCS?.width,
        svgHeight: socialSvgCS?.height,
      },
      statsSnapshot: statMatches,
      recentSection: {
        headingText: recentHeading?.innerText?.trim(),
        headingFontSize: recentHCS?.fontSize,
        headingFontWeight: recentHCS?.fontWeight,
      }
    };
  }, site);
}

async function inspectPosts(page, site) {
  return await page.evaluate((s) => {
    const cs = (el) => el ? window.getComputedStyle(el) : null;
    
    // Pinned post
    // On Yohaku/Shiro, pinned post often has distinct styling or a pinned badge
    const pinnedCandidate = document.querySelector('[data-pinned="true"], .pinned, article:first-of-type, [class*="pinned"]');
    const pinnedCS = cs(pinnedCandidate);
    
    // Summary
    const summaryEl = pinnedCandidate?.querySelector('p');
    const summaryCS = cs(summaryEl);
    
    // Post items & layout container
    const articles = Array.from(document.querySelectorAll('article, [class*="post-item"]'));
    const container = articles[0]?.parentElement;
    const containerCS = cs(container);
    
    // Pagination
    const pagination = document.querySelector('nav[aria-label*="pagination"], [class*="pagination"]');
    const paginationCS = cs(pagination);
    
    return {
      site: s,
      articleCount: articles.length,
      containerLayout: {
        display: containerCS?.display,
        gridTemplateColumns: containerCS?.gridTemplateColumns,
        gap: containerCS?.gap,
        flexDirection: containerCS?.flexDirection,
      },
      pinnedCard: {
        border: pinnedCS?.border,
        borderRadius: pinnedCS?.borderRadius,
        padding: pinnedCS?.padding,
        background: pinnedCS?.backgroundColor,
        boxShadow: pinnedCS?.boxShadow,
        summaryLineClamp: summaryCS?.webkitLineClamp || summaryCS?.lineClamp,
        summaryFontSize: summaryCS?.fontSize,
        summaryLineHeight: summaryCS?.lineHeight,
      },
      pagination: {
        found: !!pagination,
        display: paginationCS?.display,
        justifyContent: paginationCS?.justifyContent,
      }
    };
  }, site);
}

async function inspectCategory(page, site) {
  return await page.evaluate((s) => {
    const cs = (el) => el ? window.getComputedStyle(el) : null;
    
    // Year headings
    const yearEls = Array.from(document.querySelectorAll('h2, h3, [class*="year"]')).filter(el => /^(19|20)\d{2}$/.test(el.innerText?.trim()));
    const yearCS = cs(yearEls[0]);
    
    // Timeline list / items
    const items = Array.from(document.querySelectorAll('li, [class*="timeline-item"]'));
    const firstItem = items[0];
    const itemCS = cs(firstItem);
    
    // Vertical timeline line
    const timelineContainer = document.querySelector('ol, ul, [class*="timeline"]');
    const tcCS = cs(timelineContainer);
    
    return {
      site: s,
      yearCount: yearEls.length,
      firstYearHeading: {
        text: yearEls[0]?.innerText?.trim(),
        fontSize: yearCS?.fontSize,
        fontWeight: yearCS?.fontWeight,
      },
      itemCount: items.length,
      timelineContainer: {
        borderLeft: tcCS?.borderLeft,
        position: tcCS?.position,
        paddingLeft: tcCS?.paddingLeft,
      }
    };
  }, site);
}

async function inspectPostDetail(page, site) {
  return await page.evaluate((s) => {
    const cs = (el) => el ? window.getComputedStyle(el) : null;
    
    const h1 = document.querySelector('h1');
    const h1CS = cs(h1);
    
    // Main container / article
    const article = document.querySelector('article, main');
    const articleCS = cs(article);
    
    // Paragraph
    const p = document.querySelector('article p, main p');
    const pCS = cs(p);
    
    // Code block
    const pre = document.querySelector('pre');
    const code = document.querySelector('pre code, code');
    const preCS = cs(pre);
    const codeCS = cs(code);
    
    // Table
    const table = document.querySelector('table');
    const tableCS = cs(table);
    const th = document.querySelector('th');
    const thCS = cs(th);
    const td = document.querySelector('td');
    const tdCS = cs(td);
    
    // Images
    const contentImgs = Array.from(document.querySelectorAll('article img, main img'));
    const imgCS = cs(contentImgs[0]);
    
    // Author footer
    const footerAuthor = document.querySelector('[class*="author"], [class*="copyright"], footer, [class*="meta"]');
    const authorCS = cs(footerAuthor);
    
    // TOC
    const toc = document.querySelector('aside, [class*="toc"], nav[aria-label*="Table of contents"]');
    const tocCS = cs(toc);
    
    return {
      site: s,
      title: {
        text: h1?.innerText?.trim(),
        fontSize: h1CS?.fontSize,
        lineHeight: h1CS?.lineHeight,
        fontWeight: h1CS?.fontWeight,
        margin: h1CS?.margin,
      },
      bodyParagraph: {
        fontSize: pCS?.fontSize,
        lineHeight: pCS?.lineHeight,
        fontFamily: pCS?.fontFamily,
        color: pCS?.color,
      },
      codeBlock: {
        found: !!pre,
        preBg: preCS?.backgroundColor,
        prePadding: preCS?.padding,
        preBorderRadius: preCS?.borderRadius,
        codeFontFamily: codeCS?.fontFamily,
        codeFontSize: codeCS?.fontSize,
      },
      table: {
        found: !!table,
        borderCollapse: tableCS?.borderCollapse,
        thPadding: thCS?.padding,
        tdPadding: tdCS?.padding,
        tableBorder: tableCS?.border,
      },
      image: {
        found: contentImgs.length > 0,
        count: contentImgs.length,
        borderRadius: imgCS?.borderRadius,
        boxShadow: imgCS?.boxShadow,
      },
      toc: {
        found: !!toc,
        position: tocCS?.position,
        top: tocCS?.top,
        width: tocCS?.width,
      },
      footerAuthor: {
        found: !!footerAuthor,
        text: footerAuthor?.innerText?.slice(0, 100)?.trim(),
      }
    };
  }, site);
}

async function inspectAbout(page, site) {
  return await page.evaluate((s) => {
    const cs = (el) => el ? window.getComputedStyle(el) : null;
    
    const h1 = document.querySelector('h1');
    const h1CS = cs(h1);
    
    const images = Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.src,
      alt: img.alt,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete,
      broken: img.naturalWidth === 0 && img.naturalHeight === 0,
    }));
    
    const details = Array.from(document.querySelectorAll('details')).map(d => {
      const summary = d.querySelector('summary');
      const sumCS = cs(summary);
      return {
        summaryText: summary?.innerText?.trim(),
        summaryFontSize: sumCS?.fontSize,
        summaryFontWeight: sumCS?.fontWeight,
        open: d.open,
      };
    });
    
    return {
      site: s,
      title: {
        text: h1?.innerText?.trim(),
        fontSize: h1CS?.fontSize,
        fontWeight: h1CS?.fontWeight,
      },
      imagesCount: images.length,
      images,
      hasBrokenImages: images.some(img => img.broken || !img.src),
      detailsCount: details.length,
      details,
    };
  }, site);
}

export async function runInspection() {
  const browser = await chromium.launch({ channel: 'chrome' });
  const results = {};

  const pagesMap = [
    { key: 'home', localPath: '/', remotePath: '/', inspect: inspectHome },
    { key: 'posts', localPath: '/posts', remotePath: '/posts', inspect: inspectPosts },
    { key: 'category', localPath: '/categories/tech', remotePath: '/categories/tech', inspect: inspectCategory },
    { key: 'post_detail', localPath: '/posts/electron-ota-updater', remotePath: '/posts/tech/electron-ota-updater', inspect: inspectPostDetail },
    { key: 'about', localPath: '/about', remotePath: '/about', inspect: inspectAbout },
  ];

  for (const item of pagesMap) {
    results[item.key] = {};
    for (const theme of ['light', 'dark']) {
      results[item.key][theme] = {};
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
      await context.addInitScript((th) => {
        try {
          window.localStorage.setItem('payload-theme', th);
          window.localStorage.setItem('theme', th);
        } catch (e) {}
      }, theme);

      // Local
      const localPage = await context.newPage();
      try {
        await localPage.goto(`${LOCAL_BASE}${item.localPath}`, { waitUntil: 'networkidle', timeout: 20000 });
        await localPage.evaluate((th) => {
          document.documentElement.setAttribute('data-theme', th);
          if (th === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
        }, theme);
        results[item.key][theme].local = await item.inspect(localPage, 'local');
      } catch (err) {
        results[item.key][theme].localError = err.message;
      } finally {
        await localPage.close();
      }

      // Remote
      const remotePage = await context.newPage();
      try {
        await remotePage.goto(`${REMOTE_BASE}${item.remotePath}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await remotePage.waitForTimeout(2000);
        await remotePage.evaluate((th) => {
          document.documentElement.setAttribute('data-theme', th);
          if (th === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
        }, theme);
        results[item.key][theme].remote = await item.inspect(remotePage, 'remote');
      } catch (err) {
        results[item.key][theme].remoteError = err.message;
      } finally {
        await remotePage.close();
      }

      await context.close();
    }
  }

  await browser.close();

  fs.writeFileSync('docs/yohaku-evidence/dom-inspection.json', JSON.stringify(results, null, 2), 'utf8');
  console.log('DOM Inspection completed and saved to docs/yohaku-evidence/dom-inspection.json');
}

if (process.argv[1]?.endsWith('yohaku-inspect-dom.mjs')) {
  runInspection().catch(console.error);
}
