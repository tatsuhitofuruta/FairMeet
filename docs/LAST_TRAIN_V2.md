# v2 終電判定メモ

Issue: <https://github.com/tatsuhitofuruta/FairMeet/issues/1>

本メモは、現行 MVP の「静的サイト・外部 API なし・時刻表なし」という前提を壊さずに、終電判定を実装可能な単位へ分解するための決定事項をまとめる。

## 1. この issue で決めること

### 入力項目と UI 方針

- 終電判定は既定で OFF にする。ON にした場合だけ追加条件として扱う。
- 入力は「解散予定日時」とする。集合時刻ではなく、候補駅から各メンバーの最寄駅へ帰り始める時刻を直接入力させる。
- UI はメンバー入力と探索モードの間に、折りたたみ可能な「終電を考慮する」セクションを追加する。
- セクション内には以下を置く。
  - チェックボックス: 終電を考慮する
  - 日付入力: `input type="date"`
  - 時刻入力: `input type="time"`
- 日付は必須にする。平日・土曜・休日・年末年始の判定には運行日が必要なため、時刻だけの入力にはしない。
- 終電データが未搭載、または対象外エリアの場合は、候補を落とさず「終電判定は未対応です」と表示する。

### スコアリング上の扱い

終電判定はスコア式へ混ぜず、検索結果のフィルタとして扱う。

1. 現行の Dijkstra とスコアリングで候補駅を順位付けする。
2. 終電判定が OFF の場合は、現行どおり上位5件を表示する。
3. 終電判定が ON で、全メンバーについて帰宅可否を判定できる候補では、1人でも帰宅不可なら候補から除外する。
4. 終電判定が ON で、データ不足により判定不能な候補では、候補を除外せず、カード上に「終電判定不可」を警告として表示する。
5. 除外後に候補が5件未満になった場合は、候補走査を続けて最大5件まで補充する。

帰宅不可は安全上の強い制約なので、単なる減点にはしない。一方で、データ不足を帰宅不可と同一扱いにすると、対象外エリアの候補が過剰に消えるため、v2 の最初の実装では警告に留める。

## 2. データソース候補

| 候補 | 静的サイトとの相性 | 制約 | 判定 |
|------|------------------|------|------|
| GTFS / GTFS-JP の静的フィード | ビルド時に取り込んで JSON 化できるため相性が良い | 事業者ごとに公開範囲、更新頻度、ライセンス、駅ID体系が異なる。全国鉄道を一括で安定取得できるとは限らない | 最初に検証する |
| 公共交通オープンデータセンター / ODPT | 鉄道時刻表データの候補になる | ユーザ登録、利用条件、データごとの権利確認が必要。チャレンジ限定データは本番同梱に向かない可能性がある | 調査継続 |
| 駅すぱあと API | 終電探索の概念が API に存在する | APIキーや外部API呼び出しが必要になり、現行 N-1 と今回の「APIキーなし」に反する | この issue では採用しない |

参照した公開情報:

- GTFS Schedule は静的な公共交通情報を複数のテキストファイルで表す形式で、`stops.txt`、`trips.txt`、`stop_times.txt`、`calendar.txt` などを含む。<https://gtfs.org/documentation/overview/>
- GTFS の `stop_times` は、サービス日の翌日未明を `24:00:00` 超の時刻で表現できる。終電判定ではこの仕様を使える。<https://gtfs.org/documentation/schedule/reference/>
- 国土交通省は、GTFS-JP を国内向けのローカライズ仕様として普及させている。<https://www.mlit.go.jp/sogoseisaku/transport/sosei_transport_tk_000067.html>
- ODPT は公共交通データ利用にユーザ登録と利用条件遵守を求めている。<https://www.odpt.org/>
- 駅すぱあと API には `lastTrain` という探索種別がある。<https://docs.ekispert.com/v1/le/dictionary/search-type/>

## 3. 静的サイトでの最小実装案

終電判定の本体は、実行時 API ではなくビルド時前処理で作る。

### 追加生成物

`public/data/last-train.json`

```jsonc
{
  "version": 1,
  "generatedAt": "2026-06-11T00:00:00.000Z",
  "source": "GTFS/GTFS-JP feeds",
  "coverage": {
    "stationCount": 0,
    "operatorCount": 0,
    "licenseNote": "feedごとのライセンスを列挙する"
  },
  "stationMap": {
    "station_database_index": ["gtfs_stop_id"]
  },
  "serviceCalendars": {},
  "lastDepartures": {}
}
```

### 判定ロジック

- 入力された解散予定日時を、対象 feed の service day と分単位時刻へ変換する。
- 候補駅から各メンバー最寄駅へ帰る方向で、GTFS の `stop_times` と `calendar` / `calendar_dates` を使って、解散時刻以降に到着可能な便があるかを判定する。
- v2 の最初の段階では、既存の概算経路と GTFS の経路探索を完全に統合しない。まずは「同一 GTFS feed 内で、候補駅 stop から自宅駅 stop へ時刻表上たどれるか」を判定する。
- `station_database` と GTFS stop の対応付けは、駅名正規化、都道府県、緯度経度距離でビルド時に推定し、曖昧な対応は `unknown` として残す。

## 4. 実装ステップ

1. `LastTrainOptions` 型を追加し、終電判定の ON/OFF、日付、時刻を UI 状態として持てるようにする。
2. UI に「終電を考慮する」セクションを追加する。この段階では判定データがなければ警告だけを出す。
3. GTFS の小さな fixture を `tests/fixtures/gtfs/` に置き、`stop_times` の `24:00:00` 超、平日・休日、`calendar_dates` 例外をテストする。
4. `scripts/build-last-train.mjs` を追加し、fixture から `last-train.json` を生成できるようにする。
5. 実データ feed を1つ選び、ライセンス、更新頻度、再配布可否を確認した上で、対象エリアを限定して取り込む。
6. 判定結果を `MeetingCandidate` に `lastTrainStatus` として付与し、帰宅不可候補を除外する。

## 5. 今回は実装しないこと

- Google Maps API による経路・終電検索は行わない。
- 駅の栄え度 tier は扱わない。
- APIキー、秘密情報、有料APIは使わない。
- 全国すべての鉄道事業者の時刻表同梱を前提にしない。
- 終電データがない候補を、帰宅不可として断定しない。
