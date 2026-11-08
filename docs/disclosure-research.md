# 公開リポジトリで公開するもの・しないもの — 調査報告と方針案

作成日：2026-11-08。対象：GitHub 公開リポジトリ `kyritk/jibun-joho-taisaku` に置く文書の範囲。
きっかけ：開発者の指摘「リポジトリを公開しているのはコードの透明性のため。マーケティングまで公開する必要はない」。
調査は4領域（透明性を掲げる組織・OSS の明文基準／日本の法的論点／セキュリティ文書と AI 指示ファイルの公開範囲／非公開文書の置き場所）を並行して行い、ここに統合した。確認日はすべて 2026-11-08。確認できなかった点は §8 にまとめた。法的な記述は公開情報の整理であり、法律相談ではない。

## 1. 結論（先に要点）

1. **「マーケティング計画は公開しない」は規範どおり。** 透明性を最も徹底している GitLab でさえ「競争上のセールス・マーケティング施策の計画は非公開」「戦略は社内限定」と明文化している。PostHog も財務・セキュリティ・資金調達は社内限定。マーケ調査を非公開にしても「透明性の後退」とは見なされない。
2. **公開の目的は「信頼」であり、信頼に効く開示は決まっている。** 報道の信頼指標（The Trust Project）や GitLab・Buffer の自己評価が示すのは、掲載基準・承認と訂正の方法・運営者と資金源・できないこと、の開示が信頼を作るということ。「どう集客するか・いくら稼ぐか・いつ何をするか」は信頼に寄与しない。
3. **公開リポジトリに適した文書は「製品の設計と運用」まで。** Rust RFC・PEP・KEP・Chromium design docs が公開するのは製品とプロセスの設計で、事業計画を含む例は見つからなかった。GitHub の Open Source Guides が推奨する公開文書も README・CONTRIBUTING・GOVERNANCE・SECURITY・ロードマップ（製品）まで。UX 調査・脅威モデル・データスキーマはこの範囲に入り、企画書は「製品の目的・原則・やらないこと」の部分だけが入る。
4. **現行のセキュリティ上の線引きは正しい。** 「脅威モデルと完了した対策は公開、未修正の脆弱性と未完了の対策は非公開」は Tails・Chromium・Tailscale・Bitwarden の実務と一致する。検出スクリプトの正規表現は公開で問題ない（検知対象は自分のコミット）。ただし「非公開語リスト」の中身は公開しない（現行どおり git 管理外）。
5. **公開済みの文書は「取り下げられない」前提で扱う。** 閉じた PR のブランチを消しても GitHub はコミットを保持し、`refs/pull/N/head` から取得できる。GitHub Support は認証情報・個人情報でない限り削除に応じない。Software Heritage は履歴書換え前後の両方を保存する。PR #28 のマーケ調査には秘密も個人情報も無いので実害は無いが、以後は「最初から出さない」運用にする。
6. **非公開文書の置き場所は「非公開リポジトリを `private/` に clone」にする。** 現在の gitignore フォルダは履歴もバックアップも無い。GitHub Free は非公開リポジトリ無制限で費用ゼロ。入れ子リポジトリは親から `git add -f` しても gitlink しか記録されず、中身は公開側に入らない（実機確認済み）。暗号化同居（git-crypt 等）は鍵漏洩で全履歴が復号される不可逆リスクがあり採らない。
7. **収益化の記述は公開側から外す。** 公開済みの計画は営業秘密（不正競争防止法）にならず、後から秘密にはできない。今後の価格・契約条件・スポンサー候補は最初から非公開に置く。公開側に残すのはライセンス（AGPL／CC BY-NC-SA）と「企業・自治体での利用は Issue から相談」の案内だけ。
8. **名称を長く使うなら、展開計画を広く告知する前に商標出願を検討する。** 日本は先願主義で、個人の新サイトが先使用権（周知性）を立証するのは難しい。J-PlatPat の称呼検索は企画書の未了項目のまま。

## 2. 基準：公開する／条件付き／公開しない

