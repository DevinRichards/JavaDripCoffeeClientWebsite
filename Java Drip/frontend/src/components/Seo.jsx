import { useEffect } from 'react';

const SITE_ORIGIN = 'https://javadrip.coffee';
const DEFAULT_OG_IMAGE = 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80&fit=crop';

function upsertMeta(attr, key, content) {
  if (!content) return;
  let element = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertLink(rel, href) {
  if (!href) return;
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

function upsertJsonLd(data) {
  const existing = document.head.querySelector('script[data-seo-jsonld="true"]');
  if (!data) {
    if (existing) existing.remove();
    return;
  }

  const element = existing || document.createElement('script');
  element.type = 'application/ld+json';
  element.setAttribute('data-seo-jsonld', 'true');
  element.textContent = JSON.stringify(data);
  if (!existing) document.head.appendChild(element);
}

export default function Seo({
  title,
  description,
  path = '/',
  image = DEFAULT_OG_IMAGE,
  noindex = false,
  jsonLd,
}) {
  useEffect(() => {
    const canonical = new URL(path, SITE_ORIGIN).toString();
    document.title = title;

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:site_name', 'Java Drip Coffee');
    upsertMeta('property', 'og:locale', 'en_US');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);
    upsertLink('canonical', canonical);
    upsertJsonLd(jsonLd);
  }, [title, description, path, image, noindex, jsonLd]);

  return null;
}
