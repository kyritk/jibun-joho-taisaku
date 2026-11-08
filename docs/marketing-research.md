# マーケティング — 調査報告と計画（第1弾）

作成日：2026-11-08　前提：MVP は 2026-11-08 に完成（CLAUDE.md ロードマップ）。本書は「マーケティングをしていきたい。計画を立てるためにディープリサーチを」（開発者）に対し、**何を・どの順で・どう測るか**を定める。
調査は5領域（検索需要と競合／ゼロ予算の配信チャネル／事案ページの検索対策／信頼と資金・提携／事案の周期と年間カレンダー）を並行で行い、一次資料を優先した。確認できなかった点は「未確認」と明記する。出典は各節と末尾に置く。

この計画の制約（変えない）：個人・ゼロ円・広告なし・アクセス解析なし・メール／プッシュ／LINE を送らない・独自ドメインなし・外部リソースなし・公式発表だけを開発者が目視承認。

## 1. 結論（先に要点）

1. **需要は実在し、しかも空白がある。** 2026年9〜11月は国内の漏洩公表が過去最大級（10月だけで193件、1〜10月で661件。2025年通年は428件）で、消費者庁・IPA・官邸・デジタル庁が10月に相次いで個人向け注意喚起を出した。しかし公的機関は「一般論」、まとめサイトは「事案の一覧」、個人ブログは「事案別の対象確認」までで、**「自分の利用サービス × 承認済み事案 × 残っているやること」を横断・継続で出す主体は見当たらない。** 本ツールの位置づけそのものが空白にある。
2. **主戦場は検索。** 公表直後に検索されるのは「社名 情報漏洩 対象 確認／どうすれば」「おわびメール 本物」。本ツールの事案別ページがこの語で引かれるのが最大の流入経路になる。公表直後は報道と企業告知が上位を占めるので、狙うのは**意図が「対処」の長尾**（「〇〇 漏洩 やること」「〇〇 おわび メール 本物」）と、数日〜数か月続く「あとから調べる」需要。
3. **効くチャネルは2つだけ。** (a) 事案別ページ × Google／Yahoo!（Yahoo! は2027年3月末まで Google 提供）、(b) X 上の一次情報文化（piyolog 流＝公式URL・時系列・断定なし）への接続。プレスリリース配信は個人に閉じており（PR TIMES 無料枠は株式会社限定）、公的機関は民間ツールに原則リンクしない。メディアは「引用できるデータ」として届ける（窓の杜メール、GIGAZINE タレコミ、記事を書いた記者への一次情報つき補足）。
4. **サイト側に足りないのは検索と共有の土台。** 現状、事案ページに構造化データ（JSON-LD）・OGP・署名が無く、Search Console／Bing 未登録、サブパスのため `robots.txt` は読まれない。最初の2週間はこの土台を作る（§6 Tier 1）。計測は Search Console のクリック・表示回数が唯一の一次データになる。
5. **信頼の見せ方で差別化する。** 偽の「おわびメール」が実際に出回り（警察庁 2026-10-08、JPCERT/CC 同日）、「ダークウェブチェッカー」型の有料導線ツールもある。本ツールは「何も入力させない・メールを送らない・運営者とライセンスを明示・公式URLだけ」を**ホームと事案ページの冒頭で明文化**し、それらと見た目で区別する。
6. **収益は GitHub Sponsors＋法人スポンサー枠から。** 個人のまま今すぐ使える唯一の手段。日本の助成は個人をほぼ対象外（法人格が前提）。B2B（被害企業・コールセンター業者・保険の事故対応）は2026年秋の漏洩ラッシュで需要の証拠が揃っており、CC BY-NC-SA の商用側として中期に検討する。公的承認は「サイバーセキュリティに関する総務大臣奨励賞」への自薦（個人可、次回2027年1〜2月見込み）。
7. **運用速度が流入を決める。** 検索の山は公表から数日。大手事案は「公表当日〜翌日に下書き→承認→公開→X投稿」を目標にする（正確性優先の方針は変えない。同日に回せる事案だけ同日に出す）。
8. **やらないこと**：第三者アナリティクス、llms.txt、FAQPage／HowTo 構造化データ（リッチリザルトは終了）、Google Publisher Center 申請、独自ドメイン、プレスリリース有料配信、ローンチサイト回遊、レビュー依頼（ステマ規制の安全側）。

