# UI/UX 刷新のための調査報告と設計案

作成日：2026-11-07。対象：公開中のフェーズ1サイト（https://kyritk.github.io/jibun-joho-taisaku/ ）。
目的：モダンで認知負荷の少ないUIへ刷新するための、根拠（一次資料）に基づく設計方針と具体案。
調査は4領域（認知負荷の原則と高齢者研究／類似サービスの分析／選択とチェックリストの設計パターン／日本語タイポグラフィと色）を並行で行い、一次資料を実際に開いて確認した。確認できなかった項目は末尾「未検証」に分離した。

## 1. 結論（先に要点）

1. **トップ画面は「状態」から始める。** 現行はサービス選択の64個のチェックボックスが最初に見える。類似サービスで最も完成度が高い Mozilla Monitor はトップを「要対処 N件／すべて対処済み／該当なし」の3状態の一文で始める。Google のダークウェブレポートは「次に何をすべきかが示されない」として2026年2月に廃止された。価値は「状態→次の1行動」にある。
2. **サービス選択は「検索＋よく使われる上位8〜10件＋カテゴリ折りたたみ」に変える。** 選択過多の研究（Chernev 2015 メタ分析）では、件数そのものより「一覧の複雑さ」が負荷を生む。1画面に見せる候補は6〜10件（Baymard）、別名辞書付きの検索（GOV.UK の自動補完の知見）、選択済みはトークンで常時表示。
3. **やることは GOV.UK タスクリスト型にする。** 34名×5ラウンドの研究で最頻の問題は「ステータスのタグをボタンと誤認」。行全体をタップ可能にし、タグは押せる見た目にしない。ステータスは最小3種、「完了」は黒文字・背景なし。進捗は％ではなく「2/5 完了」の件数。
4. **文言は見た目と同じ重さで設計する。** 総務省の高齢者調査で困りごと上位は「英語やカタカナが多く意味が分からない」。国語研の調査では「ログイン」の認知率75%でも理解率はさらに10〜30ポイント低い。NN/g の研究では高齢者の90%が失敗を自分のせいにする。外来語を減らし、責めない表現にし、脅さない（Mozilla の実験で脅し調は行動を改善しなかった）。
5. **視覚は「本文18px・行間1.75・ウェイト2種・単一アクセント・影なし」の静かな構成にする。** デジタル庁デザインシステム（DADS）の実トークン値を基準にし、ライト既定・ダークはOS設定に追従（高齢者には黒文字白地が有利という2013年の実験）。

## 2. 現行UIの監査

| 問題 | 根拠となる原則 |
| --- | --- |
| 最初に64個のチェックボックスが見え、自分の状態が見えない | 「主要な答えを最初に」（セキュリティダッシュボードの一般原則）、Mozilla Monitor の3状態バナー |
| 事案を開くと9〜10枚のカード＋根拠リンク＋事実メモ＋公表の経緯が1か所に同居 | 段階的開示は2段まで（NN/g）。一覧と詳細の分離（HIBP 2.0、Monitor が情報過多対策として採用） |
| バッジが「新着」「状態」「対策済み」「下書き」と並ぶ | 色・タグは最小個数から（GOV.UK）。非重要情報に警告色を使わない（NN/g） |
| 「対象者に個別連絡中」という状態名 | 平易な日本語、1文1アイデア（NN/g Plain Language、国語研） |
| サービスの検索がない | 15件超の一覧は見える形＋検索で補う（NN/g、GOV.UK） |
| 引き継ぎ・ホーム画面追加が常時表示 | 二次情報は後回し（NN/g Defer Secondary Content） |
| カードの根拠リンクが毎枚繰り返される | 「なぜ」はインライン展開の2段目へ（NN/g Progressive Disclosure、GOV.UK Details） |
| 「新着」判定が最終訪問日のみで、何が変わったかが分からない | 変化を隠さず、要素近傍の指標＋上部バナー1つ（NN/g Visibility of System Status、GOV.UK Notification banner） |

## 3. 根拠の要約（領域別）

### 3.1 認知負荷と高齢者（一次資料）

