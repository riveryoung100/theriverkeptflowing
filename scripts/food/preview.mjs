// Local only: preserve the production adapter, sessions and original optimizer cache.
import { resolve } from 'node:path';
process.env.XDG_CONFIG_HOME = resolve('.river-dev/state/food-preview-config');
process.env.WRANGLER_LOG_PATH = resolve('.river-dev/state/food-preview-logs');
const { dev } = await import('astro');
const verify = process.argv.includes('--verify');
const port = verify ? 4336 : 4335;
const server = await dev({ root: process.cwd(), server: { host: '127.0.0.1', port }, vite: {
  // Prevent late dependency discovery from invalidating Cloudflare's active SSR chunks.
  optimizeDeps: { include: ['astro/assets/services/noop'] },
  cacheDir: resolve('.river-dev/state/food-preview-vite')
} });
const origin = `http://127.0.0.1:${port}`;
console.log(`Food preview: ${origin}/the-table/`);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await server.stop(); process.exit(0); });
if (verify) {
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(`${origin}/the-table/`);
      const html = await response.text();
      if (response.status !== 200 || !html.includes('Southwest Harvest Bowl') || !html.includes('Payments and preorders remain unavailable.')) throw new Error('Storefront verification failed.');
      const productPaths = [...new Set([...html.matchAll(/href="(\/the-table\/[^"#?]+\/)"/g)].map(match => match[1]))];
      if (!productPaths.length) throw new Error('No product detail link found.');
      for (const path of productPaths) {
        const detailResponse = await fetch(origin + path);
        const detail = await detailResponse.text();
        if (detailResponse.status !== 200 || !detail.includes('Allergen review is not complete') || !detail.includes('Payments and preorders remain unavailable.') || /<form\b|create-checkout|stripe/i.test(detail)) throw new Error(`Product detail verification failed: ${path}`);
        console.log(`PASS product detail ${path}`);
      }
      for (const path of ['/styles.css', '/website-v4.css', '/src/styles/table-launch.css?direct']) {
        const css = await fetch(origin + path);
        if (css.status !== 200 || !(css.headers.get('content-type') || '').includes('text/css') || !(await css.text()).length) throw new Error(`CSS failed: ${path}`);
      }
      console.log(`PASS storefront and CSS request ${attempt + 1}/3`);
      await new Promise(done => setTimeout(done, 1000));
    }
  } finally { await server.stop(); }
}
