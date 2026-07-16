import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import Navbar from "../components/Navbar";
import MobileBottomNav from "../components/MobileBottomNav";
import { useLang } from "../context/LanguageContext";

export default function Privacy() {
    const { t } = useLang();
    const isRtl = t.dir === "rtl";
    const ta = isRtl ? "text-right" : "text-left";

    const sections = isRtl ? AR_SECTIONS : EN_SECTIONS;

    return (
        <div dir={t.dir} className="min-h-screen bg-slate-50" style={{ fontFamily: "'Cairo','Inter',sans-serif" }}>
            <Navbar />

            {/* Header */}
            <div className="bg-[#0b9292] py-7 text-center sm:py-8">
                <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                    <Shield className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
                    {isRtl ? "سياسة الخصوصية" : "Privacy Policy"}
                </h1>
                <p className="mt-1 text-white/60 text-xs">
                    {isRtl ? "آخر تحديث: مارس 2026" : "Last updated: March 2026"}
                </p>
            </div>

            {/* Content */}
            <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
                {sections.map((sec) => (
                    <div key={sec.title}>
                        <h2 className={`text-sm font-extrabold text-[#0b9292] mb-2 ${ta}`}>{sec.title}</h2>
                        <ul className={`space-y-1.5 ${ta}`}>
                            {sec.points.map((point) => (
                                <li key={point} className="flex items-start gap-2">
                                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#0da694] shrink-0" />
                                    <span className="text-slate-600 text-sm leading-7">{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}

                {/* Contact */}
                <div className={`pt-4 border-t border-slate-200 text-sm text-slate-500 ${ta}`}>
                    {isRtl ? "للاستفسار: " : "Questions? "}
                    <a href="mailto:privacy@medora.com" className="text-[#0da694] font-bold hover:underline">
                        privacy@medora.com
                    </a>
                </div>

                {/* Back */}
                <Link to="/" className="inline-flex items-center gap-1 text-sm font-bold text-[#0da694] hover:underline">
                    {isRtl ? "← العودة للرئيسية" : "← Back to Home"}
                </Link>
            </main>

            <MobileBottomNav />
        </div>
    );
}

const AR_SECTIONS = [
    {
        title: "١. المعلومات التي نجمعها",
        points: [
            "معلومات التسجيل: الاسم، البريد الإلكتروني، رقم الهاتف، ونوع الحساب.",
            "بيانات الملف الشخصي للأطباء والصيادلة كالتخصص ورقم الترخيص.",
            "بيانات الاستخدام: الصفحات المزارة والاستعلامات المُرسلة.",
            "بيانات الجهاز: نوع المتصفح، نظام التشغيل، وعنوان IP.",
        ],
    },
    {
        title: "٢. كيف نستخدم معلوماتك",
        points: [
            "تفعيل حسابك وتقديم خدمات المنصة.",
            "التحقق من هوية الأطباء والصيادلة.",
            "إرسال إشعارات متعلقة بالمواعيد والتحديثات.",
            "تحسين تجربة المستخدم وتطوير الخدمات.",
        ],
    },
    {
        title: "٣. حماية بياناتك",
        points: [
            "نستخدم تشفير SSL/TLS لجميع البيانات المنقولة.",
            "كلمات المرور مشفرة ولا يمكن لأحد الوصول إليها.",
            "الوصول للبيانات مقيد بالموظفين المصرح لهم فقط.",
        ],
    },
    {
        title: "٤. مشاركة المعلومات",
        points: [
            "لا نبيع أو نؤجر بياناتك لأي طرف ثالث.",
            "قد نشارك بيانات مجهولة الهوية لأغراض إحصائية.",
            "قد نكشف المعلومات إذا طُلب بموجب القانون.",
        ],
    },
    {
        title: "٥. حقوقك",
        points: [
            "الاطلاع على بياناتك الشخصية في أي وقت.",
            "تصحيح أي بيانات غير دقيقة.",
            "طلب حذف بياناتك الشخصية.",
        ],
    },
];

const EN_SECTIONS = [
    {
        title: "1. Information We Collect",
        points: [
            "Registration info: name, email, phone, and account type.",
            "Profile data for doctors and pharmacists (specialty, license).",
            "Usage data: pages visited and AI assistant queries.",
            "Device data: browser type, OS, and IP address.",
        ],
    },
    {
        title: "2. How We Use Your Information",
        points: [
            "Activating your account and providing platform services.",
            "Verifying the identity of doctors and pharmacists.",
            "Sending appointment and update notifications.",
            "Improving user experience and developing services.",
        ],
    },
    {
        title: "3. Protecting Your Data",
        points: [
            "SSL/TLS encryption for all transferred data.",
            "Passwords are encrypted and inaccessible to anyone.",
            "Data access is restricted to authorized personnel only.",
        ],
    },
    {
        title: "4. Sharing Information",
        points: [
            "We do not sell or rent your personal data to any third party.",
            "We may share anonymized data for research purposes.",
            "We may disclose information if required by law.",
        ],
    },
    {
        title: "5. Your Rights",
        points: [
            "Access your personal data stored with us at any time.",
            "Correct any inaccurate or incomplete data.",
            "Request deletion of your personal data.",
        ],
    },
];
