import { NextRequest, NextResponse } from 'next/server';

interface Question {
  question_number: number;
  question_text: string;
  choices: string[];
  question_type: 'multiple_choice' | 'checkbox' | 'text';
}

interface ProposedAnswer {
  question_number: number;
  answer: string;
}

interface RequestBody {
  questions: Question[];
  proposed_answers: ProposedAnswer[];
  reference_material?: string; // Optional - for enhanced validation
}

interface ValidatedAnswer {
  question_number: number;
  answer: string;
  confidence: number;
  reasoning: string;
  suggested_change?: string;
}

export async function GET() {
  return NextResponse.json({
    message: 'GPT Mock API for Answer Validation',
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
}

/**
 * GPT Mock API - Validates answers to quiz questions
 *
 * This is a mock implementation that validates answers based on simple heuristics.
 * In a real implementation, this would call GPT-4 API for validation.
 */
export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { questions, proposed_answers } = body;

    if (!questions || !proposed_answers) {
      return NextResponse.json(
        { error: 'Missing required fields: questions, proposed_answers' },
        { status: 400 }
      );
    }

    const validated_answers: ValidatedAnswer[] = proposed_answers.map((proposed) => {
      const question = questions.find((q) => q.question_number === proposed.question_number);

      if (!question) {
        return {
          question_number: proposed.question_number,
          answer: proposed.answer,
          confidence: 0,
          reasoning: 'Question not found',
        };
      }

      // Check if answer matches one of the choices exactly
      const isValidChoice = question.choices.includes(proposed.answer);

      if (!isValidChoice) {
        return {
          question_number: proposed.question_number,
          answer: proposed.answer,
          confidence: 0,
          reasoning: 'Answer does not match any of the provided choices',
          suggested_change: question.choices[0], // Suggest first choice as fallback
        };
      }

      // Mock validation logic - in real implementation, use GPT-4 to validate
      // For simple use case: just validate that answer matches a choice
      const confidence = 0.95; // High confidence if answer is valid

      return {
        question_number: proposed.question_number,
        answer: proposed.answer,
        confidence,
        reasoning: '回答は選択肢と一致しています',
      };
    });

    // Check if all answers have high confidence (>0.8)
    const allValid = validated_answers.every(v => v.confidence > 0.8);
    const hasIssues = validated_answers.some(v => v.suggested_change);

    // Simple response message
    let message = '';
    if (allValid && !hasIssues) {
      message = '問題ありません。全ての回答が適切です。';
    } else if (hasIssues) {
      message = '一部の回答に問題があります。suggested_changesを確認してください。';
    } else {
      message = '回答を確認してください。';
    }

    const confidence_scores = validated_answers.map(v => v.confidence);
    const suggested_changes = validated_answers
      .filter(v => v.suggested_change)
      .map(v => ({
        question_number: v.question_number,
        original: v.answer,
        suggested: v.suggested_change,
      }));

    return NextResponse.json({
      message,
      all_valid: allValid,
      validated_answers,
      confidence_scores,
      suggested_changes,
      overall_confidence: validated_answers.reduce((sum, v) => sum + v.confidence, 0) / validated_answers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GPT Mock API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
