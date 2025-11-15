const puppeteer = require('puppeteer');

async function debug() {
  console.log('Debugging Google Form question structure...\n');

  const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfIZgtHH8FJudeMNlW1oyzmI8LKqHiZD9jkP-UYSeTIGdVtww/viewform';

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(formUrl, { waitUntil: 'networkidle2' });

  // 質問構造を詳細調査
  const questionDetails = await page.evaluate(() => {
    const listItems = document.querySelectorAll('[role="listitem"]');

    return Array.from(listItems).map((item, index) => {
      // 質問テキストを探す
      const questionCandidates = [
        item.querySelector('.freebirdFormviewerComponentsQuestionBaseTitle'),
        item.querySelector('[role="heading"]'),
        item.querySelector('.M7eMe'),
        item.querySelector('[jsname]'),
      ];

      const questionTexts = questionCandidates.map((el, idx) => ({
        selector: idx === 0 ? '.freebirdFormviewerComponentsQuestionBaseTitle' :
                 idx === 1 ? '[role="heading"]' :
                 idx === 2 ? '.M7eMe' : '[jsname]',
        text: el ? el.textContent?.trim() : null,
        found: !!el,
      }));

      // ラジオボタンの選択肢を探す
      const radioLabels = item.querySelectorAll('[role="radio"]');
      const radioTexts = Array.from(radioLabels).map(el => {
        // ラベルテキストを探す
        const labelEl = el.querySelector('.aDTYNe') || el.querySelector('[jsname]') || el;
        return labelEl.textContent?.trim() || '';
      });

      // チェックボックスの選択肢を探す
      const checkboxes = item.querySelectorAll('[role="checkbox"]');
      const checkboxTexts = Array.from(checkboxes).map(el => {
        const labelEl = el.querySelector('.aDTYNe') || el.querySelector('[jsname]') || el;
        return labelEl.textContent?.trim() || '';
      });

      // テキスト入力フィールドを探す
      const textInputs = item.querySelectorAll('input[type="text"], textarea');

      return {
        index: index + 1,
        questionCandidates: questionTexts,
        radioChoices: radioTexts,
        checkboxChoices: checkboxTexts,
        hasTextInput: textInputs.length > 0,
        innerHTML: item.innerHTML.substring(0, 500), // 最初の500文字
      };
    });
  });

  console.log('=== Question Details ===\n');
  questionDetails.forEach((q) => {
    console.log(`Question ${q.index}:`);
    console.log('  Question text candidates:');
    q.questionCandidates.forEach((c) => {
      console.log(`    ${c.selector}: ${c.found ? '✓' : '✗'} ${c.text || ''}`);
    });
    if (q.radioChoices.length > 0) {
      console.log(`  Radio choices (${q.radioChoices.length}):`);
      q.radioChoices.forEach((choice, idx) => {
        console.log(`    ${idx + 1}. "${choice}"`);
      });
    }
    if (q.checkboxChoices.length > 0) {
      console.log(`  Checkbox choices (${q.checkboxChoices.length}):`);
      q.checkboxChoices.forEach((choice, idx) => {
        console.log(`    ${idx + 1}. "${choice}"`);
      });
    }
    if (q.hasTextInput) {
      console.log('  Has text input: ✓');
    }
    console.log('');
  });

  await browser.close();
}

debug().catch(console.error);
