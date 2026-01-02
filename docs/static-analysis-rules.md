# 静的解析ルールまとめ

このドキュメントは、本プロジェクトで使われている静的解析ツールの設定とルールを整理したものです。

## 対象ツールと実行コマンド
- ESLint: `npm run lint:js`（`eslint --ext .js . --max-warnings 0`）
- Stylelint: `npm run lint:css`（`stylelint "**/*.css" --max-warnings 0`）
- HTMLHint: `npm run lint:html`（`htmlhint "**/*.html" --ignore "**/reports/**,**/node_modules/**"`）
- TypeScript: `npm run lint:types`（`tsc -p tsconfig.json`）
- 集約: `npm run lint`（`scripts/lint-report.js` で各ツールを実行し、`reports/lint-report.html` にレポート出力）

補足:
- ESLint/Stylelint は `--max-warnings 0` のため警告も失敗扱い。
- 集約スクリプト側でも警告が 1 件でもあれば失敗扱いになります。

## ESLint（`.eslintrc.cjs`）
### 基本設定
- `root: true`: 親ディレクトリの ESLint 設定を無効化
- `env.es2021: true`: ES2021 を想定
- `parserOptions`: `ecmaVersion: 2021`, `sourceType: "script"`
- `extends: ["eslint:recommended"]`
- `reportUnusedDisableDirectives: true`: 不要な `eslint-disable` を報告

### ファイル別設定
- `app.js`: `browser: true`, `google` グローバルを読み取り専用で許可
- `server.js`: `node: true`

### 明示的なルール
- `array-callback-return`: 配列メソッドのコールバックは `return` を必須化
- `block-scoped-var`: ブロックスコープ外参照を禁止
- `consistent-return`: `return` の有無/返り値を一貫させる
- `complexity: ["error", 10]`: 循環的複雑度が10を超える関数をエラー
- `curly: ["error", "all"]`: 制御構文に波括弧を必須化
- `default-case`: `switch` の `default` を必須化
- `default-case-last`: `default` を末尾に配置
- `eqeqeq: ["error", "always"]`: `===`/`!==` を強制
- `no-alert`: `alert/confirm/prompt` を禁止
- `no-console`: `console.warn` と `console.error` 以外を禁止
- `no-debugger`: `debugger` を禁止
- `no-else-return`: `if` で `return` した後の `else` を禁止
- `no-implicit-coercion`: 暗黙の型変換を禁止
- `no-multi-assign`: 連鎖代入を禁止
- `no-return-assign: ["error", "always"]`: `return` 内の代入を禁止
- `no-shadow`: 外側の変数と同名の宣言を禁止
- `no-throw-literal`: リテラルの `throw` を禁止
- `no-undef-init`: `undefined` 初期化を禁止
- `no-unneeded-ternary`: 不要な三項演算子を禁止
- `no-unused-expressions`: 副作用のない式を禁止（短絡評価/三項/タグ付きテンプレートも不可）
- `no-unused-vars`: 未使用の変数を禁止（未使用引数は後方のみ許容、残余は無視）
- `no-use-before-define`: 定義前の使用を禁止（関数は許容、クラス/変数は不可）
- `no-useless-call`: 不要な `call/apply` を禁止
- `no-useless-return`: 不要な `return` を禁止
- `no-var`: `var` を禁止
- `object-shorthand: ["error", "always"]`: オブジェクト省略記法を強制
- `prefer-const`: 再代入のない変数は `const`
- `prefer-template`: 文字列結合よりテンプレート文字列を推奨
- `max-params: ["error", 4]`: 関数の引数は4つまで（5つ以上はエラー）
- `max-len: ["error", { code: 120 }]`: 1行120文字超をエラー
- `single-return`: return は1か所のみ（複数returnをエラー）
- `radix: ["error", "always"]`: `parseInt` の基数指定を必須化
- `yoda`: ヨーダ条件を禁止

