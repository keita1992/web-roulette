# Web Roulette
ネットワーク接続不要のウェブルーレットです。サーバーエンドを使いません。

# 動くもの
https://web-roulette.kt-app.link

# クイックスタート
```
cp .env.sample .env
docker compose run --rm web npm run build
```
これで`dist/index.html`が生成されますので、ブラウザでこのファイルを開いてご利用ください。

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
