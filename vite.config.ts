import path from 'path';
import { execSync } from 'child_process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function getLastGitDate(): string {
  try {
    return execSync('git log -1 --format=%cI', { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const lastGitDate = getLastGitDate();
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.VITE_WP_GRAPHQL_URL': JSON.stringify(env.VITE_WP_GRAPHQL_URL || 'https://demo.wp-graphql.org/graphql'),
        'import.meta.env.VITE_LAST_GIT_DATE': JSON.stringify(lastGitDate),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: (id) => {
              if (id.includes('node_modules')) {
                if (id.includes('framer-motion')) return 'framer-motion';
                if (id.includes('gsap')) return 'gsap';
                if (id.includes('react-router')) return 'react-router';
                if (id.includes('@google/genai')) return 'genai';
                if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
                if (id.includes('lucide-react')) return 'lucide';
              }
            },
          },
        },
        chunkSizeWarningLimit: 600,
      },
    };
});
