import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevQuery Forum - Get Instant AI-Powered Answers",
  description:
    "A modern Q&A platform where every question receives instant AI-generated answers, powered by GPT-5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="font-sans antialiased bg-background text-foreground"
        suppressHydrationWarning
      >
        <Providers>
          <Header />
          <main className="px-4 sm:px-6 py-6 sm:py-8">
            <div className="max-w-[1200px] mx-auto">{children}</div>
          </main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
