import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bol - Hinglish-to-English Speaking Coach",
  description: "Speak English without fear. Tap-to-talk voice sanctuary built for Hindi-speaking students.",
  icons: {
    icon: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Epilogue:wght@500;600;700&family=Fraunces:opsz,wght@9..144,600;700&family=Noto+Sans:wght@400;500;600&family=Noto+Sans+Tamil:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#0f1030] text-[#e1e0ff] antialiased selection:bg-[#ff7a59] selection:text-[#701500]">
        {children}
      </body>
    </html>
  );
}
