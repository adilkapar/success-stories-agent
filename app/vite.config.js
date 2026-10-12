import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@ui5/webcomponents-react')) return 'ui5-react';
          if (id.includes('@ui5/webcomponents-fiori')) return 'ui5-fiori';
          if (id.includes('@ui5/webcomponents-icons')) return 'ui5-base';
          if (id.includes('@ui5/webcomponents')) return 'ui5-base';
          if (id.includes('node_modules/react')) return 'react-vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
    // Proxy /api/agent/* to the A2A agent server running on port 10010
    proxy: {
      '/api/agent': {
        target: 'http://localhost:10010',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/agent/, '')
      }
    }
  }
});
