import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
let browserInstance = null;
async function getBrowser() {
    if (!browserInstance) {
        browserInstance = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
    }
    return browserInstance;
}
export async function closeBrowser() {
    if (browserInstance) {
        await browserInstance.close();
        browserInstance = null;
    }
}
export async function getLessonPdfUrl(courseName, lessonNumber, credentials, baseUrl = 'http://localhost:3000') {
    let page = null;
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
                    pdfUrl = await pdfLink.evaluate((el) => el.href);
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
        // 6. PDFをダウンロードして一時ファイルに保存
        const pdfResponse = await page.goto(pdfUrl, { waitUntil: 'networkidle2' });
        if (!pdfResponse) {
            return {
                success: false,
                error: 'PDFのダウンロードに失敗しました',
            };
        }
        const pdfBuffer = await pdfResponse.buffer();
        // 一時ディレクトリにPDFを保存
        const tmpDir = os.tmpdir();
        const sanitizedCourseName = courseName.replace(/[^a-zA-Z0-9]/g, '-');
        const pdfFileName = `${sanitizedCourseName}-lesson-${lessonNumber}.pdf`;
        const pdfFilePath = path.join(tmpDir, pdfFileName);
        fs.writeFileSync(pdfFilePath, pdfBuffer);
        return {
            success: true,
            pdf_url: pdfUrl,
            pdf_file_path: pdfFilePath,
            lesson_title: lessonTitle,
            course_name: courseName,
        };
    }
    catch (error) {
        return {
            success: false,
            error: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
    finally {
        if (page) {
            await page.close();
        }
    }
}
//# sourceMappingURL=browser.js.map