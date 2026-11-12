import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";

const ROOT = dirname(new URL(import.meta.url).pathname);
const DIST = join(ROOT, "dist");
const SITE = process.env.SITE_URL || "https://shakkanho.vercel.app";
const BUILD_DATE = new Date().toISOString().slice(0, 10);

const unitsDoc = JSON.parse(readFileSync(join(ROOT, "data/units.json"), "utf8"));
const pagesDoc = JSON.parse(readFileSync(join(ROOT, "data/pages.json"), "utf8"));
const units = unitsDoc.units;
const pages = pagesDoc.pages;
const byId = Object.fromEntries(units.map((u) => [u.id, u]));

/* ---------- 恒等式テスト（落ちたらビルド中止） ---------- */
const factor = (u) => u.num / u.den;
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b));
const tests = [
  ["10寸 = 1尺", 10 * factor(byId.sun), factor(byId.shaku)],
  ["10尺 = 1丈", 10 * factor(byId.shaku), factor(byId.jo)],
  ["6尺 = 1間", 6 * factor(byId.shaku), factor(byId.ken)],
  ["60間 = 1町", 60 * factor(byId.ken), factor(byId.cho)],
  ["36町 = 1里", 36 * factor(byId.cho), factor(byId.ri)],
  ["1.25尺 = 1鯨尺", 1.25 * factor(byId.shaku), factor(byId.kujira)],
  ["121坪 = 400㎡", 121 * factor(byId.tsubo), 400],
  ["300坪 = 1反", 300 * factor(byId.tsubo), factor(byId.tan)],
  ["10反 = 1町歩", 10 * factor(byId.tan), factor(byId.chobu)],
  ["30坪 = 1畝", 30 * factor(byId.tsubo), factor(byId.se)],
  ["10合 = 1升", 10 * factor(byId.go), factor(byId.sho)],
  ["10升 = 1斗", 10 * factor(byId.sho), factor(byId.to)],
  ["10斗 = 1石", 10 * factor(byId.to), factor(byId.koku)],
  ["1000匁 = 1貫", 1000 * factor(byId.monme), factor(byId.kan)],
  ["16両 = 1斤", 16 * factor(byId.ryo), factor(byId.kin)],
  ["1尺×1尺×1寸 = 1才", factor(byId.shaku) ** 2 * factor(byId.sun), factor(byId.sai)],
];
let failed = 0;
for (const [name, got, want] of tests) {
  if (rel(got, want) > 1e-9) {
    console.error(`✗ ${name}: ${got} != ${want}`);
    failed++;
  }
}
if (failed) {
  console.error(`恒等式テスト失敗 ${failed} 件。ビルドを中止します。`);
  process.exit(1);
}
console.log(`✓ 恒等式テスト ${tests.length} 件すべて通過`);

/* ---------- ユーティリティ ---------- */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = (v) => {
  if (!isFinite(v)) return "—";
  const p = Number(v.toPrecision(6));
  return p.toLocaleString("ja-JP", { maximumFractionDigits: 6 });
};
const catName = { length: "長さ", area: "面積", volume: "容積", weight: "重さ", construction: "建築・住宅" };
const catPath = { length: "/length/", area: "/area/", volume: "/volume/", weight: "/weight/", construction: "/construction/" };

const listByCat = {};
for (const p of pages) (listByCat[p.group] ??= []).push(p);

/* ---------- 共通レイアウト ---------- */
const nav = `
<header class="site-header">
  <div class="inner">
    <a class="brand" href="/"><span class="brand-mark">尺</span><span class="brand-text">尺貫法換算</span></a>
    <nav class="site-nav">
      <a href="/length/">長さ</a>
      <a href="/area/">面積</a>
      <a href="/volume/">容積</a>
      <a href="/weight/">重さ</a>
      <a href="/construction/">建築</a>
    </nav>
  </div>
</header>`;

const footer = (year) => `
<footer class="site-footer">
  <div class="inner">
    <p class="foot-note">本サイトの数値は換算の目安です。契約・登記・法令判断に関わる場合は、専門家または自治体窓口でご確認ください。</p>
    <p class="foot-links"><a href="/all/">全ページ一覧</a> · <a href="/length/">長さ</a> · <a href="/area/">面積</a> · <a href="/volume/">容積</a> · <a href="/weight/">重さ</a> · <a href="/construction/">建築</a></p>
    <p class="foot-copy">© ${year} 尺貫法換算</p>
  </div>
</footer>`;

