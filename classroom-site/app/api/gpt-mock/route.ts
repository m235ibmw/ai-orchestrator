import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Hello World from GPT Mock API',
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, answer } = body;

    if (!prompt || !answer) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt and answer' },
        { status: 400 }
      );
    }

    // Mock GPT response - 簡易的な校正結果を返す
    const mockResponse = {
      original_answer: answer,
      reviewed_answer: answer, // 後でちゃんとしたモックデータに置き換える
      confidence_score: 0.85,
      suggestions: [
        'この回答は適切です。',
        '論理的な構成になっています。',
      ],
      reviewed_at: new Date().toISOString(),
      model: 'gpt-4-mock',
    };

    return NextResponse.json(mockResponse);
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