## Stylelint（`.stylelintrc.cjs`）
### 基本設定
- `extends: ["stylelint-config-standard"]`: 標準ルールセット
- `plugins: ["stylelint-order"]`

### 明示的なルール
- `declaration-no-important`: `!important` を禁止
- `max-nesting-depth: 0`: ネストを禁止
- `number-max-precision: 3`: 数値の小数点以下 3 桁まで
- `order/properties-alphabetical-order`: プロパティをアルファベット順に並べる
- `selector-max-compound-selectors: 4`: 複合セレクタの上限 4
- `selector-max-id: 0`: `#id` セレクタを禁止

## HTMLHint（`.htmlhintrc`）
- `tagname-lowercase`: タグ名は小文字
- `attr-lowercase`: 属性名は小文字
- `attr-value-double-quotes`: 属性値はダブルクォート
- `attr-no-duplication`: 属性の重複を禁止
- `doctype-first`: `<!doctype>` は先頭に配置
- `doctype-html5`: HTML5 の doctype を強制
- `tag-pair`: 開閉タグの対応を必須化
- `tag-self-close`: 空要素は自己閉じタグを要求
- `id-unique`: `id` の重複を禁止
- `spec-char-escape`: 特殊文字のエスケープを必須化
- `src-not-empty`: `src` 属性の空値を禁止
- `title-require`: `title` 要素を必須化
- `alt-require`: `img` の `alt` を必須化
- `space-tab-mixed-disabled: "space"`: インデントはスペース、タブ混在禁止
- `inline-style-disabled`: インライン `style` 属性を禁止
- `inline-script-disabled`: インライン `script` を禁止
- `style-disabled`: `style` タグを禁止
- `head-script-disabled`: `head` 内の `script` を禁止

## TypeScript（`tsconfig.json`）
### 対象/出力
- `allowJs: true` / `checkJs: true`: JS も型チェック対象
- `noEmit: true`: 出力ファイルを生成しない
- `include`: `*.js`, `types/**/*.d.ts` のみ対象

### 互換性/環境
- `target: "ES2020"`
- `module: "commonjs"`
- `moduleResolution: "node"`
- `lib: ["ES2020", "DOM"]`
- `types: ["node"]`
- `skipLibCheck: true`: ライブラリ型定義のチェックを省略

### 厳格チェック
- `strict: true`（厳格モード一式）
- `noImplicitAny`: 暗黙の `any` を禁止
- `noImplicitThis`: `this` の暗黙 `any` を禁止
- `alwaysStrict`: 常に strict モード
- `strictNullChecks`: `null/undefined` を厳密化
- `strictFunctionTypes`: 関数型の反変/共変を厳密化
- `strictBindCallApply`: `bind/call/apply` の型チェック
- `strictPropertyInitialization`: プロパティ初期化を必須化
- `useUnknownInCatchVariables`: `catch` 変数を `unknown`
- `exactOptionalPropertyTypes`: `?` の意味を厳密化
- `noUncheckedIndexedAccess`: インデックスアクセスを `undefined` 考慮
- `noPropertyAccessFromIndexSignature`: インデックス署名を `.` で参照禁止
- `noUnusedLocals`: 未使用ローカルを禁止
- `noUnusedParameters`: 未使用引数を禁止
- `noImplicitReturns`: すべての分岐で `return` を強制
- `noFallthroughCasesInSwitch`: `switch` のフォールスルーを禁止

## JSDoc コメント運用
- 目的文を先頭に1行で書き、日本語で「。」で終える
- `@param` / `@returns` は目的文の後に記述し、各タグの横に日本語で用途を追記する
- ESLint に `eslint-plugin-jsdoc` を導入し、`FunctionDeclaration` と名前付き `FunctionExpression` に JSDoc を必須化
- ESLint で目的文と `@param` / `@returns` の説明文を必須化
- 例:
  ```js
  /**
   * 配列からランダムに1件選ぶ。
   * @param {string[]} list 候補配列。
   * @returns {string} 選択された要素。
   */
  ```