function layout({ title, desc, path, body, jsonld = [] }) {
  const canonical = SITE + path;
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="尺貫法換算">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary">
<link rel="stylesheet" href="/assets/app.css">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("\n")}
</head>
<body>
${nav}
<main class="container">
${body}
</main>
${footer(new Date().getFullYear())}
<script type="application/json" id="unit-data">${JSON.stringify(
    units.map((u) => ({ id: u.id, ja: u.ja, f: u.num / u.den }))
  )}</script>
<script src="/assets/app.js" defer></script>
</body>
</html>`;
}

/* ---------- ウィジェット ---------- */
function convertWidget(w) {
  const from = byId[w.from];
  const targets = w.to.map((id) => byId[id]);
  return `
<div class="tool" data-tool="convert">
  <div class="tool-lead">
    <label class="field">
      <span class="field-label">数値</span>
      <input type="number" step="any" value="1" data-unit="${from.id}" aria-label="${esc(from.ja)}の数値">
    </label>
    <span class="eq">＝</span>
  </div>
  <div class="results">
    ${targets
      .map(
        (t) => `
    <label class="result">
      <input type="number" step="any" data-unit="${t.id}" aria-label="${esc(t.ja)}の換算結果">
      <span class="result-unit">${esc(t.ja)}</span>
    </label>`
      )
      .join("")}
  </div>
  <p class="tool-hint">どちらの欄に入力しても、他の単位が同時に更新されます。</p>
</div>`;
}

const CALC_FIELDS = {
  sai: [
    { k: "t", label: "厚み", unit: "cm", v: 3, step: 0.1 },
    { k: "w", label: "幅", unit: "cm", v: 10, step: 0.1 },
    { k: "len", label: "長さ", unit: "m", v: 3, step: 0.1 },
  ],
  tsuboTanka: [
    { k: "price", label: "価格", unit: "万円", v: 3000, step: 1 },
    { k: "area", label: "面積", unit: "", v: 100, step: 0.01, select: { k: "unit", opts: [["tsubo", "坪"], ["m2", "㎡"]] } },
  ],
  tsuboPrice: [
    { k: "tanka", label: "坪単価", unit: "万円/坪", v: 30, step: 0.1 },
    { k: "tsubo", label: "坪数", unit: "坪", v: 100, step: 0.01 },
  ],
  wallpaper: [
    { k: "wsum", label: "壁の幅合計", unit: "m", v: 20, step: 0.1 },
    { k: "h", label: "壁の高さ", unit: "m", v: 2.4, step: 0.01 },
    { k: "repeat", label: "柄リピート", unit: "cm", v: 0, step: 0.5 },
    { k: "rollW", label: "ロール巾", unit: "cm", v: 92, step: 1 },
    { k: "rollL", label: "ロール長", unit: "m", v: 30, step: 1 },
    { k: "margin", label: "余裕", unit: "%", v: 5, step: 1 },
  ],
  paint: [
    { k: "area", label: "塗装面積", unit: "㎡", v: 50, step: 0.1 },
    { k: "coats", label: "塗り回数", unit: "回", v: 2, step: 1 },
    { k: "coverage", label: "塗布量", unit: "㎡/L", v: 10, step: 0.1 },
  ],
  gravel: [
    { k: "area", label: "面積", unit: "㎡", v: 10, step: 0.1 },
    { k: "depth", label: "厚さ", unit: "cm", v: 5, step: 0.5 },
    { k: "density", label: "比重", unit: "t/m³", v: 1.6, step: 0.05 },
    { k: "bag", label: "1袋", unit: "kg", v: 20, step: 1 },
  ],
  tatamiCount: [
    { k: "height", label: "縦", unit: "m", v: 3.52, step: 0.01 },
    { k: "width", label: "横", unit: "m", v: 2.64, step: 0.01 },
    {
      k: "spec", label: "畳の規格", unit: "", v: "1.62", type: "select",
      opts: [["1.62", "帖（1.62㎡基準）"], ["1.824", "京間（1.824㎡）"], ["1.6562", "中京間（1.656㎡）"], ["1.5488", "江戸間（1.549㎡）"], ["1.445", "団地間（1.445㎡）"]],
    },
  ],
  kenpei: [
    { k: "site", label: "敷地面積", unit: "㎡", v: 100, step: 0.1 },
    { k: "kenpei", label: "建ぺい率", unit: "%", v: 60, step: 1 },
    { k: "yoseki", label: "容積率", unit: "%", v: 200, step: 1 },
  ],
};

const CALC_OUTS = {
  sai: [["m3", "材積", "m³"], ["sai", "才", "才"], ["l", "容積", "L"]],
  tsuboTanka: [["tankaTsubo", "坪単価", "万円/坪"], ["tankaM2", "㎡単価", "万円/㎡"], ["m2", "面積", "㎡"]],
  tsuboPrice: [["total", "総額", "万円"], ["totalYen", "総額", "円"], ["m2", "面積", "㎡"]],
  wallpaper: [["strips", "必要巾数", "巾"], ["perRoll", "1ロールの取れ巾数", "巾"], ["rolls", "必要ロール数", "本"]],
  paint: [["liters", "必要量", "L"], ["cans", "4L缶の目安", "缶"]],
  gravel: [["m3", "体積", "m³"], ["ton", "重量", "t"], ["bags", "袋数", "袋"]],
  tatamiCount: [["m2", "面積", "㎡"], ["jo", "畳数", "畳"], ["tsubo", "坪数", "坪"]],
  kenpei: [["kenchiku", "建築面積の上限", "㎡"], ["yosekiArea", "延床面積の上限", "㎡"], ["kenchikuTsubo", "建築面積", "坪"], ["yosekiTsubo", "延床面積", "坪"]],
};

function calcWidget(calcId) {
  const fields = CALC_FIELDS[calcId];
  return `
