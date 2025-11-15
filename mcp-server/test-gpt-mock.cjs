const fetch = require('node-fetch').default || require('node-fetch');

async function testGPTMockAPI() {
  console.log('Testing GPT Mock API...\n');

  const apiUrl = 'http://localhost:3000/api/gpt-mock';

  // Test data
  const questions = [
    {
      question_number: 1,
      question_text: '問1. 古代ギリシャで発展した政治制度は？',
      choices: ['民主制', '君主制', '貴族制', '共和制'],
      question_type: 'multiple_choice',
    },
    {
      question_number: 2,
      question_text: '問2. ローマ共和制の最高執政官の名称は？',
      choices: ['執政官（コンスル）', '独裁官', '護民官', '元老院議員'],
      question_type: 'multiple_choice',
    },
    {
      question_number: 3,
      question_text: '問3. パックス・ロマーナとは何を意味するか？',
      choices: ['ローマによる平和', 'ローマの戦争', 'ローマの法律', 'ローマの建築'],
      question_type: 'multiple_choice',
    },
    {
      question_number: 4,
      question_text: '問4. ローマ帝国が東西に分割されたのは西暦何年か？',
      choices: ['395年', '476年', '27年', '509年'],
      question_type: 'multiple_choice',
    },
    {
      question_number: 5,
      question_text: '問5. 古代ローマを代表する建築物は？',
      choices: ['コロッセオ', 'パルテノン神殿', 'ピラミッド', '万里の長城'],
      question_type: 'multiple_choice',
    },
  ];

  const proposed_answers = [
    { question_number: 1, answer: '民主制' },
    { question_number: 2, answer: '執政官（コンスル）' },
    { question_number: 3, answer: 'ローマによる平和' },
    { question_number: 4, answer: '395年' },
    { question_number: 5, answer: 'コロッセオ' },
  ];

  try {
    console.log('Sending validation request to', apiUrl);
    console.log('Questions:', questions.length);
    console.log('Proposed answers:', proposed_answers.length);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        questions,
        proposed_answers,
      }),
    });

    if (!response.ok) {
      console.error(`✗ HTTP Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Response:', errorText);
      return;
    }

    const result = await response.json();

    console.log('\n✓ API Response:\n');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n=== Validation Summary ===\n');
    console.log(`Message: ${result.message}`);
    console.log(`All Valid: ${result.all_valid}`);
    console.log(`Overall Confidence: ${(result.overall_confidence * 100).toFixed(1)}%`);
    console.log(`Validated Answers: ${result.validated_answers.length}`);
    console.log(`Suggested Changes: ${result.suggested_changes.length}`);

    console.log('\n=== Individual Answers ===\n');
    result.validated_answers.forEach((answer) => {
      console.log(`Q${answer.question_number}: ${answer.answer}`);
      console.log(`  Confidence: ${(answer.confidence * 100).toFixed(1)}%`);
      console.log(`  Reasoning: ${answer.reasoning}`);
      if (answer.suggested_change) {
        console.log(`  Suggested: ${answer.suggested_change}`);
      }
      console.log('');
    });

    if (result.suggested_changes.length > 0) {
      console.log('=== Suggested Changes ===\n');
      result.suggested_changes.forEach((change) => {
        console.log(`Q${change.question_number}:`);
        console.log(`  Original: ${change.original}`);
        console.log(`  Suggested: ${change.suggested}`);
        console.log('');
      });
    }

    console.log('✓ Test completed successfully!');
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error(error.stack);
  }
}

testGPTMockAPI();
