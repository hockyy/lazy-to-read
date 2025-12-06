import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'lazy-to-read',
    description: 'Brief Codeforces problems on demand.',
    permissions: ['storage'],
    host_permissions: ['https://openrouter.ai/*'],
    action: {
      default_title: 'lazy-to-read',
    },
    web_accessible_resources: [
      {
        resources: ['libs/*', 'injected.js'],
        matches: ['*://codeforces.com/*', '*://*.codeforces.com/*'],
      },
    ],
  },
});