<div class="tool" data-tool="calc" data-calc="${calcId}">
  <div class="calc-fields">
    ${fields
      .map((f) =>
        f.type === "select"
          ? `<label class="field"><span class="field-label">${esc(f.label)}</span><select data-field="${f.k}">${f.opts
              .map(([v, l]) => `<option value="${v}"${String(v) === String(f.v) ? " selected" : ""}>${esc(l)}</option>`)
              .join("")}</select></label>`
          : `<label class="field"><span class="field-label">${esc(f.label)}${f.unit ? ` <em>${esc(f.unit)}</em>` : ""}</span><input type="number" step="${f.step}" value="${f.v}" data-field="${f.k}"></label>`
      )
      .join("")}
  </div>
  <div class="calc-results">
    ${CALC_OUTS[calcId]
      .map(
        ([k, label, unit]) => `
    <div class="calc-out"><span class="calc-out-label">${esc(label)}</span><strong data-out="${k}">—</strong><span class="calc-out-unit">${esc(unit)}</span></div>`
      )
      .join("")}
  </div>
</div>`;
}

function tableBlock(p) {
  const t = p.table;
  if (!t) return "";
  const from = byId[t.from], to = byId[t.to];
  const rows = [];
  for (let i = 1; i <= t.rows; i++) {
    rows.push(`<tr><th>${fmt(i)}${esc(from.ja)}</th><td>${fmt((i * factor(from)) / factor(to))}${esc(to.ja)}</td></tr>`);
  }
  return `
<section class="block">
  <h2>${esc(from.ja)}→${esc(to.ja)} 早見表（1〜${t.rows}${esc(from.ja)}）</h2>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>${esc(from.ja)}</th><th>${esc(to.ja)}</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>
</section>`;
}

/* ---------- ページ生成 ---------- */
function crumbs(items) {
  return `<nav class="breadcrumb">${items
    .map((it, i) => (i === items.length - 1 ? `<span>${esc(it.label)}</span>` : `<a href="${it.href}">${esc(it.label)}</a><span class="sep">›</span>`))
    .join("")}</nav>`;
}

function relatedBlock(p) {
  const siblings = listByCat[p.group].filter((x) => x.slug !== p.slug).slice(0, 8);
  const others = pages.filter((x) => x.group !== p.group).slice(0, 4);
  const link = (x) => `<li><a href="/${x.slug}/">${esc(x.h1)}</a></li>`;
  return `