## 2. 現状の基準値（2026-11-08）

| 項目 | 値 | 備考 |
| --- | --- | --- |
| 公開日 | 2026-11-07 | GitHub Pages サブパス |
| Google の索引 | なし | `site:` 検索で0件。公開翌日なので想定内 |
| 「じぶんの情報対策」の検索 | 競合なし | 同名のサービス・ページは見つからない。商標は J-PlatPat で未確認（手動確認が必要） |
| リポジトリ | Star 0・閲覧 0・参照元なし | 説明文（description）とトピックが未設定。README の説明文は旧タグライン |
| Search Console／Bing Webmaster | 未登録 | — |
| 事案ページの `<head>` | title・description・canonical・lang のみ | JSON-LD・OGP・署名なし |
| `robots.txt` | 生成しているが読まれない | Google はサブディレクトリの robots.txt を見ない（4xx＝制限なし）。`Sitemap:` 行も無効 |
| sitemap.xml | 25 URL、lastmod あり | 手動送信が唯一の経路 |
| 承認済み事案 | 20件（2026-06〜11） | 2026年秋の波と整合 |

## 3. 需要と競合

### 3.1 検索されている語（型）

| 型 | 例 | 意図 | いま上位にいるもの |
| --- | --- | --- | --- |
| 対象確認 | 「〇〇 情報漏洩 対象 確認」「〇〇 自分は対象？」 | 会社の公式と窓口を探す | 企業告知、報道、公表翌日の個人ブログ |
| 対処 | 「情報漏洩 通知 来たら 何をする」「〇〇 漏洩 やること」 | 何をすればよいか | NRIセキュア・Canon ESET・弁護士事務所のブログ、IPA（2026-10-26）、@IT（2026-10-30） |
| 真偽 | 「情報漏洩 お詫びメール 本物 偽物」 | 届いたメールが本物か | 自治体の注意喚起、セキュリティ会社のコラム。**公的な専用ページは無い＝最大の空白** |
| ツール探し | 「個人情報 流出 確認 無料」「メールアドレス 漏洩 チェック」 | 自分の情報が漏れたか | HIBP・Mozilla Monitor・ノートン・ダークウェブチェッカー（有料導線） |

検索量の一次データ（Google トレンド・キーワードツール）は取得できず **未確認**。代替指標：MM総研 2026年10月単月193件、1〜10月累計661件（2025年通年428件）。IPA は2026-11-02に「漏えいに不安を感じる方」向けの相談窓口を強化。需要が公的機関を動かす水準にある。

Yahoo!知恵袋の生の悩み（2026-10〜11）：「使い回しで全部変えると1日かかる。放置していいか」（閲覧3,060）、「迷惑メール以外に気をつけることは？」（閲覧2,312）。リサート調査（2026-10-23、n=800）では「どこまでやれば十分か分からない」38%、連絡を受けた28%、連絡を受けたか覚えていない16%。→ **「1回で済むこと／会社ごと」の重複排除と完了管理**は、そのまま訴求点になる。

### 3.2 誰が読まれ、何が残っているか

| 情報源 | 出しているもの | 消費者に残る隙間 |
| --- | --- | --- |
| 企業の公式お知らせ | 事実と窓口 | 「自分は対象か」「何をすべきか」が1枚で分からない。続報の差分が追えない |
| Security NEXT／ScanNetSecurity／ITmedia／Impress | 事案単位の報道 | 読者は企業・IT担当。個人の行動に落とさない |
| 事案DB（モレタ、漏洩ウォッチ、情報漏洩まとめ.site、security-karte.jp） | 一覧・検索・統計 | 運営者不明のものが多い。やること・サービス選択・完了管理が無い。**最も近い隣接領域** |
| 公的機関（消費者庁 caution_039、IPA 2026-10-26、官邸の窓口一覧、デジタル庁） | 一般的なやること | 事案名で検索しても出ない。個別化がゼロ |
| HIBP／Mozilla Monitor | メールアドレス照合 | 2026年10月の国内主要12事案はHIBPに未登録。日本の漏洩はほぼ映らない |
| 個人ブログ | 事案別の対象確認記事を即日量産 | 1記事1事案、更新されない、信頼性が見た目で判別しづらい |

