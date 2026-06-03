import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_OG_IMAGE, PRERENDER_ROUTES, SITE_ORIGIN, getSeoConfig } from '../src/seo/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const indexPath = path.join(distDir, 'index.html');

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function replaceTag(html, pattern, replacement) {
  return html.match(pattern) ? html.replace(pattern, replacement) : html;
}

function applySeo(html, route) {
  const seo = getSeoConfig(route);
  const canonical = new URL(seo.path, SITE_ORIGIN).toString();
  const robots = seo.noindex ? 'noindex, nofollow' : 'index, follow';
  const jsonLd = seo.jsonLd
    ? `<script type="application/ld+json" data-seo-jsonld="true">${JSON.stringify(seo.jsonLd)}</script>`
    : '';

  let output = html;
  output = replaceTag(output, /<title>.*?<\/title>/s, `<title>${escapeHtml(seo.title)}</title>`);
  output = replaceTag(output, /<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${escapeHtml(seo.description)}" />`);
  output = replaceTag(output, /<meta name="robots" content="[^"]*"\s*\/?>/, `<meta name="robots" content="${robots}" />`);
  output = replaceTag(output, /<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${canonical}" />`);
  output = replaceTag(output, /<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${canonical}" />`);
  output = replaceTag(output, /<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${escapeHtml(seo.title)}" />`);
  output = replaceTag(output, /<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${escapeHtml(seo.description)}" />`);
  output = replaceTag(output, /<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${seo.image || DEFAULT_OG_IMAGE}" />`);
  output = replaceTag(output, /<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`);
  output = replaceTag(output, /<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`);
  output = replaceTag(output, /<meta name="twitter:image" content="[^"]*"\s*\/?>/, `<meta name="twitter:image" content="${seo.image || DEFAULT_OG_IMAGE}" />`);
  output = output.replace(/<script type="application\/ld\+json" data-seo-jsonld="true">.*?<\/script>/s, '').replace('</head>', `${jsonLd}\n  </head>`);
  return output;
}

async function writeRouteHtml(route, html) {
  if (route === '/') {
    await fs.writeFile(indexPath, html, 'utf8');
    return;
  }

  const routeDir = path.join(distDir, route.slice(1));
  await fs.mkdir(routeDir, { recursive: true });
  await fs.writeFile(path.join(routeDir, 'index.html'), html, 'utf8');
}

async function main() {
  const baseHtml = await fs.readFile(indexPath, 'utf8');

  for (const route of PRERENDER_ROUTES) {
    const html = applySeo(baseHtml, route);
    await writeRouteHtml(route, html);
  }

  console.log(`Prerendered ${PRERENDER_ROUTES.length} static routes.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
