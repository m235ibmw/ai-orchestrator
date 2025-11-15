import puppeteer, { Browser, Page } from 'puppeteer';

interface FormQuestion {
  question_number: number;
  question_text: string;
  choices: string[];
  question_type: 'multiple_choice' | 'checkbox' | 'text';
}

interface FormStructure {
  success: boolean;
  form_title: string;
  questions: FormQuestion[];
  form_url: string;
  error?: string;
}

interface FormSubmissionResult {
  success: boolean;
  message: string;
  error?: string;
}

interface StudentInfo {
  name: string;
  student_id: string;
}

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Google Form の問題と選択肢を取得
 */
export async function getGoogleFormQuestions(
  formUrl: string
): Promise<FormStructure> {
  let page: Page | null = null;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.goto(formUrl, { waitUntil: 'networkidle2' });

    // フォームタイトルを取得
    const formTitle = await page
      .$eval('[role="heading"][aria-level="1"]', (el) => el.textContent)
      .catch(() => 'タイトル不明');

    // 各問題を取得（名前・学籍番号などの入力フィールドをスキップ）
    const questions: FormQuestion[] = await page.evaluate(() => {
      const items = document.querySelectorAll('[role="listitem"]');

      const results: any[] = [];
      let questionNumber = 1;

      Array.from(items).forEach((item) => {
        // 問題文を取得
        const questionEl = item.querySelector('.M7eMe');
        const questionText = questionEl ? questionEl.textContent?.trim() || '' : '';

        // テキスト入力フィールドがある場合はスキップ（名前・学籍番号など）
        const hasTextInput = item.querySelectorAll('input[type="text"], textarea').length > 0;
        if (hasTextInput) {
          return; // スキップ
        }

        // ラジオボタンの選択肢を取得
        const radioElements = item.querySelectorAll('[role="radio"]');
        const radioChoices = Array.from(radioElements).map((radio) => {
          // .aDTYNe is in a sibling element, not a child
          const parent = radio.closest('.nWQGrd');
          const labelEl = parent ? parent.querySelector('.aDTYNe') : null;
          return labelEl ? labelEl.textContent?.trim() || '' : '';
        }).filter(text => text !== '');

        // チェックボックスの選択肢を取得
        const checkboxElements = item.querySelectorAll('[role="checkbox"]');
        const checkboxChoices = Array.from(checkboxElements).map((checkbox) => {
          // .aDTYNe is in a sibling element, not a child
          const parent = checkbox.closest('.nWQGrd');
          const labelEl = parent ? parent.querySelector('.aDTYNe') : null;
          return labelEl ? labelEl.textContent?.trim() || '' : '';
        }).filter(text => text !== '');

        let questionType: 'multiple_choice' | 'checkbox' | 'text' = 'text';
        let finalChoices: string[] = [];

        if (radioChoices.length > 0) {
          questionType = 'multiple_choice';
          finalChoices = radioChoices;
        } else if (checkboxChoices.length > 0) {
          questionType = 'checkbox';
          finalChoices = checkboxChoices;
        }

        // 問題文があり、選択肢があるもののみを追加
        if (questionText && (radioChoices.length > 0 || checkboxChoices.length > 0)) {
          results.push({
            question_number: questionNumber++,
            question_text: questionText,
            choices: finalChoices,
            question_type: questionType,
          });
        }
      });

      return results;
    });

    return {
      success: true,
      form_title: formTitle || '',
      questions,
      form_url: formUrl,
    };
  } catch (error) {
    return {
      success: false,
      form_title: '',
      questions: [],
      form_url: formUrl,
      error: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    if (page) {
      await page.close();
    }
  }
}

/**
 * Google Form に回答を送信
 */
export async function submitGoogleForm(
  formUrl: string,
  studentInfo: StudentInfo,
  answers: { question_number: number; answer: string }[]
): Promise<FormSubmissionResult> {
  let page: Page | null = null;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.goto(formUrl, { waitUntil: 'networkidle2' });

    // 名前と学籍番号を入力（最初の2つのテキストフィールド）
    const textInputs = await page.$$('input[type="text"]');

    if (textInputs.length >= 2 && textInputs[0] && textInputs[1]) {
      // 1つ目: 名前
      await textInputs[0].type(studentInfo.name);
      // 2つ目: 学籍番号
      await textInputs[1].type(studentInfo.student_id);
    } else {
      throw new Error('名前または学籍番号の入力フィールドが見つかりませんでした');
    }

    // 各問題に回答
    for (const answer of answers) {
      // 全ての listitem を取得し、テキスト入力をスキップして質問のみを取得
      const allItems = await page.$$('[role="listitem"]');

      const questionItems = [];
      for (const item of allItems) {
        const hasTextInput = await item.$$('input[type="text"], textarea');
        if (hasTextInput.length === 0) {
          questionItems.push(item);
        }
      }

      const questionIndex = answer.question_number - 1; // 0-indexed

      if (questionIndex >= questionItems.length) {
        throw new Error(
          `問${answer.question_number}が見つかりません（全${questionItems.length}問）`
        );
      }

      const itemContainer = questionItems[questionIndex];

      if (!itemContainer) {
        throw new Error(`問${answer.question_number}のコンテナが見つかりません`);
      }

      // Multiple choice の場合
      const radioElements = await itemContainer.$$('[role="radio"]');

      if (radioElements.length > 0) {
        // 選択肢をクリック
        for (const radio of radioElements) {
          // Get the label text using evaluate
          const labelText = await radio.evaluate((el: Element) => {
            const parent = el.closest('.nWQGrd');
            const labelEl = parent ? parent.querySelector('.aDTYNe') : null;
            return labelEl ? labelEl.textContent?.trim() || '' : '';
          });

          if (labelText === answer.answer.trim()) {
            // Click the radio button
            await radio.click();
            break;
          }
        }
      }

      // Checkbox の場合
      const checkboxElements = await itemContainer.$$('[role="checkbox"]');

      if (checkboxElements.length > 0) {
        for (const checkbox of checkboxElements) {
          // Get the label text using evaluate
          const labelText = await checkbox.evaluate((el: Element) => {
            const parent = el.closest('.nWQGrd');
            const labelEl = parent ? parent.querySelector('.aDTYNe') : null;
            return labelEl ? labelEl.textContent?.trim() || '' : '';
          });

          if (labelText === answer.answer.trim()) {
            // Click the checkbox
            await checkbox.click();
            break;
          }
        }
      }
    }

    // 送信ボタンをクリック
    await page.waitForSelector('[role="button"]', { visible: true });

    // 送信ボタンを探してクリック
    const submitClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('[role="button"]'));
      const submitButton = buttons.find(
        (btn) =>
          btn.textContent?.includes('送信') || btn.textContent?.includes('Submit')
      );

      if (submitButton && submitButton instanceof HTMLElement) {
        submitButton.click();
        return true;
      }
      return false;
    });

    if (!submitClicked) {
      throw new Error('送信ボタンが見つかりませんでした');
    }

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });

    // 成功メッセージを確認
    const successMessage = await page
      .$eval('.freebirdFormviewerViewResponseConfirmationMessage', (el) =>
        el.textContent?.trim()
      )
      .catch(() => '回答を送信しました');

    return {
      success: true,
      message: successMessage || '回答を送信しました',
    };
  } catch (error) {
    return {
      success: false,
      message: '',
      error: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    if (page) {
      await page.close();
    }
  }
}