**避けるべき見た目**（怪しいツールと同じになる）：メール・電話番号の入力欄、「ダークウェブ」「今すぐチェック」「漏洩が見つかりました→有料」、運営者不明。本ツールの「入力欄なし・運営者とライセンス明示・公式URLのみ」はそのまま差別化になる。

## 4. ポジショニングと訴求

- **一文**：「使っているサービスを選ぶだけ。公表された漏洩のうち関係あるものと、残っているやることだけが出る。何も入力しない、何も送らない。」
- **誰に**：非ITの社会人。入口は「漏洩のニュースや通知を見て、何をすればいいか調べている人」。
- **訴求の順**：①関係あるものだけ（会社名で引ける）→②やることが重複なく短い（1回で済む／会社ごと）→③続報で必要な分だけ戻る→④何も預からない・公式だけ。
- **信頼の明文化（冒頭に1行）**：「このサイトはメールもSMSも送りません。氏名・メールアドレス・カード番号の入力欄はありません。」（偽おわびメールと区別するため。フッターから外した文とは目的が違う）
- **文体**：公的機関と同じ出典・同じ文言。評価語（ずさん等）を使わない。「漏洩」と「漏洩のおそれ」を区別。security-karte.jp の編集方針（公式発表なしは収録しない・推測で埋めない・訂正の記録）と同じ水準を、運営者名＋Git履歴で上回る。

## 5. チャネル評価

| チャネル | 期待効果 | 費用／手間 | 方針との適合 | 優先 | 根拠 |
| --- | --- | --- | --- | --- | --- |
| 事案別ページ × 検索（Google／Yahoo!） | 高・持続 | 土台づくり1〜2週、以後は運用 | ◎ | **1** | 公表直後の検索型と長尾。Yahoo! は Google 提供（2027-03まで） |
| X（公式発表の当日投稿、piyolog 流） | 中・瞬発 | 事案ごと10分 | ◎（公式URLのみ） | **1** | 界隈の規範＝一次情報・時系列・断定なし |
| Search Console／Bing／IndexNow | 計測と索引の前提 | 初回1時間、Actions に組込み | ◎ | **1** | 手動送信が唯一の経路。IndexNow は `keyLocation` で解決した実例 |
| Zenn／Qiita の設計解説記事 | 中（技術者経由の紹介） | 記事1本 2〜4時間 | ○（宣伝主目的は禁止、末尾に紹介） | 2 | 「誰が紹介したか」で広がる前例 |
| はてなブックマーク | 中 | セルクマ可、依頼不可 | ○ | 2 | 記事公開時に自分で1回 |
| 窓の杜メール・GIGAZINE タレコミ | 低〜中 | 各1通 | ○ | 2 | 返信なし前提 |
| 記者への一次情報つき補足（X） | 中 | 事案ごと | ○ | 2 | 「引用できるデータ」として届ける |
| GitHub Sponsors＋法人スポンサー枠 | 収益 | 設定1日 | ○（関係を明示） | 2 | 日本対応済み。法人は広告宣伝費の前例 |
| 総務大臣奨励賞 自薦 | 信頼（公的承認） | 書類 | ◎ | 3（2027-01） | 個人対象・自薦可、piyolog の前例 |
| 地域講座（公民館・図書館）、デジタル推進委員 | 低・中期 | 講座ごと | ○ | 3 | 掲載制度は無く、自分が講師として使う |
| 技術書典22 | 低 | 申込は開催5か月前 | ○ | 3 | 次回の申込期を確認 |
| B2B 商用ライセンス（被害企業・コールセンター・保険） | 収益・中期 | 営業 | ○（NC の商用側） | 3 | NUWORKS 新サービス、保険の見舞金特約 |
| 自治体スタートアップ支援枠 | 低・中期 | 申請 | ○ | 3 | Whoscall–渋谷区型 |
| プレスリリース配信（PR TIMES 等） | — | 株式会社限定／有料 | × | 見送り | — |
| 公的機関への掲載依頼 | — | 制度なし | × | 見送り | IPA 窓口は「製品紹介は対象外」と明記 |
| ローンチサイト（Product Hunt 等） | 低 | 手間 | △ | 見送り | 日本の利用者比率は未確認、効果低下の見方 |

