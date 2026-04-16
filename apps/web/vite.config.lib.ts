import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: /^@\//, replacement: path.resolve(__dirname, 'frontend') + '/' }],
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'frontend/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react-router-dom',
        /^@radix-ui\//,
        /^@tanstack\//,
        'framer-motion',
        'zustand',
        'zod',
        'recharts',
        'lucide-react',
        'sonner',
        'date-fns',
        /^@codemirror\//,
        /^@heroicons\//,
        /^@fontsource/,
        'styled-components',
        'tailwind-merge',
        'tailwindcss-animate',
        'class-variance-authority',
        'clsx',
        'cmdk',
        'react-hook-form',
        '@hookform/resolvers',
        'react-day-picker',
        'xlsx',
        'react-helmet-async',
      ],
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
})
