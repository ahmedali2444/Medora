import { memo, useEffect, useMemo, useState } from "react";
import {
  ScanSearch as Search,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  Star,
  BookOpen,
  Heart,
  Brain,
  ShieldCheck,
  Baby,
  Apple,
  FileText,
  X,
} from "lucide-react";
import { useLang } from "../context/LanguageContext";
import Navbar from "../components/Navbar";
import MobileBottomNav from "../components/MobileBottomNav";
import SearchEmptyIcon from "../components/SearchEmptyIcon";
import imgWater from "../assets/images/articles/water_health.jpg";
import imgNutrition from "../assets/images/articles/nutrition.jpg";
import imgMental from "../assets/images/articles/mental_health.jpg";
import imgFitness from "../assets/images/articles/fitness.jpg";
import { medoraApi } from "../api/medoraApi";

const IMAGE_MAP = {
  water: imgWater,
  nutrition: imgNutrition,
  mental: imgMental,
  fitness: imgFitness,
};

const BRAND = "#0da694";
const BRAND_DK = "#0b9282";
const BRAND_LT = "#e8f7f5";

const CAT_ICONS = {
  "كل المقالات": FileText,
  "All Articles": FileText,
  "الصحة العامة": Heart,
  "General Health": Heart,
  "الصحة النفسية": Brain,
  "Mental Health": Brain,
  "الأمراض والوقاية": ShieldCheck,
  "Diseases & Prevention": ShieldCheck,
  "صحة الأطفال": Baby,
  "Children's Health": Baby,
  "صحة وتغذية": Apple,
  "Health & Nutrition": Apple,
};

