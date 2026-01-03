# 動的検証ルールまとめ

このドキュメントは、本プロジェクトの動的検証ツールに関する品質ルールを整理したものです。

## 対象ツールと実行コマンド
- Playwright: `npm run test:playwright`（初回のみ `npx playwright install`）
- Cypress: `node server.js` を起動してから `npm run test:cypress`
- Vitest: `npm run test:vitest`
- Lighthouse: `npm run test:perf`（`reports/lighthouse-report.html` を出力）
- Load Test: `npm run test:load`（`reports/load-test-report.json` を出力）
- Security Check: `npm run test:security`（`reports/security-report.json` を出力）
- 一括実行: `npm run test:all`（必要に応じてCypress用のサーバーを自動起動、レポートと品質ゲートも実行）
- 一括+レポート: `npm run test:all:report`（`test:all` と同等の明示用）
- HTMLレポート生成: `npm run test:report`（`reports/test-report.html` を出力）
- 品質ゲート: `npm run test:gate`

## 共通品質ルール
- CIでは `CI=1` を前提に、`.only` の混入を禁止し、必要なリトライを有効化する。
- 失敗時の証跡を必ず保存する（Playwright: trace/動画/スクショ、Cypress: スクショ/CI時動画）。
- 外部API（Google Maps/OpenAI）に依存するテストは、UIの存在確認に留めるかモックで切り離す。
- 固定待機は避け、DOMの状態やリクエスト完了に合わせて待機する。
- セレクタは `id` / role / `data-testid` など安定したものを使う。
- HTMLレポートは `reports/test-report.html` に集約し、詳細は `reports/playwright/index.html` と `reports/cypress/index.html` を参照する。

## 品質ゲート
- `scripts/test-gate.js` で動的検証の品質基準を判定する。
- 現在の基準は `minTotal` / `maxFailed` / `maxSkipped` をツール別に設定している。
- 既定値: Vitest 60件 / Playwright 40件 / Cypress 3件 / Lighthouse 4件 / Load Test 3件 /
  Security 7件、失敗とスキップは0件。
- カバレッジ判定: `reports/vitest-coverage/coverage-summary.json` を参照し、
  line 95% / statement 95% / function 95% / branch 85% を下回らないこと。
- 品質ゲートの結果は `reports/test-gate.json` に保存され、`reports/test-report.html` に反映される。
- ファイル単位のカバレッジも同じ閾値で判定し、未達の場合は品質ゲートを失敗させる。

## 非機能テスト
- Playwrightでアクセシビリティ（axe）とパフォーマンス、セキュリティヘッダーを検証する。
- パフォーマンス目安: `domContentLoaded <= 3000ms`、`load <= 5000ms`。
- Lighthouseでパフォーマンス/アクセシビリティ/ベストプラクティス/SEOのスコアを検証する。
- Lighthouseの閾値: performance 0.90 / accessibility 0.95 / best-practices 0.90 / seo 0.90
- Load Testで `p95 <= 800ms` / `errorRate <= 0` / `rps >= 50` を満たす。
- セキュリティヘッダー: `Content-Security-Policy` / `Cross-Origin-Opener-Policy` /
  `Cross-Origin-Resource-Policy` / `X-Content-Type-Options` / `X-Frame-Options` /
  `Referrer-Policy` / `Permissions-Policy` を必須とする。

## Playwright ルール
- 配置: `tests/playwright/**/*.spec.js`
- `baseURL`: `http://localhost:3000`
- `webServer`: `node server.js` を起動（CIは新規起動、ローカルは再利用可）
- `retries`: CI で2回、ローカルで0回
- 失敗時の `trace` / `screenshot` / `video` を保存し、CIではHTMLレポートを出力する。
- HTMLレポート: `reports/playwright/index.html`
- 外部依存を避けるため、Google Maps APIはテスト内でスタブ化する。
- プロジェクトは Chromium / Firefox / WebKit / Mobile Chrome を対象とする。
- `toHaveScreenshot` を使ったビジュアル回帰を含める。

## Cypress ルール
- 配置: `cypress/e2e/**/*.cy.js`
- サーバーが起動していない場合は `test:all` が自動で起動する。
- `retries`: runMode 2回 / openMode 0回
- `defaultCommandTimeout`: 8秒、`pageLoadTimeout`: 60秒
- 失敗時のスクリーンショットを必ず保存し、CIでは動画も保存する。
- HTMLレポート: `reports/cypress/index.html`
- 外部依存を避けるため、Google Maps APIはテスト内でスタブ化する。

## Vitest ルール
- 配置: `tests/unit/**/*.test.js`
- `clearMocks` / `restoreMocks` を有効化し、テスト間の状態混入を防ぐ。
- `testTimeout`: 5秒、`hookTimeout`: 5秒
- テストが0件の場合は失敗する（`passWithNoTests: false`）。
- カバレッジHTML: `reports/vitest-coverage/index.html`
