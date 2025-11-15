const puppeteer = require('puppeteer');
const fs = require('fs');

async function debug() {
  console.log('Debugging Google Form DOM structure...\n');

  const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfIZgtHH8FJudeMNlW1oyzmI8LKqHiZD9jkP-UYSeTIGdVtww/viewform';

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(formUrl, { waitUntil: 'networkidle2' });

  // スクリーンショットを保存
  await page.screenshot({ path: '/tmp/google-form-debug.png', fullPage: true });
  console.log('✓ Screenshot saved to /tmp/google-form-debug.png');

  // HTML構造を保存
  const html = await page.content();
  fs.writeFileSync('/tmp/google-form-debug.html', html);
  console.log('✓ HTML saved to /tmp/google-form-debug.html');

  // 現在のDOM構造を調査
  const domInfo = await page.evaluate(() => {
    const result = {
      title: null,
      titleSelectors: [],
      questionContainers: [],
      allClassesUsed: new Set(),
    };

    // タイトル候補を探す
    const titleCandidates = [
      '.freebirdFormviewerViewHeaderTitle',
      '[role="heading"]',
      'h1',
      '.freebirdFormviewerViewHeaderTitleRow',
    ];

    titleCandidates.forEach((selector) => {
      const el = document.querySelector(selector);
      if (el) {
        result.titleSelectors.push({
          selector,
          text: el.textContent?.trim(),
          found: true,
        });
      } else {
        result.titleSelectors.push({ selector, found: false });
      }
    });

    // 問題コンテナ候補を探す
    const questionSelectors = [
      '.freebirdFormviewerViewNumberedItemContainer',
      '[role="listitem"]',
      '.freebirdFormviewerViewItemList > div',
      '.Qr7Oae',
    ];

    questionSelectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        result.questionContainers.push({
          selector,
          count: elements.length,
          found: true,
        });
      } else {
        result.questionContainers.push({ selector, count: 0, found: false });
      }
    });

    // 全てのclass名を収集
    const allElements = document.querySelectorAll('*');
    allElements.forEach((el) => {
      if (el.className && typeof el.className === 'string') {
        el.className.split(' ').forEach((cls) => {
          if (cls) result.allClassesUsed.add(cls);
        });
      }
    });

    result.allClassesUsed = Array.from(result.allClassesUsed).sort();

    return result;
  });

  console.log('\n=== DOM Investigation Results ===\n');
  console.log('Title selectors:');
  domInfo.titleSelectors.forEach((s) => {
    console.log(`  ${s.selector}: ${s.found ? '✓ FOUND' : '✗ NOT FOUND'}`);
    if (s.text) console.log(`    Text: "${s.text}"`);
  });

  console.log('\nQuestion container selectors:');
  domInfo.questionContainers.forEach((s) => {
    console.log(`  ${s.selector}: ${s.found ? `✓ FOUND (${s.count} items)` : '✗ NOT FOUND'}`);
  });

  console.log('\nAll CSS classes used (first 50):');
  domInfo.allClassesUsed.slice(0, 50).forEach((cls, idx) => {
    console.log(`  ${idx + 1}. ${cls}`);
  });

  await browser.close();
}

debug().catch(console.error);
