# FairMeet

みんなの最寄駅から、ちょうどいい集合駅を見つけるWebアプリ。

2〜10人の最寄駅を入力すると、鉄道網グラフ上の所要時間を全駅について推定し、「誰か一人だけが極端に遠い」を避けた集合駅の上位5候補を提示する。サーバ不要・ブラウザ内で完結する。

## 使い方

```bash
npm install
npm run build:data   # 駅データを取得して public/data/graph.json を生成（初回のみ）
npm run dev          # 開発サーバ起動
```

| コマンド | 内容 |
|---------|------|
| `npm run build:data` | station_database から駅・路線データを取得し、鉄道グラフJSONを生成 |
| `npm run dev` | Vite開発サーバ |
| `npm run build` | 型検査 + 本番ビルド（`dist/`） |
| `npm run preview` | ビルド成果物のプレビュー |
| `npm run test` | Vitest（graph.json生成後は実データの統合スモーク含む） |

## 仕組み

- 駅を「ハブ + (駅,路線)スポーク」に分割したグラフを構築。乗車エッジは駅間距離と表定速度モデルから、乗換はハブ⇔スポーク2.5分、近接駅間は徒歩連絡エッジで表現
- メンバーごとにDijkstraで全駅への所要時間を計算し、モード別スコア（公平重視 = 最大所要時間の最小化など）で順位付け
- 所要時間はダイヤを考慮しない概算。詳細は [docs/DESIGN.md](docs/DESIGN.md) と [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)

## 探索モード

| モード | 最適化対象 |
|--------|-----------|
| 公平重視（既定） | 一番遠い人の所要時間を最小化 |
| バランス | 平均と格差（最大−最小）の折衷 |
| 合計重視 | 全員の合計所要時間を最小化 |

## データ出典とライセンス

駅・路線データ: [Seo-4d696b75/station_database](https://github.com/Seo-4d696b75/station_database)（[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.ja)）

生成物 `public/data/graph.json` は上記データの改変物であり、同じく CC BY-SA 4.0 で提供される。位置情報・名称等の正確性は保証されない。
