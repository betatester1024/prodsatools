import "./globals.css";
import { Themes } from "@/lib/Themes";
import Link from "next/link";

import { Noto_Sans_Display, Noto_Sans_Mono } from "next/font/google";

const NotoSansDisplay = Noto_Sans_Display({
  variable: "--font-nsd",
  subsets: ["latin"],
});

const NotoSansMono = Noto_Sans_Mono({
  variable: "--font-nsm",
  subsets: ["latin"],
});

export default function RootLayout({children}: Readonly<{children:React.ReactNode}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.png"/>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
        <meta name="description" content="Blueprint editor and valuator for ProDSA Services, a subsidiary of BetaOS Services."/>
        <meta property="og:type" content="website"/>
        <meta property="og:title" content="ProDSA Services Tools"/>
        <meta property="og:description" content="Blueprint editor and valuator for ProDSA Services, a subsidiary of BetaOS Services."/>
        <meta property="og:image" content="https://prodsatools.vercel.app/icon.png"/>
      </head>
      <body className={`${NotoSansDisplay.variable} ${NotoSansMono.variable} antialiased`}>
        {children}
        <footer className={`${Themes.BLUE.textCls} p-3 flex gap-2 flex-wrap justify-center`}>
          <Link href="/valuate">Ship cost calculator</Link>
          <Link href="/rates">ProDSA Rates</Link>
          <Link href="/">ProDSA PrecisionEdit Tools</Link>
          <Link href="//dsc.gg/ProDSA" target="_blank" className={Themes.GREEN.textCls}>Order ships from ProDSA Services today!</Link>
          <span>Site design by ProDSA Services</span>
        </footer>
      </body>
    </html>
  );
}
