export function FAQSchema({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export function BreadcrumbSchema({ items }: { items: Array<{ name: string; href: string }> }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem', position: i + 1,
      name: item.name, item: item.href,
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export function WebSiteSchema({ name, url }: { name: string; url: string }) {
  const schema = {
    '@context': 'https://schema.org', '@type': 'WebSite',
    name, url, potentialAction: { '@type': 'SearchAction', target: `${url}/services?search={search_term_string}`, 'query-input': 'required name=search_term_string' },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export function ArticleSchema({ title, description, url, image, datePublished, dateModified, authorName }: any) {
  const schema = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: title, description, url, image, datePublished, dateModified,
    author: { '@type': 'Person', name: authorName },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export function SoftwareAppSchema({ name, url }: { name: string; url: string }) {
  const schema = {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication',
    name, url, operatingSystem: 'Web', applicationCategory: 'MultimediaApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