- **NN/g 高齢者研究**（2013、65歳以上75名）：若年層より43%遅く、成功率55%対75%。記憶の自己評価49%対63%。**失敗を自分のせいにする90%**、半数が手順を紙に書く。推奨：12pt以上＋拡大可、大きいボタンと間隔、プルダウンや動く要素を避ける、エラーは直し方を明示。 https://www.nngroup.com/articles/usability-seniors-improvements/ 、後継 https://www.nngroup.com/articles/usability-for-senior-citizens/
- **NN/g 段階的開示**：開示は2段まで。3段以上は通常ユーザビリティが低い。 https://www.nngroup.com/articles/progressive-disclosure/
- **NN/g ハンバーガーメニュー**（n=179）：隠しナビは発見率20%超低下、難易度評価+21%。最上位4項目以下なら常時表示。 https://www.nngroup.com/articles/hamburger-menus/
- **NN/g アイコン**：ほぼ普遍的なのは「ホーム・印刷・検索」のみ。常時見えるテキストラベル必須。 https://www.nngroup.com/articles/icon-usability/
- **NN/g カード**：同種項目の走査・比較はカードよりリストが良い。 https://www.nngroup.com/articles/cards-component/
- **NN/g 視覚階層**：サイズは3種まで、主色2＋副色2、赤は警告専用。 https://www.nngroup.com/articles/visual-hierarchy-ux-definition/
- **総務省「高齢者はICTの何に困っているの？」**（2011、50歳以上340名）：「英語やカタカナが多く意味が分からない」131件、「ボタンが小さく誤操作」69件。家族と相談114件。 https://www.soumu.go.jp/main_content/000115449.pdf
- **総務省 通信利用動向調査**（2023）：ネット利用率は65〜69歳88%、70代67%、**80歳以上36%**。家族の支援が前提。 https://www.soumu.go.jp/johotsusintokei/statistics/pdf/HR202300_001.pdf
- **国語研「外来語」言い換え提案**：「ログイン」認知率32.6%→74.7%（2004→2014）。理解率は認知率より10〜30ポイント低い。 https://www2.ninjal.ac.jp/gairaigo/
- **産総研 佐川ほか**（2013、111名）：高齢者（60〜70代）が読める最小は12pt、明朝はゴシックより+1.3pt必要。JIS S 0032 として規格化。 https://www.aist.go.jp/pdf/aist_j/synthesiology/vol06_01/vol06_01_p34_p44.pdf
- **日本SPセンター**（2023、50〜70代330名、印刷物）：読みやすい文字サイズは14pt 38.5%、18pt 32.1%。行間1.7倍が60%。 https://prtimes.jp/main/html/rd/p/000000011.000002810.html
- **WCAG 2.2**：ターゲット24×24px以上（AA）、文字200%拡大、テキスト4.5:1、UI部品3:1、同一プロセスで既入力の再入力を求めない（3.3.7）、ヘルプの位置を一貫させる（3.2.6）。 https://www.w3.org/WAI/WCAG22/Understanding/
- **デジタル庁 ウェブアクセシビリティ導入ガイドブック**（2025-10）：文字サイズ拡大ボタン・配色変更ボタンの設置は非推奨（OS設定に追従する実装を優先）。 https://www.digital.go.jp/resources/introduction-to-web-accessibility-guidebook

### 3.2 類似サービス

| 製品 | 最初に見せるもの | 完了の扱い | 学ぶ点 |
| --- | --- | --- | --- |
| Mozilla Monitor | 3状態バナー「Let's protect your data」「Your data is protected」「No exposures found」＋件数 | 「Mark as fixed」「Skip for now」、所要時間表示、区切りごとの励まし | トップ3状態、1カード1行動＋2ボタン、脅し調はテストで却下 |
| Google パスワードチェックアップ | 侵害／再利用／弱い の3行＋「Checked just now」 | 「Already changed this password?」「Dismiss warning」 | 0件は数字でなく肯定文、3色に読み上げ文言を対で持つ、最終確認日時 |
| HIBP 2.0 | 入力1つ→「Oh no — pwned!」か「Good news」 | なし | 一覧と詳細の分離、恐怖訴求の排除 |
| Apple セキュリティ勧告 | 理由付き一覧 | 変更で自動解消、できない項目は「非表示」 | 1項目1ボタン、退避は削除でなく非表示 |
| Google ダークウェブレポート（廃止） | 件数と一般論 | なし | 「helpful next steps がない」として廃止。検出だけでは価値がない |
| security-karte.jp | 重大度の目安（加点内訳つき）、「やっておきたいこと」3項目 | なし | 固有名詞入りの3項目、柔らかい命名、根拠の透明化 |
| マイナポータル／DADS | 「やること」「さがす」「お知らせ」 | 未確認 | 「やること」が行政系の標準語に。通知は4種のセマンティック色 |

