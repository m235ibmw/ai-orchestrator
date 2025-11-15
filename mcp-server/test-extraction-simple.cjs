const puppeteer = require('puppeteer');

async function test() {
  const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfIZgtHH8FJudeMNlW1oyzmI8LKqHiZD9jkP-UYSeTIGdVtww/viewform';

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Capture console logs from the page
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.text());
  });

  await page.goto(formUrl, { waitUntil: 'networkidle2' });

  const result = await page.evaluate(() => {
    const items = document.querySelectorAll('[role="listitem"]');
    console.log('Found listitems:', items.length);

    const results = [];
    let questionNumber = 1;

    Array.from(items).forEach((item, idx) => {
      const questionEl = item.querySelector('.M7eMe');
      const questionText = questionEl ? questionEl.textContent?.trim() || '' : '';

      const hasTextInput = item.querySelectorAll('input[type="text"], textarea').length > 0;

      const radioElements = item.querySelectorAll('[role="radio"]');
      const radioChoices = Array.from(radioElements).map((radio) => {
        // .aDTYNe is in a sibling element, not a child
        const parent = radio.closest('.nWQGrd');
        const labelEl = parent ? parent.querySelector('.aDTYNe') : null;
        return labelEl ? labelEl.textContent?.trim() || '' : '';
      }).filter(text => text !== '');

      console.log(`Item ${idx}: question="${questionText}", hasText=${hasTextInput}, radios=${radioElements.length}, choices=${JSON.stringify(radioChoices)}`);

      if (hasTextInput) {
        console.log(`  -> Skipping (text input)`);
        return;
      }

      if (questionText && radioChoices.length > 0) {
        console.log(`  -> Adding as question ${questionNumber}`);
        results.push({
          question_number: questionNumber++,
          question_text: questionText,
          choices: radioChoices,
        });
      } else {
        console.log(`  -> Skipping (no text or no choices)`);
      }
    });

    console.log('Final results:', results.length);
    return results;
  });

  console.log('\nExtracted questions:', JSON.stringify(result, null, 2));

  await browser.close();
}

test().catch(console.error);