<section class="block related">
  <h2>関連ページ</h2>
  <div class="related-cols">
    <div><h3>${esc(catName[p.group])}の換算</h3><ul>${siblings.map(link).join("")}</ul></div>
    <div><h3>よく使う換算</h3><ul>${others.map(link).join("")}<li><a href="${catPath[p.group]}">${esc(catName[p.group])}の一覧</a></li></ul></div>
  </div>
</section>`;
}

function faqBlock(p) {
  if (!p.faq?.length) return "";
  return `
<section class="block">
  <h2>よくある質問</h2>
  <dl class="faq">
    ${p.faq.map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join("")}
  </dl>
</section>`;
}

for (const p of pages) {
  const path = `/${p.slug}/`;
  const widget = p.widget.type === "convert" ? convertWidget(p.widget) : calcWidget(p.widget.calcId);
  const body = `
${crumbs([{ label: "ホーム", href: "/" }, { label: catName[p.group], href: catPath[p.group] }, { label: p.h1 }])}
<div class="page-head">
  <p class="kicker">${esc(catName[p.group])}の換算</p>
  <h1>${esc(p.h1)}</h1>
  <p class="lead">${esc(p.intro)}</p>
</div>
${widget}
<section class="block">
  <h2>計算式と定義</h2>
  <div class="formula"><code>${esc(p.formula)}</code></div>
  <p>${esc(p.origin)}</p>
</section>
${tableBlock(p)}
${faqBlock(p)}
${relatedBlock(p)}`;

  const jsonld = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ホーム", item: SITE + "/" },
        { "@type": "ListItem", position: 2, name: catName[p.group], item: SITE + catPath[p.group] },
        { "@type": "ListItem", position: 3, name: p.h1, item: SITE + path },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: p.faq.map(([q, a]) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: p.h1,
      url: SITE + path,
      applicationCategory: "UtilityApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
      inLanguage: "ja",
    },
  ];

  const html = layout({ title: p.title, desc: p.desc, path, body, jsonld });
  mkdirSync(join(DIST, p.slug), { recursive: true });
  writeFileSync(join(DIST, p.slug, "index.html"), html);
}

/* ---------- カテゴリハブ ---------- */
for (const [group, list] of Object.entries(listByCat)) {
  const path = catPath[group];
  const body = `
${crumbs([{ label: "ホーム", href: "/" }, { label: catName[group] }])}
<div class="page-head">
  <p class="kicker">一覧</p>
  <h1>${esc(catName[group])}の換算ツール</h1>
  <p class="lead">${esc(group === "construction" ? "木材材積・坪単価・壁紙・塗料・砂利・建ぺい率など、住宅と建築の実務計算をまとめています。" : `${catName[group]}に関する尺貫法の単位を、すべてその場で換算できます。`)}</p>
</div>
<section class="block">
  <h2>${esc(catName[group])}のページ（${list.length}件）</h2>
  <ul class="page-list">
    ${list.map((x) => `<li><a href="/${x.slug}/"><strong>${esc(x.h1)}</strong><span>${esc(x.desc)}</span></a></li>`).join("")}
  </ul>
</section>`;
  const html = layout({
    title: `${catName[group]}の換算ツール一覧｜尺貫法換算`,
    desc: `${catName[group]}の尺貫法換算ページを一覧にしています。${list.slice(0, 4).map((x) => x.h1).join("、")}など。`,
    path,
    body,
    jsonld: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${catName[group]}の換算ツール`,
        url: SITE + path,
        inLanguage: "ja",
      },
    ],
  });
  mkdirSync(join(DIST, group), { recursive: true });
  writeFileSync(join(DIST, group, "index.html"), html);
}