出典：Mozilla Monitor の実文言は公式リポジトリの locale ファイル（https://github.com/mozilla/blurts-server/tree/main/locales/en ）、設計記事 https://blog.mozilla.org/ux/2020/05/designing-a-content-first-experience-on-firefox-monitor/ 、Google 廃止告知 https://support.google.com/websearch/answer/15191033 、HIBP 2.0 https://www.troyhunt.com/have-i-been-pwned-2-0-is-now-live/ 、security-karte https://security-karte.jp/victims.html 。侵害通知の可読性研究（Zou ら CHI 2019）はヘッジ表現の多用が楽観バイアスを生むと報告 https://yixinzou.github.io/publications/pdf/chi2019-zou.pdf 。

### 3.3 選択とチェックリストの設計パターン

- 選択過多：Scheibehenne 2010（50実験）は平均効果ほぼゼロ、Chernev 2015（99観測）は「選択セットの複雑さ・課題の難しさ・嗜好の不確実性」があると効果あり。本件は「使っているか」を問うだけで不確実性が低い。構造で解決できる。
- NN/g：15件超は全体が見える形に、選択済みはトークンで上部に。ドロップダウンは複数選択に不向き。 https://www.nngroup.com/articles/listbox-dropdown/
- GOV.UK チェックボックス：既定は五十音順だが「最も一般的なものから」が有効なら採用。「該当するものをすべて選択」のヒント。 https://design-system.service.gov.uk/components/checkboxes/
- Baymard：1画面に10件まで表示して切り詰め、6件未満は「これで全部」と誤解される、1件だけ隠さない。自動補完の候補はモバイル4〜8件。 https://baymard.com/blog/truncation-design 、 https://baymard.com/blog/autocomplete-design
- GOV.UK 自動補完：同義語・略称の吸収が必須。 https://designnotes.blog.gov.uk/2017/04/20/were-building-an-autocomplete/
- マネーフォワード：「連携する銀行やカードを入力」の検索＋カテゴリ＋「見つからない方はこちら」。連携先2,400件超で成立。 https://biz.moneyforward.com/support/account/guide/linkage-financial/lf01.html
- GOV.UK タスクリスト（34名×5ラウンド）：タグをボタンと誤認→淡い背景＋濃い文字、行全体をリンク。全大文字は読みにくい。「Completed」を「提出済み」と誤解した事故。 https://design-system.service.gov.uk/patterns/complete-multiple-tasks/ 、 https://designnotes.blog.gov.uk/2023/12/15/working-as-a-community-to-iterate-the-task-list-pattern/
- GOV.UK：フォームの進捗バーは「ほとんど見られず、外しても完了率に差なし」。 https://design-system.service.gov.uk/patterns/question-pages/
- GOV.UK 確認ページ：完了パネル＋「次に何が起きるか」。ブックマークされる。 https://design-system.service.gov.uk/patterns/confirmation-pages/
- NN/g 指標と通知：変化は要素近傍の条件付き指標＋上部バナー1つ、閲覧したら消す。 https://nngroup.com/articles/indicators-validations-notifications
- NN/g モバイルのアコーディオン：展開時に上端へスクロールさせない、最初の項目を既定で開かない。 https://www.nngroup.com/articles/mobile-accordions/
- NN/g ツールチップ：タスク完了に必要な情報を入れない、タッチで動かない。 https://www.nngroup.com/articles/tooltip-guidelines/
- 完了演出：効果を単離した査読研究は見つからず。NN/g は繰り返し見る長いアニメーションの害を指摘。初回のみ短く、`prefers-reduced-motion` を尊重。

### 3.4 日本語タイポグラフィと色（DADS 実トークン値）

