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
        { label: 'Introduction', slug: '' },
        {
          label: 'Analytics',
          items: [
            {
              label: 'Getting Started',
              items: [
                { label: 'Installation', slug: 'analytics/installation' },
                { label: 'Configuration', slug: 'analytics/configuration' },
                { label: 'Connecting a Warehouse', slug: 'analytics/connecting-a-warehouse' },
              ],
            },
            {
              label: 'Features',
              items: [
                { label: 'Global Filters', slug: 'analytics/global-filters' },
                { label: 'Mission Control', slug: 'analytics/mission-control' },
                { label: 'Trends', slug: 'analytics/trends' },
                { label: 'Retention', slug: 'analytics/retention' },
                { label: 'Funnel', slug: 'analytics/funnel' },
                { label: 'Paths (Journey)', slug: 'analytics/paths' },
                { label: 'People', slug: 'analytics/people' },
                { label: 'Events Explorer', slug: 'analytics/events' },
                { label: 'Pivot', slug: 'analytics/pivot' },
                { label: 'SQL Studio', slug: 'analytics/sql-studio' },
              ],
            },
          ],
        },
        {
          label: 'Event Simulator',
          items: [
            { label: 'Sample Data', slug: 'event-simulator/sample-data' },
            { label: 'Generating Sample Data', slug: 'event-simulator/seeding' },
          ],
        },
      ],
    }),
  ],
})
