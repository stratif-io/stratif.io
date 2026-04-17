import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

export default defineConfig({
  site: 'https://docs.stratif.io',
  integrations: [
    starlight({
      title: 'stratif.io',
      logo: {
        light: './src/assets/logo-light.svg',
        dark: './src/assets/logo-dark.svg',
        replacesTitle: true,
      },
      favicon: '/favicon.svg',
      customCss: ['./src/styles/custom.css'],
      social: {
        github: 'https://github.com/stratif-io/stratif.io',
      },
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: '' },
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'Configuration', slug: 'getting-started/configuration' },
            { label: 'Connecting a Warehouse', slug: 'getting-started/connecting-a-warehouse' },
          ],
        },
        {
          label: 'Demo',
          items: [{ label: 'Sample Data', slug: 'demo/sample-data' }],
        },
      ],
    }),
  ],
})