/* ---------- 全ページ一覧 ---------- */
{
  const groups = Object.entries(listByCat);
  const body = `
${crumbs([{ label: "ホーム", href: "/" }, { label: "全ページ一覧" }])}
<div class="page-head">
  <p class="kicker">サイトマップ</p>
  <h1>全ページ一覧</h1>
  <p class="lead">尺貫法の換算・住宅の実務計算を、カテゴリごとにまとめています。全${pages.length}ページ。</p>
</div>
${groups
  .map(
    ([g, list]) => `
<section class="block">
  <h2>${esc(catName[g])}</h2>
  <ul class="page-list compact">
    ${list.map((x) => `<li><a href="/${x.slug}/">${esc(x.h1)}</a></li>`).join("")}
  </ul>
</section>`
  )
  .join("")}`;
  const html = layout({
    title: "全ページ一覧｜尺貫法換算",
    desc: `尺貫法の換算と住宅実務計算の全ページ一覧（${pages.length}ページ）。`,
    path: "/all/",
    body,
    jsonld: [{ "@context": "https://schema.org", "@type": "SiteNavigationElement", name: "全ページ一覧", url: SITE + "/all/" }],
  });
  mkdirSync(join(DIST, "all"), { recursive: true });
  writeFileSync(join(DIST, "all", "index.html"), html);
}

/* ---------- ホーム ---------- */
{
  const quick = ["shaku", "tsubo", "tatami", "sho", "kan", "ken", "wallpaper", "kenpei"].map((s) => pages.find((p) => p.slug === s));
  const body = `
<div class="hero">
  <p class="kicker">尺貫法・和の単位</p>
  <h1>尺・寸・間・坪・貫・升を、その場で換算</h1>
  <p class="lead">1尺は何cm、1坪は何㎡、1貫は何kg。尺貫法の単位をメートル法と相互換算し、早見表と計算式も一緒に確認できます。入力すると他の単位が同時に更新されます。</p>
</div>
<section class="block">
  <h2>よく使う換算</h2>
  <div class="card-grid">
    ${quick.map((p) => `<a class="card" href="/${p.slug}/"><span class="card-cat">${esc(catName[p.group])}</span><strong>${esc(p.h1)}</strong><span class="card-desc">${esc(p.desc.split("。")[0])}。</span></a>`).join("")}
  </div>
</section>
<section class="block">
  <h2>カテゴリから探す</h2>
  <div class="cat-grid">
    ${Object.entries(listByCat)
      .map(
        ([g, list]) => `
    <a class="cat-card" href="${catPath[g]}">
      <strong>${esc(catName[g])}</strong>
      <span>${list.length}ページ</span>
      <em>${esc(list.slice(0, 3).map((x) => x.h1).join(" / "))}</em>
    </a>`
      )
      .join("")}
  </div>
</section>
<section class="block note-block">
  <h2>このサイトについて</h2>
  <p>換算値は1891年の度量衡法以降の法定値にもとづいています。畳・俵・尺モジュールなど地域や業界で幅のある数値は、ページ内で口径を明示しています。数値は概算の目安としてご利用ください。</p>
  <p><a href="/all/">全${pages.length}ページの一覧を見る</a></p>
</section>`;
  const html = layout({
    title: "尺貫法換算｜1尺は何cm・1坪は何㎡・1貫は何kg を即換算",
    desc: "尺・寸・間・丈・町・里・坪・畳・反・升・合・斗・石・貫・匁をメートル法と相互換算。早見表と計算式、住宅実務の計算ツールをまとめています。",
    path: "/",
    body,
    jsonld: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "尺貫法換算",
        url: SITE,
        inLanguage: "ja",
      },
    ],
  });
  mkdirSync(DIST, { recursive: true });
  writeFileSync(join(DIST, "index.html"), html);
}

/* ---------- sitemap / robots ---------- */
const urls = ["/", "/all/", ...Object.values(catPath), ...pages.map((p) => `/${p.slug}/`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${BUILD_DATE}</lastmod></url>`).join("\n")}
</urlset>`;
writeFileSync(join(DIST, "sitemap.xml"), sitemap);
writeFileSync(join(DIST, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

/* ---------- アセット ---------- */
cpSync(join(ROOT, "src/assets"), join(DIST, "assets"), { recursive: true });
writeFileSync(join(ROOT, "dist/.nojekyll"), "");

console.log(`✓ 生成完了: ${pages.length}ページ + ハブ${Object.keys(listByCat).length} + 一覧 + ホーム`);
console.log(`✓ 出力: ${DIST}`);
