import { memo, useMemo } from "react";
import Reveal from "./Reveal.jsx";
import { UserPlus, ScanSearch as Search, CalendarDays, HeartPulse } from "lucide-react";
import { useLang } from "../../context/LanguageContext.jsx";

export default memo(function HowItWorks() {
  const { t } = useLang();

  const steps = useMemo(() => [
    { n: 1, title: t.step1_title, desc: t.step1_desc, Icon: UserPlus },
    { n: 2, title: t.step2_title, desc: t.step2_desc, Icon: Search },
    { n: 3, title: t.step3_title, desc: t.step3_desc, Icon: CalendarDays },
    { n: 4, title: t.step4_title, desc: t.step4_desc, Icon: HeartPulse },
  ], [t]);

  return (
    <section className="bg-white/40 border-y border-white/60">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <Reveal>
          <h2 className="text-3xl md:text-4xl font-extrabold text-center">{t.how_title}</h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mt-3 text-center text-slate-600">{t.how_sub}</p>
        </Reveal>

        <div className="mt-10 grid gap-6 md:grid-cols-4">
          {steps.map((s, idx) => (
            <Reveal key={s.n} delay={160 + idx * 90}>
              <div className="text-center">
                <div className="mx-auto relative h-16 w-16">
                  <div className="absolute inset-0 rounded-full bg-[#119a8a] shadow-[0_12px_30px_rgba(17,154,138,0.28)]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <s.Icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="absolute -top-2 -left-2 h-8 w-8 rounded-full bg-[#14b8a6] text-white font-extrabold flex items-center justify-center shadow">
                    {s.n}
                  </div>
                </div>
                <h3 className="mt-4 font-extrabold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
});
