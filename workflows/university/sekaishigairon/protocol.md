# Protocol: 世界史概論（sekaishigairon）

世界史概論の課題処理ワークフローをAIオーケストレーションで実行するためのプロトコル。

## Status
- Version: 0.0.1（MVP）
- Purpose: Claude がこの手順を読み、外部MCPを呼び出しながら自動課題処理を実行する。

## Draft Steps
1. 課題ページ（Vercel）の教材メタデータを取得
2. 教材資料（PDF/HTML）の取得
3. Googleフォームの問題を抽出
4. Claude による一次回答生成
5. GPT・DeepSeek API によるキャリブレーション（二重推論）
6. Notion DB に結果を書き込み
7. HITL承認 → フォーム送信（必要であれば）

## Note
このファイルは Claude に読み込ませて “手順書（AITL）” として使う。
