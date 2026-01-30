# Web Roulette

完全クライアントサイドで動作するウェブルーレットです。候補は1行1候補で入力し、当選結果は非表示にして次の抽選から除外できます。ローカル保存は `localStorage` を利用し、外部ネットワーク通信は行いません。

## 開発

```bash
npm install
npm run dev
```

Vite の開発サーバーが起動します。

### タイトルの変更（環境変数）

ビルド時に `VITE_APP_TITLE` を指定すると、画面の大きいタイトルを変更できます。

```bash
VITE_APP_TITLE="My Roulette" npm run dev
```

### Docker での開発

```bash
docker compose up --build
```

`http://localhost:5173` でアクセスできます。

ビルドだけ行う場合は以下でも実行できます。

```bash
docker compose run --rm web npm run build
```

## ビルドと配布

```bash
npm run build
```

`dist/` に単一の `index.html` が出力されます。ビルド成果物だけで動作します。

ローカルで確認する場合は、`dist/index.html` を直接開くか、静的サーバーで `dist/` を配信してください。

```bash
npm run preview
```

または任意の静的サーバー（例: `npx serve dist`）でも動作します。

### 単一HTMLでの配布

ビルド成果物は `dist/index.html` の単一ファイルにまとまります。`dist/index.html` を直接開いても動作します（外部アセット不要）。
