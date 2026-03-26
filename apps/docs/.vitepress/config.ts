import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'stratif.io',
  description: 'Self-hosted product analytics. Your database, your infrastructure, your rules.',
  // Default: /stratifio-oss/ for GitHub Pages. Override with VITEPRESS_BASE for other deployments
  // (e.g. VITEPRESS_BASE=/docs/ when serving from a running instance at /docs/).
  base: process.env.VITEPRESS_BASE ?? '/stratifio-oss/',

  ignoreDeadLinks: [
    // Allow localhost URLs (runtime links, not available during static build)
    /^http:\/\/localhost/,
    // Allow placeholders like <your-instance>
    /^http:\/\/<your-instance>/,
  ],

  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'Configuration', link: '/configuration' },
      { text: 'API Reference', link: '/api-reference' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Configuration', link: '/configuration' },
          { text: 'Architecture', link: '/architecture' },
          { text: 'Contributing', link: '/contributing' },
        ],
      },
      {
        text: 'Reference',
        items: [{ text: 'API Reference', link: '/api-reference' }],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/stratifio/stratifio-oss' }],
    footer: {
      message: 'Released under the MIT License.',
    },
  },
})