| 区分 | 内容 | 理由・根拠 |
| --- | --- | --- |
| **公開する** | コード、ビルド・検証スクリプト、データ（事案・カード・サービス・公式ドメイン）、ライセンス、第三者通知 | コードの透明性＝このリポジトリを公開する目的 |
| 公開する | 掲載基準、承認フロー、訂正・取り下げの方法と履歴、運営者（ハンドル）、連絡先（GitHub）、できること・できないこと | 信頼指標そのもの（Trust Project、GitLab「判断基準は公開」） |
| 公開する | 製品の設計文書：UX 調査、データスキーマ、脅威モデル（資産・脅威・完了した対策・守らない範囲）、SECURITY.md、security.txt | RFC／PEP／KEP 型の設計文書。OpenSSF Best Practices silver は「利用者が期待できる／できないこと」の文書化を求める |
| 公開する | 製品のロードマップ（機能の方向。期日と数値目標は置かない） | Home Assistant 方式。Basecamp・ZeroMQ が述べる「約束と受け取られる」問題を避ける |
| 公開する | AI 利用方針（「下書きは LLM、公開は開発者が目視承認」の1段落）と、AI 向け指示ファイル（設計原則・運用ルール・決定事項） | AGENTS.md は6万超のリポジトリで公開されている標準。開示しない場合、誤りが出たときに「検証せず載せた」と見られる |
| **条件付き** | 企画書：製品の目的・唯一性・原則・やらないこと・法務の整理は公開。収益・集客・KPI・「今週やること」は分離して非公開へ | 製品設計の部分だけが設計文書の範囲 |
| 条件付き | 競合・類似サービスへの言及：サイト上で確認できる事実＋根拠付きの評価に限る。確認日を併記。他サイトの文章は写さず自分の言葉で要約し URL を付ける | 名誉毀損の免責3要件（公共性・公益目的・真実性）、論評の域、著作権法32条の引用要件 |
| 条件付き | 未完了項目：機能・UI・データ運用の未完了は公開 Issue でよい。マーケ・収益・セキュリティの未完了は非公開 | Tails・Chromium の線引き。check-repo.mjs の「完了したことだけ書く」規則はセキュリティ文書向けで、機能の Issue には適用しない |
| **公開しない** | マーケティング計画：チャネル評価、SEO 計画、競合分析、カレンダー、KPI 目標、投稿計画、メディアへの売り込み先 | GitLab「競争上のマーケ施策は非公開」。信頼に寄与せず、競合には情報優位を与える（Kahl） |
| 公開しない | 事業・収益：価格、商用ライセンスの条件、スポンサー候補、助成の応募計画、法人化の検討 | GitLab・PostHog とも財務・戦略は社内限定。公開後は営業秘密にできない |
| 公開しない | 未修正の脆弱性、未実施のセキュリティ対策の一覧、非公開語リストの中身、インシデント時の手順書（Support 依頼・アーカイブ除外の手順） | 現行方針。OpenSSF CVD ガイド、Tailscale・Bitwarden が伏せる範囲 |
| 公開しない | 開発者の個人情報：本名、住所、メール、端末のパス、スクリーンショットの元画像（Exif） | 現行方針（check-repo.mjs） |
| 公開しない | 手元のメモ、下書き、調査の中間生成物 | 公開文書は完成したものだけ |

## 3. 現在のリポジトリの棚卸しと判定

