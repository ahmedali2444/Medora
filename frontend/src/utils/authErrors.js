export function mapAuthErrorMessage(error, t) {
  const code = error?.data?.code;
  const message = error?.message || "";

  if (code === "email_exists") return t.reg_err_email_exists;
  if (code === "email_exists_unverified") return t.reg_err_email_unverified;
  if (code === "phone_exists") return t.reg_err_phone_exists;

  const lower = message.toLowerCase();
  if (lower.includes("email already registered") && lower.includes("not verified")) {
    return t.reg_err_email_unverified;
  }
  if (lower.includes("email already registered") || lower.includes("email already exists")) {
    return t.reg_err_email_exists;
  }
  if (lower.includes("phone number already registered")) {
    return t.reg_err_phone_exists;
  }

  return message || (t.dir === "rtl" ? "حدث خطأ. حاول مرة أخرى." : "Something went wrong. Please try again.");
}
