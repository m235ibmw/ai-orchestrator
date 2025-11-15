/**
 * 認証情報管理シート作成スクリプト
 *
 * 使い方:
 * 1. Google スプレッドシートを新規作成
 * 2. このスクリプトを Apps Script エディタに貼り付け
 * 3. createCredentialsSheet() を実行
 */

function createCredentialsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 既存の「認証情報」シートがあれば削除
  const existingSheet = ss.getSheetByName("認証情報");
  if (existingSheet) {
    ss.deleteSheet(existingSheet);
    Logger.log("既存の「認証情報」シートを削除しました");
  }

  // 新しい「認証情報」シートを作成
  const sheet = ss.insertSheet("認証情報");

  // ヘッダー行を設定
  sheet.appendRow(["name", "student_id", "classroom_username", "classroom_password"]);

  // ヘッダー行のスタイル設定
  const headerRange = sheet.getRange(1, 1, 1, 4);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#4285f4");
  headerRange.setFontColor("#ffffff");

  // デモデータを追加
  const demoData = [
    ["kurihara yuya", "12345A", "student", "password123"],
  ];

  sheet.getRange(2, 1, demoData.length, 4).setValues(demoData);

  // 列幅を自動調整
  sheet.autoResizeColumn(1);
  sheet.autoResizeColumn(2);
  sheet.autoResizeColumn(3);
  sheet.autoResizeColumn(4);

  // パスワード列を保護（表示は可能だが編集に注意喚起）
  const passwordColumn = sheet.getRange(2, 4, sheet.getMaxRows() - 1, 1);
  passwordColumn.setBackground("#fff3cd");
  passwordColumn.setNote("⚠️ パスワードは安全に管理してください");

  Logger.log("「認証情報」シートを作成しました");

  SpreadsheetApp.getUi().alert(
    "認証情報シート作成完了\n\n" +
    "「認証情報」シートにデモデータを追加しました。\n\n" +
    "name: kurihara yuya\n" +
    "student_id: 12345A\n" +
    "classroom_username: student\n" +
    "classroom_password: password123\n\n" +
    "必要に応じてデータを編集してください。"
  );

  return sheet;
}

/**
 * 認証情報を取得する関数
 * @param {string} studentId - 学籍番号
 * @return {Object} 認証情報オブジェクト {name, student_id, classroom_username, classroom_password}
 */
function getCredentialsByStudentId(studentId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("認証情報");

  if (!sheet) {
    throw new Error("「認証情報」シートが見つかりません");
  }

  const data = sheet.getDataRange().getValues();

  // ヘッダー行をスキップして検索
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[1] === studentId) {
      return {
        name: row[0],
        student_id: row[1],
        classroom_username: row[2],
        classroom_password: row[3]
      };
    }
  }

  throw new Error(`学籍番号 "${studentId}" の認証情報が見つかりません`);
}

/**
 * すべての認証情報を取得する関数
 * @return {Array} 認証情報の配列
 */
function getAllCredentials() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("認証情報");

  if (!sheet) {
    throw new Error("「認証情報」シートが見つかりません");
  }

  const data = sheet.getDataRange().getValues();
  const credentials = [];

  // ヘッダー行をスキップ
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) { // 名前が空でない行のみ
      credentials.push({
        name: row[0],
        student_id: row[1],
        classroom_username: row[2],
        classroom_password: row[3]
      });
    }
  }

  return credentials;
}

/**
 * 新しい認証情報を追加する関数
 * @param {string} name - 名前
 * @param {string} studentId - 学籍番号
 * @param {string} classroomUsername - Classroom ログインID
 * @param {string} classroomPassword - Classroom パスワード
 */
function addCredential(name, studentId, classroomUsername, classroomPassword) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("認証情報");

  if (!sheet) {
    throw new Error("「認証情報」シートが見つかりません");
  }

  // 重複チェック
  try {
    getCredentialsByStudentId(studentId);
    throw new Error(`学籍番号 "${studentId}" は既に登録されています`);
  } catch (e) {
    if (e.message.includes("が見つかりません")) {
      // 見つからなかった場合は追加可能
      sheet.appendRow([name, studentId, classroomUsername, classroomPassword]);
      Logger.log(`認証情報を追加しました: ${name} (${studentId})`);
      return true;
    } else {
      throw e;
    }
  }
}

/**
 * メニューにカスタム項目を追加
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("認証情報管理")
    .addItem("認証情報シート作成", "createCredentialsSheet")
    .addSeparator()
    .addItem("すべての認証情報を表示", "showAllCredentials")
    .addToUi();
}

/**
 * すべての認証情報をダイアログで表示（デバッグ用）
 */
function showAllCredentials() {
  try {
    const credentials = getAllCredentials();
    let message = "登録されている認証情報:\n\n";

    credentials.forEach((cred, index) => {
      message += `${index + 1}. ${cred.name}\n`;
      message += `   学籍番号: ${cred.student_id}\n`;
      message += `   Classroom ID: ${cred.classroom_username}\n`;
      message += `   Classroom PW: ${"*".repeat(cred.classroom_password.length)}\n\n`;
    });

    SpreadsheetApp.getUi().alert(message);
  } catch (e) {
    SpreadsheetApp.getUi().alert("エラー: " + e.message);
  }
}

/**
 * テスト関数: 認証情報の取得をテスト
 */
function testGetCredentials() {
  try {
    const cred = getCredentialsByStudentId("12345A");
    Logger.log("取得成功:");
    Logger.log(JSON.stringify(cred, null, 2));
  } catch (e) {
    Logger.log("エラー: " + e.message);
  }
}
