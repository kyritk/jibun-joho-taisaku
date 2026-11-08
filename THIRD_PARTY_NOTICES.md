# 第三者の素材と、そのライセンス

このリポジトリ自体のライセンスは、コードが GNU AGPL-3.0（`LICENSE`）、`data/` 配下のデータが CC BY-NC-SA 4.0（`data/LICENSE`）です（README「ライセンス」参照）。
次の素材は別の作者の著作物で、それぞれのライセンスに従います。
ライセンス全文をここに同梱することで利用条件を満たしています。画面上への表示義務はありません。

## Tabler Icons（`assets/icons/` のうち、先頭にコメント `version:` があるファイル）

- 配布元: https://github.com/tabler/tabler-icons （filled 版）
- ライセンス: MIT License
- 変更点: `<symbol>` に切り出すため、ビルド時に `<path>` 要素だけを取り出して使う（`scripts/build.mjs`）。形は変えていない。

```
MIT License

Copyright (c) 2020-2026 Paweł Kuna

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 自作アイコン（`assets/icons/` のうち、先頭にコメント `custom:` があるファイル）

`ring.svg`、`bank.svg`、`store.svg`、`mynumber.svg`、`mail-x.svg`、`table.svg` はこのリポジトリのために描いたもので、コードと同じ AGPL-3.0 です。

## 使っていないもの

Web フォント、CDN、外部画像、解析スクリプトは使っていません（docs/threat-model.md）。
いらすとや等の無料素材サイトの画像は、公開リポジトリへの同梱が規約上あいまいなため使っていません（docs/ux-visual-research.md 6章）。
