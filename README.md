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
| `assets/icons/` | アイコン素材（Tabler filled＝MIT、自作）。ビルドが `<path>` だけを取り出し HTML 内スプライトにする。ライセンスは `THIRD_PARTY_NOTICES.md` |
| `docs/ux-research.md`, `docs/ux-visual-research.md` | 画面設計の調査報告（文字の設計／絵と形の設計） |
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

## 公開してはいけないものを入れない仕組み

- `scripts/check-repo.mjs` が、秘密情報・端末のパスやユーザー名・メールアドレス・公開文書の未完了項目を検査します（CI でも実行）。
- クローンしたら一度だけ `git config core.hooksPath .githooks` を実行すると、コミット前にも同じ検査が走ります。
- 絶対に公開しない語は `.private-terms`（git 管理外、1行1語）に書きます。手元のメモや未完了の項目は `private/`（git 管理外）に置きます。

## 事案の承認フロー

1. `data/incidents/drafts/<id>.json` を開き、`announcements[].url` の公式発表と1項目ずつ照合する。
2. 問題なければ `review.approved: true`、`approved_on`、`approved_by` を入れ、`data/incidents/approved/` へ移す。
3. `npm run validate` が通ることを確認する。
4. 続報が出たら `announcements` に追記し、`changes` に何が変わったかを書く（`docs/data-schema.md`）。

## ライセンス

| 対象 | ライセンス | 要点 |
| --- | --- | --- |
| コード（`src/`、`scripts/`、`.github/`、自作アイコンなど、`data/` 以外） | [GNU AGPL-3.0](LICENSE) | 自由に使えるが、改変して配信・提供する場合は改変後のソースも公開する |
| データ（`data/` 配下。承認済み事案DB、やることカード、サービスマスタ、許可リスト） | [CC BY-NC-SA 4.0](data/LICENSE) | 出典を示せば非営利目的で利用・改変できる。商用利用は個別にご相談ください |
| 第三者素材（Tabler Icons など） | [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) | それぞれのライセンスに従う |

事案の事実そのもの（企業の公表内容）は各社のものです。本リポジトリが権利を主張するのは、事実を選別・整理・承認した編集物としてのデータです。
企業・自治体で利用したい場合（商用ライセンス、ホワイトラベル提供）は、GitHub の Issue からご連絡ください。