| ファイル | 判定 | 理由・措置 |
| --- | --- | --- |
| `README.md`、`SECURITY.md`、`LICENSE`、`data/LICENSE`、`THIRD_PARTY_NOTICES.md` | 公開（現状維持） | 信頼指標。「公開するもの・しないもの」節が既にある |
| `docs/threat-model.md` | 公開（現状維持） | 資産・脅威・完了した対策。追加するなら「守らないもの（範囲外）」の節 |
| `docs/data-schema.md`、`docs/ux-*.md`（7本）、`docs/mockups/` | 公開（現状維持） | 製品の設計文書。類似サービスへの言及は公開資料に基づく事実と設計上の評価にとどまっている |
| `docs/企画書_1.md` | 公開（一部を分離） | 「コンセプト／価値の中心／やることカード／データ運用／技術構成／法務・運用チェックリスト／やらないこと」は公開のまま。「MVP ロードマップの完了条件（検索流入）」「今週やること」「調べきれていない点」は現状を反映していないので削るか非公開側へ。企画書は CLAUDE.md が「判断に迷ったら正とする」文書なので、公開側に残す部分が製品の正であり続けるように編集する |
| `CLAUDE.md` | 公開（2か所を修正） | 設計原則・運用ルール・決定事項は AGENTS.md 型の標準的な内容。修正は (a) 「決定事項」のライセンス行から「収益はスポンサー・助成・商用ライセンスで検討」を外し「企業・自治体での利用は Issue から相談」に揃える、(b) 「ロードマップ上の現在地」から Search Console 登録などマーケの次工程を外し、製品の次工程（週次の事案承認、CAPCOM 確認、DCO／CLA、フェーズ2）だけ残す。あわせて「公開範囲」節（§6 の規則）を追加する |
| `docs/marketing-research.md`（PR #28、未マージ） | **公開しない** | §2 の「マーケティング計画」「事業・収益」に当たる。非公開リポジトリへ移し、PR #28 は close、ブランチは削除。コミットは `refs/pull/28/head` に残るが秘密も個人情報も無いので許容する。実装項目のうち**サイトの変更**（JSON-LD、OGP、署名、信頼の1行、title 文言、IndexNow、ハブページ）はコードとして公開リポジトリで行う。公開されるのは「何をしたか」であって計画ではない |
| `scripts/check-repo.mjs` | 公開（現状維持＋拡張） | 正規表現の公開は gitleaks と同じ構造で問題ない。拡張：ステージに `private/` 配下が含まれたら拒否 |
| `.private-terms`、`private/` | 非公開（現状維持） | git 管理外。`private/` は §4 の方式で Git 化する |
| コミット履歴 | 問題なし | 著者は全件 noreply アドレス。GitHub の「Block command line pushes that expose my email」を有効にしておく |

## 4. 非公開文書の置き場所

比較した選択肢：gitignore フォルダ（現状）、別の非公開リポジトリ（ネスト配置／submodule）、暗号化同居（git-crypt、SOPS＋age、transcrypt）、GitHub の Wiki・Discussions・Projects、リポジトリ外（Obsidian、Notion 等）。

| 選択肢 | 履歴 | バックアップ | 費用 | AI 支援からの参照 | 誤公開のリスク |
| --- | --- | --- | --- | --- | --- |
| gitignore フォルダ（現状） | なし | なし | 0 | ◎ | `git add -f` 一発 |
| **非公開リポジトリをネスト** | あり | GitHub | 0 | ◎ | 低（入れ子は gitlink 止まり） |
| submodule | あり | GitHub | 0 | ◎ | 低だが URL と SHA が公開側に残る |
| 暗号化同居 | あり（暗号文） | GitHub | 0 | ◎ | 鍵漏洩＝全履歴復号、取り消し不可。GitHub 上で diff 不可。git-crypt は Windows 公式バイナリなし |
| Wiki／Discussions | あり | GitHub | 0 | △ | 公開リポジトリでは公開固定 |
| Projects（private） | 弱 | GitHub | 0 | △ | 低。長文の置き場に向かない |
| Obsidian＋非公開リポジトリ | あり | GitHub | 0〜 | ○ | 低 |

**推奨：非公開リポジトリ `jibun-joho-taisaku-private` を作り、公開リポジトリの作業ディレクトリ内 `private/` に clone する。** 親の `.gitignore` で `private/` を除外（現状どおり）し、pre-commit（check-repo.mjs）で `private/` 配下のステージを拒否する。

- GitHub Free は公開・非公開ともリポジトリ数・協力者数が無制限。非公開で使えないのは Wiki・Pages・保護ブランチ等で、文書置き場には不要。
- 入れ子リポジトリは、親で `git add -f private` しても gitlink（コミット SHA）しか記録されず、`git add -f private/plan.md` は何も追加しない（2026-11-08 に手元の Git で確認）。submodule と違い、公開側に非公開リポジトリの URL も SHA も残らない。
- AI コーディング支援は起動ディレクトリ配下として平文を直接読めるので、CLAUDE.md から `private/` の文書を参照する現行の設計を変えずに済む。
- `private/` に置くもの：マーケ調査と計画、収益化の検討、未完了のセキュリティ項目、非公開語リスト（`.private-terms` の移設先候補）、インシデント時の手順書（GitHub Support 依頼、アーカイブ除外）、手元メモ。

