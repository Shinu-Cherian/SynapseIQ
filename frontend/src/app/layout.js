import { Inter, Syne, Space_Grotesk } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const syne = Syne({
  weight: ["800"],
  subsets: ["latin"],
  variable: "--font-syne",
});

const spaceGrotesk = Space_Grotesk({
  weight: ["500", "700"],
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata = {
  title: "SynapseIQ | The AI-Powered Organizational Brain",
  description: "Synchronized workspace with chat, document versioning, automated meeting transcripts, and pgvector RAG memory.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${syne.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <SmoothScroll>
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}