## 6. 施策（段階別）

### Tier 1：検索と共有の土台（最初の2週間。実装が必要なものは PR）

| # | 施策 | 中身 | 変更箇所 |
| --- | --- | --- | --- |
| 1 | Search Console 登録 | URL プレフィックス プロパティ `https://kyritk.github.io/jibun-joho-taisaku/`。HTML 確認ファイルを `dist/` ルートに出すか meta タグ。サイトマップ送信。ホーム・`incidents/`・主要事案を URL 検査で登録リクエスト（1日約10件） | `scripts/build.mjs`（確認ファイルの書き出し） |
| 2 | Bing Webmaster Tools | Search Console からインポート。サブフォルダで通るか確認し結果を記録 | なし |
| 3 | JSON-LD | 事案ページに `NewsArticle`（headline／datePublished／dateModified／author{name:"Kyri", url: about}／publisher）＋`BreadcrumbList`。`dateModified` は「続報を反映した日」をデータに持つ。**`check-dist.mjs` は `type="application/json"` だけをデータブロックと見なすので、`application/ld+json` も許可する1行の変更が要る**。CSP には抵触しない（実行されないデータブロック） | `scripts/build.mjs`、`scripts/check-dist.mjs`、`docs/data-schema.md`（更新日の項目） |
| 4 | OGP | `og:title`／`og:description`／`og:url`／`og:image`（当面は `icon-512.png`）／`twitter:card=summary`。X で貼ったときの見え方のため。Discover は狙わない（1200px画像が要る） | `scripts/build.mjs` |
| 5 | 署名と About | 全ページのフッターに「承認者 Kyri ・ このサイトについて」。about に運営目的・事案の選び方・訂正の受け方（「削除」でなく「公式発表に基づく訂正」）・訂正履歴（Git）への導線・連絡先（GitHub Issue） | `scripts/build.mjs`、about 本文 |
| 6 | title・見出しを意図語に | 事案ページ title を「〇〇の情報漏洩｜利用者がやること・公式発表の経過」、h2 に「〇〇を名乗るメール・SMSが来たら」。description に会社名＋サービス名＋「やること」。本文にサービス名の表記ゆれ（英字・略称）を自然に含める | `scripts/build.mjs`、`data/services.json`（aliases） |
| 7 | 信頼の1行 | ホームと事案ページの冒頭に「このサイトはメールもSMSも送りません。入力欄はありません」（段C、13px） | `src/app.js`、`scripts/build.mjs` |
| 8 | IndexNow | 鍵ファイルを `dist/` に出し、デプロイ後に Actions から `curl` で更新URLを送る（`keyLocation` 付き、第三者アクション不要、シークレット不要＝鍵は公開前提） | `.github/workflows/deploy.yml`、`scripts/build.mjs` |
| 9 | リポジトリの体裁 | description を新タグラインに、homepage に公開URL、topics（security, privacy, japan, data-breach, github-pages）。README の説明文を更新 | GitHub 設定、`README.md` |
| 10 | 常緑ハブ「個人情報が漏れたらやること」 | 情報の種類別に IPA を根拠にまとめ、各種類から事案ページ群へリンク。IPA・@IT と正面競合するので「会社名で引ける」を差別化点に | 新規静的ページ |

### Tier 2：運用（毎週・事案ごと）

