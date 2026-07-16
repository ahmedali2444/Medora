import { memo, useMemo } from "react";
import Reveal from "./Reveal.jsx";
import { CalendarDays, Smile, Building2, UserCheck } from "lucide-react";
import { useLang } from "../../context/LanguageContext.jsx";

export default memo(function Stats() {
  const { t } = useLang();

  const stats = useMemo(() => [
    { label: t.stat1_label, value: "+25,000", Icon: CalendarDays },
    { label: t.stat2_label, value: "+10,000", Icon: Smile },
    { label: t.stat3_label, value: "+200", Icon: Building2 },
    { label: t.stat4_label, value: "+500", Icon: UserCheck },
  ], [t]);

  return (
    <section className="relative overflow-hidden font-sans">
      <div className="absolute inset-0" style={{ background: "linear-gradient(110deg, #14B8A6 0%, #0EA5E9 100%)" }} />
      <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
      <div className="absolute -bottom-32 -left-32 h-112 w-md rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.05)" }} />
      <div className="absolute -bottom-40 -left-40 h-140 w-140 rounded-full blur-[100px]" style={{ backgroundColor: "#2DD4BF", opacity: 0.35 }} />
      <div className="absolute -top-32 -right-32 h-160 w-160 rounded-full blur-[120px]" style={{ backgroundColor: "#38BDF8", opacity: 0.45 }} />

      <div className="relative mx-auto max-w-6xl px-4 py-20 text-white">
        <Reveal>
          <h2 className="text-3xl md:text-5xl font-bold text-center tracking-tight">{t.stats_title}</h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mt-3 text-center text-white/90 text-lg">{t.stats_sub}</p>
        </Reveal>

        <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s, idx) => (
            <Reveal key={idx} delay={160 + idx * 90}>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm">
                  <s.Icon className="h-8 w-8 text-white" strokeWidth={2.5} />
                </div>
                <div className="text-3xl font-extrabold mb-1">{s.value}</div>
                <div className="text-sm md:text-base font-medium text-white/95">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
});