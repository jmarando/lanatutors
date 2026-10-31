import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

export const SITE_URL = 'https://lanatutors.africa';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  structuredData?: object;
  canonical?: string;
}

export const SEO = ({ 
  title, 
  description, 
  keywords = "Kenyan tutors online, KCSE tutors worldwide, KCPE tutors diaspora, CBC tutors global, verified Kenyan teachers, online tutoring East Africa",
  ogImage = "/og-image.png",
  structuredData,
  canonical
}: SEOProps) => {
  const { pathname } = useLocation();
  const fullTitle = `${title} | Lana Tutors`;
  // Pages that don't pass a canonical point at their own path (index.html deliberately sets none).
  // Relative canonicals are made absolute, since og:url must be a full URL.
  const canonicalPath = canonical ?? (pathname.replace(/\/+$/, '') || '/');
  const canonicalUrl = canonicalPath.startsWith('/') ? `${SITE_URL}${canonicalPath}` : canonicalPath;
  // Link-preview scrapers (WhatsApp, Facebook) need an absolute image URL.
  const ogImageUrl = ogImage.startsWith('/') ? `${SITE_URL}${ogImage}` : ogImage;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      <link rel="canonical" href={canonicalUrl} />
      
      <meta property="og:title" content={fullTitle} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:type" content="website" />
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImageUrl} />
      
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};
