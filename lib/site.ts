export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://t4sc-recruitment-website.vercel.app";
}