- DADS タイポグラフィ：本文・UIは16px以上。14pxは補足のみ、14px未満は不可。本文16pxの行間は170〜175%、18pxは160%。字間は26px以下で2%。ウェイトは400と700の2段階。 https://design.digital.go.jp/dads/foundations/typography/
- DADS 色：テキスト4.5:1、非テキスト3:1、大きい文字の例外を使わない。基本テキスト#333333、キーカラー Blue-900 #0017C1。成功 #197A4B（文字）、エラー #CE0000、警告（橙）#C74700／#AC3E00。フォーカスは Yellow-300 #FFD43D＋黒の2重で変更禁止。 https://design.digital.go.jp/dads/foundations/color/ 、トークン https://cdn.jsdelivr.net/npm/@digital-go-jp/design-tokens@2.1.0/dist/tokens.css
- DADS ボタン：Medium 96×48px、Large 136×56px、ターゲット44px以上。プライマリは1画面に原則1つ。disabled はできる限り避ける。 https://design.digital.go.jp/dads/components/button/usage/
- DADS エレベーション：「影でコントラストは確保できない」。浮いた要素は3:1の境界線を併用。 https://design.digital.go.jp/dads/foundations/elevation/
- システムフォント：iOS の system font は Hiragino Sans（ProN ではない）。Android は Noto Sans CJK JP。Windows 基本は Yu Gothic、BIZ UDPGothic・Meiryo は日本語補助フォント。**`system-ui` は Windows で Yu Gothic UI に解決され本文に不向き**（CSSWG の報告）。 https://developer.apple.com/fonts/system-fonts/ 、 https://learn.microsoft.com/en-us/typography/fonts/windows_11_font_list 、 https://lists.w3.org/Archives/Public/public-css-archive/2022Sep/0979.html
- 表示極性：Piepenbrock ら 2013（Ergonomics）は若年・高齢の両群で黒文字白地が優位と報告。既定はライト、ダークは追従。 PubMed 23654206
- 高齢者×文字サイズの系統的レビュー（PMC9376262）：日本語×iPad×60〜89歳で18pt推奨、ただし大きいほど良いわけではない。

## 4. 設計方針（10原則）

1. **状態ファースト。** 最初の1画面で「あなたは今どういう状態か」と「次にやる1つ」だけを見せる。
2. **1画面1タスク、プライマリボタンは1つ。** ラベルは結果が分かる動詞（「この対策を済みにする」）。
3. **段階的開示は2段まで。** 「何をするか」は常時表示、「なぜ・根拠」は展開、「公式発表の全文」は別ページ。
4. **再認で済ませる。** 入力は選択式、前回の選択・完了状態は常に見える。覚えさせない。
5. **文字18px、行間1.75、ウェイト2種、色はアクセント1＋意味色3。** 装飾より手がかりの明確さ。
6. **タップ領域44px以上、行全体をタップ可能、隠しメニュー禁止。** 最上位の導線は常時表示（4つ以下）。
7. **ステータスは色＋アイコン形状＋日本語ラベルの3点セット。** 色だけに頼らない。赤は「確定した要対処」だけ。
8. **外来語を減らし、責めず、脅さない。** 「ログイン」には一言の説明、「あなたの情報が漏れた」と断定しない、未完了を赤で責めない。
9. **変化は隠さない。** 前回からの変化は上部バナー1つ＋該当行の指標で示し、見たら消す。
10. **助けの導線を同じ位置に固定。** 「家族に見せる」「相談窓口」「よくある質問」を全画面の同じ場所に。

## 5. 情報設計と画面構成

現行の「1ページに全部」から、役割の異なる4画面に分ける。最上位の導線はヘッダーに常時表示し、4つ以内に収める：**ホーム／やること／サービス／設定**（「設定」に引き継ぎ・端末の記録・このサイトについてを収容）。

### 5.1 ホーム（状態ファースト）

```
┌──────────────────────────────────┐
│ じぶんの情報対策        [ホーム][やること][サービス][設定] │
├──────────────────────────────────┤
│ ✓ いまは対策済みです                                   │  ← 3状態のうち1つ。大きく、緑、アイコン付き
│   選んだ 5件のサービスに、まだ対策していない           │
│   漏洩はありません。                                 │
│   最終確認：2026年11月7日                              │
│   [ サービスを追加する ]                               │  ← プライマリ1つ
├──────────────────────────────────┤
│ 最近の公表（選んだサービス以外も含む）                 │  ← 二次情報。3件まで＋「一覧を見る」
│ ・11/2 ノジマオンライン 漏洩を確認                   │
│ ・10/27 So-net 漏洩を確認                            │
└──────────────────────────────────┘
```

