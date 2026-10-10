/** Approved sitewide link groups. Render them with the site's existing footer components. */
export const approvedFooterGroups = [
  {
    title: 'Services',
    links: [
      { label: 'Home Moving', href: 'https://www.nglob.com/services/home-relocation' },
      { label: 'Few Items', href: 'https://www.nglob.com/services/few-items' },
      { label: 'Student Moving', href: 'https://www.nglob.com/services/student-moves' },
      { label: 'Storage', href: 'https://www.nglob.com/#how-it-works-storage' },
      { label: 'Business Solutions', href: 'https://www.nglob.com/business' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Nglob', href: 'https://www.nglob.com/about' },
      { label: 'How it works', href: 'https://www.nglob.com/how-it-works' },
    ],
  },
  {
    title: 'Partners',
    links: [
      { label: 'Referral Partners', href: 'https://www.nglob.com/partner' },
      { label: 'Service Partners', href: 'https://www.nglob.com/service-partners' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Centre', href: 'https://www.nglob.com/faq' },
      { label: 'Contact Us', href: 'https://www.nglob.com/contact' },
    ],
  },
] as const;
