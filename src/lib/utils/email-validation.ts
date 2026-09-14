import dns from "dns";

import disposableDomains from "disposable-email-domains";

const disposableDomainSet = new Set(
  (disposableDomains as string[]).map((d) => d.toLowerCase())
);

const EXTRA_DISPOSABLE_DOMAINS = new Set([
  "yopmail.com", "yopmail.fr", "tempmail.com", "temp-mail.org",
  "guerrillamail.com", "10minutemail.com", "mailinator.com", "sharklasers.com",
]);

function getDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

export function isDisposableEmail(email: string): boolean {
  const domain = getDomain(email);
  if (!domain) return true;
  return disposableDomainSet.has(domain) || EXTRA_DISPOSABLE_DOMAINS.has(domain);
}

export function hasValidMxRecord(email: string): Promise<boolean> {
  const domain = getDomain(email);
  if (!domain) return Promise.resolve(false);

  return new Promise((resolve) => {
    dns.resolveMx(domain, (err, addresses) => {
      resolve(!err && !!addresses && addresses.length > 0);
    });
  });
}

export async function validateEmailForRegistration(email: string): Promise<string | null> {
  if (isDisposableEmail(email)) {
    return "Gunakan email pribadi/permanen, bukan email sementara (temp-mail)";
  }
  const hasMx = await hasValidMxRecord(email);
  if (!hasMx) {
    return "Domain email tidak valid atau tidak bisa menerima e-mail";
  }
  return null;
}