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
