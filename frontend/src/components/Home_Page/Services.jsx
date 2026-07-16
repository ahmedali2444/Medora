import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Reveal from "./Reveal.jsx";
import { CalendarDays, Bot, Pill, ScanSearch as Search } from "lucide-react";
import { useLang } from "../../context/LanguageContext.jsx";

export default memo(function Services() {
  const { t } = useLang();
  const navigate = useNavigate();

  const items = useMemo(() => [
    { title: t.svc1_title, desc: t.svc1_desc, Icon: CalendarDays, path: "/doctors" },
    { title: t.svc2_title, desc: t.svc2_desc, Icon: Bot, path: "/ai-consultation" },
    { title: t.svc3_title, desc: t.svc3_desc, Icon: Pill, path: "/medicine" },
    { title: t.svc4_title, desc: t.svc4_desc, Icon: Search, path: "/doctors" },
  ], [t]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <Reveal>
        <h2 className="text-3xl md:text-4xl font-extrabold text-center">{t.services_title}</h2>
      </Reveal>
      <Reveal delay={120}>
        <p className="mt-3 text-center text-slate-600">{t.services_sub}</p>
      </Reveal>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((x, idx) => (
          <Reveal key={x.title} delay={160 + idx * 90}>
            <div
              onClick={() => x.path && navigate(x.path)}
              className={["group block rounded-2xl bg-white border border-slate-200 px-5 py-6 shadow-[0_10px_25px_rgba(2,8,23,0.06)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_18px_40px_rgba(2,8,23,0.12)] hover:border-slate-300", x.path ? "cursor-pointer" : ""].join(" ")}
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6f7f7]">
                <x.Icon className="h-6 w-6 text-[#14b8a6]" />
              </div>
              <h3 className="text-center font-extrabold">{x.title}</h3>
              <p className="mt-2 text-center text-sm text-slate-600">{x.desc}</p>
              <div className="mt-4 flex justify-center">
                <span className="text-sm font-bold text-[#14b8a6] transition group-hover:-translate-x-1">
                  {t.services_learnmore}
                </span>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
});
