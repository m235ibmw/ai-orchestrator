const { getLessonPdfUrl, closeBrowser } = require('./dist/tools/browser.js');

async function test() {
  console.log('Testing getLessonPdfUrl...\n');

  const credentials = {
    username: 'student',
    password: 'password123'
  };

  try {
    const result = await getLessonPdfUrl('世界史概論', 2, credentials, 'http://localhost:3000');

    console.log('Result:', JSON.stringify(result, null, 2));

    if (result.success && result.pdf_text) {
      console.log('\n✓ Success!');
      console.log('PDF Text length:', result.pdf_text.length);
      console.log('First 300 chars:', result.pdf_text.substring(0, 300));
    } else {
      console.log('\n✗ Failed:', result.error);
    }
  } catch (err) {
    console.error('✗ Error:', err.message);
    console.error(err.stack);
  } finally {
    await closeBrowser();
  }
}

test();
