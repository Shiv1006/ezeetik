import "./globals.css";
import Providers from "@/components/Providers";

export const metadata = {
  title: "EzeeTik — Create Surveys People Actually Want to Answer",
  description: "EzeeTik makes it easy to create beautiful surveys, share them, and watch responses grow.",
  openGraph: {
    title: "EzeeTik — Viral Survey Platform",
    description: "Create beautiful surveys, share them everywhere, and watch responses grow.",
  },
};

export const viewport = { width: "device-width", initialScale: 1 };

/* Sets the saved theme or light default before first paint */
const themeScript = `try{var t=JSON.parse(localStorage.getItem('pulse_theme'))||'light';document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1151707142950550"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
