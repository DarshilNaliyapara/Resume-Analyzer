import type { Metadata } from 'next'
import './globals.css'
import GoogleProvider from '@/components/GoogleProvider'

export const metadata: Metadata = {
  title: 'Resume Analyzer',
  description: 'AI-powered resume analysis',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <GoogleProvider>{children}</GoogleProvider>
      </body>
    </html>
  )
}