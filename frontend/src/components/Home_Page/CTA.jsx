import { memo } from "react";
import { useNavigate } from "react-router-dom";
import Reveal from "./Reveal";
import { useLang } from "../../context/LanguageContext";

export default memo(function CTA() {
  const navigate = useNavigate();
  const { t } = useLang();

  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <div className="rounded-3xl bg-white/60 border border-white/80 px-6 py-12 text-center shadow-[0_10px_30px_rgba(2,8,23,0.06)]">
        <Reveal>
          <h2 className="text-3xl md:text-4xl font-extrabold">{t.cta_title}</h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mt-3 text-slate-600">{t.cta_sub}</p>
        </Reveal>
        <Reveal delay={220}>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/sign-up")}
              className="rounded-lg bg-[#12998B] px-8 py-3 font-extrabold text-white hover:bg-[#0e8077] transition"
            >
              {t.cta_register}
            </button>
            <button
              type="button"
              onClick={() => navigate("/sign-in")}
              className="rounded-lg border-2 border-[#2f8f8f] px-8 py-3 font-extrabold text-[#2f8f8f] hover:bg-[#2f8f8f]/5 transition"
            >
              {t.cta_login}
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
});