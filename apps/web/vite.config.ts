import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      svgr(),
      tailwindcss(),
      {
        name: 'redirect-root',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/') {
              res.writeHead(302, { Location: '/dashboard' })
              res.end()
              return
            }
            next()
          })
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './frontend'),
      },
    },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || ''),
      'import.meta.env.VITE_API_KEY': JSON.stringify(env.VITE_API_KEY || ''),
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': 'http://localhost:8000',
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) {
                return 'charts'
              }
              if (id.includes('ag-grid')) {
                return 'ag-grid'
              }
              if (id.includes('@tanstack')) {
                return 'query'
              }
              if (id.includes('framer-motion')) {
                return 'motion'
              }
            }
          },
        },
      },
    },
  }
})
