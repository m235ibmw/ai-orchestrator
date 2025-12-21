/**
 * 経費記録フォーム送信ツール
 *
 * Google FormにHTTP POSTで直接送信
 */

// フォームURL
const FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSdxiLRA80UfOHpox__siLjRe5D-jIkSHG6U5iMTenyqaqnbpw/formResponse';

// フォームのentry ID（FB_PUBLIC_LOAD_DATAから取得）
const ENTRY_IDS = {
  date: 1538326662,
  category: 1649422402,
  item: 661684965,
  amount: 1075274019,
  paymentMethod: 869064225,
  memo: 1048252621,
} as const;

// カテゴリの選択肢
export const CATEGORIES = [
  '食費',
  'タバコ',
  '交際費',
  '美容',
  '日用品',
  '交通費',
  '医療費',
  '趣味',
  'Buffer',
  '固定費',
  '収入 - 荷揚げ',
  '収入 - 警備',
  '収入 - 奨学金',
  '収入 - その他',
  '現金入金',
  '初期データ',
] as const;

// 決済手段の選択肢
export const PAYMENT_METHODS = [
  'PayPay',
  'まとめ買い',
  'Kyash',
  'B/43',
  'クレカ',
  '銀行引落',
  '銀行',
  '現金',
  '未着金',
  '初期データ',
] as const;

export type Category = (typeof CATEGORIES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface ExpenseEntry {
  date: string; // YYYY-MM-DD format or 'today'
  category: Category;
  item: string; // 品目
  amount: number; // 合計金額
  paymentMethod: PaymentMethod;
  memo?: string; // メモ（任意）
}

export interface ExpenseFormResult {
  success: boolean;
  message: string;
  submitted_data?: ExpenseEntry;
  error?: string;
}

/**
 * 日付文字列をYYYY-MM-DD形式に変換
 */
function parseDate(dateStr: string): string {
  // すでに YYYY-MM-DD 形式
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // 今日の日付
  if (dateStr === 'today' || dateStr === '今日') {
    const today = new Date();
    return formatDate(today);
  }

  // YYYY/MM/DD 形式
  const ymdMatch = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2]!.padStart(2, '0')}-${ymdMatch[3]!.padStart(2, '0')}`;
  }

  // MM/DD 形式 (今年とみなす)
  const mdSlashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (mdSlashMatch) {
    const year = new Date().getFullYear();
    return `${year}-${mdSlashMatch[1]!.padStart(2, '0')}-${mdSlashMatch[2]!.padStart(2, '0')}`;
  }

  // M月D日 形式
  const mdMatch = dateStr.match(/(\d{1,2})月(\d{1,2})日/);
  if (mdMatch) {
    const year = new Date().getFullYear();
    return `${year}-${mdMatch[1]!.padStart(2, '0')}-${mdMatch[2]!.padStart(2, '0')}`;
  }

  // パースできない場合は今日
  return formatDate(new Date());
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 経費データをGoogle Formに送信（HTTP POST）
 */
export async function submitExpenseForm(entry: ExpenseEntry): Promise<ExpenseFormResult> {
  // バリデーション
  if (!entry.date) {
    return { success: false, message: '', error: '日付は必須です' };
  }
  if (!CATEGORIES.includes(entry.category)) {
    return {
      success: false,
      message: '',
      error: `無効なカテゴリです: ${entry.category}`,
    };
  }
  if (!entry.item || entry.item.trim() === '') {
    return { success: false, message: '', error: '品目は必須です' };
  }
  if (typeof entry.amount !== 'number' || entry.amount < 0) {
    return {
      success: false,
      message: '',
      error: '合計金額は0以上の数値である必要があります',
    };
  }
  if (!PAYMENT_METHODS.includes(entry.paymentMethod)) {
    return {
      success: false,
      message: '',
      error: `無効な決済手段です: ${entry.paymentMethod}`,
    };
  }

  try {
    const dateValue = parseDate(entry.date);

    // フォームデータを構築
    const formData = new URLSearchParams();
    formData.append(`entry.${ENTRY_IDS.date}`, dateValue);
    formData.append(`entry.${ENTRY_IDS.category}`, entry.category);
    formData.append(`entry.${ENTRY_IDS.item}`, entry.item);
    formData.append(`entry.${ENTRY_IDS.amount}`, String(entry.amount));
    formData.append(`entry.${ENTRY_IDS.paymentMethod}`, entry.paymentMethod);
    if (entry.memo) {
      formData.append(`entry.${ENTRY_IDS.memo}`, entry.memo);
    }

    // POSTリクエスト送信
    const response = await fetch(FORM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    // Google Formは成功時も失敗時も200を返すことがある
    // レスポンスのHTMLに確認メッセージがあるかチェック
    if (response.ok) {
      return {
        success: true,
        message: '経費データを送信しました',
        submitted_data: {
          ...entry,
          date: dateValue,
        },
      };
    } else {
      return {
        success: false,
        message: '',
        error: `送信に失敗しました: HTTP ${response.status}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: '',
      error: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * フォームの選択肢情報を取得
 */
export function getFormOptions(): {
  categories: readonly string[];
  paymentMethods: readonly string[];
} {
  return {
    categories: CATEGORIES,
    paymentMethods: PAYMENT_METHODS,
  };
}
