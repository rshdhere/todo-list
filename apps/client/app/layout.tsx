import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import TRPCReactProvider from "@/providers/trpc-provider";
import { ThemesProvider } from "@/providers/theme-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "todo-list by @rshdhere",
  description: "todo-list by @rshdhere for my daily tasks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className}`}>
        <TRPCReactProvider>
          <ThemesProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <main>{children}</main>
          </ThemesProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