- **速報の目標**：大手事案（会員100万人以上、またはカード・本人確認書類）は公表当日〜翌日に下書き→承認→公開→X投稿。それ以外は週次。承認基準は変えない。
- **X 投稿の型**：「〇〇社が△日に□□の漏洩（のおそれ）を公表。漏れたとされる情報：…。利用者がやること：（事案ページURL）。出典：（公式URL）」。断定しない。ハッシュタグは付けない。
- **続報の投稿**：第2報・最終報で「再確認」に戻る行がある場合だけ投稿する。
- **記者への補足**：当該事案を書いた記者の投稿に、公式URLと事案ページを添えて1回だけ返信。依頼はしない。
- **技術記事**（月1本、Zenn）：題材は「承認フロー（PRマージ＝承認）」「URL許可リストでビルドを落とす」「Trusted Types と CSP だけで動く静的アプリ」「1回で済むやることの重複排除」。紹介は末尾の1段落。公開時に自分で1回ブックマーク。
- **メディア**：窓の杜編集部メール（1通、返信なし前提）、GIGAZINE タレコミ（1回）。
- **Search Console の確認**（週1）：クエリ、クリック、表示回数、索引の状態。「漏えい／漏洩」の出方を記録。

### Tier 3：中期（3〜12か月）

- **GitHub Sponsors**：プロフィールを作り、README とサイトの about に1行。法人向けに「ロゴ掲載（about の下、1行）」の枠を用意。関係は明示（HIBP の方式）。確定申告の所得区分は税理士に確認（未確認）。
- **総務大臣奨励賞**：2027年1月前後の公募に自薦。実績として「承認済み事案数」「訂正履歴」「Search Console の数字」を揃えておく。
- **B2B の芽**：被害企業の「お客様へのお願い」ページ、コールセンター業者（NUWORKS 型）、保険の事故対応サービス向けに「被害者向けやることページのテンプレート＋事案JSON の商用ライセンス（転載・組込み許諾＋更新フィード）」を1枚の提案書にする。営業は問い合わせが来てから。
- **地域講座**：自治体のデジタル講習に講師として参加できるなら、教材の中でサイトを使う。デジタル推進委員は事業参加が前提。
- **法人化の判断**：助成（トヨタ財団4〜6月、日工組8〜10月）を狙うなら一般社団法人が前提。2027年春までに要否を決める。
- **フェーズ2（家族）**：8月の「家族に見せる1ページ」を助走にする。

## 7. 12か月カレンダー（2026-11〜2027-10）

公表は9〜10月に集中し（2026年：9月135件、10月189件。4〜5月が谷）、初報は火曜・金曜が約半数、続報は数日後、カード事案の最終報は3〜4か月後。

| 月 | 外部の節目 | 出すもの・やること |
| --- | --- | --- |
| 2026-11 | 協議会月次（17〜21日頃）、秋の波の続報 | **Tier 1 の土台**。「秋の漏洩20件の続報まとめ」、「おわびメールの見分け方」（需要最大） |
| 12 | 年末ECセール・配送系フィッシング | 「カード明細を年内に1回見る」、カード不正利用の届け出手順。Search Console 初回レビュー |
| 2027-01 | IPA 10大脅威2027（下旬）、TSR 年間調査（下旬）、**総務大臣奨励賞 公募**（見込み） | 「2026年の漏洩を振り返る：やることは結局5つ」。奨励賞の自薦 |
| 2 | サイバーセキュリティ月間（2/1〜3/18） | 「パスワード使い回しをやめる手順」「二段階認証の方式比較」。技術記事 |
| 3 | 警察庁 通年版（中旬）、年度末 | 秋のカード事案の最終報整理。3か月レビュー（表記・title 調整） |
| 4 | 公表の谷 | メンテ月：根拠URLの点検、サービスマスタ拡充（aliases） |
| 5 | 消費者月間、IPA 個人編ハンドブック | 「補償・おわび品は来るのか」「マイナンバーが漏れたら」。法人化の要否判断 |
| 6 | 協議会 年次レポート、PPC 年次報告 | 「正規アドレスから来るフィッシング」。半年レビュー |
| 7 | 公表の増加期に入る | 「続報の読み方：初報→第2報→最終報」。速報体制の確認 |
| 8 | 夏季 | 「家族に見せる1ページ」（フェーズ2の助走）。技術書典22 の申込期を確認 |
| 9 | 警察庁 上半期版、公表の山の始まり | 「信用情報機関の本人申告：要る人・要らない人」。当日公開体制 |
| 10 | 公表の最大月 | 事案ページの集中投入、「おわびを名乗る偽メール」再掲。年間レビュー |

