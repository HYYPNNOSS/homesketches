import { pageMeta } from './content';

/** Render with the host's head manager on the public route, not only after hydration. */
export const studentSeo = {
  ...pageMeta,
  canonical: 'https://www.nglob.com/services/student-moves',
  language: 'en-GB',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    siteName: 'Nglob',
    title: pageMeta.title,
    description: pageMeta.description,
    url: 'https://www.nglob.com/services/student-moves',
    image: 'https://www.nglob.com/nglob-students/assets/student-hero-1280.webp',
    imageAlt: 'Three students moving into their new home with their belongings.',
    imageWidth: 1280,
    imageHeight: 853,
    locale: 'en_GB',
  },
} as const;

export const studentStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${studentSeo.canonical}#webpage`,
  url: studentSeo.canonical,
  name: pageMeta.title,
  description: pageMeta.description,
  inLanguage: studentSeo.language,
  isPartOf: { '@type': 'WebSite', name: 'Nglob', url: 'https://www.nglob.com/' },
} as const;
