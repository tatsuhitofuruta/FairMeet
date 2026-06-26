# Google Maps API 連携 v2 検討メモ

作成日: 2026-06-11

## 結論

MVP では Google Maps Platform API を導入しない。現行の `https://www.google.com/maps/search/?api=1&query={lat},{lng}` リンクを拡張し、API キー不要・静的ホスティング可能・外部 API 不要という制約を守る。

v2 の最小方針は、候補駅カードに「地図」「飲食店」「カフェ」「居酒屋」の Maps URLs リンクを出すこととする。アプリ内に店舗一覧や地図を埋め込む必要が出た場合だけ、Google Maps Platform API を再検討する。

## 現行 MVP の制約

- 要件 `N-1`: フロントエンドのみで完結し、静的ホスティング可能。サーバ・外部 API は不要。
- 要件 `F-8`: 候補駅から Google マップへのリンクを提供する。
- 対象外: 店舗・スポット検索、時刻表・リアルタイム経路検索、運賃計算、ユーザー登録・履歴保存。
- 既存実装: `ResultCard` が駅の緯度経度から Google マップ検索 URL を生成している。API キーは使っていない。

## API 候補の切り分け

| 候補 | v2 での判断 | 用途 | 理由 |
| --- | --- | --- | --- |
| Maps URLs | 採用 | Google マップを別タブで開く。カテゴリ検索も Maps 側に委ねる | API キーが不要で、MVP の静的構成と一致する。 |
| Maps JavaScript API | 保留 | アプリ内に地図を表示する | 地図表示だけなら有効だが、候補駅一覧の主要価値には不要。導入すると課金・キー制限・利用規約対応が必要になる。 |
| Places API (New) / Places Library | v2 の第一候補 | 候補駅周辺の飲食店、カフェ、スポットを検索する | issue #2 の背景に最も近い。Nearby Search または Text Search を、ユーザー操作時だけ実行する。 |
| Places UI Kit | 保留 | Google 提供 UI で場所情報を表示する | 早い検証には向くが、UI の自由度と既存 UI との整合性を確認してから使う。 |
| Geocoding API | 不採用 | 住所から緯度経度を取得する | FairMeet は駅データに緯度経度を持っているため不要。 |
| Routes API | 今回は不採用 | 徒歩時間や経路行列を計算する | 終電判定や徒歩込みの到着判定は別 issue の領域。店舗選定後の徒歩時間表示が必要になった場合だけ再検討する。 |
| Directions API (Legacy) / Distance Matrix API (Legacy) | 不採用 | 旧 API で経路・距離を計算する | Google は Routes API への移行導線を出しているため、新規設計では Legacy API を選ばない。 |
| Map Tiles API | 不採用 | 独自地図タイルを描画する | FairMeet の用途に対して過剰で、キャッシュ制約も強い。 |

## 導入方針

### Phase 0: 無料リンク拡張

- Google Maps Platform API は使わない。
- API キー、環境変数、課金設定、サーバレス関数は追加しない。
- 候補駅カードから Google マップを開くリンクに加えて、`飲食店 near {駅名}駅 {都道府県}` のように場所名を含めたカテゴリ検索リンクを追加する。Google Maps URLs のカテゴリ検索では、`near {lat},{lng}` のような座標文字列が場所指定として安定解釈されず、広域検索に落ちる場合があるため避ける。

### Phase 1: API 導入が必要になった場合の最小検証

- 候補駅カードに「周辺を見る」のような明示操作を追加する。
- クリックされた候補駅だけを対象に Places API を呼び出す。
- 初期フィールドは `places.id`, `places.displayName`, `places.googleMapsUri`, `places.location`, `places.primaryType` 程度に限定する。
- レビュー、評価、営業時間、写真、価格帯などは追加価値と課金 SKU が大きくなるため、最初は取得しない。
- 取得結果は画面表示用の一時状態に留める。リポジトリ、`localStorage`、静的 JSON、ビルド成果物には保存しない。

### Phase 2: 必要になった場合の中継層

