import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "T4SC | Technology for Social Change", description: "An inclusive technology community recruiting curious people, committed beginners and experienced builders across four departments." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
