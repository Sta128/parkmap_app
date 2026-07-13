# ParkMap

場所を検索し、指定範囲内の駐車場を車両条件で絞り込み、距離順・料金順で表示するWebアプリです。

## データの責務

- **Supabase**: 共有してよい駐車場情報と料金検索RPC
- **Dexie.js / IndexedDB**: 各端末だけで保持する車両情報と選択中の車両
- **Node / Express**: SupabaseへのAPI境界。ブラウザへSupabaseキーやDB処理を散在させない
- **React / TypeScript**: 地図、検索、絞り込み、車両設定UI

車両情報を扱う `/cars` API と Supabase の `cars` テーブルへのアクセスは削除しました。

## 主な構成

```text
parkmap_app/
├─ frontend/
│  └─ src/
│     ├─ features/
│     │  ├─ parkings/api/parkingApi.ts
│     │  └─ vehicles/
│     │     ├─ components/VehicleSettings.tsx
│     │     └─ hooks/useVehicles.ts
│     ├─ lib/
│     │  ├─ api/http.ts
│     │  └─ db/vehicleDb.ts
│     ├─ hooks/
│     ├─ components/
│     ├─ maps/
│     └─ types/
├─ backend/
│  ├─ lib/supabase.js
│  ├─ routes/parkings.js
│  └─ server.js
└─ docker-compose.yml
```

## セットアップ

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

各 `.env` にGoogle MapsとSupabaseの値を設定し、次のいずれかで起動します。

```bash
docker compose up --build
```

または:

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

## 環境変数

Frontend:

- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_API_BASE_URL`

Backend:

- `PORT`
- `CORS_ORIGIN`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## 車両フィルター

選択車両はIndexedDBに保存されます。駐車場レスポンスに以下の列が存在する場合、フロント側でも適合判定します。

- `max_height`
- `max_width`
- `max_length`
- `min_ground_clearance`

料金検索時は選択車両の全高・車幅・全長・最低地上高を `search_parkings` RPCへ渡します。車両データ自体は送信せず、検索条件となる数値だけを一時的にAPIへ渡します。

## Supabase SQL

1. Supabase SQL Editorで `supabase/parking_schema.sql` を実行します。
2. 続けて `supabase/seed.sql` を実行します。

`parking_schema.sql` は開発用の全再作成SQLで、既存の対象テーブルを削除します。本番データがある場合は、実行前にバックアップし、必要なALTER文へ分割してください。料金は日本時間で計算されます。`parking_rates.start_time = end_time` は24時間料金、`start_time > end_time` は日付をまたぐ料金帯を表します。

## 確認済み

- `npm run lint`
- `npm run build`
- Node.js構文チェック

## 最大料金テーブルの統合マイグレーション
既存のv6データベースを維持する場合は、Supabase SQL Editorで
`supabase/max_fee_unification_migration.sql`を実行してください。
`parking_max_fee_rules`と`parking_daily_max_fees`は`parking_max_fees`へ統合され、
表示専用の`name/text`列は廃止されます。

## v6 UI updates

- Search radius is selected from a compact dial-style slider (0.5–200 km).
- Google Places Autocomplete is initialized only once and stale suggestion overlays are removed on cleanup, preventing duplicated/darkened suggestion lists.

## PGRST200 after the maximum-fee migration

If Supabase reports that it cannot find the relationship between `parking` and
`parking_max_fees`, run `supabase/fix_max_fee_relationship.sql` once. The backend
also fetches these tables separately, so it no longer depends on PostgREST's
embedded relationship cache for the parking list.

## v9: 料金検索日時ダイヤル

料金順検索の開始・終了日時は、日付と時刻のスライダーダイヤルで指定します。選択範囲はアプリを開いた現在時刻から3年後まで、時刻は15分刻みです。開始日時より前の終了日時は選択できず、開始日時を終了日時以降へ動かした場合は終了日時が自動的に1時間後へ補正されます。

## PWAとしてインストール

フロントエンドはPWA対応済みです。`docker compose up --build`で起動後、対応ブラウザでは、アドレスバーのインストールアイコン、またはブラウザメニューの「アプリをインストール」から追加できます。アプリ画面内には専用のインストールボタンを表示しません。

- PCの`localhost`はインストール可能です。
- スマートフォンなど別端末からアクセスする場合、Service Workerの要件によりHTTPSで公開してください。LAN内の単純な`http://PCのIP:5173`ではインストールできないブラウザがあります。
- オフライン時は画面シェルを表示できますが、Google MapsとSupabaseの検索には通信が必要です。
