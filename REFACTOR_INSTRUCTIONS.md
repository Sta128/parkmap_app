# Maps.tsx 統合・分割リファクタリング指示書

## 背景

`feature/search-and-sort` ブランチの旧 `frontend/src/Maps.tsx`（フラットなファイル構成時代に書いたもの）には、検索・ソート・ルート表示機能がすべて1ファイルに実装されている。

master側のファイル構成は既に整理されており、`frontend/src/maps/Map.tsx` が地図ページの本体、`frontend/src/components/` 配下に機能別コンポーネント、`frontend/src/types/types.ts` に型定義をまとめる方針になっている。

**やりたいこと**: 旧 `Maps.tsx` にある機能を壊さずに、master側のファイル構成・命名規則に沿って複数ファイルに分割し、`frontend/src/maps/Map.tsx` と `frontend/src/components/` 配下に再配置する。

## 現在の作業ブランチ

`feature/search-and-sort`（masterの構成をベースにした新しい統合用ブランチを切ってから作業すること。下記「作業前の準備」を参照）

## 作業前の準備

1. `upstream/master` を最新化してから、そこを起点に新しいブランチを作る:
   ```bash
   git fetch upstream
   git checkout upstream/master -b feature/search-and-sort-restructured
   ```
2. 旧実装を参照用に取り出す（削除しないこと、リファクタ中の参照用）:
   ```bash
   git show feature/search-and-sort:frontend/src/Maps.tsx > /tmp/old_Maps.tsx
   ```
3. 以降の作業はすべて `feature/search-and-sort-restructured` ブランチ上で行う。

## 移植元ファイル（参照用、これを分割する）

`/tmp/old_Maps.tsx` （266行、機能：リアルタイム現在地取得、駐車場データ取得、エリア検索、距離計算・ソート、名前/住所フィルタ、料金順ソート、ルート表示、InfoWindow）

## 移植先の現状ファイル（これをベースに統合する）

- `frontend/src/maps/Map.tsx` — 現状はシンプルな地図表示のみ。`CarSetting` を呼び出し、`types/types.ts` から型をimportするパターンが既に確立されている。**このファイルの既存の書き方・スタイルを踏襲すること。**
- `frontend/src/types/types.ts` — `Position`, `Parking` 型が既に定義済み。
- `frontend/src/components/CarSetting.tsx` — 既存コンポーネントの参考例（このファイルのコードスタイル・importパターンを他の新規コンポーネントでも踏襲する）。
- `frontend/src/components/ParkingInfoWindow.tsx` — 駐車場詳細のInfoWindow。既存実装があるなら中身を確認し、ルート表示ボタンを追加する形で拡張する。新規作成ではなく既存ファイルの拡張を優先。

## 分割方針（ファイルごとの責務）

### 1. `frontend/src/types/types.ts`（既存ファイルに追記）
旧Maps.tsxの型を統合する:
```ts
export type ParkingWithDistance = Parking & {
  distanceText?: string
  distanceValue?: number
  durationText?: string
}
```
既存の `Position`, `Parking` 型と重複・矛盾がないか確認し、なければそのまま使う。

### 2. `frontend/src/components/SearchBar.tsx`（新規）
旧 `AutocompleteInput` コンポーネントを移植。
- Google Places Autocompleteを使ったエリア検索の入力欄
- 名前・住所によるローカルフィルタ用のテキスト入力（`filterText`）も同じファイル内、または検索バーの一部としてここに含める
- props: `onPlaceSelect: (position: Position) => void`, `filterText: string`, `onFilterChange: (text: string) => void` など、親（Map.tsx）から状態を受け取る形にする（状態自体はMap.tsx側で持つ）

### 3. `frontend/src/components/DirectionsLayer.tsx`（新規）
旧 `DirectionsLayer` コンポーネントをそのまま移植。Google Maps DirectionsRenderer/DirectionsServiceを使うロジック。`@vis.gl/react-google-maps` の `useMap` フックを使用。

### 4. `frontend/src/components/MapController.tsx`（新規）
旧 `MapController` コンポーネントをそのまま移植。`center`が変わったらpanTo・setZoomする小さいコンポーネント。

