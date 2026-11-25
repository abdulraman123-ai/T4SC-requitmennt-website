import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
const geist = Geist({subsets:["latin"],variable:"--font-geist-sans"});
const mono = Geist_Mono({subsets:["latin"],variable:"--font-geist-mono"});
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://t4sc-recruitment-website.vercel.app"),
  title:{default:"T4SC | Technology for Social Change",template:"%s | T4SC"},
  description:"A community for curious minds and future builders. Explore AI, game development, full-stack engineering and cybersecurity.",
  applicationName:"T4SC",
  openGraph:{type:"website",title:"T4SC — Build what matters",description:"Open recruitment for curious minds, beginners and experienced builders.",siteName:"T4SC"},
  robots:{index:true,follow:true}
};
export const viewport: Viewport={width:"device-width",initialScale:1,themeColor:"#070b16"};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en" className={`${geist.variable} ${mono.variable}`}><body>{children}</body></html>;
}