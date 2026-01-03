# 動的検証ルールまとめ

このドキュメントは、本プロジェクトの動的検証ツールに関する品質ルールを整理したものです。

## 対象ツールと実行コマンド
- Playwright: `npm run test:playwright`（初回のみ `npx playwright install`）
- Cypress: `node server.js` を起動してから `npm run test:cypress`
- Vitest: `npm run test:vitest`

## 共通品質ルール
- CIでは `CI=1` を前提に、`.only` の混入を禁止し、必要なリトライを有効化する。
- 失敗時の証跡を必ず保存する（Playwright: trace/動画/スクショ、Cypress: スクショ/CI時動画）。
- 外部API（Google Maps/OpenAI）に依存するテストは、UIの存在確認に留めるかモックで切り離す。
- 固定待機は避け、DOMの状態やリクエスト完了に合わせて待機する。
- セレクタは `id` / role / `data-testid` など安定したものを使う。

## Playwright ルール
- 配置: `tests/playwright/**/*.spec.js`
- `baseURL`: `http://localhost:3000`
- `webServer`: `node server.js` を起動（CIは新規起動、ローカルは再利用可）
- `retries`: CI で2回、ローカルで0回
- 失敗時の `trace` / `screenshot` / `video` を保存し、CIではHTMLレポートを出力する。

## Cypress ルール
- 配置: `cypress/e2e/**/*.cy.js`
- サーバーは別ターミナルで起動する。
- `retries`: runMode 2回 / openMode 0回
- `defaultCommandTimeout`: 8秒、`pageLoadTimeout`: 60秒
- 失敗時のスクリーンショットを必ず保存し、CIでは動画も保存する。

## Vitest ルール
- 配置: `tests/unit/**/*.test.js`
- `clearMocks` / `restoreMocks` を有効化し、テスト間の状態混入を防ぐ。
- `testTimeout`: 5秒、`hookTimeout`: 5秒
- テストが0件の場合は失敗する（`passWithNoTests: false`）。