3状態の文言（Mozilla Monitor／Google の肯定文の方式）：

| 状態 | 見出し | 補足 | プライマリ |
| --- | --- | --- | --- |
| 要対処 | 「やることが 7件 あります」 | 「3件の漏洩が公表されています。上から順に進めれば大丈夫です。」 | 「やることを見る」 |
| すべて対処済み | 「いまは対策済みです」 | 「続報が出たら、必要なものだけをここに出します。」 | 「サービスを追加する」 |
| 未選択 | 「使っているサービスを選ぶと、関係のある漏洩だけが分かります」 | 「選んだ内容はこの端末にだけ保存されます。」 | 「サービスを選ぶ」 |

再訪時に変化があれば、見出しの上に青いバナーを1つ：「前回（10月30日）のあと、2件のやることが「再確認」になりました」＋該当行へのリンク。

### 5.2 サービスを選ぶ（検索＋よく使われる＋カテゴリ）

```
┌──────────────────────────────────┐
│ 使っているサービスを選ぶ                               │
│ 該当するものをすべて選んでください。あとから追加できます。│
│ [🔍 サービス名で探す（例：セブン、ペイペイ）]          │  ← 別名辞書。候補はモバイル4〜8件
│                                                        │
│ よく使われているサービス                               │  ← 8〜10件、ロゴ付き大きめチェック
│ [□ PayPay] [□ 楽天市場] [□ Amazon] [□ LINE] ...        │
│                                                        │
│ ▸ コンビニ（3）   ▸ 通販・ネットショップ（9）          │  ← 閉じたアコーディオン、件数つき
│ ▸ 旅行（4）       ▸ 携帯・ネット回線（11）             │     中は10件まで＋「さらに表示 (+N)」
│                                                        │
│ この中に使っているものはない →「あとで追加する」       │
├──────────────────────────────────┤
│ 選択中：PayPay ×  楽天市場 ×  タイムズカー ×   [決定]  │  ← 画面下固定。件数だけの表示にしない
└──────────────────────────────────┘
```

- 「よく使われている」の初期順は、事案の有無と会員規模から開発者が決める固定順（利用統計は取らない方針のため）。
- 選択済みはトークンで常時表示し、×で解除。決定後はホームへ戻り、状態が更新されたことを緑バナーで確認。
- 検索の別名辞書は `services.json` の `aliases` を使う（ひらがな・カタカナ・英字・略称）。

### 5.3 やること（タスクリスト型）

```
┌──────────────────────────────────┐
│ やること  7件のうち 2件 完了                           │
│ ┌ タイムズカー  漏洩を確認（9/28）    2/5 完了 ┐     │  ← 事案＝セクション。見出しに件数
│ │ ● タイムズカーを名乗るメールのリンクは押さない  対策済み│  ← 行全体タップ。完了は黒文字・背景なし
│ │ ● 信用情報機関に「本人申告」をする   約10分  未対応 │  ← 未対応＝青タグ
│ │ ● 同じパスワードを使っている他のサービスも変える 再確認│  ← 再確認＝橙タグ＋点（見たら消える）
│ └ ...                                           ┘     │
│ ┌ skyticket  対象者に連絡中（10/16）     0/8 完了 ┐    │
└──────────────────────────────────┘
```

- 行をタップすると、その場で2段目が開く（上端へスクロールしない）：**1文の理由**、やり方の2〜3行、公式の連絡先（電話番号は大きく）、「理由と根拠を見る ∨」（3段目は別ページ）。ボタンは2つ：**「済みにする」**（プライマリ）と**「あとで」**。「済み」はあとから取り消せる。
- ステータス語彙は最小3種＋1：**未対応／対策済み／再確認**（続報で戻ったもの）、事案単位で**取り下げ**（漏洩なしと公表）。「対象者に個別連絡中」は事案の補足文に移し、タグにしない。
- 所要時間の目安（「約3分」「約10分」）をカードに持たせる（最大の障壁は「時間と手間」という被験者の声）。
- 並び順は緊急度固定：高リスク（カード・口座・本人確認書類・マイナンバー）→ パスワード → 連絡先系の注意 → その他。先頭の「リンクを押さない」カードは維持。
- 事案の全カード完了で、セクション末尾に静かな緑パネル「この事案の対策は済みました」。全事案完了でホームが「いまは対策済み」に変わる。演出は初回のみ1〜2秒、`prefers-reduced-motion` で無効。
- 進捗バーは置かない。件数表示のみ。