## 5. 法的な論点の整理（公開情報の範囲）

- **営業秘密**：3要件（秘密管理性・有用性・非公知性）のうち、公開リポジトリに置いた時点で秘密管理性と非公知性を欠く。公開済みの企画・計画は後から秘密に戻せない。守りたいものは最初から非公開に置き、公開文書から参照しない。
- **特定商取引法**：法人向け商用ライセンスは「営業のために契約する者」への販売として適用除外（26条1項1号）。個人向けの有償販売は始めない。GitHub Sponsors は特典なし（または README 掲載程度）にとどめる。表示義務が生じる場合、氏名は省略できず住所・電話はバーチャルオフィス等で代替できる。本名公開の可否はその前に決める。
- **競合への言及**：事実の摘示は公共性・公益目的・真実性で免責、論評は人身攻撃に及ばないこと。「運営者を明かしていない」のような事実はサイト上で確認でき、確認日を併記できるものに限る。
- **引用**：他サイトの文章は写さず自分の言葉で事実を要約し、出所（URL）を明示する。事案 DB の方針と同じ。
- **商標**：先願主義。先使用権の周知性は個人の新サイトには高いハードル。ロゴ・展開計画を広く告知する前に出願を検討する（第41類／第42類が想定）。
- **身元の特定経路**：コミットのメール、GPG 鍵 UID のメール（REST API で誰でも取得可）、画像の Exif、スクリーンショットのパスやウィンドウ名、過去アカウントとの紐づけ。本リポジトリは noreply のみ、独自ドメインなし。公開前チェックに画像の Exif とパスを加える。

## 6. 運用規則の案（CLAUDE.md に追加する文）

```
## 公開範囲

- 公開リポジトリに置くのは「製品の設計と運用」まで：コード、データ、設計文書（UX 調査・スキーマ・脅威モデル）、
  掲載基準、承認と訂正の方法、運営者、ライセンス、製品のロードマップ（期日と数値目標は置かない）。
- 置かないもの：マーケティングの計画と調査（チャネル・SEO・競合分析・カレンダー・KPI）、収益と価格、スポンサー候補、
  未修正の脆弱性、未実施の対策、非公開語リスト、手順書、手元メモ、開発者の個人情報。これらは `private/`（非公開リポジトリ）に置く。
- 競合・類似サービスに触れるときは、公開資料で確認できる事実と設計上の評価だけを書き、確認日と URL を付ける。文章は写さない。
- 公開したものは取り下げられない前提で出す。訂正は上書きのコミットで行い、履歴を訂正履歴として残す。
- マーケ施策のうちサイトの変更（構造化データ、OGP、署名、文言）はコードとして公開リポジトリで行う。計画は公開しない。
```

check-repo.mjs の拡張：ステージ済みファイルに `private/` 配下が含まれたらエラー。CLAUDE.md の「ロードマップの現在地」は製品の次工程だけにする。

## 7. 実行の順序（提案）

1. 非公開リポジトリ `jibun-joho-taisaku-private` を作成（開発者のアカウント操作）。現在の `private/` の中身を初回コミット。`private/` を clone に置き換える。
2. PR #28 の `docs/marketing-research.md` と調査の中間ファイルを非公開リポジトリへ移す。PR #28 を close、ブランチを削除。
3. CLAUDE.md の2か所の修正と「公開範囲」節の追加、check-repo.mjs の `private/` 拒否（公開リポジトリの PR）。
4. 企画書の「今週やること」「調べきれていない点」「ロードマップの完了条件」を整理（公開リポジトリの PR）。
5. 以後、マーケ施策のサイト変更は通常の PR として行う。PR の説明には「何を変えたか」だけ書き、計画・目標は書かない。

## 8. 未確認のまま残した点

- GitLab Handbook の values ページ本体（「Public by default」節）は raw を特定できず、confidentiality-levels 本文で代替した。
- Signal がロードマップ非公開を宣言した公式声明、Plausible が公開指標ページを止めた理由。
- 経産省「営業秘密管理指針」、特許庁 FAQ、消費者庁 Q&A、文化庁「引用」解説の原文（自動取得が拒否され、二次資料で確認）。
- GitHub Sponsors（特典なし）の特商法該当性についての消費者庁・弁護士の明示的な整理。
- 国内のセキュリティ系サイト運営者への嫌がらせ・削除要求の公表事例。
- SOPS の鍵ローテーション手順、transcrypt の Windows 動作、GitHub Projects の無料プランでの個数制限。
- Software Heritage の削除ポリシー原文（ボット対策で取得不可）、Wayback Machine に PR #28 が保存されているか。

