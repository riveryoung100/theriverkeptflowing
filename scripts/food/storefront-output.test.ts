/** Run after astro build. Checks generated pages, links and non-transactional boundary. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { TABLE_PRODUCTS } from '../../src/lib/food/table-catalog';
const homePath = 'dist/client/the-table/index.html';
test('built landing and every catalog route link consistently and preserve navigation', async () => {
  const home = await readFile(homePath, 'utf8');
  assert.ok((home.match(/href="\/the-table\/"/g) ?? []).length >= 2);
  for (const product of TABLE_PRODUCTS) {
    assert.ok(home.includes(`href="${product.path}"`));
    const html = await readFile(`dist/client${product.path}index.html`, 'utf8');
    assert.ok(html.includes(product.name)); assert.ok(html.includes(product.id)); assert.ok(html.includes('href="/the-table/"'));
    assert.ok(html.includes('Allergen review is not complete')); assert.ok(html.includes('Concept illustration'));
    assert.ok(html.includes('Not yet confirmed')); assert.ok(html.includes('Ordering is not yet open.'));
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${anchor}"`), `Broken fragment ${anchor}`);
  }
});
test('built pages expose no price/nutrition inventions, owner finances or live checkout', async () => {
  for (const path of [homePath, ...TABLE_PRODUCTS.map(p => `dist/client${p.path}index.html`)]) {
    const html = await readFile(path, 'utf8');
    assert.ok(html.includes('Payments and preorders remain unavailable.'));
    assert.doesNotMatch(html, /vie naturelle|recipe-lab|weeklyProfitTarget|200 weekly|evidenceReference|sourceReference|stripe|create-checkout|<form\b|\$\d|kcal|application\/ld\+json[^<]*Offer/i);
    // Shared navigation button is permitted; every Table purchase button stays disabled.
    const tableMain = html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
    assert.ok(tableMain);
    for (const [button] of tableMain.matchAll(/<button\b[^>]*>/g)) assert.match(button, /\bdisabled\b/);
    for (const [input] of tableMain.matchAll(/<input\b[^>]*type="number"[^>]*>/g)) assert.match(input, /\bdisabled\b/);
    for (const [fieldset] of tableMain.matchAll(/<fieldset\b[^>]*>/g)) assert.match(fieldset, /\bdisabled\b/);
    for (const [select] of tableMain.matchAll(/<select\b[^>]*>/g)) assert.match(select, /\bdisabled\b/);
    assert.doesNotMatch(tableMain, /<script\b|action=|data-checkout|<input[^>]*type="(?:email|tel|text)"/);
  }
});
test('built CSS references exist and scoped accessibility/responsive rules survive', async () => {
  const cssSources: string[] = [];
  for (const path of [homePath, ...TABLE_PRODUCTS.map(p => `dist/client${p.path}index.html`)]) {
    const html = await readFile(path, 'utf8');
    for (const [, href] of html.matchAll(/href="([^"?]+\.css)"/g)) { assert.ok(href.startsWith('/')); const file = `dist/client${href}`; await access(file); cssSources.push(await readFile(file, 'utf8')); }
  }
  const css = cssSources.join('\n'); assert.match(css, /prefers-reduced-motion/); assert.match(css, /focus-visible/); assert.match(css, /tl-detail-grid/); assert.match(css, /minmax\(0/);
});
test('prelaunch product journey restores disabled ordering preview before FAQs and explains outstanding approvals', async () => {
  for (const product of TABLE_PRODUCTS) {
    const html = await readFile(`dist/client${product.path}index.html`, 'utf8');
    const main = html.match(/<main\b[\s\S]*?<\/main>/)![0];
    assert.doesNotMatch(main, /<form\b|action=|data-checkout/);
    assert.match(main, /A preview of ordering at The Table/);
    assert.match(main, /class="tl-quantity"/);
    assert.match(main, /id="bowl-quantity"[^>]*disabled/);
    assert.match(main, /<fieldset[^>]*class="tl-fulfillment-options"[^>]*disabled/);
    for (const kind of ['pickup', 'local-delivery', 'out-of-area']) assert.ok(main.includes(`value="${kind}"`));
    assert.match(main, /<select[^>]*id="bowl-fulfillment-window"[^>]*disabled/);
    assert.match(main, /class="tl-order-summary"/);
    assert.match(main, /No order has been created/);
    assert.match(main, /data-order-stage="unavailable"/);
    assert.match(main, /No confirmed windows yet/);
    assert.match(main, /Not selected/);
    assert.match(main, /Not available yet/);
    assert.match(main, /The maximum per order and available batch capacity are not yet confirmed/);
    assert.match(main, /Final totals require verified prices, fulfillment charges, and applicable tax information/);
    assert.ok(main.indexOf('id="opening-questions"') > main.indexOf('class="tl-order-summary"'));
    assert.equal((main.match(/<details>/g) ?? []).length, 6);
    assert.match(main, /A first look, not an offer for sale/);
    assert.match(main, /operational and legal approval/);
    assert.match(main, /Portion size, nutrition, shelf life, storage and reheating/);
    assert.doesNotMatch(html, /data-order-stage="(?:accepted|fulfilled|refunded)"|Paid and accepted|synthetic-integrated|SIMULATION\//);
    assert.match(html, /Final packaging and label details will be shared after testing and review/);
  }
});
test('built concept illustration is local, accessible, honest and present on both storefront routes',async()=>{
 const source='/images/table/southwest-harvest-concept.svg';
 const svg=await readFile('dist/client'+source,'utf8');
 assert.match(svg,/<svg[^>]*viewBox="0 0 1000 900"/);assert.match(svg,/<title[^>]*>.*illustrated concept/i);
 assert.doesNotMatch(svg,/<script|<foreignObject|(?:href|src)="(?:https?:|\/\/)|onload=/i);
 for(const path of [homePath,...TABLE_PRODUCTS.map(p=>`dist/client${p.path}index.html`)]){
  const html=await readFile(path,'utf8');assert.ok(html.includes(`src="${source}"`));
  assert.match(html,/alt="Illustrated Southwest Harvest Bowl concept/);assert.match(html,/width="1000" height="900"/);
  assert.match(html,/NOT A PRODUCT PHOTO/);assert.match(html,/Hot Food Bowls/);
 }
});
test('built current navigation keeps dormant departments, future products and unsupported promises out',async()=>{
 const home=await readFile(homePath,'utf8'),detail=await readFile('dist/client/the-table/southwest-harvest-bowl/index.html','utf8');
 assert.match(home,/Homestyle comfort/);assert.match(home,/Family-owned/);assert.match(home,/grandmother-style cooking/);
 assert.match(home,/aria-label="Current menu department"/);assert.match(home,/Big Spring, Texas/);
 for(const html of [home,detail])assert.doesNotMatch(html,/unlock|locked character|mystery product|countdown|limited time|Cold Bowls|Hot Soups|Signature Gnocchi|Juice \/ Water|Take-Home (?:Freezer Packs|Frozen Gnocchi Packs)|açaí|gnocchi|Refrigerated fulfillment is planned|separate sauce to add after heating|same-day delivery|free delivery|allergen-free meal/i);
 assert.match(detail,/Feta is excluded/);assert.match(detail,/Kale in the sauce is under evaluation/);
 assert.match(detail,/removed before microwave heating/);assert.match(detail,/above the rice and beneath the vegetables/);
 assert.doesNotMatch(detail,/10\s*g|kcal|\$\d/);
});

test('both storefront routes provide a keyboard bypass and resolve accessible references', async () => {
 for (const path of [homePath,...TABLE_PRODUCTS.map(p=>`dist/client${p.path}index.html`)]) {
  const html=await readFile(path,'utf8');
  assert.match(html,/<a class="tl-skip-link" href="#table-content">Skip to The Table content<\/a>/);
  assert.match(html,/<main[^>]*tabindex="-1"[^>]*id="table-content"/);
  assert.equal((html.match(/<h1\b/g)??[]).length,1);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length,'Duplicate element IDs');
  for (const [,values] of html.matchAll(/aria-(?:labelledby|describedby|controls)="([^"]+)"/g))
   for(const id of values.split(/\s+/))assert.ok(ids.includes(id),`Unresolved accessible reference: ${id}`);
 }
 const css=await readFile('src/styles/table-launch.css','utf8');
 assert.match(css,/\.tl-skip-link:focus\{/);
 assert.match(css,/\.tl-launch-section :is\(a,button,input,select\):focus-visible\{outline-color:#faf7ef\}/);
});

test('browser-discovered focus and contrast regressions stay corrected',async()=>{
 const script=await readFile('public/script.js','utf8');
 assert.ok(script.includes('a[href^="#"]:not(.tl-skip-link)'));
 const css=await readFile('src/styles/table-launch.css','utf8');
 assert.match(css,/\.tl-launch-section :is\(h2,h3\)\{color:inherit\}/);
 for(const path of [homePath,...TABLE_PRODUCTS.map(p=>`dist/client${p.path}index.html`)]){
  const html=await readFile(path,'utf8');assert.match(html,/<body class="table-storefront"/);
 }
});

test('FOOD-033 routes retain SEO, truthful FAQ, one visual and a single featured product', async () => {
 for (const path of [homePath,...TABLE_PRODUCTS.map(p=>`dist/client${p.path}index.html`)]) {
  const html=await readFile(path,'utf8');
  const route=path.slice('dist/client'.length).replace(/index\.html$/,'');
  assert.ok(html.includes(`rel="canonical" href="https://theriverkeptflowing.com${route}"`));
  assert.match(html, /name="description" content="[^"]{30,}"/);
  assert.match(html, /data-table-availability="in-development"/);
  assert.equal((html.match(/src="\/images\/table\/southwest-harvest-concept.svg"/g)??[]).length,1);
  assert.equal((html.match(/<details>/g)??[]).length,6);
  assert.match(html,/not a cooked meal, verified portion or final package/);
  assert.doesNotMatch(html,/"@type"\s*:\s*"(?:Offer|Product|AggregateRating)"|coupon|redeem|referral/i);
  const main=html.match(/<main\b[\s\S]*?<\/main>/)![0];
  assert.doesNotMatch(main,/Mushrooms and greens|separate sauce to add after heating|<form\b/);
 }
 const home=await readFile(homePath,'utf8');
 assert.equal((home.match(/class="tl-product-card"/g)??[]).length,1);
 assert.equal((home.match(/class="tl-step-number"/g)??[]).length,3);
 const sitemap=await readFile('dist/client/sitemap-0.xml','utf8');
 for(const route of ['/the-table/',...TABLE_PRODUCTS.map(p=>p.path)])assert.ok(sitemap.includes(`https://theriverkeptflowing.com${route}`));
});