### 5.4 事案の詳細ページ（既存の静的ページを整理）

上から：状態と公表日 → 断定しない説明（1段落）→ 漏れた情報（種別のみ太字、細目は展開）→ やること（上と同じ行構造、チェックなし）→ 会社の公式窓口 → 公表の経緯（日付とリンクのみ、「事実のメモ」は展開）→ 「このサービスを登録する」。

### 5.5 設定

引き継ぎコード、端末の記録を消す、ホーム画面への追加のやり方、このサイトについて、プライバシー。すべて二次情報なのでホームから外す。

### 5.6 助けの導線（全画面共通、同じ位置）

フッター直上に固定の3リンク：「家族に見せる（このページのURLを共有）」「相談窓口（188／#9110／IPA）」「よくある質問」。アイコンは使わず文字のみ。

## 6. 文言ガイド

| 避ける | 使う | 根拠 |
| --- | --- | --- |
| ログイン | ログイン（サービスに入ること） | 国語研：理解率は認知率より低い。初出で一言説明 |
| アカウント | 会員登録・会員情報 | 高齢者向け実務知見、国語研 |
| 二段階認証、多要素認証 | 確認コードを使う設定 | 動作で表す |
| インストール／アップデート | 入れる／更新する | 総務省調査「英語やカタカナが多い」 |
| ダークウェブ、ハッカー | 使わない | 恐怖訴求はMozillaの実験で効果なし、HIBPも排除 |
| あなたの情報が漏れました | ○○社が漏洩（のおそれ）を公表しました | 企画書の原則、Zou ら（ヘッジ表現の乱用も避ける） |
| 未完了（赤） | 未対応（青） | GOV.UK：赤はエラー専用 |
| 完了 | 対策済み | GOV.UK の「Completed＝提出済み」誤解事故。全体は「いまは対策済み」 |
| 対象者に個別連絡中 | 会社が対象の人に連絡しています（補足文） | タグにしない |
| スキップ | あとで | 低自信ユーザーへの配慮（Grammarly 事例の再フレーミング） |

- 1文は短く、1段落1アイデア。見出しは質問文か動詞で。
- 数字は「約660万件」のように会社の言い回しをそのまま。自分に関係しない大きな数字を前面に出さない（Monitor が削除した知見）。
- 0件の状態は数字でなく肯定文（「漏洩したパスワードは見つかりませんでした」）。

## 7. デザイントークン（提案値。コントラスト比は WCAG 式で計算）

### 7.1 フォントとサイズ

```css
:root {
  --font-sans: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Noto Sans CJK JP",
               "BIZ UDPGothic", "Yu Gothic Medium", "Yu Gothic", Meiryo, sans-serif; /* system-ui は入れない */
  --text-display: 2rem;     /* 32px / 1.4  700  H1 */
  --text-title:   1.5rem;   /* 24px / 1.5  700  H2 */
  --text-heading: 1.25rem;  /* 20px / 1.5  700  行の見出し */
  --text-body:    1.125rem; /* 18px / 1.75 400  本文。字間 .02em */
  --text-ui:      1rem;     /* 16px / 1.5  ボタン・ラベル */
  --text-caption: .875rem;  /* 14px / 1.5  日付などメタ情報のみ */
  --measure: 38em;          /* 本文の最大行長 ≒ 36〜40字 */
}
html { font-size: 100%; }   /* OS・ブラウザの文字設定に追従。拡大ボタンは置かない */
```

ウェイトは400と700のみ。イタリック不使用。タイプスタイルは5種＋補助1種。

### 7.2 余白・角丸・ターゲット・フォーカス

- 余白：4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px（8基調）。セクション間32〜48、行内16〜24、左右ガター16（モバイル）。
- 角丸：8px（ボタン・入力）、12px（カード・バナー）、全丸（タグ）。
- ターゲット：最小44×44px。主ボタン高さ48px、最重要CTAは56px。隣接は8px以上離す。
- 影：使わない。境界は1pxの線と面の色差で表す（DADS「影でコントラストは確保できない」）。
- フォーカス：黒4px＋黄 #FFD43D 2px の2重（DADS 準拠、変更しない）。
- モーション：150〜200ms、`prefers-reduced-motion: reduce` で無効化。