## 8. 計測と目標

アクセス解析は置かない（方針）。使える一次データは Search Console だけ。GitHub のトラフィックは Pages の訪問を含まない（未確認だが実態は含まれない）。

| 指標 | 出所 | 3か月（2027-02） | 12か月（2027-11） |
| --- | --- | --- | --- |
| 索引済み URL | Search Console | 全25 URL＋新規事案 | 全件 |
| 表示回数／クリック（月） | Search Console | 表示 3,000・クリック 100 | 表示 30,000・クリック 1,500 |
| 「社名＋やること／おわび」型クエリの順位 | Search Console | 新規事案で20位以内 | 大手事案で10位以内 |
| 公表→公開の日数（大手） | Git 履歴 | 中央値 2日 | 中央値 1日 |
| 被リンク（参照元ドメイン） | Search Console リンク | 5 | 30 |
| Star／Issue | GitHub | 20／訂正依頼 1 | 100／— |
| スポンサー | GitHub Sponsors | 設定済み | 法人1社 |

数字は目安で、根拠となる類似事例の一次データは無い（未確認）。3か月ごとに実績で置き換える。

## 9. 最初の2週間（チェックリスト）

1. Search Console に URL プレフィックス プロパティを作る（確認ファイルをビルドで出す PR）→ サイトマップ送信 → 主要 URL を登録リクエスト。
2. Bing Webmaster Tools にインポート。
3. PR：JSON-LD（`NewsArticle`＋`BreadcrumbList`）、`check-dist.mjs` の `ld+json` 許可、OGP、署名リンク、信頼の1行、title・h2 の語順、`dateModified` のデータ項目。
4. PR：about の拡充（運営目的・選び方・訂正の受け方・履歴・連絡先）。
5. PR：IndexNow（鍵ファイル＋ deploy.yml の `curl`）。
6. GitHub の description・homepage・topics、README の説明文。
7. J-PlatPat で「じぶんの情報対策」の称呼検索（手動）。
8. X の投稿の型を決め、次の承認から運用開始。
9. 常緑ハブ「個人情報が漏れたらやること」の下書き。
10. Zenn 記事1本目「PRマージ＝承認で回す、公式発表だけの事案DB」の下書き。

## 10. リスクと備え

- **偽装との誤認**：冒頭の信頼の1行、入力欄なし、運営者とライセンス明示、security.txt。偽サイトが本サイトを名乗った場合は about とリポジトリで注意喚起する（本物のURLは about に残している）。
- **企業からの削除依頼**：法的には公式発表の事実項目だけの構造化は、営業権侵害の論点（漏洩データそのものの転載）から最も遠い。「削除」ではなく「公式発表に基づく訂正」として受ける方針を about に公開し、Issue で受け、訂正履歴を残す。
- **索引の遅れ**：github.io サブパスはサイトマップ取得が数週間遅れる事例がある。URL 検査の登録リクエストとハブページからの内部リンクで補う。独自ドメインは方針どおり持たない（失うもの：ドメインプロパティ、robots.txt の制御、移転時の301）。
- **ステマ規制**：自分名義での紹介は問題ない。他者にレビューを依頼しない。依頼する場合は依頼した旨を明記。
- **運用負荷**：当日公開は大手事案だけ。週の承認作業10件以内の上限（企画書）は守る。
- **「漏えい」表記**：公的機関・企業は「漏えい」が多い。方針は「漏洩」のまま、Search Console で両表記の出方を3か月見てから判断。

## 11. 未確認のまま残した点

