import type {Metadata,Viewport} from "next";
import {Geist,Geist_Mono} from "next/font/google";
import "./globals.css";
import "./community.css";
import {SiteHeader,SiteFooter} from "@/components/site-chrome";
import {MotionEffects} from "@/components/motion-effects";
const geist=Geist({subsets:["latin"],variable:"--font-geist-sans"});
const mono=Geist_Mono({subsets:["latin"],variable:"--font-geist-mono"});
export const metadata:Metadata={metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL??"https://t4sc-recruitment-website.vercel.app"),title:{default:"T4SC | Tech 4 Skill Community",template:"%s | T4SC"},description:"Tech 4 Skill Community — Learn. Build. Play. A selective, beginner-friendly technology community across AI, games, full-stack engineering and cybersecurity.",applicationName:"T4SC",openGraph:{type:"website",title:"T4SC — Learn. Build. Play.",description:"Bring your curiosity. Build your next skill.",siteName:"T4SC"},robots:{index:true,follow:true}};
export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#08101d"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" className={`${geist.variable} ${mono.variable}`}><body><MotionEffects/><a className="skip-link" href="#main-content">Skip to content</a><SiteHeader/><div id="main-content">{children}</div><SiteFooter/></body></html>}
