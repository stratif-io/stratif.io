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
        {
          label: 'Features',
          items: [
            { label: 'Global Filters', slug: 'features/global-filters' },
            { label: 'Mission Control', slug: 'features/mission-control' },
            { label: 'Trends', slug: 'features/trends' },
            { label: 'Retention', slug: 'features/retention' },
            { label: 'Funnel', slug: 'features/funnel' },
            { label: 'Paths (Journey)', slug: 'features/paths' },
            { label: 'People', slug: 'features/people' },
            { label: 'Events Explorer', slug: 'features/events' },
            { label: 'Pivot', slug: 'features/pivot' },
            { label: 'SQL Studio', slug: 'features/sql-studio' },
          ],
        },
      ],
    }),
  ],
})