Google トレンドの推移、知恵袋の件数推移、公表後の検索量の日本データ／Bing のサブフォルダ プロパティ可否／Yahoo! の2027-04以降／「漏えい・漏洩」の同義処理／GitHub トラフィックに Pages 訪問が含まれない点の公式記述／J-PlatPat の称呼検索結果／GitHub Sponsors の所得区分／総務大臣奨励賞の2027年公募時期／日工組社会安全研究財団の団体要件／Yahoo!ニュース エキスパートの公募／ステマ規制における無料・非営利の個人の「事業者」該当。

## 出典（主なもの）

需要・競合
- MM総研 漏洩事案件数（2026-10-14）https://www.m2ri.jp/release/detail.html?id=741 ／ Impress（2026-11-05）https://edu.watch.impress.co.jp/docs/news/2153581.html
- IPA 相談窓口強化（2026-11-02）https://www.ipa.go.jp/pressrelease/2026/press20261102.html
- IPA「漏えいした際の対処と日頃の対策」（2026-10-26）https://www.ipa.go.jp/security/anshin/attention/2026/mgdayori20261026.html
- 消費者庁 caution_039 https://www.caa.go.jp/policies/policy/consumer_policy/caution/caution_039
- 首相官邸「個人情報流出の被害に遭われた方」https://www.kantei.go.jp/jp/headline/johoryushutsu_sodan/index.html
- @IT「個人情報、漏れたらまず何する?」（2026-10-30）https://atmarkit.itmedia.co.jp/ait/articles/2610/30/news022.html
- リサート調査（2026-10-23）https://prtimes.jp/main/html/rd/p/000000010.000187532.html ／ UPF 調査（2026-10-22）https://prtimes.jp/main/html/rd/p/000000053.000048564.html ／ トレンドマイクロ（2026-03-24）https://www.trendmicro.com/ja_jp/about/newsroom/press-releases/2026/pr-20260324-01.html
- 漏洩ウォッチ https://japan-breach-watch.realizeinc.workers.dev/ ／ モレタ https://moreta.jp/ ／ 情報漏洩まとめ.site 方針 https://jouhourouei.clipmaster.jp/policy ／ security-karte.jp 編集方針 https://www.security-karte.jp/policy/
- HIBP の国内事案収録状況（2026-10-11）https://atsoho.com/blog/have-i-been-pwned
- おわびフィッシング（2026-10-07）https://rocket-boys.co.jp/security-measures-lab/data-breach-apology-scam-secondary-phishing/ ／ 警察庁（2026-10-08）https://www.npa.go.jp/bureau/cyber/pdf/R8_Vol.19cpal.pdf ／ JPCERT/CC（2026-10-08）https://www.jpcert.or.jp/at/2026/at260030.html

チャネル・法律
- Zenn ガイドライン https://zenn.dev/guideline ／ Qiita ガイドライン https://help.qiita.com/ja/articles/qiita-community-guideline ／ はてなブックマーク https://b.hatena.ne.jp/help/entry/spam
- PR TIMES スタートアップチャレンジ https://prtimes.jp/startup_free/ ／ valuepress https://www.value-press.com/pricelist_free
- 窓の杜 情報提供 https://forest.watch.impress.co.jp/info/sakusya/sakusya3.html ／ GIGAZINE タレコミ https://gigazine.net/news/contact/
- IPA 安心相談窓口（対象外の明記）https://www.ipa.go.jp/security/anshin/ ／ デジタル推進委員 FAQ https://www.digital.go.jp/policies/digital_promotion_staff_faq
- ステマ規制 https://www.caa.go.jp/policies/policy/representation/fair_labeling/stealth_marketing/ ／ 名誉毀損の免責 https://monolith.law/?p=9782 ／ 漏洩情報の削除請求 https://monolith.law/reputation/information-leakage-specific-delete
- piyolog https://piyolog.hatenadiary.jp/ ／ 総務大臣奨励賞 公募（2026-01-13）https://scan.netsecurity.ne.jp/article/2026/01/13/54392.html
- 個人開発の拡散事例 https://zenn.dev/5naokichi/articles/0863da7bc3d568 ／ https://levtech.jp/media/article/focus/detail_609/ ／ https://zenn.dev/ktmouk/articles/0be490eab52dbc

