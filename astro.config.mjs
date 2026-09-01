// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static Assets only. Do not change output to 'server'.
// Do not add @astrojs/cloudflare, src/pages/api/*, Functions, KV, R2, or a Worker main script.

export default defineConfig({
  output: 'static',
  site: 'https://wiki.winsmux.dev',
  trailingSlash: 'always',
  integrations: [
    // ルートは /hermes/ を canonical に指している。正規化先ではない URL を
    // サイトマップに載せるとクロールの一枠を無駄にするので外す
    sitemap({ filter: (page) => page !== 'https://wiki.winsmux.dev/' }),
  ],
});
