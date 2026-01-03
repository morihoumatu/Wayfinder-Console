# ライブマップコンソール 仕様まとめ

## 概要
Google Maps を使ったライブマップアプリ。地図上で出発地と目的地を選択して徒歩/在来線の所要時間を表示し、OpenAI + Web検索でおすすめ地点または散歩ルート（複数地点）を提案する。

## 構成と技術
- フロントエンド: 素の JavaScript + Google Maps JavaScript API（`index.html` + `styles.css` + `app/*.js`）。
- バックエンド: Node.js HTTP サーバー（`server/index.js`）で静的ファイル配信と `/api/recommend` を提供。
- OpenAI: Responses API を使用し、必要に応じて Web 検索ツールを呼び出す。

## UI/操作フロー
- 地図クリック 1回目: 出発地(A)を設定。
- 地図クリック 2回目: 目的地(B)を設定し、徒歩/在来線ルートを計算。
- 地図クリック 3回目: ルートをリセットして再選択。
- 地域選択: 地方/都道府県から選択。出発地が未設定の場合のみ有効。
- 「地域の駅から開始」: 選択地域の駅を検索して出発地に設定。
- おすすめ検索:
  - 入力あり: 目的地スポットの提案。
  - 入力なし: 目標時間に合わせた散歩ルート（複数地点）を提案。
- 所要時間の上限（分）: 徒歩/在来線の上限判定に使用。
- ルート内訳: 徒歩→在来線→徒歩の順で区間リンクを表示。

## フロントエンド構成
`index.html` で以下スクリプトを順に読み込み（グローバル依存があるため順序が重要）:
- `app.js`: 定数とグローバル状態（`MAPS_API_KEY`, 出発地/目的地、選択状態など）。
- `app/ui/status.js`: 状態表示、ヒント、リンク更新。
- `app/region/*`: 地域選択、地域判定、駅検索。
- `app/recommend/*`: おすすめ検索 UI/フロー、ジオコード。
- `app/maps/*`: Google Maps 初期化、散歩ルート補助。
- `app/route/*`: ルート計算、在来線除外、内訳生成。

## ルート計算仕様
- Google Directions API で徒歩/WALKING と在来線/TRANSIT を常に計算。
- 在来線は `TRAIN/SUBWAY/TRAM/RAIL` のみ許可。
- 新幹線など高速鉄道を含む経路は除外（`HIGH_SPEED_TRAIN` 判定）。
- `getRouteDurationFromLegs` で複数レッグの所要時間を合算。
- 上限超過時:
  - 両方超過 → エラーメッセージ、推薦経由なら目的地クリア。
  - 両方以内 → 「上限内」メッセージ。

## 散歩ルート（walk_multi）仕様
- 条件: おすすめ検索のクエリが空。
- OpenAI から得た `stops` を最大6件までジオコード。
- 2点未満ならエラー「散歩ルートの地点が見つけられませんでした」。
- 出発地が未設定の場合:
  - 最初の地点付近の最寄り駅を優先して出発地に設定。
  - 駅が見つからない場合は最初の地点を出発地にする。
- 出発地が開始地点から一定距離以上離れている場合、開始地点付近の最寄り駅へ自動で再設定。
- 目的地は最終地点、経由地は中間地点。
- 在来線の経由地指定は `walk_multi` の場合のみ無効（Directions API 制約回避）。
- 目標時間の調整:
  - 許容差: 目標時間の±0.8分。
  - 目標未達時は最大4回再検索（長め/短め指定）。
  - `walk_multi` でもルート確定後に表示範囲を自動調整。

## 地域/駅選択仕様
- 地方/都道府県の排他選択。
- `REGION_GROUPS` に都道府県リストとアンカー都市を定義。
  - 関東は毎回ランダムな都道府県をアンカーとして選ぶ。
- 駅検索:
  - 地域名 + 駅関連語（駅/JR駅/主要駅/中心駅/代表駅）を用いて候補生成。
  - 地域フィルタに一致する候補を優先。
  - 最寄り駅検索は地名候補（逆ジオコード）と停止名からクエリを生成。

## ルート内訳表示
- 在来線が選択された場合:
  - 「徒歩ルート → 出発駅〜到着駅 → 徒歩ルート」を表示。
- 徒歩のみの場合:
  - 徒歩区間1つのみ表示。
- 各区間に以下リンクを出力:
  - Google Maps 経路リンク
  - Google Maps 検索リンク（区間ラベル優先）

## API 仕様
### POST `/api/recommend`
用途: おすすめ地点または散歩ルートの提案取得。

リクエスト（例）:
```json
{
  "query": "景色の良いカフェ",
  "mode": "spot",
  "origin": { "lat": 35.681236, "lng": 139.767125 },
  "originLabel": "東京駅",
  "originRegion": "東京都",
  "originAreaLabel": "関東地方",
  "originPrefectures": ["東京都", "神奈川県"],
  "maxMinutes": 60,
  "targetMinutes": 60,
  "adjustment": "longer",
  "actualMinutes": 55
}
```

レスポンス（スポット）:
```json
{
  "place": {
    "name": "場所名",
    "address": "住所",
    "reason": "理由",
    "sources": [{ "title": "参照", "url": "https://..." }]
  }
}
```

レスポンス（散歩ルート）:
```json
{
  "place": {
    "route_type": "walk_multi",
    "name": "おすすめ散歩ルート",
    "area": "対象地域",
    "reason": "理由",
    "target_minutes": 60,
    "stops": [{ "name": "地点名", "address": "住所" }],
    "sources": [{ "title": "参照", "url": "https://..." }]
  }
}
```

エラー: `4xx/500` で `{ "error": "..." }` を返す。

## OpenAI 連携仕様
- モデル: `OPENAI_MODEL`（既定 `gpt-4o-mini`）。
- ツール: `OPENAI_WEB_SEARCH_TOOL` が設定されていれば `web_search` を利用。
- システムプロンプト:
  - 散歩ルート: JSONのみ出力、徒歩中心、必要なら在来線、地域優先、目標時間調整。
  - スポット: JSONのみ出力、徒歩/在来線で到達可能範囲。
- JSON解析は `output_text`/`output[].content` を抽出して解析。

## 設定
- Google Maps APIキー: `app.js` の `MAPS_API_KEY` を設定。
- サーバ環境変数:
  - `PORT` (既定 3000)
  - `OPENAI_API_KEY`
  - `OPENAI_API_URL` (既定 `https://api.openai.com/v1/responses`)
  - `OPENAI_MODEL` (既定 `gpt-4o-mini`)
  - `OPENAI_WEB_SEARCH_TOOL` (既定 `web_search`, `off` で無効)

## 代表的な制約
- 散歩ルート立ち寄り上限: 6件までジオコード。
- 駅検索クエリ上限: 12件。
- 散歩ルート再検索回数: 最大4回。
- 時間許容差: 目標時間の±0.8分。
