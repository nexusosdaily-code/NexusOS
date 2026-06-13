import { useEffect } from "react";

interface PageMetaOptions {
  title: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  twitterTitle?: string;
  twitterDescription?: string;
}

function setMeta(selector: string, attr: string, value: string) {
  let el = document.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!el) {
    if (selector.startsWith("link")) {
      el = document.createElement("link");
      (el as HTMLLinkElement).rel = "canonical";
      document.head.appendChild(el);
    } else {
      el = document.createElement("meta");
      const attrMatch = selector.match(/\[([^\]=]+)="([^"]+)"\]/);
      if (attrMatch) {
        (el as HTMLMetaElement).setAttribute(attrMatch[1], attrMatch[2]);
      }
      document.head.appendChild(el);
    }
  }
  (el as Element).setAttribute(attr, value);
}

/**
 * Dynamically updates the document <head> for JavaScript-capable crawlers
 * (Google, Bing) and the visible browser tab. Call once per page component.
 *
 * The server already injects correct metadata into the HTML shell for
 * non-JS crawlers (Facebook, Twitter, LinkedIn, AI crawlers). This hook
 * ensures correctness for JS-rendered visits.
 */
export function usePageMeta(opts: PageMetaOptions) {
  useEffect(() => {
    const prev = {
      title: document.title,
      desc:  (document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content ?? "",
      canonical: (document.querySelector('link[rel="canonical"]') as HTMLLinkElement)?.href ?? "",
    };

    document.title = opts.title;

    if (opts.description) {
      setMeta('meta[name="description"]', "content", opts.description);
    }

    if (opts.canonical) {
      setMeta('link[rel="canonical"]', "href", opts.canonical);
    }

    setMeta('meta[property="og:title"]', "content", opts.ogTitle ?? opts.title);

    if (opts.ogDescription ?? opts.description) {
      setMeta('meta[property="og:description"]', "content", (opts.ogDescription ?? opts.description)!);
    }

    if (opts.ogUrl ?? opts.canonical) {
      setMeta('meta[property="og:url"]', "content", (opts.ogUrl ?? opts.canonical)!);
    }

    setMeta('meta[name="twitter:title"]', "content", opts.twitterTitle ?? opts.title);

    if (opts.twitterDescription ?? opts.description) {
      setMeta('meta[name="twitter:description"]', "content", (opts.twitterDescription ?? opts.description)!);
    }

    return () => {
      document.title = prev.title;
      if (prev.desc) {
        setMeta('meta[name="description"]', "content", prev.desc);
      }
      if (prev.canonical) {
        setMeta('link[rel="canonical"]', "href", prev.canonical);
      }
    };
  }, [
    opts.title, opts.description, opts.canonical,
    opts.ogTitle, opts.ogDescription, opts.ogUrl,
    opts.twitterTitle, opts.twitterDescription,
  ]);
}
