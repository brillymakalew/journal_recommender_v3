import './globals.css'
import { Inter } from 'next/font/google'
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
    title: "Journal Recommender",
    description: "AI-powered journal recommendations",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className="dark">
            <body className={inter.className}>
                <ThemeProvider>{children}</ThemeProvider>
            </body>
        </html>
    )
}
