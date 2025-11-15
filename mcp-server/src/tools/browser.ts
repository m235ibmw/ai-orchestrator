import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PDFParse } from 'pdf-parse';

interface LoginCredentials {
  username: string;
  password: string;
}

interface LessonInfo {
  success: boolean;
  pdf_url?: string;
  pdf_text?: string;
  lesson_title?: string;
  course_name?: string;
  error?: string;
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

export async function getLessonPdfUrl(
  courseName: string,
  lessonNumber: number,
  credentials: LoginCredentials,
  baseUrl: string = 'http://localhost:3000'
): Promise<LessonInfo> {
  let page: Page | null = null;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // 1. ログインページへ移動
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle2' });

    // 2. ログイン情報入力
    await page.type('#username', credentials.username);
    await page.type('#password', credentials.password);

    // 3. ログインボタンをクリック
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]'),
    ]);

    // 4. /home で科目一覧を取得
    const courseElements = await page.$$('.course-item');

    let courseFound = false;
    for (const element of courseElements) {
      const text = await element.evaluate((el) => el.textContent || '');

      if (text.includes(courseName)) {
        // 科目をクリック
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
          element.click(),
        ]);
        courseFound = true;
        break;
      }
    }

    if (!courseFound) {
      return {
        success: false,
        error: `科目 "${courseName}" が見つかりませんでした`,
      };
    }

    // 5. 授業詳細ページで指定回数の授業を探す
    const lessonElements = await page.$$('.lesson-item');

    let lessonFound = false;
    let lessonTitle = '';
    let pdfUrl = '';

    for (const element of lessonElements) {
      const text = await element.evaluate((el) => el.textContent || '');

      if (text.includes(`第${lessonNumber}回`)) {
        // レッスンタイトルを取得
        lessonTitle = await element.evaluate((el) => {
          const titleEl = el.querySelector('h2');
          return titleEl ? titleEl.textContent || '' : '';
        });

        // PDF URLを取得
        const pdfLink = await element.$('a.pdf-link');
        if (pdfLink) {
          pdfUrl = await pdfLink.evaluate((el) => (el as HTMLAnchorElement).href);
          lessonFound = true;
          break;
        }
      }
    }

    if (!lessonFound) {
      return {
        success: false,
        error: `第${lessonNumber}回の授業が見つかりませんでした`,
      };
    }

    // 6. PDFをダウンロード
    console.error('[MCP] PDF URL:', pdfUrl);

    // Get cookies from the page to make authenticated request
    const cookies = await page.cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Use native fetch to download PDF with cookies
    const fetchModule = await import('node-fetch');
    const fetch = fetchModule.default;

    const response = await fetch(pdfUrl, {
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': await page.evaluate(() => navigator.userAgent),
      }
    });

    if (!response.ok) {
      return {
        success: false,
        error: `PDFのダウンロードに失敗しました (HTTP ${response.status})`,
      };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    console.error('[MCP] Downloaded PDF, size:', buffer.length, 'bytes');

    // Verify it's actually a PDF by checking magic bytes
    if (buffer.length < 4 || buffer.toString('utf-8', 0, 4) !== '%PDF') {
      console.error('[MCP] Downloaded content is not a PDF. First 100 bytes:', buffer.toString('utf-8', 0, 100));
      return {
        success: false,
        error: 'ダウンロードしたファイルがPDFではありませんでした',
      };
    }

    // 7. 一時ディレクトリにPDFを保存
    const tmpDir = os.tmpdir();
    const timestamp = Date.now();
    const pdfFileName = `course-${timestamp}-lesson-${lessonNumber}.pdf`;
    const pdfFilePath = path.join(tmpDir, pdfFileName);
    fs.writeFileSync(pdfFilePath, buffer);

    // 8. PDFからテキストを抽出
    let pdfText = '';
    try {
      // Parse PDF using file path
      const parser = new PDFParse({ url: 'file://' + pdfFilePath });
      const result = await parser.getText();
      pdfText = result.text;

      console.error('[MCP] PDF parsing succeeded, extracted', pdfText.length, 'characters');
    } catch (parseError) {
      console.error('[MCP] PDF parsing failed:', parseError);
      pdfText = '[PDF text extraction failed]';
    }

    // Return localhost URL and extracted text
    const localhostPdfUrl = `${baseUrl}/api/pdf/${pdfFileName}`;

    return {
      success: true,
      pdf_url: localhostPdfUrl,
      pdf_text: pdfText,
      lesson_title: lessonTitle,
      course_name: courseName,
    };

  } catch (error) {
    return {
      success: false,
      error: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    if (page) {
      await page.close();
    }
  }
}