export default function Articles() {
  const { t } = useLang();
  const isRtl = t.dir === "rtl";

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [visibleCount, setVisibleCount] = useState(9);
  const [email, setEmail] = useState("");
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [newsletterState, setNewsletterState] = useState({ type: "idle", message: "" });
  const [apiArticles, setApiArticles] = useState([]);
  const [ui, setUi] = useState({ loading: true, error: "" });

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) setUi({ loading: true, error: "" });
    });
    medoraApi.articles({ search, page: 1, pageSize: 50 })
      .then((data) => {
        if (!mounted) return;
        const mapped = Array.isArray(data?.items) ? data.items.map((article) => ({
          id: article.id,
          title: article.title,
          excerpt: article.title,
          cat: (isRtl ? article.specialtyNameAr : article.specialtyNameEn) || article.specialtyNameAr || t.art_categories[0],
          author: article.authorName,
          readTime: 4,
          date: article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : "",
          img: article.coverImageUrl || null,
          featured: false,
          source: "api",
        })) : [];
        setApiArticles(mapped);
        setUi({ loading: false, error: "" });
      })
      .catch((error) => {
        if (!mounted) return;
        setApiArticles([]);
        setUi({ loading: false, error: error.message || "Unable to load articles" });
      });
    return () => { mounted = false; };
  }, [search, isRtl, t.art_categories]);

  const articles = apiArticles.length ? apiArticles : t.art_articles;
  const categories = useMemo(() => {
    const values = new Set(t.art_categories);
    apiArticles.forEach((article) => {
      if (article.cat) values.add(article.cat);
    });
    return [...values];
  }, [apiArticles, t.art_categories]);
  const activeCategoryValue = categories.includes(activeCategory) ? activeCategory : categories[0];

  const filtered = useMemo(() => {
    return articles
      .map((article) => ({
        ...article,
        img: article.img || (article.imgKey ? IMAGE_MAP[article.imgKey] : null),
      }))
      .filter((article) => {
        const matchCategory = activeCategoryValue === categories[0] || article.cat === activeCategoryValue;
        const query = search.toLowerCase();
        const matchSearch =
          query === "" ||
          article.title.toLowerCase().includes(query) ||
          article.excerpt.toLowerCase().includes(query);
        return matchCategory && matchSearch;
      });
  }, [articles, activeCategoryValue, search, categories]);

  const featured = filtered.find((article) => article.featured);
  const regular = filtered.filter((article) => !article.featured);
  const visible = regular.slice(0, visibleCount);
  const hasMore = regular.length > visibleCount;
  const isNewsletterSuccess = newsletterState.type === "success";

  useEffect(() => {
    if (!selectedArticle) return undefined;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setSelectedArticle(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedArticle]);

  const openArticle = async (article) => {
    setSelectedArticle(article);
    if (article.source !== "api") return;

    try {
      const details = await medoraApi.article(article.id);
      setSelectedArticle((current) => current?.id === article.id ? {
        ...current,
        title: details.title || current.title,
        excerpt: details.content || current.excerpt,
        content: details.content || current.content,
        img: details.coverImageUrl || current.img,
        author: details.authorName || current.author,
        date: details.publishedAt ? new Date(details.publishedAt).toLocaleDateString() : current.date,
      } : current);
    } catch {
      setSelectedArticle(article);
    }
  };

  const closeArticle = () => {
    setSelectedArticle(null);
  };

  const handleNewsletterSubmit = (event) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const isValidEmail = /^\S+@\S+\.\S+$/.test(trimmedEmail);

    if (!trimmedEmail || !isValidEmail) {
      setNewsletterState({
        type: "error",
        message: isRtl
          ? "أدخل بريدًا إلكترونيًا صحيحًا للاشتراك."
          : "Enter a valid email address to subscribe.",
      });
      return;
    }

    setNewsletterState({
      type: "success",
      message: isRtl
        ? "تم تسجيل بريدك وسنرسل لك أحدث المقالات قريبًا."
        : "Your email was saved and we will send new articles soon.",
    });
    setEmail("");
  };

  return (
    <div
      dir={t.dir}
      style={{ fontFamily: "'Cairo','Inter',sans-serif", background: "#f4fbfa", minHeight: "100vh" }}
    >
      <Navbar />

      <section
        style={{
          background: `linear-gradient(135deg, ${BRAND_DK}, ${BRAND}, #14b8a6)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -60,
            width: 250,
            height: 250,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-12 text-center sm:py-16">
          <div
            className="mx-auto mb-5 flex items-center justify-center"
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "rgba(255,255,255,0.18)",
              backdropFilter: "blur(8px)",
            }}
          >
            <BookOpen style={{ width: 32, height: 32, color: "#fff" }} />
          </div>
          <h1 className="mb-3 text-3xl font-extrabold text-white sm:text-4xl">{t.art_hero_title}</h1>
          <p className="mx-auto max-w-lg text-sm leading-7 text-white/80 sm:text-base">{t.art_hero_sub}</p>
        </div>
      </section>

      <div style={{ background: "#fff" }}>
        <div className="mx-auto flex max-w-6xl justify-center px-4 py-4">
          <div className="relative w-full max-w-xl" style={{ direction: t.dir }}>
            <Search
              className="absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              style={{ [isRtl ? "right" : "left"]: 16 }}
            />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setVisibleCount(9);
              }}
              placeholder={t.art_search_ph}
              dir={t.dir}
              className="w-full rounded-xl text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400"
              style={{
                height: 48,
                paddingLeft: isRtl ? 16 : 48,
                paddingRight: isRtl ? 48 : 16,
                background: "#f4f9f8",
                border: "1.5px solid #dbeae8",
              }}
              onFocus={(event) => {
                event.target.style.borderColor = BRAND;
                event.target.style.boxShadow = `0 0 0 3px ${BRAND}20`;
              }}
              onBlur={(event) => {
                event.target.style.borderColor = "#dbeae8";
                event.target.style.boxShadow = "none";
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ background: "#fff" }}>
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1" style={{ direction: t.dir }}>
            {categories.map((category) => {
              const active = category === activeCategoryValue;
              const IconComp = CAT_ICONS[category] || FileText;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setActiveCategory(category);
                    setVisibleCount(9);
                  }}
                  className="shrink-0 whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-semibold transition-all"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: active ? BRAND : "#f4f9f8",
                    color: active ? "#fff" : "#5a7d7a",
                    border: active ? `1.5px solid ${BRAND}` : "1.5px solid #dbeae8",
                    boxShadow: active ? `0 4px 12px ${BRAND}30` : "none",
                  }}
                >
                  <IconComp style={{ width: 16, height: 16 }} />
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {featured && search === "" && (
          <section className="mb-10">
            <div className="mb-5 flex items-center gap-2" style={{ direction: t.dir }}>
              <Star className="h-5 w-5" style={{ color: BRAND, fill: BRAND }} />
              <span className="text-lg font-bold text-slate-800">{t.art_featured}</span>
            </div>

            <div className="overflow-hidden rounded-2xl shadow-sm" style={{ background: "#fff", border: "1px solid #e2edec" }}>
              <div className="flex flex-col md:flex-row-reverse" style={{ direction: t.dir }}>
                <div className="relative overflow-hidden md:w-1/2" style={{ minHeight: 280 }}>
                  {featured.img ? (
                    <img
                      src={featured.img}
                      alt={featured.title}
                      className="h-full w-full object-cover"
                      style={{ minHeight: 280 }}
                      decoding="async"
                      fetchPriority="high"
                      width={640}
                      height={640}
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center"
                      style={{
                        minHeight: 280,
                        background: `linear-gradient(135deg, ${BRAND_DK}, ${BRAND}, #14b8a6)`,
                      }}
                    >
                      <div className="text-center">
                        <BookOpen
                          style={{
                            width: 48,
                            height: 48,
                            color: "rgba(255,255,255,0.7)",
                            margin: "0 auto 8px",
                          }}
                        />
                        <span className="text-sm font-medium text-white/60">{featured.cat}</span>
                      </div>
                    </div>
                  )}

                  <div className="absolute top-4" style={{ [isRtl ? "right" : "left"]: 16 }}>
                    <span className="rounded-lg px-3 py-1 text-xs font-bold text-white" style={{ background: BRAND }}>
                      {t.art_new}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-center p-6 sm:p-8 md:w-1/2" style={{ textAlign: isRtl ? "right" : "left" }}>
                  <h2 className="mb-3 text-xl font-extrabold leading-snug text-slate-900 sm:text-2xl">{featured.title}</h2>
                  <p className="mb-5 line-clamp-3 text-sm leading-7 text-slate-500">{featured.excerpt}</p>

                  <div className="mb-6 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: BRAND_LT }}>
                        <User className="h-3.5 w-3.5" style={{ color: BRAND }} />
                      </div>
                      <span className="font-medium text-slate-600">{featured.author}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {featured.readTime} {t.art_min}
                    </span>
                    <span>{featured.date}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openArticle(featured)}
                    className="self-start rounded-xl px-6 py-2.5 text-sm font-bold transition-all hover:opacity-90 active:scale-95"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: BRAND,
                      color: "#fff",
                      boxShadow: `0 4px 14px ${BRAND}40`,
                    }}
                  >
                    {t.art_read}
                    {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {filtered.length > 0 && (
          <div className="mb-5 flex items-center gap-2" style={{ direction: t.dir }}>
            <BookOpen className="h-5 w-5" style={{ color: BRAND }} />
            <span className="text-lg font-bold text-slate-800">{t.art_all_articles}</span>
            <span className="text-xs font-medium text-slate-400">({regular.length})</span>
            {ui.loading && <span className="text-xs font-semibold text-slate-400">...</span>}
          </div>
        )}

        {ui.error && <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{ui.error}</div>}

        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <SearchEmptyIcon />
            <p className="text-base font-medium text-slate-400">{t.art_no_results}</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((article) => (
              <ArticleCard key={article.id} article={article} t={t} isRtl={isRtl} onRead={openArticle} />
            ))}
          </div>
        )}

        {hasMore && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((value) => value + 3)}
              className="inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold transition-all hover:opacity-90 active:scale-95"
              style={{
                background: BRAND,
                color: "#fff",
                boxShadow: `0 4px 16px ${BRAND}30`,
              }}
            >
              {t.art_load_more}
            </button>
          </div>
        )}
      </main>

      <section style={{ background: `linear-gradient(135deg, ${BRAND_DK}, ${BRAND})` }}>
        <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:py-16">
          <h2 className="mb-3 text-2xl font-extrabold text-white sm:text-3xl">{t.art_newsletter_title}</h2>
          <p className="mx-auto mb-8 max-w-md text-sm leading-7 text-white/75 sm:text-base">{t.art_newsletter_sub}</p>

          <form
            onSubmit={handleNewsletterSubmit}
            className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
            style={{ direction: t.dir }}
          >
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (newsletterState.type !== "idle") {
                  setNewsletterState({ type: "idle", message: "" });
                }
              }}
              placeholder={t.art_newsletter_ph}
              dir={t.dir}
              className="h-12 flex-1 rounded-xl px-4 text-sm text-slate-700 outline-none placeholder:text-slate-400"
              style={{ border: "2px solid rgba(255,255,255,0.3)", background: "#fff" }}
            />
            <button
              type="submit"
              className="h-12 whitespace-nowrap rounded-xl px-6 text-sm font-bold transition-all hover:opacity-90 active:scale-95"
              style={{
                background: "#fff",
                color: BRAND,
                boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
              }}
            >
              {t.art_newsletter_btn}
            </button>
          </form>

          {newsletterState.message && (
            <p
              className="mt-4 text-sm font-semibold"
              style={{ color: isNewsletterSuccess ? "#d1fae5" : "#fee2e2" }}
            >
              {newsletterState.message}
            </p>
          )}
        </div>
      </section>

      {selectedArticle && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 px-4 py-8" onClick={closeArticle}>
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="relative bg-gradient-to-br from-[#0b9282] via-[#0da694] to-[#14b8a6] px-6 py-6 text-white sm:px-8">
              <button
                type="button"
                onClick={closeArticle}
                className="absolute top-4 rounded-xl bg-white/15 p-2 transition hover:bg-white/25"
                style={{ [isRtl ? "left" : "right"]: 16 }}
              >
                <X className="h-5 w-5" />
              </button>
              <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold">{selectedArticle.cat}</span>
              <h2 className="mt-4 text-2xl font-extrabold leading-snug sm:text-3xl">{selectedArticle.title}</h2>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-white/80">
                <span>{selectedArticle.author}</span>
                <span>{selectedArticle.date}</span>
                <span>
                  {selectedArticle.readTime} {t.art_min}
                </span>
              </div>
            </div>

            <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
              <div className="p-6 sm:p-8" style={{ textAlign: isRtl ? "right" : "left" }}>
                <p className="whitespace-pre-line text-base leading-8 text-slate-700">{selectedArticle.content || selectedArticle.excerpt}</p>
              </div>

              <div className="min-h-72 bg-[#edf8f7]">
                {selectedArticle.img ? (
                  <img
                    src={selectedArticle.img}
                    alt={selectedArticle.title}
                    className="h-full w-full object-cover"
                    decoding="async"
                    width={640}
                    height={640}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <BookOpen className="h-12 w-12 text-[#0da694]" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav />

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

const ArticleCard = memo(function ArticleCard({ article, t, isRtl, onRead }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onRead(article)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex cursor-pointer flex-col overflow-hidden rounded-2xl"
      style={{
        background: "#fff",
        border: hovered ? `1.5px solid ${BRAND}50` : "1.5px solid #e2edec",
        boxShadow: hovered ? "0 12px 28px rgba(13,166,148,0.12)" : "0 2px 8px rgba(0,0,0,0.04)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition: "all 0.3s ease",
      }}
    >
      <div className="relative overflow-hidden" style={{ height: 180 }}>
        {article.img ? (
          <img
            src={article.img}
            alt={article.title}
            className="h-full w-full object-cover transition-transform duration-500"
            style={{ transform: hovered ? "scale(1.05)" : "scale(1)" }}
            loading="lazy"
            decoding="async"
            width={640}
            height={360}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${BRAND_DK}dd, ${BRAND}cc, #14b8a6bb)`,
            }}
          >
            <BookOpen style={{ width: 36, height: 36, color: "rgba(255,255,255,0.5)" }} />
          </div>
        )}
        <div className="absolute top-3" style={{ [isRtl ? "right" : "left"]: 12 }}>
          <span className="rounded-lg px-3 py-1 text-[11px] font-bold text-white" style={{ background: BRAND, backdropFilter: "blur(4px)" }}>
            {article.cat}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5" style={{ textAlign: isRtl ? "right" : "left" }}>
        <h3 className="mb-2 line-clamp-2 text-[15px] font-bold leading-snug text-slate-900">{article.title}</h3>
        <p className="mb-4 flex-1 line-clamp-2 text-[13px] leading-6 text-slate-400">{article.excerpt}</p>

        <div className="mb-4 flex items-center justify-between border-t pt-3 text-[11px] text-slate-400" style={{ borderTop: "1px solid #f0f5f4" }}>
          <span className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: BRAND_LT }}>
              <User className="h-3 w-3" style={{ color: BRAND }} />
            </div>
            <span className="font-medium text-slate-500">{article.author}</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {article.readTime} {t.art_min}
          </span>
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRead(article);
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all"
          style={{
            background: hovered ? BRAND : "transparent",
            color: hovered ? "#fff" : BRAND,
            border: `1.5px solid ${BRAND}`,
          }}
        >
          {t.art_read}
          {isRtl ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
});
