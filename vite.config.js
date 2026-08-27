import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/* Lightning CSS version numbers are packed major << 16 | minor << 8. */
const v = (major, minor = 0) => (major << 16) | (minor << 8)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    /* Without explicit targets the minifier collapses prefixed + standard
       pairs to a single form (it kept only -webkit-backdrop-filter, which is
       why the navbar blur vanished in production). Real targets make it emit
       every form the range needs. */
    lightningcss: {
      targets: {
        chrome: v(90),
        edge: v(90),
        firefox: v(102),
        safari: v(14),
        ios_saf: v(14),
      },
    },
  },
  build: {
    cssMinify: 'lightningcss',
  },
})
