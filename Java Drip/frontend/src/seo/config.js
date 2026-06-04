export const SITE_ORIGIN = 'https://javadrip.coffee';
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/favicon.svg`;

export function getSeoConfig(pathname) {
  switch (pathname) {
    case '/':
      return {
        title: 'Java Drip Coffee | Specialty Coffee in Gallup, NM',
        description: 'Java Drip Coffee serves specialty coffee, espresso drinks, and pickup orders on Historic Route 66 in Gallup, New Mexico.',
        path: '/',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'CafeOrCoffeeShop',
          name: 'Java Drip Coffee',
          url: 'https://javadrip.coffee',
          telephone: '+1-505-488-2682',
          servesCuisine: 'Coffee',
          priceRange: '$$',
          address: {
            '@type': 'PostalAddress',
            streetAddress: '1307 E Historic Highway 66',
            addressLocality: 'Gallup',
            addressRegion: 'NM',
            postalCode: '87301',
            addressCountry: 'US',
          },
          openingHours: ['Mo-Fr 06:00-19:00', 'Sa 07:00-18:00', 'Su 08:00-15:00'],
        },
      };
    case '/menu':
      return {
        title: 'Menu | Coffee, Lattes & Snacks in Gallup, NM | Java Drip Coffee',
        description: 'Browse Java Drip Coffee’s menu of coffee, nitro brews, crafted lattes, and snacks available for pickup in Gallup, New Mexico.',
        path: '/menu',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Menu',
          name: 'Java Drip Coffee Menu',
          url: 'https://javadrip.coffee/menu',
          hasMenuSection: [
            { '@type': 'MenuSection', name: 'Refreshers' },
            { '@type': 'MenuSection', name: 'Lattes' },
            { '@type': 'MenuSection', name: 'Roadrunner' },
            { '@type': 'MenuSection', name: 'Chai' },
            { '@type': 'MenuSection', name: 'Lemonades' },
            { '@type': 'MenuSection', name: 'Teas' },
            { '@type': 'MenuSection', name: 'Matcha' },
            { '@type': 'MenuSection', name: 'Reg Coffee' },
            { '@type': 'MenuSection', name: 'Cake Pops' },
            { '@type': 'MenuSection', name: 'Other' },
          ],
        },
      };
    case '/locations':
      return {
        title: 'Location & Hours | Java Drip Coffee in Gallup, NM',
        description: 'Find Java Drip Coffee on Historic Highway 66 in Gallup, NM. View hours, directions, and pickup information.',
        path: '/locations',
      };
    case '/gallery':
      return {
        title: 'Gallery | Java Drip Coffee Photos, Video & Social Feed',
        description: 'Explore Java Drip Coffee photos, video moments, and social updates from Gallup, New Mexico.',
        path: '/gallery',
      };
    case '/about':
      return {
        title: 'About Java Drip Coffee | Gallup Coffee on Route 66',
        description: 'Learn the story behind Java Drip Coffee, our Gallup roots, and the high-energy coffee experience we are building on Route 66.',
        path: '/about',
      };
    case '/contact':
      return {
        title: 'Contact Java Drip Coffee | Gallup, NM',
        description: 'Contact Java Drip Coffee for questions, catering inquiries, partnerships, and coffee-related conversations in Gallup, New Mexico.',
        path: '/contact',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'ContactPage',
          name: 'Contact Java Drip Coffee',
          url: 'https://javadrip.coffee/contact',
        },
      };
    case '/signin':
      return {
        title: 'Sign In | Java Drip Coffee',
        description: 'Sign in to your Java Drip Coffee account.',
        path: '/signin',
        noindex: true,
      };
    case '/profile':
      return {
        title: 'Profile | Java Drip Coffee',
        description: 'View your Java Drip Coffee profile and orders.',
        path: '/profile',
        noindex: true,
      };
    case '/admin/signin':
      return {
        title: 'Staff Sign In | Java Drip Coffee',
        description: 'Employee sign in for the Java Drip menu admin panel.',
        path: '/admin/signin',
        noindex: true,
      };
    case '/admin':
      return {
        title: 'Staff Admin | Java Drip Coffee',
        description: 'Internal staff dashboard for Java Drip Coffee.',
        path: '/admin',
        noindex: true,
      };
    case '/admin/orders':
      return {
        title: 'Pickup Orders | Java Drip Coffee',
        description: 'Internal pickup order queue for Java Drip Coffee staff.',
        path: '/admin/orders',
        noindex: true,
      };
    case '/admin/menu':
      return {
        title: 'Menu Editor | Java Drip Coffee',
        description: 'Internal menu editing dashboard for Java Drip Coffee staff.',
        path: '/admin/menu',
        noindex: true,
      };
    case '/admin/gallery':
      return {
        title: 'Gallery Media | Java Drip Coffee',
        description: 'Internal gallery media dashboard for Java Drip Coffee staff.',
        path: '/admin/gallery',
        noindex: true,
      };
    case '/checkout':
      return {
        title: 'Pickup Checkout | Java Drip Coffee',
        description: 'Review your Java Drip Coffee pickup order and complete checkout online.',
        path: '/checkout',
        noindex: true,
      };
    case '/privacy':
      return {
        title: 'Privacy Policy | Java Drip Coffee',
        description: 'Read the Java Drip Coffee privacy policy.',
        path: '/privacy',
      };
    case '/terms':
      return {
        title: 'Terms of Service | Java Drip Coffee',
        description: 'Read the Java Drip Coffee terms of service.',
        path: '/terms',
      };
    default:
      if (pathname.startsWith('/payment-return/')) {
        return {
          title: 'Confirming Payment | Java Drip Coffee',
          description: 'Confirming your Java Drip Coffee payment status.',
          path: pathname,
          noindex: true,
        };
      }
      if (pathname.startsWith('/order/')) {
        return {
          title: 'Order Confirmation | Java Drip Coffee',
          description: 'View your Java Drip Coffee order confirmation.',
          path: pathname,
          noindex: true,
        };
      }
      return {
        title: 'Java Drip Coffee | Gallup, NM',
        description: 'Java Drip Coffee in Gallup, New Mexico.',
        path: pathname,
      };
  }
}

export const PRERENDER_ROUTES = [
  '/',
  '/menu',
  '/gallery',
  '/locations',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
];
