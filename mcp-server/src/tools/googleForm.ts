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
      .$eval('.freebirdFormviewerViewHeaderTitle', (el) => el.textContent)
      .catch(() => 'タイトル不明');

    // 各問題を取得
    const questions: FormQuestion[] = await page.evaluate(() => {
      const items = document.querySelectorAll(
        '.freebirdFormviewerViewNumberedItemContainer'
      );

      return Array.from(items).map((item, index) => {
        // 問題文を取得
        const questionEl = item.querySelector(
          '.freebirdFormviewerComponentsQuestionBaseTitle'
        );
        const questionText = questionEl ? questionEl.textContent || '' : '';

        // 選択肢を取得（multiple choice の場合）
        const choiceElements = item.querySelectorAll(
          '.freebirdFormviewerComponentsQuestionRadioLabel'
        );
        const choices = Array.from(choiceElements).map(
          (choice) => choice.textContent || ''
        );

        // checkbox の場合
        const checkboxElements = item.querySelectorAll(
          '.freebirdFormviewerComponentsQuestionCheckboxLabel'
        );
        const checkboxChoices = Array.from(checkboxElements).map(
          (choice) => choice.textContent || ''
        );

        let questionType: 'multiple_choice' | 'checkbox' | 'text' = 'text';
        let finalChoices: string[] = [];

        if (choices.length > 0) {
          questionType = 'multiple_choice';
          finalChoices = choices;
        } else if (checkboxChoices.length > 0) {
          questionType = 'checkbox';
          finalChoices = checkboxChoices;
        }

        return {
          question_number: index + 1,
          question_text: questionText,
          choices: finalChoices,
          question_type: questionType,
        };
      });
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
      const questionIndex = answer.question_number - 1; // 0-indexed

      // 問題コンテナを取得
      const itemContainers = await page.$$(
        '.freebirdFormviewerViewNumberedItemContainer'
      );

      if (questionIndex >= itemContainers.length) {
        throw new Error(
          `問${answer.question_number}が見つかりません（全${itemContainers.length}問）`
        );
      }

      const itemContainer = itemContainers[questionIndex];

      if (!itemContainer) {
        throw new Error(`問${answer.question_number}のコンテナが見つかりません`);
      }

      // Multiple choice の場合
      const radioLabels = await itemContainer.$$(
        '.freebirdFormviewerComponentsQuestionRadioLabel'
      );

      if (radioLabels.length > 0) {
        // 選択肢をクリック
        for (const label of radioLabels) {
          const labelText = await label.evaluate((el) => el.textContent || '');

          if (labelText.trim() === answer.answer.trim()) {
            // ラベルではなく、その親の div をクリック
            await label.evaluate((el) => {
              const root = el.closest('.freebirdFormviewerComponentsQuestionRadioRoot');
              if (root instanceof HTMLElement) {
                root.click();
              }
            });
            break;
          }
        }
      }

      // Checkbox の場合
      const checkboxLabels = await itemContainer.$$(
        '.freebirdFormviewerComponentsQuestionCheckboxLabel'
      );

      if (checkboxLabels.length > 0) {
        for (const label of checkboxLabels) {
          const labelText = await label.evaluate((el) => el.textContent || '');

          if (labelText.trim() === answer.answer.trim()) {
            await label.evaluate((el) => {
              const root = el.closest('.freebirdFormviewerComponentsQuestionCheckboxRoot');
              if (root instanceof HTMLElement) {
                root.click();
              }
            });
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
