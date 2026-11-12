# 尺貫法換算（shakkanho）

尺・寸・間・丈・町・里・坪・畳・反・升・合・斗・石・貫・匁をメートル法と相互換算する、日本語の工具＋データサイト。

## 特徴

- **ゼロ依存**：フレームワーク無し。`node build.mjs` だけで 37 ページの静的 HTML を生成（約 600KB）
- **データ駆動**：`data/units.json` の 40 行の換算係数から、全ページの早見表・内リンク・canonical を自動生成
- **恒等式テスト**：ビルド時に 16 本の恒等式（10寸=1尺 / 121坪=400㎡ / 1000匁=1貫 など）を検証し、1 本でも落ちればビルド中止
- **SSG のみ**：クライアントは 4.6KB の JS で即時換算。API コスト・DB・サーバー無し
- **SEO 基礎**：全ページ個別の title/description/canonical、パンクロード、FAQPage + BreadcrumbList + WebApplication の JSON-LD、sitemap.xml、robots.txt

## 構成

```
data/units.json      換算係数（分数で保持し丸め誤差を排除）
data/specs.json      地域差・業界規格（畳4規格・壁紙ロール・塗布量・比重など）
data/pages.json      30ページの本文・FAQ・ウィジェット定義
build.mjs            静的生成器 + 恒等式テスト
src/assets/           CSS / クライアントJS / favicon
test/units.test.mjs  node:test による係数テスト
dist/                生成物（Vercel の outputDirectory）
```

## コマンド

```bash
node build.mjs                    # ビルド（dist/ へ出力）
node --test test/units.test.mjs   # 係数テスト
node serve.mjs                    # ローカル確認 http://localhost:4321
```

## ページを増やすには

`data/pages.json` に 1 オブジェクト追加するだけ。単位を増やす場合は `data/units.json` に 1 行追加すれば、その単位を使う全ページの換算・早見表・内リンクが自動で揃う。

## データ方針

- 法定換算値（1891年度量衡法以降）は分数で保持。`10/33 m` を `0.30303` に丸めない
- 地域差・業界慣例の値は `note` に口径を明記し、ページ上でも「目安」と表示
- 更新が早いデータ（為替・税率・地価・天気）は扱わない

## デプロイ

Vercel の Build Command `node build.mjs`、Output Directory `dist`。

## 今後

- GSC 登録 → sitemap 送信 → 「曝光あり・クリック0」のクエリを週次で拾って TD を直す
- 同一エンジンで第2クラスタ（温度・速度・圧力・紙・写真サイズ）へ横展開
- 外リンクは月 5〜10 件、3〜4 か月継続
