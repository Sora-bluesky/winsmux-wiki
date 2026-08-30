// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static Assets only. Do not change output to 'server'.
// Do not add @astrojs/cloudflare, src/pages/api/*, Functions, KV, R2, or a Worker main script.

export default defineConfig({
  output: 'static',
  site: 'https://wiki.winsmux.dev',
  trailingSlash: 'always',
  integrations: [sitemap()],
});