検索対策
- Search Console プロパティ https://support.google.com/webmasters/answer/34592 ／ 所有権確認 https://support.google.com/webmasters/answer/9008080
- robots.txt の仕様 https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt ／ IndexNow https://www.indexnow.org/documentation ／ サブパスでの実例 https://dev.to/samtj/my-indexnow-submissions-returned-202-for-two-weeks-none-of-them-worked-2li0
- Article 構造化データ https://developers.google.com/search/docs/appearance/structured-data/article ／ FAQPage 終了 https://developers.google.com/search/docs/appearance/structured-data/faqpage ／ 日付 https://developers.google.com/search/docs/appearance/publication-dates ／ AI 機能 https://developers.google.com/search/docs/appearance/ai-features ／ 有用なコンテンツ https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google Discover https://developers.google.com/search/docs/appearance/google-discover?hl=ja ／ Google ニュース https://support.google.com/news/publisher-center/answer/9607025?hl=ja
- 無料サブドメインと SEO（2026-01-19）https://www.searchenginejournal.com/googles-mueller-free-subdomain-hosting-makes-seo-harder/ ／ llms.txt（2026-05-20）https://www.searchenginejournal.com/googles-llms-txt-guidance-depends-on-which-product-you-ask/575431/
- Yahoo! の Google 延長 https://webtan.impress.co.jp/e/2024/05/17/47019/page/1
- GoatCounter ピクセル https://www.goatcounter.com/help/pixel ／ Cloudflare Web Analytics https://developers.cloudflare.com/web-analytics/get-started/

資金・提携
- GitHub Sponsors https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors ／ 国税庁 No.1900 https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1900.htm ／ 法人の広告宣伝費処理 https://birtles.blog/2023/09/09/sponsoring-open-source-as-a-japanese-company/
- HIBP の歩み https://www.troyhunt.com/a-decade-of-have-i-been-pwned/ ／ スポンサー方針 https://www.troyhunt.com/have-i-been-pwned-is-now-partnering-with-1password/
- トヨタ財団 https://www.toyotafound.or.jp/grant/community/ ／ 日工組社会安全研究財団 https://www.syaanken.or.jp/wp-content/uploads/2026/06/2027_youkou_koiki.pdf ／ NLnet https://nlnet.nl/core/eligibility/
- NUWORKS 被害者対応サービス（2026-10-15）https://bestcalendar.jp/press/159001 ／ サイバー保険の対象費用 https://ajhc.or.jp/siryo/2024cyberprotect.pdf
- Whoscall と渋谷区（2023-09-04）https://www.watch.impress.co.jp/docs/news/1528683.html

周期・カレンダー
- 東京商工リサーチ 2025年調査（2026-02-06）https://webtan.impress.co.jp/n/2026/02/06/52123 ／ 2026年中間（2026-10-21）https://scan.netsecurity.ne.jp/article/2026/10/21/56521.html
- トレンドマイクロ 2025年総括（2025-12-11）https://www.trendmicro.com/ja_jp/jp-security/25/l/securitytrend-20251211-01.html
- PwC 公表の曜日・日数 https://www.pwc.com/jp/ja/knowledge/thoughtleadership/cyber-attack-survey2024.html
- 個人情報保護委員会 四半期（2026-09-02）https://www.ppc.go.jp/files/pdf/260902quarter-report_roueihoukoku.pdf
- IPA 10大脅威2026 https://www.ipa.go.jp/security/10threats/10threats2026.html ／ サイバーセキュリティ月間 https://www.npa.go.jp/bureau/cyber/koho/news/csmonth.html ／ 消費者月間 https://www.caa.go.jp/notice/entry/045785/ ／ フィッシング対策協議会 月次 https://www.antiphishing.jp/report/monthly/
- 2026年秋の波の分析（2026-10-30）https://westeria.jp/security-incidents/guide/breach-wave-2026-autumn/ ／ 駿河屋 最終報（2025-12-04）https://www.suruga-ya.jp/feature/osirase/2025_12_04.html
