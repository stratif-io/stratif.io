import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'stratif.io',
  description: 'Self-hosted product analytics. Your database, your infrastructure, your rules.',
  base: '/stratifio-oss/', // for GitHub Pages under repo name

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
