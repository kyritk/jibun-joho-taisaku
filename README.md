# じぶんの情報対策

**使っているサービスの漏えいと、やることだけ。**

使っているサービスを選ぶだけで、自分に関係ある情報漏えいと、自分がやることだけが揃い、
対策済みの安心な状態に到達できるツール。企画書は [docs/企画書_1.md](docs/企画書_1.md)。

フェーズ0（検証）の成果物は揃い、事案20件は承認済み。次はフェーズ1（GitHub Pages での公開）。

## ディレクトリ

| パス | 内容 |
| --- | --- |
| `docs/企画書_1.md` | 企画書（正） |
| `docs/data-schema.md` | データスキーマ |
| `CLAUDE.md` | 実装時に毎回守ること（企画書の要約） |
| `data/cards.json` | 漏れた情報の種類ごとの「やることカード」と根拠 |
| `data/services.json` | サービスマスタ（通称、運営会社、カテゴリ） |
| `data/incidents/drafts/` | 事案の下書き（LLM構造化。**未承認**。現在は空） |
| `data/incidents/approved/` | 承認済みの事案20件（公開対象）。`limited_info_types` で一部の人だけが対象の情報を区別 |
| `docs/threat-model.md` | 脅威モデルと対策の一覧 |
| `data/official-domains.json` | 表示してよいURLのホスト許可リスト |
| `src/app.js`, `src/app.css` | クライアント側のコードとスタイル（innerHTML 不使用、依存ゼロ） |
| `scripts/validate.mjs` | データ検証（スキーマ、参照整合性、URL許可リスト） |
| `scripts/build.mjs` | 静的サイト生成 → `dist/`（Node 標準ライブラリのみ） |
| `scripts/check-dist.mjs` | 出力の自己検査（CSP、外部リソースなし、inline script なし） |
| `.github/workflows/` | CI（PR：検証＋ビルド）とデプロイ（main：GitHub Pages） |

## 使い方

```sh
npm run validate        # データ検証（エラーがあれば exit 1）
npm run build           # 承認済みだけで dist/ を生成
npm run build:preview   # 下書きも含めて生成（確認用。公開しない）
npm run check           # dist/ の自己検査
npm run all             # 上の3つをまとめて
```

`dist/` は CSP で `script-src 'self'` を要求するため、`file://` で開くとスクリプトが動かないことがある。ローカル確認は任意の静的サーバーで `dist/` を配信する。

公開URL：https://kyritk.github.io/jibun-joho-taisaku/

## 事案の承認フロー

1. `data/incidents/drafts/<id>.json` を開き、`announcements[].url` の公式発表と1項目ずつ照合する。
2. 問題なければ `review.approved: true`、`approved_on`、`approved_by` を入れ、`data/incidents/approved/` へ移す。
3. `npm run validate` が通ることを確認する。
4. 続報が出たら `announcements` に追記し、`changes` に何が変わったかを書く（`docs/data-schema.md`）。
