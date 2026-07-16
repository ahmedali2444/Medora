import { memo, useMemo } from "react";
import Reveal from "./Reveal.jsx";
import { Star } from "lucide-react";
import { useLang } from "../../context/LanguageContext.jsx";

const Stars = memo(function Stars() {
  return (
    <div className="flex items-center justify-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      ))}
    </div>
  );
});

export default memo(function Testimonials() {
  const { t } = useLang();

  const people = useMemo(() => [
    { name: t.t1_name, role: t.t1_role, text: t.t1_text },
    { name: t.t2_name, role: t.t2_role, text: t.t2_text },
    { name: t.t3_name, role: t.t3_role, text: t.t3_text },
  ], [t]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <Reveal>
        <h2 className="text-3xl md:text-4xl font-extrabold text-center">{t.test_title}</h2>
      </Reveal>
      <Reveal delay={120}>
        <p className="mt-3 text-center text-slate-600">{t.test_sub}</p>
      </Reveal>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {people.map((p, idx) => (
          <Reveal key={p.name} delay={160 + idx * 90}>
            <div className="group rounded-2xl bg-white border border-slate-200 px-6 py-6 shadow-[0_10px_25px_rgba(2,8,23,0.06)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_18px_40px_rgba(2,8,23,0.12)] hover:border-slate-300">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-extrabold">{p.name}</div>
                  <div className="text-sm text-slate-500">{p.role}</div>
                </div>
                <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full w-full bg-linear-to-br from-slate-200 to-slate-300" />
                </div>
              </div>
              <div className="mt-4"><Stars /></div>
              <p className="mt-4 text-sm leading-7 text-slate-600">{p.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
});
