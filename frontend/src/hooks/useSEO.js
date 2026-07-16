import { useEffect } from "react";

/**
 * BUG-F9: useSEO hook
 * Sets document.title and meta description/keywords dynamically per page.
 *
 * @param {string} title      - Page title (will be suffixed with " | ميدورا")
 * @param {string} description - Meta description
 * @param {string} [keywords] - Optional meta keywords
 */
export function useSEO({ title, description, keywords } = {}) {
  useEffect(() => {
    const suffix = " | ميدورا";
    const fullTitle = title ? `${title}${suffix}` : `ميدورا - منصتك الطبية الشاملة`;
    document.title = fullTitle;

    const setMeta = (name, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const setOg = (property, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", description);
    setMeta("keywords", keywords);
    setOg("og:title", fullTitle);
    setOg("og:description", description);

    return () => {
      // Restore default on unmount
      document.title = "ميدورا - منصتك الطبية الشاملة";
    };
  }, [title, description, keywords]);
}
