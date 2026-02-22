import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: [
      // Order matters! Longer prefixes must come first.
      // @/app → root, so Figma Make imports like '@/app/services/X' resolve to './services/X'
      { find: '@/app', replacement: path.resolve(__dirname, './') },
      // @ → root, so existing imports like '@/services/X' also resolve to './services/X'
      { find: '@', replacement: path.resolve(__dirname, './') },
      // Force all three imports to resolve to the same physical module
      { find: 'three', replacement: path.resolve(__dirname, 'node_modules/three') },
    ],
    dedupe: ['three'],
  },
  optimizeDeps: {
    include: ['three', 'three/examples/jsm/controls/OrbitControls.js'],
  },
})
