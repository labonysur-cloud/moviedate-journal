import { Helmet } from "react-helmet-async";

const SITE = "https://moviedate-journal.lovable.app";

interface SeoProps {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
}

/**
 * Per-route <head> tags. Sets a unique title, meta description, canonical,
 * and og:*/twitter:* previews that self-reference the current route.
 */
export default function Seo({ title, description, path, type = "website" }: SeoProps) {
  const url = `${SITE}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