## 出典（主なもの）

- GitLab Confidentiality levels https://handbook.gitlab.com/handbook/communication/confidentiality-levels/ ／ SAFE Framework https://handbook.gitlab.com/handbook/legal/safe-framework/
- PostHog Communication https://posthog.com/handbook/company/communication ／ Marketing https://posthog.com/handbook/growth/marketing
- Mozilla Data Safety https://wiki.mozilla.org/Data_Safety ／ Buffer salary system https://buffer.com/resources/salary-system/
- Home Assistant roadmap https://www.home-assistant.io/blog/2024/06/12/roadmap-introduction/ ／ Basecamp「Options, not roadmaps」 https://signalvnoise.com/options-not-roadmaps/ ／ ZeroMQ guide ch.6 https://zguide.zeromq.org/docs/chapter6/ ／ Kahl「Too many eyes」 https://thebootstrappedfounder.com/too-many-eyes/
- GitHub Open Source Guides https://opensource.guide/starting-a-project/ 、https://opensource.guide/building-community/
- Rust RFCs https://github.com/rust-lang/rfcs ／ PEP 1 https://peps.python.org/pep-0001/ ／ KEP https://github.com/kubernetes/enhancements/blob/master/keps/README.md ／ Chromium design docs https://www.chromium.org/developers/design-documents/
- The Trust Project「Trust Indicators」 https://thetrustproject.org/trust-indicators/ ／ Bernstein「The Transparency Trap」（HBR 2014）
- Tails design https://tails.net/contribute/design/ ／ Tails security policy https://tails.net/contribute/security_policy/ ／ Chromium Security FAQ https://chromium.googlesource.com/chromium/src/+/lkgr/docs/security/faq.md ／ Tailscale security https://tailscale.com/security ／ Bitwarden white paper https://bitwarden.com/help/bitwarden-security-white-paper/
- OpenSSF Best Practices criteria https://www.bestpractices.dev/en/criteria ／ OpenSSF CVD guide https://oss-vulnerability-guide.openssf.org/maintainer-guide.html ／ NIST SP 800-123 https://csrc.nist.gov/pubs/sp/800/123/final ／ gitleaks https://github.com/gitleaks/gitleaks
- AGENTS.md https://agents.md/ ／ CSA「Agent instruction file poisoning」 https://labs.cloudsecurityalliance.org/research/csa-research-note-agent-instruction-file-poisoning-20261027/ ／ Scientific Python AI guide https://learn.scientific-python.org/development/guides/ai/
- GitHub「Removing sensitive data」 https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository ／ 閉じた PR のブランチ復元 https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-branches-in-your-repository/deleting-and-restoring-branches-in-a-pull-request ／ GitHub plans https://docs.github.com/en/get-started/learning-about-github/githubs-plans ／ Project visibility https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-your-project/managing-visibility-of-your-projects ／ Software Heritage と履歴書換え https://arxiv.org/abs/2509.09294
- 営業秘密管理指針の解説 https://keiyaku-watch.jp/media/kisochishiki/2025-eigyohimitsukanrishishin/ ／ 消費者庁 特商法ガイド（通信販売） https://www.no-trouble.caa.go.jp/what/mailorder/ ／ GitHub Sponsors Additional Terms https://docs.github.com/en/site-policy/github-terms/github-sponsors-additional-terms
- 論評と名誉毀損 https://monolith.law/reputation/expressions-and-defamation ／ 先使用権と周知性 https://www.courts.go.jp/assets/hanrei/hanrei-pdf-14009.pdf ／ 特許庁商標課の回答 https://tkc.jp/cc/senkei/201609_consult01
- GitHub メールアドレス https://docs.github.com/en/account-and-profile/reference/email-addresses-reference ／ GPG 鍵 REST https://docs.github.com/en/rest/users/gpg-keys
