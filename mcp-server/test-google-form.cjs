const { getGoogleFormQuestions, closeBrowser } = require('./dist/tools/googleForm.js');

async function test() {
  console.log('Testing Google Form questions extraction...\n');

  const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfIZgtHH8FJudeMNlW1oyzmI8LKqHiZD9jkP-UYSeTIGdVtww/viewform';

  try {
    const result = await getGoogleFormQuestions(formUrl);

    console.log('Result:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✓ Success!');
      console.log('Form Title:', result.form_title);
      console.log('Number of questions:', result.questions.length);
      result.questions.forEach((q) => {
        console.log(`\nQ${q.question_number}: ${q.question_text}`);
        console.log(`  Type: ${q.question_type}`);
        if (q.choices.length > 0) {
          console.log(`  Choices: ${q.choices.join(', ')}`);
        }
      });
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
