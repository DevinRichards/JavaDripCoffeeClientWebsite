export const INSTAGRAM_URL = 'https://www.instagram.com/java_drip_coffee/';
export const FACEBOOK_URL = 'https://www.facebook.com/javadripcoffee';
export const TIKTOK_URL = 'https://www.tiktok.com/@javadripcoffee';

export const FACEBOOK_EMBED_URL = `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(FACEBOOK_URL)}&tabs=timeline&width=500&height=620&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=false`;
export const INSTAGRAM_EMBED_URL = 'https://www.instagram.com/java_drip_coffee/embed';
export const TIKTOK_EMBED_URL = 'https://www.tiktok.com/embed/@javadripcoffee';

const LATTE_BAR_IMAGE = 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1000&q=85&fit=crop';
const STOREFRONT_IMAGE = 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=1000&q=85&fit=crop';
const TEAM_IMAGE = 'https://images.unsplash.com/photo-1513267048331-5611cad62e41?w=1000&q=85&fit=crop';

export const SOCIAL_SPOTLIGHTS = [
  {
    id: 'instagram-scenes',
    platform: 'Instagram',
    icon: 'photo_camera',
    title: 'Daily drink moments and behind-the-bar shots',
    description: 'A fast visual feed for seasonal pours, latte art, and the Gallup coffee mood.',
    href: INSTAGRAM_URL,
    image: LATTE_BAR_IMAGE,
  },
  {
    id: 'facebook-community',
    platform: 'Facebook',
    icon: 'thumb_up',
    title: 'Community updates, announcements, and event posts',
    description: 'Stay close to store updates, hours notes, and local happenings around Java Drip Coffee.',
    href: FACEBOOK_URL,
    image: STOREFRONT_IMAGE,
  },
  {
    id: 'tiktok-reels',
    platform: 'TikTok',
    icon: 'music_note',
    title: 'Short-form cafe clips with energy and personality',
    description: 'Quick edits from the counter, drink builds, and the personality behind the brand.',
    href: TIKTOK_URL,
    image: TEAM_IMAGE,
  },
];

export const SOCIAL_PROFILES = [
  {
    id: 'instagram',
    platform: 'Instagram',
    handle: '@java_drip_coffee',
    bio: 'Java Drip Coffee',
    href: INSTAGRAM_URL,
    image: LATTE_BAR_IMAGE,
    accent: 'Daily photos, reels, drinks, and behind-the-counter moments.',
    embedUrl: INSTAGRAM_EMBED_URL,
  },
  {
    id: 'facebook',
    platform: 'Facebook',
    handle: '/javadripcoffee',
    bio: 'Java Drip Coffee',
    href: FACEBOOK_URL,
    image: STOREFRONT_IMAGE,
    accent: 'Community updates, announcements, hours, and local customer touchpoints.',
    embedUrl: FACEBOOK_EMBED_URL,
  },
  {
    id: 'tiktok',
    platform: 'TikTok',
    handle: '@javadripcoffee',
    bio: 'Java Drip Coffee',
    href: TIKTOK_URL,
    image: TEAM_IMAGE,
    accent: 'Short-form drink builds, shop personality, and quick cafe clips.',
    embedUrl: TIKTOK_EMBED_URL,
  },
];