### 7.3 ライト（既定）

| トークン | 値 | 用途 | 対白 |
| --- | --- | --- | --- |
| bg | #FFFFFF | ページ | — |
| surface-sunken | #F2F2F2 | 区切り面 | — |
| text | #1A1A1A | 本文 | 17.4 |
| text-secondary | #4D4D4D | 補足 | 8.5 |
| border | #767676 | 入力枠・行の境界（3:1必要） | 4.5 |
| divider | #CCCCCC | 装飾的区切り | — |
| accent | #0017C1 | リンク・主ボタン・「未対応」タグ文字 | 11.1 |
| accent-tint | #E8F1FE | 選択行・情報バナー背景 | 本文15.3 |
| success | #197A4B | 「対策済み」「いまは対策済み」のアイコン・文字 | 5.4 |
| success-tint | #E6F5EC | 完了パネル背景 | 本文15.5 |
| warning | #AC3E00（文字）／#C74700（アイコン・枠） | 「再確認」「おそれ」 | 6.1／4.9 |
| warning-tint | #FFEEE2 | 背景 | 本文15.4 |
| danger | #CE0000 | 確定した要対処の強調のみ | 5.8 |
| danger-tint | #FDEEEE | 背景 | 本文15.5 |
| focus | #000000 ＋ #FFD43D | 2重リング | 21.0／14.7 |

### 7.4 ダーク（OS設定に追従）

| トークン | 値 | 対#121212 |
| --- | --- | --- |
| bg / surface | #121212 / #1E1E1E（1px境界必須） | — |
| text | #E6E6E6（純白を避ける） | 15.0 |
| text-secondary | #B3B3B3 | 8.9 |
| border | #767676 | 4.1 |
| accent | #9DB7F9（文字）／ボタン背景 #7096F8＋黒文字 | 9.4／6.6 |
| success | #71C598（文字）／#51B883（アイコン） | 9.1／7.6 |
| warning | #FFA66D／#FF8D44 | 9.8／8.2 |
| danger | #FF9696／#FF7171 | 9.0／7.0 |
| focus | #FFD43D ＋ #121212 | 13.2 |

### 7.5 ステータスの3点セット

| 状態 | 色 | アイコン形状 | ラベル |
| --- | --- | --- | --- |
| 未対応 | accent（青） | ○（空の円） | 未対応 |
| 対策済み | 黒文字・背景なし（ダークは text） | ✓（円） | 対策済み |
| 再確認 | warning（橙） | !（三角） | 再確認 |
| 取り下げ | text-secondary（灰） | –（円） | 漏洩なしと公表 |
| 全体：いまは対策済み | success（緑） | ✓（円、大） | いまは対策済みです |

アイコンはインラインSVG（CSP の `img-src 'self'` と整合、外部アイコンフォントは使わない）。

## 8. 既存の技術制約との整合

- CSP（`style-src 'self'`、inline style 禁止）：進捗やトークンの表示は class 切り替えだけで実現する。幅をJSで変えない（進捗バーは廃止するので問題なし）。
- DOM API のみ（innerHTML 不使用）：行・タグ・展開は `createElement` で組む。現行の `el()` ヘルパーを継続。
- 外部フォント・アイコン不可：システムフォントスタックとインラインSVG。
- Service Worker なし：状態はすべて `localStorage`、変化の判定は `last_updated` と最終訪問日。
- 静的ページ（事案別）はビルド時生成を継続。検索の自動補完はクライアントJSで `services.json` の `aliases` を引く。

## 9. 実装計画

| 段階 | 内容 | 検証 |
| --- | --- | --- |
| 1. トークンと骨格 | `app.css` を新トークンに置換。4画面のルーティング（ハッシュ）、ヘッダー導線、助けの導線 | `check-dist`、コントラスト比の自動計算スクリプト |
| 2. ホームの3状態 | 状態計算をホームに移し、3状態の文言と青バナー | 3状態をそれぞれ再現したスクリーンショット |
| 3. サービス選択 | 検索（別名辞書）、よく使われる上位、カテゴリ折りたたみ、固定サマリー | 候補数4〜8、ターゲット44pxの自動チェック |
| 4. やること | タスクリスト型、2段目の展開、「済みにする／あとで」、再確認の指標、所要時間 | DOMダンプで行構造・タグの非ボタン化を確認 |
| 5. 詳細ページと設定 | 静的ページの整理、設定画面への移動 | `check-dist` |
| 6. データ追加 | `cards.json` に `minutes`（所要時間）と `urgency`（並び順）、`services.json` の `aliases` 拡充と `popular_rank` | `validate.mjs` に項目追加 |

