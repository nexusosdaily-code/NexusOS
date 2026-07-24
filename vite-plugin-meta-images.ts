import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Vite plugin that updates og:image and twitter:image meta tags
 * to point to the app's opengraph image with the correct Replit domain.
 */
export function metaImagesPlugin(): Plugin {
  return {
    name: 'vite-plugin-meta-images',
    transformIndexHtml(html) {
      const baseUrl = getDeploymentUrl();
      if (!baseUrl) {
        log('[meta-images] no Replit deployment domain found, skipping meta tag updates');
        return html;
      }

      // Check if opengraph image exists in public directory
      const publicDir = path.resolve(process.cwd(), 'client', 'public');
      const opengraphPngPath = path.join(publicDir, 'opengraph.png');
      const opengraphJpgPath = path.join(publicDir, 'opengraph.jpg');
      const opengraphJpegPath = path.join(publicDir, 'opengraph.jpeg');

      let imageExt: string | null = null;
      if (fs.existsSync(opengraphPngPath)) {
        imageExt = 'png';
      } else if (fs.existsSync(opengraphJpgPath)) {
        imageExt = 'jpg';
      } else if (fs.existsSync(opengraphJpegPath)) {
        imageExt = 'jpeg';
      }

      if (!imageExt) {
        log('[meta-images] OpenGraph image not found, skipping meta tag updates');
        return html;
      }

      const imageUrl = `${baseUrl}/opengraph.${imageExt}`;

      log('[meta-images] updating meta image tags to:', imageUrl);

      html = html.replace(
        /<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/g,
        `<meta property="og:image" content="${imageUrl}" />`
      );

      html = html.replace(
        /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/>/g,
        `<meta name="twitter:image" content="${imageUrl}" />`
      );

      return html;
    },
  };
}

/**
 * Vite plugin that converts render-blocking CSS <link rel="stylesheet"> tags
 * injected by the build into non-render-blocking preloads.
 *
 * Pattern used (same as Google Fonts in client/index.html):
 *   <link rel="preload" as="style" onload="this.onload=null;this.rel='stylesheet'" href="...">
 *   <noscript><link rel="stylesheet" href="..."></noscript>
 *
 * Safe to apply because:
 *  - The <body> already has inline background:#050d1a so there is no white flash.
 *  - The inline boot spinner runs while JS + CSS load in parallel.
 *  - React does not mount until JS is parsed; by then the preloaded CSS is
 *    already in cache and applied before the first React paint.
 *
 * Only the hashed app bundles (e.g. /assets/index-*.css) are deferred.
 * Any existing hand-authored <link rel="stylesheet"> in index.html are left alone.
 */
export function cssPreloadPlugin(): Plugin {
  return {
    name: 'vite-plugin-css-preload',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(
          /<link([^>]*)\shref="(\/assets\/[^"]+\.css)"([^>]*)>/g,
          (match, before, href, after) => {
            const attrs = (before + after).trim();
            const isCssStylesheet =
              /rel="stylesheet"/.test(attrs) ||
              /rel="stylesheet"/.test(match);
            if (!isCssStylesheet) return match;
            const cross = /crossorigin/.test(attrs) ? ' crossorigin' : '';
            return (
              `<link rel="preload" as="style"${cross} href="${href}" onload="this.onload=null;this.rel='stylesheet'">` +
              `<noscript><link rel="stylesheet"${cross} href="${href}"></noscript>`
            );
          }
        );
      },
    },
  };
}

function getDeploymentUrl(): string | null {
  if (process.env.REPLIT_INTERNAL_APP_DOMAIN) {
    const url = `https://${process.env.REPLIT_INTERNAL_APP_DOMAIN}`;
    log('[meta-images] using internal app domain:', url);
    return url;
  }

  if (process.env.REPLIT_DEV_DOMAIN) {
    const url = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    log('[meta-images] using dev domain:', url);
    return url;
  }

  return null;
}

function log(...args: any[]): void {
  if (process.env.NODE_ENV === 'production') {
    console.log(...args);
  }
}
