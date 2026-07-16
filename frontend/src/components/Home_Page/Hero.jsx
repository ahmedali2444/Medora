import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Reveal from "./Reveal.jsx";
import { Bot, Newspaper, Pill, Stethoscope } from "lucide-react";
import { useLang } from "../../context/LanguageContext.jsx";

export default memo(function Hero() {
  const { t } = useLang();
  const navigate = useNavigate();

  const miniCards = useMemo(() => [
    { title: t.hero_card1_title, desc: t.hero_card1_desc, Icon: Bot, path: "/ai-consultation" },
    { title: t.hero_card2_title, desc: t.hero_card2_desc, Icon: Pill, path: "/medicine" },
    { title: t.hero_card3_title, desc: t.hero_card3_desc, Icon: Stethoscope, path: "/doctors" },
    { title: t.hero_card4_title, desc: t.hero_card4_desc, Icon: Newspaper, path: "/articles" },
  ], [t]);

  return (
    <section className="relative bg-[#418989] overflow-hidden">
      <div className="absolute inset-0 w-full h-full">
   
      </div>
      <div className="absolute inset-0 bg-linear-to-b from-black/5 via-transparent to-black/10" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 text-white sm:px-6 md:py-16 lg:px-8 lg:py-20">
        <div className="text-center">
          <Reveal>
            <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">
              {t.hero_title}
            </h1>
          </Reveal>

          <Reveal delay={120}>
            <p className="mx-auto mt-4 max-w-2xl px-4 text-sm text-white/95 sm:text-base md:text-lg">
              {t.hero_subtitle}
            </p>
          </Reveal>

          <Reveal delay={220}>
            <div className="mt-6 flex items-center justify-center px-4">
              <button
                onClick={() => navigate("/services")}
                className="w-full rounded-xl bg-white px-10 py-4 text-lg font-bold text-[#4A9B96] shadow-lg transition hover:bg-gray-50 sm:w-auto sm:min-w-[320px] sm:px-12"
              >
                {t.hero_start}
              </button>
            </div>
          </Reveal>

          <div className="mx-auto mt-10 grid max-w-7xl grid-cols-1 gap-3 px-4 sm:grid-cols-2 sm:gap-4 md:mt-12 lg:grid-cols-4">
            {miniCards.map((c, idx) => (
              <Reveal key={c.title} className="h-full" delay={300 + idx * 80}>
                <div
                  onClick={() => c.path && navigate(c.path)}
                  className={[
                    "group flex h-full min-h-[104px] flex-row items-center gap-4 rounded-2xl border border-white/10 bg-white/15 px-5 py-4 text-start shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/20 hover:shadow-2xl sm:min-h-[180px] sm:flex-col sm:justify-center sm:gap-0 sm:rounded-3xl sm:px-5 sm:py-5 sm:text-center",
                    c.path ? "cursor-pointer" : "",
                  ].join(" ")}
                >
                  <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/20 backdrop-blur-sm sm:mb-3 sm:h-14 sm:w-14">
                    <c.Icon className="h-6 w-6 text-white sm:h-7 sm:w-7" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold sm:mb-1.5 sm:text-xl">{c.title}</h3>
                    <p className="mt-1 text-xs leading-6 text-white/90 sm:mt-0 sm:text-sm sm:leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});
