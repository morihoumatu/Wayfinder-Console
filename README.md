# Wayfinder Console

地域起点のルート設計と所要時間検証を、プロダクト品質で運用できるライブコンソールです。

クイックスタート:

1. `.env.example` を `.env` にコピーします。
2. `.env` にキーを設定します。
   - `GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY`
   - `OPENAI_API_KEY=YOUR_OPENAI_API_KEY`
3. `node server.js` を実行します。
4. ブラウザで `http://localhost:3000` を開きます。

実行方法:

アプリ起動:

1. `node server.js` を実行します。
2. ブラウザで `http://localhost:3000` を開きます。

静的解析:

1. `npm install`
2. `npm run lint`
3. `npm run docs:html`（フォルダ説明・JSDocのHTMLを生成）

動的検証:

1. `npm install`
2. Playwright: `npm run test:playwright`（初回のみ `npx playwright install`）
3. Cypress: `node server.js` を別ターミナルで起動してから `npm run test:cypress`
4. Vitest: `npm run test:vitest`

注意:

- Google Maps JavaScript API を有効にしてください。
- 地図が表示されない場合は、ブラウザのコンソールで API エラーを確認してください。
- おすすめ検索の所要時間上限（分）を設定すると、その範囲を目安に候補を選びます。
- おすすめ検索が空欄の場合は、所要時間を目安にした散歩ルート（複数地点）を提案します。

YOUR_GOOGLE_MAPS_API_KEY の発行手順:

1. Google Cloud Console (https://console.cloud.google.com/) にアクセスしてプロジェクトを作成または選択します。
2. 左メニューの「API とサービス」→「ライブラリ」で「Maps JavaScript API」を有効化します。
3. 「API とサービス」→「認証情報」→「認証情報を作成」→「API キー」を選びます。
4. 作成したキーの「キーを制限」でアプリに合わせた制限を設定します。
   - ローカルで開く場合: HTTP リファラーに `http://localhost:3000/*` などを追加
   - 公開環境の場合: 使うドメインのみ許可
5. 発行されたキーを `.env` の `GOOGLE_MAPS_API_KEY` に貼り付けます。

OpenAI API 設定:

1. OpenAI の API キーを取得します。
2. `.env` の `OPENAI_API_KEY` を設定してからサーバーを起動します。
3. Web 検索ツール名が異なる場合は `.env` の `OPENAI_WEB_SEARCH_TOOL` を設定します。
   - 例: `$env:OPENAI_WEB_SEARCH_TOOL="web_search"` または `"web_search_preview"`
4. `node server.js` を再実行します。

補足:

- OpenAI API の利用料金が発生します。
- Web 検索ツールが未対応のモデルではエラーになります。