次の条件のどれかを満たす場合は、静的ホスティング単独ではなくサーバレス関数の導入を検討する。

- API キーをブラウザに出したくない。
- 日次・ユーザー単位の独自レート制限を実装したい。
- Places API のリクエスト条件をサーバ側で固定したい。
- ログ、監視、異常検知、予算超過対策をアプリ側でも制御したい。

中継層を入れる場合も、Google 由来の Places コンテンツは永続キャッシュしない。保存する必要がある場合は、キャッシュ制約の例外である Place ID を中心に扱い、表示時に詳細を再取得する。

## API キー管理

- 公開リポジトリに API キーや秘密情報をコミットしない。
- ブラウザ用キーは `VITE_GOOGLE_MAPS_BROWSER_KEY` のような環境変数名だけをドキュメント化し、実値はデプロイ先の環境変数で管理する。
- Vite の `VITE_` 変数はビルド後の JavaScript に埋め込まれるため、ブラウザ用キーは秘密情報として扱えない。必ず HTTP referrer 制限と API 制限を設定する。
- Google の推奨に従い、キーは用途別に分ける。ブラウザ用キーとサーバ側 Web Service 用キーを共有しない。
- ブラウザ用キーには Web サイト制限を設定し、本番ドメイン、必要ならプレビュー用ドメインだけを許可する。
- API 制限では、実際に使う API だけを許可する。Maps JavaScript API を使うキーには Maps JavaScript API を含め、Places を使う場合は必要な Places API だけを追加する。
- Cloud Billing の予算アラート、SKU ごとのクォータ、使用量監視を必ず設定する。
- `.env`, `.env.local`, `.env.*.local` はコミットしない。`.env.example` を追加する場合も実値は入れない。

## 料金とリスク

Google Maps Platform は SKU ごとの従量課金で、無料枠、単価、請求条件は変更される可能性がある。料金は SKU、取得フィールド、リクエスト数、リージョン、契約条件で変わるため、実装前に必ず最新の公式価格表で再確認する。

## キャッシュとデータ保存

- Places API のコンテンツは、許可された例外を除いて事前取得、キャッシュ、保存をしない。
- Place ID はキャッシュ制約の例外として保存できるが、店名・住所・評価・写真・営業時間などの表示データは永続保存しない。
- Places API を使うアプリでは、Google の規約とプライバシーポリシーを組み込んだ公開 Terms of Use と Privacy Policy を用意する。
- Places API の結果を地図上に表示する場合は Google マップ上に表示し、必要な Google ロゴ、第三者データ提供元、attribution を表示する。
- Google マップなしで Places データを表示する場合も、Google ロゴと必要な attribution を表示する。
- FairMeet の静的 `graph.json` に Google 由来の店舗・スポット情報を混ぜない。

## 今回の issue #2 では実装しないこと

- 終電判定は実装しない。Routes API や交通 API が必要になる可能性はメモに留める。
- 駅の栄え度 tier は実装しない。Places の件数やカテゴリ分布が材料になる可能性はあるが、別 issue で扱う。
- アプリ内の店舗検索 UI、地図埋め込み、API キー設定、サーバレス関数は追加しない。
- 依存パッケージは追加しない。

## 参考にした公式情報

- [Google Maps Platform pricing overview](https://developers.google.com/maps/billing-and-pricing/overview)
- [Google Maps Platform core services pricing list](https://developers.google.com/maps/billing-and-pricing/pricing)
- [Google Maps Platform security guidance](https://developers.google.com/maps/api-security-best-practices)
- [Maps JavaScript API overview](https://developers.google.com/maps/documentation/javascript/overview)
- [Places API policies and attributions](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Nearby Search (New)](https://developers.google.com/maps/documentation/places/web-service/nearby-search)
- [Routes API overview](https://developers.google.com/maps/documentation/routes)
- [Routes API usage and billing](https://developers.google.com/maps/documentation/routes/usage-and-billing)
- [Migrate from Directions API (Legacy) or Distance Matrix API (Legacy)](https://developers.google.com/maps/documentation/routes/migrate-routes)