工数の目安は段階1〜4で1〜2週間（1人）。段階5〜6は半日ずつ。

## 10. 未検証・判断が必要な事項

- Apple「セキュリティ」画面の全クリア文言、1Password・ノートンの全クリア画面は公開資料で確認できず。
- BIZ UDPGothic の高齢者向け有効性の定量研究は公開されていない（UD新ゴ・UDデジタル教科書体の研究のみ）。「UD設計」としてのみ扱う。
- Noto Sans JP が全 Windows 端末に存在するかは未確認（2025年の更新で追加、言語設定依存の可能性）。
- 「よく使われているサービス」の順位：利用統計を取らない方針のため、開発者の固定順になる。判断が必要。
- 「家族に見せる」はURL共有だけにするか、親の選択を子の端末に載せる「代理設定」（企画書フェーズ2）まで含めるか。本報告はURL共有までを対象とした。
- 完了演出の効果は実証されていない。入れるなら初回のみ・短く。
- 1画面ハイブリッド（推奨）と「1カテゴリ1ページ」ウィザードのどちらが高齢者に合うかは、実利用者での比較が必要。推奨は前者。

## 11. 出典（主要）

- NN/g：minimize-cognitive-load, progressive-disclosure, chunking, recognition-and-recall, visual-hierarchy-ux-definition, usability-seniors-improvements, usability-for-senior-citizens, hamburger-menus, icon-usability, cards-component, listbox-dropdown, alphabetical-sorting-must-mostly-die, site-search-suggestions, wizards, mobile-app-onboarding, indicators-validations-notifications, visibility-system-status, accordions-complex-content, mobile-accordions, tooltip-guidelines, animation-usability, error-message-guidelines, confirmation-dialog, plain-language-experts（すべて https://www.nngroup.com/articles/<slug>/ ）
- GOV.UK Design System：checkboxes, select, tag, task-list, details, notification-banner, button, complete-multiple-tasks, question-pages, check-answers, confirmation-pages（ https://design-system.service.gov.uk/ ）、 https://alphagov.github.io/accessible-autocomplete/ 、 https://designnotes.blog.gov.uk/2015/07/03/one-thing-per-page/ 、 https://userresearch.blog.gov.uk/2015/08/13/no-more-accordions-how-to-choose-a-form-structure/
- Baymard：truncation-design, autocomplete-design, allow-applying-of-multiple-filter-values, how-to-design-applied-filters（ https://baymard.com/blog/ ）
- デジタル庁 DADS：typography, color, color/accessibility, spacing, corner-shapes, elevation, components/button, components/checkbox, components/select, components/notification-banner（ https://design.digital.go.jp/dads/ ）、デザイントークン v2.1.0、ウェブアクセシビリティ導入ガイドブック（2025-10-16）
- W3C WCAG 2.2 Understanding：1.4.1, 1.4.3, 1.4.4, 1.4.11, 1.4.12, 2.4.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8（ https://www.w3.org/WAI/WCAG22/Understanding/ ）、 https://www.w3.org/WAI/older-users/developing/
- 日本の研究・公的資料：総務省 2011（000115449.pdf）、総務省 通信利用動向調査 2023、産総研 Synthesiology 6(1) 2013、高橋ら 日本教育工学雑誌 27(2) 2003、人間生活工学研究センター 2004、国語研「外来語」言い換え提案、日本SPセンター 2023
- 類似サービス：Mozilla blurts-server locales、Mozilla UX ブログ 2020／2019、HIBP 2.0、Google パスワードチェックアップ（Chromium 文字列）、Google ダークウェブレポート終了告知、1Password Watchtower、Bitwarden Reports、ノートン・トレンドマイクロのヘルプ、security-karte.jp、警視庁デジポリス、マイナポータル
- 学術：Scheibehenne 2010、Chernev 2015、Iyengar & Lepper 2000、Nunes & Drèze 2006、Zou ら CHI 2019、Piepenbrock ら Ergonomics 2013、PMC9376262
