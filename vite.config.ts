import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// robots.txt и sitemap.xml собираются из VITE_SITE_URL (.env),
// чтобы адрес сайта нигде не был прибит гвоздями
function seoFiles(siteUrl: string, outDir: string): Plugin {
  return {
    name: 'caspol-seo-files',
    apply: 'build',
    closeBundle() {
      const today = new Date().toISOString().slice(0, 10)
      writeFileSync(
        resolve(outDir, 'robots.txt'),
        `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
      )
      writeFileSync(
        resolve(outDir, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          `  <url>\n    <loc>${siteUrl}/</loc>\n    <lastmod>${today}</lastmod>\n` +
          `    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>\n` +
          `</urlset>\n`,
      )
    },
  }
}

// мета-тег подтверждения прав в Яндекс.Вебмастере добавляем только если код
// задан: пустой content выглядел бы как недоделка и ничего не подтверждает
function yandexVerification(code: string): Plugin {
  return {
    name: 'caspol-yandex-verification',
    transformIndexHtml(html) {
      if (!code) return html
      return html.replace(
        '</head>',
        `  <meta name="yandex-verification" content="${code}" />\n  </head>`,
      )
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const siteUrl = (env.VITE_SITE_URL || 'https://caspol.ru').replace(/\/+$/, '')
  const outDir = resolve(process.cwd(), 'dist')

  return {
    // сайт живёт в подпапке репозитория на GitHub Pages
    base: process.env.GH_PAGES ? '/caspol-landing/' : '/',
    plugins: [
      react(),
      seoFiles(siteUrl, outDir),
      yandexVerification((env.VITE_YANDEX_VERIFICATION || '').trim()),
    ],
    resolve: { dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client'] },
    server: { port: 5185, host: true },
    preview: { port: 5185, host: true },
  }
})
