import { createElement, memo } from "react";
import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter, Phone, Mail, MapPin } from "lucide-react";
import logo from "../../assets/images/Logo.png";
import { useLang } from "../../context/LanguageContext";
const SOCIAL_LINKS = [
  { key: 'instagram', Icon: Instagram, href: import.meta.env.VITE_SOCIAL_INSTAGRAM || '' },
  { key: 'twitter', Icon: Twitter, href: import.meta.env.VITE_SOCIAL_TWITTER || '' },
  { key: 'facebook', Icon: Facebook, href: import.meta.env.VITE_SOCIAL_FACEBOOK || '' },
].filter((item) => item.href).map((item) => ({
  ...item,
  label: item.key.charAt(0).toUpperCase() + item.key.slice(1),
}));

export default memo(function Footer() {
  const { t } = useLang();

  return (
    <footer className="bg-[#0b1220] text-white/80" dir={t.dir}>
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="text-center">
            <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="inline-flex items-center gap-3 hover:opacity-90 transition justify-center">
              <img src={logo} alt="Medora Logo" className="h-15 w-15 object-contain" />
              <span className="text-white font-extrabold text-3xl">{t.brand}</span>
            </Link>
            <p className="mt-4 text-base leading-8 text-white/70">{t.footer_desc}</p>
            {SOCIAL_LINKS.length > 0 && (
            <div className="mt-6 flex items-center gap-4 justify-center">
              {SOCIAL_LINKS.map(({ key, Icon, href, label }) => (
                  <a key={key} href={href} target="_blank" rel="noreferrer noopener" aria-label={label || key}
                    className="h-12 w-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/15 hover:-translate-y-0.5 transition">
                    {createElement(Icon, { className: "h-5 w-5 text-white/80" })}
                  </a>
                ))}
            </div>
            )}
          </div>

          {/* Quick links */}
          <div className={t.dir === "rtl" ? "text-right" : "text-left"}>
            <div className="text-white font-extrabold text-xl mb-5">{t.footer_quick}</div>
            <ul className="space-y-4 text-base text-white/70">
              <li><Link className="hover:text-white transition" to="/" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>{t.footer_home}</Link></li>
              <li><Link className="hover:text-white transition" to="/doctors">{t.footer_find_doctor}</Link></li>
              <li><Link className="hover:text-white transition" to="/medicine">{t.footer_find_medicine}</Link></li>
              <li><Link className="hover:text-white transition" to="/ai-consultation">{t.footer_ai}</Link></li>
            </ul>
          </div>

          {/* Users */}
          <div className={t.dir === "rtl" ? "text-right" : "text-left"}>
            <div className="text-white font-extrabold text-xl mb-5">{t.footer_users}</div>
            <ul className="space-y-4 text-base text-white/70">
              <li><Link className="hover:text-white transition" to="/sign-up?role=patient">{t.footer_reg_patient}</Link></li>
              <li><Link className="hover:text-white transition" to="/sign-up?role=doctor">{t.footer_reg_doctor}</Link></li>
              <li><Link className="hover:text-white transition" to="/sign-up?role=pharmacy">{t.footer_reg_pharmacy}</Link></li>
              <li><Link className="hover:text-white transition" to="/sign-in">{t.footer_login}</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className={t.dir === "rtl" ? "text-right" : "text-left"}>
            <div className="text-white font-extrabold text-xl mb-5">{t.footer_contact}</div>
            <div className="space-y-5 text-base text-white/70">
              <div className="flex items-center gap-3"><Phone className="h-5 w-5 text-teal-400 shrink-0" /><span dir="ltr">+20 101 234 5678</span></div>
              <div className="flex items-center gap-3"><Mail className="h-5 w-5 text-teal-400 shrink-0" /><span>info@medora.com</span></div>
              <div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-teal-400 shrink-0" /><span>{t.footer_location}</span></div>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10" />
        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between text-sm">
          <div className="flex items-center gap-6 text-white/60">
            <Link className="hover:text-white transition" to="/privacy">{t.footer_privacy}</Link>
            <Link className="hover:text-white transition" to="/terms">{t.footer_terms}</Link>
          </div>
          <div className="text-white/60">{t.footer_rights} <span className="text-white/70">© 2026</span></div>
        </div>
      </div>
    </footer>
  );
});
