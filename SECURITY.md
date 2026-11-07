# セキュリティポリシー / Security Policy

「じぶんの情報対策」は、利用者を正しい行動に導くことを目的としたツールです。
表示内容の誤り（電話番号・URL・事実）も、技術的な脆弱性と同じ重さで扱います。

## 報告先

- 技術的な脆弱性：GitHub の **Private vulnerability reporting**（リポジトリの Security タブ）から報告してください。公開 Issue には書かないでください。機械可読の連絡先は `https://kyritk.github.io/jibun-joho-taisaku/.well-known/security.txt`（RFC 9116）にあります。
- 表示内容の誤り・訂正依頼（企業の方を含む）：GitHub Issues の「訂正・削除の依頼」テンプレートを使ってください。急ぎの場合は Issue のタイトルに「至急」と付けてください。

## 対応の目安

- 受領の返信：3営業日以内
- 電話番号・URL・事案の事実の誤り：確認でき次第、即日で修正し再公開します
- その他の脆弱性：内容に応じて対応し、修正後にこのファイルと Git 履歴で公開します

## 設計上の前提

- サーバー側に利用者データを持ちません。保存されるのは利用者の端末内（localStorage）だけです。
- 外部のスクリプト・フォント・解析ツールを読み込みません（Content Security Policy で禁止しています）。
- 表示するURLは、`data/official-domains.json` に登録した公式ドメインに限ります。
- 詳細は [docs/threat-model.md](docs/threat-model.md) を参照してください。

## 公開するもの・しないもの

- 守り方（CSP、SRI、署名必須、脅威モデル）は公開します。設計の正しさで守り、隠すことに頼りません。
- 未修正の脆弱性は公開しません。報告を受けた修正は GitHub の非公開フォーク（Security Advisory）で行い、マージ＝公開＝配信を同時にします。
- 秘密情報（トークン、鍵）、開発者の端末や個人に関する情報、まだ行っていない対策の一覧は公開しません。公開文書には完了したことだけを書きます。CI とコミット前フック（`scripts/check-repo.mjs`）が機械的に検査します。

## 対象外

- サイトを丸ごとコピーした偽サイト（本物のURLは `https://kyritk.github.io/jibun-joho-taisaku/` だけです）
- GitHub Pages / GitHub 自体の障害や脆弱性（GitHub に報告してください）
