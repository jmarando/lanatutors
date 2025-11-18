import { Helmet } from 'react-helmet-async';

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
  ogImage = "https://lovable.dev/opengraph-image-p98pqg.png",
  structuredData,
  canonical
}: SEOProps) => {
  const fullTitle = `${title} | Lana Tutors`;
  
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {canonical && <link rel="canonical" href={canonical} />}
      
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content="website" />
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};
