import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// 构建产物直接落到 studyroom 仓库的 public/408/，
// 与已有的 /kaoyan 子应用保持同一套「构建即部署」流程。
export default defineConfig({
  base: '/408/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: fileURLToPath(new URL('../../public/408', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
    // 拆分第三方库与内容表：KaTeX/React 等体积大但很少变，
    // 内容表（cards/questions/essays）更新频繁，分开后重复访问只需重下内容块。
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) {
            // 内容表按科目切开：首屏 4 块并行下载，改一科的内容只失效那一块
            const content = /\/src\/data\/(bank|questions|essays)\/(ds|co|os|cn)/.exec(id);
            if (content) return `content-${content[2]}`;
            if (id.includes('/src/data/')) return 'content-core';
            return undefined;
          }
          if (id.includes('katex')) return 'katex';
          if (id.includes('framer-motion') || id.includes('/motion')) return 'motion';
          if (id.includes('dexie')) return 'dexie';
          if (id.includes('marked')) return 'marked';
          if (id.includes('ts-fsrs')) return 'fsrs';
          if (id.includes('react') || id.includes('scheduler')) return 'react';
          return 'vendor';
        },
      },
    },
  },
});