### 5. `frontend/src/components/ParkingList.tsx`（新規）
旧実装の「右サイドバーの駐車場リスト＋ソート切替ボタン＋件数表示」部分を切り出す。
- props: `parkings: ParkingWithDistance[]`, `selected: ParkingWithDistance | null`, `onSelect: (p: ParkingWithDistance) => void`, `sortMode: 'distance' | 'price'`, `onSortModeChange: (mode: 'distance' | 'price') => void`, `loading: boolean`
- 表示ロジック（フィルタ・ソート後の `displayedParkings` の算出）は呼び出し側（Map.tsx かカスタムフック）から渡される配列をそのまま描画するだけにし、このコンポーネント自体はソート/フィルタの計算をしない（関心の分離）

### 6. `frontend/src/components/ParkingInfoWindow.tsx`（既存ファイルを拡張）
既存実装を確認した上で、旧Maps.tsxのInfoWindow内にある「ルートを表示」ボタンと距離・所要時間の表示を追加する。既存のprops設計を尊重しつつ、必要なら `onRouteRequest: (pos: Position) => void` のようなpropsを追加する。

### 7. `frontend/src/hooks/useParkingSearch.ts`（新規、カスタムフック）
ロジックをUIから分離する。旧Maps.tsxの以下のuseEffect群をこのフックにまとめる:
- リアルタイム現在地取得（`watchPosition`）
- 駐車場データ取得（`fetch('http://localhost:3000/parkings')`）
- Distance Matrix APIによる距離計算・ソート（`SEARCH_RADIUS_M` による絞り込み含む）
- フィルタ・ソート後の `displayedParkings` の算出（`useMemo`）

返り値の例:
```ts
return {
  userPos,
  displayedParkings,
  selected,
  setSelected,
  routeTarget,
  setRouteTarget,
  distanceLoading,
  filterText,
  setFilterText,
  sortMode,
  setSortMode,
  searchCenter,
  handlePlaceSelect,
  apiLoaded,
  setApiLoaded,
}
```
（実際の設計はMap.tsxの使い勝手に合わせて調整して良い）

### 8. `frontend/src/maps/Map.tsx`（既存ファイルを書き換え）
上記で分割した各コンポーネント・フックを組み合わせる「司令塔」にする。現状の `CarSetting` 呼び出しはそのまま残し、地図本体・マーカー・各コンポーネントの配置を行う。レイアウトは旧実装の「地図70% + 右サイドバー30%」を踏襲する。

## 重要な注意点

- **動作を変えない**: リファクタリングが目的であり、機能追加・仕様変更はしない。旧Maps.tsxの挙動（検索半径200000m、距離100m未満は再計算スキップ、3km以内絞り込みなど）はそのまま維持する。
- **APIキーの扱い**: 旧Maps.tsxは `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` を使っているが、現在のMap.tsxはAPIキーがハードコードされている（`AIzaSyB3m9bG6xDdW5Jcs72jpX5eIrdTerSJZ7A`）。**これは絶対に維持・コミットしないこと。** 統合時は必ず `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` を使う形に統一し、ハードコードされたキーは削除する。`.env` に `VITE_GOOGLE_MAPS_API_KEY` が設定されているか確認し、なければその旨を作業者に報告する。
- **既存コンポーネントのスタイルを踏襲**: `CarSetting.tsx` の書き方（importの順番、型の付け方、インラインスタイルの書き方など）を新規コンポーネントでも一貫して使う。
- **段階的に進める**: 一度に全部書き換えず、1ファイルずつ作成・動作確認しながら進める。型定義 → 小さいコンポーネント（MapController, DirectionsLayer）→ SearchBar → ParkingList → ParkingInfoWindow拡張 → useParkingSearchフック → 最後にMap.tsx統合、の順番を推奨。
- **既存のParkingInfoWindow.tsxとCarSetting.tsxは必ず先に中身を読むこと**（`view` コマンド等で）。それを見ずに新規ファイルを作ると、命名規則やスタイルが既存コードと食い違う可能性がある。

## 完了後の確認事項

- `npm run build` または `npm run dev` で型エラーが出ないか確認
- 既存の `CarSetting` の動作に影響を与えていないか確認
- ハードコードされたAPIキーが残っていないか `grep -r "AIzaSy" frontend/src` で確認
