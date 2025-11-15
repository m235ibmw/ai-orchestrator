const { submitGoogleForm, closeBrowser } = require('./dist/tools/googleForm.js');

async function test() {
  console.log('Testing Google Form submission...\n');

  const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfIZgtHH8FJudeMNlW1oyzmI8LKqHiZD9jkP-UYSeTIGdVtww/viewform';

  const studentInfo = {
    name: 'kurihara yuya',
    student_id: '12345A'
  };

  const answers = [
    { question_number: 1, answer: '民主制' },
    { question_number: 2, answer: '執政官（コンスル）' },
    { question_number: 3, answer: 'ローマによる平和' },
    { question_number: 4, answer: '395年' },
    { question_number: 5, answer: 'コロッセオ' }
  ];

  try {
    const result = await submitGoogleForm(formUrl, studentInfo, answers);

    console.log('Result:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✓ Success!');
      console.log('Message:', result.message);
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
