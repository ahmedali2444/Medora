import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Home_Page/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useLang } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { medoraApi } from "../api/medoraApi";

export default function Contact() {
  const { t } = useLang();
  const { isAuthenticated } = useAuth();
  const isRtl = t.dir === "rtl";
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [ui, setUi] = useState({ loading: false, error: "", success: "" });

  const title = isRtl ? "تواصل معنا" : "Contact Us";
  const subtitle = isRtl
    ? "أرسل رسالتك وسنرد عليك في أقرب وقت ممكن."
    : "Send us a message and we will get back to you as soon as possible.";

  const items = [
    {
      title: isRtl ? "البريد الإلكتروني" : "Email",
      value: "info@medora.com",
      href: "mailto:info@medora.com",
      Icon: Mail,
      dir: "ltr",
    },
    {
      title: isRtl ? "الهاتف" : "Phone",
      value: "+20 101 234 5678",
      href: "tel:+201012345678",
      Icon: Phone,
      dir: "ltr",
    },
    {
      title: isRtl ? "الموقع" : "Location",
      value: isRtl ? "القاهرة، مصر" : "Cairo, Egypt",
      href: null,
      Icon: MapPin,
      dir: t.dir,
    },
  ];

  const openMailto = () => {
    const subject = encodeURIComponent(isRtl ? "رسالة من صفحة التواصل - Medora" : "Medora contact form message");
    const body = encodeURIComponent(
      `${isRtl ? "الاسم" : "Name"}: ${form.name}\n${isRtl ? "البريد" : "Email"}: ${form.email}\n\n${form.message}`,
    );
    window.location.href = `mailto:info@medora.com?subject=${subject}&body=${body}`;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setUi({
        loading: false,
        error: isRtl ? "يرجى تعبئة جميع الحقول" : "Please fill in all fields",
        success: "",
      });
      return;
    }

    setUi({ loading: true, error: "", success: "" });
    const reason = `Contact form | ${form.name.trim()} | ${form.email.trim()} | ${form.message.trim()}`;

    if (isAuthenticated) {
      try {
        await medoraApi.report({
          targetType: "platform",
          targetId: 0,
          reason,
        });
        setForm({ name: "", email: "", message: "" });
        setUi({
          loading: false,
          error: "",
          success: isRtl ? "تم استلام رسالتك. شكرًا لتواصلك معنا." : "Your message was received. Thank you for contacting us.",
        });
        return;
      } catch (error) {
        openMailto();
        setUi({
          loading: false,
          error: error.message || (isRtl ? "تعذر الإرسال عبر المنصة. تم فتح البريد كبديل." : "Unable to submit via platform. Email client opened as fallback."),
          success: "",
        });
        return;
      }
    }

    openMailto();
    setUi({
      loading: false,
      error: "",
      success: isRtl ? "تم فتح تطبيق البريد لإرسال رسالتك." : "Your email app was opened to send the message.",
    });
  };

  return (
    <div dir={t.dir} className="min-h-screen bg-[#eef8f8] text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-7 sm:py-9">
        <section className="rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-[0_10px_30px_rgba(2,8,23,0.05)] sm:px-10 sm:py-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6f7f7]">
              <MessageCircle className="h-6 w-6 text-[#119a8a]" />
            </div>
            <h1 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="mx-auto mt-8 max-w-2xl space-y-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">{isRtl ? "الاسم" : "Name"}</label>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#14b8a6]"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">{isRtl ? "البريد الإلكتروني" : "Email"}</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#14b8a6]"
                dir="ltr"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">{isRtl ? "الرسالة" : "Message"}</label>
              <textarea
                value={form.message}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                rows={5}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#14b8a6]"
                required
              />
            </div>
            {ui.error && <p className="text-sm font-semibold text-red-600">{ui.error}</p>}
            {ui.success && <p className="text-sm font-semibold text-[#0e7c6e]">{ui.success}</p>}
            <button
              type="submit"
              disabled={ui.loading}
              className="w-full rounded-xl bg-[#119a8a] py-3 text-sm font-extrabold text-white transition hover:bg-[#0e7c6e] disabled:opacity-60"
            >
              {ui.loading ? "..." : (isRtl ? "إرسال الرسالة" : "Send message")}
            </button>
          </form>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {items.map((item) => {
              const content = (
                <>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6f7f7]">
                    <item.Icon className="h-6 w-6 text-[#119a8a]" />
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-900">{item.title}</h2>
                  <p className="mt-2 text-sm text-slate-600" dir={item.dir}>
                    {item.value}
                  </p>
                </>
              );

              if (!item.href) {
                return (
                  <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                    {content}
                  </div>
                );
              }

              return (
                <a
                  key={item.title}
                  href={item.href}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:border-[#14b8a6] hover:bg-white"
                >
                  {content}
                </a>
              );
            })}
          </div>

          <div className="mt-8 flex justify-center">
            <Link
              to="/"
              className="rounded-xl bg-[#119a8a] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#0e7c6e]"
            >
              {isRtl ? "الرجوع للرئيسية" : "Back Home"}
            </Link>
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
