/**
 * 世界史概論 第2回 確認テスト自動生成スクリプト
 *
 * 想定：
 * - 空のスプレッドシートにシート1つだけある状態からスタート
 * - このスクリプトを貼り付けて、
 *   1) メニューの「フォーム自動生成」→「1. サンプルデータ作成」
 *   2) 「2. フォーム生成」
 *   の順に使う想定
 */

function createQuizForm() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 「設問データ」シートを取得（なければアクティブシートを使う）
  let sheet = ss.getSheetByName("設問データ");
  if (!sheet) {
    sheet = ss.getActiveSheet();
    sheet.setName("設問データ");
  }

  const lastRow = sheet.getLastRow();

  // データが1行以下（ヘッダーのみ or 完全空）の場合はサンプルを自動投入
  if (lastRow < 2) {
    Logger.log("設問データが無いのでサンプルデータを自動生成します");
    setupSampleData(); // 下で定義している関数
  }

  // 再度取得（setupSampleData で行数が増えている前提）
  const lastRowAfterSetup = sheet.getLastRow();
  if (lastRowAfterSetup < 2) {
    SpreadsheetApp.getUi().alert(
      "設問データがありません。シートに問題データを入力してください。"
    );
    return;
  }

  const numRows = lastRowAfterSetup - 1; // ヘッダーを除く行数
  const data = sheet.getRange(2, 1, numRows, 7).getValues();

  // 新しいフォームを作成
  const form = FormApp.create(
    "世界史概論 第2回 確認テスト - ギリシャ・ローマ時代"
  );

  form.setDescription(
    "世界史概論 第2回授業の確認テストです。\n" +
      "古代ギリシャとローマ時代について学んだ内容を確認しましょう。"
  );

  // デモ用途なので「1人1回」の制限はオフ
  form.setLimitOneResponsePerUser(false);

  // 名前と学籍番号を要求する項目を追加
  const nameItem = form.addTextItem();
  nameItem.setTitle("名前");
  nameItem.setHelpText("例: kurihara yuya");
  nameItem.setRequired(true);

  const studentIdItem = form.addTextItem();
  studentIdItem.setTitle("学籍番号");
  studentIdItem.setHelpText("例: 12345A");
  studentIdItem.setRequired(true);

  // 各設問を追加
  data.forEach((row) => {
    const questionNumber = row[0];
    const questionText = row[1];
    const option1 = row[2];
    const option2 = row[3];
    const option3 = row[4];
    const option4 = row[5];
    const correctAnswer = row[6]; // 今は使っていないが、将来クイズモードにするなら利用

    // 空行スキップ
    if (!questionText) return;

    const item = form.addMultipleChoiceItem();
    item.setTitle(`問${questionNumber}. ${questionText}`);

    const choices = [option1, option2, option3, option4].filter((opt) => opt);
    item.setChoiceValues(choices);
    item.setRequired(true);

    Logger.log(`問${questionNumber}を追加しました: ${questionText}`);
  });

  // URL取得
  const formUrl = form.getPublishedUrl();
  const editUrl = form.getEditUrl();

  // フォーム情報シートに記録
  let resultSheet = ss.getSheetByName("フォーム情報");
  if (!resultSheet) {
    resultSheet = ss.insertSheet("フォーム情報");
    resultSheet.appendRow(["作成日時", "フォームURL", "編集URL"]);
  }

  resultSheet.appendRow([new Date(), formUrl, editUrl]);

  Logger.log("フォームが作成されました！");
  Logger.log("フォームURL: " + formUrl);
  Logger.log("編集URL: " + editUrl);

  SpreadsheetApp.getUi().alert(
    "フォーム作成完了\n\n" +
      "フォームURL:\n" +
      formUrl +
      "\n\n" +
      "編集URL:\n" +
      editUrl
  );
}

/**
 * サンプル設問データを、現在のシートに流し込む
 * - 空のシート1枚からスタートするケースを想定
 */
function setupSampleData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("設問データ");

  if (!sheet) {
    sheet = ss.getActiveSheet();
    sheet.setName("設問データ");
  }

  // 一旦クリアしてヘッダー＋データを入れ直す
  sheet.clear();

  // ヘッダー
  sheet.appendRow([
    "問題番号",
    "設問",
    "選択肢1",
    "選択肢2",
    "選択肢3",
    "選択肢4",
    "正解",
  ]);

  // サンプル設問データ
  const sampleData = [
    [
      1,
      "古代ギリシャで発展した政治制度は？",
      "民主制",
      "君主制",
      "貴族制",
      "共和制",
      "民主制",
    ],
    [
      2,
      "ローマ共和制の最高執政官の名称は？",
      "執政官（コンスル）",
      "独裁官",
      "護民官",
      "元老院議員",
      "執政官（コンスル）",
    ],
    [
      3,
      "パックス・ロマーナとは何を意味するか？",
      "ローマによる平和",
      "ローマの戦争",
      "ローマの法律",
      "ローマの建築",
      "ローマによる平和",
    ],
    [
      4,
      "ローマ帝国が東西に分割されたのは西暦何年か？",
      "395年",
      "476年",
      "27年",
      "509年",
      "395年",
    ],
    [
      5,
      "古代ローマを代表する建築物は？",
      "コロッセオ",
      "パルテノン神殿",
      "ピラミッド",
      "万里の長城",
      "コロッセオ",
    ],
  ];

  sheet
    .getRange(2, 1, sampleData.length, sampleData[0].length)
    .setValues(sampleData);

  Logger.log("サンプルデータを作成しました");
  SpreadsheetApp.getUi().alert(
    "サンプルデータを作成しました！\n次に「フォーム生成」を実行してください。"
  );
}

/**
 * メニューにカスタム項目を追加
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("フォーム自動生成")
    .addItem("1. サンプルデータ作成", "setupSampleData")
    .addItem("2. フォーム生成", "createQuizForm")
    .addToUi();
}
