'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAccessToken } from '@/lib/api'

export default function Home() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (getAccessToken()) {
      router.replace('/dashboard')
    } else {
      setChecking(false)
    }
  }, [router])

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-bg">
        <div className="animate-fade-up text-center">
          <div className="animate-spin-sm w-6 h-6 border border-border border-t-white rounded-full mx-auto mb-5" />
          <p className="font-display font-bold text-white text-lg tracking-tight mb-1">
            Redirecting to dashboard
          </p>
          <p className="font-mono text-sm text-muted">taking you back...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col bg-bg text-text">
      <nav className="animate-fade-in flex justify-between items-center px-5 md:px-8 py-5 border-b border-border">
        <span className="font-display font-extrabold text-sm md:text-base text-white tracking-tight">
          RESUMALYZE
        </span>
        <div className="flex gap-2 md:gap-3">
          <Link href="/login"
            className="font-mono text-sm text-muted border border-border px-3 py-1.5 rounded hover:text-white hover:border-border-hover transition-all">
            login
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex flex-col justify-center px-5 md:px-8 py-16 md:py-24 max-w-4xl">
        <p className="animate-fade-up font-mono text-sm text-muted tracking-widest mb-4">
          AI-POWERED · FREE TO START
        </p>
        <h1 className="animate-fade-up delay-1 font-display font-extrabold leading-none tracking-tighter text-white mb-6 md:mb-8"
          style={{ fontSize: 'clamp(2.5rem, 8vw, 7rem)' }}>
          Know your<br />
          <span className="text-muted">fit score.</span>
        </h1>
        <p className="animate-fade-up delay-2 font-mono text-sm text-muted max-w-md leading-relaxed mb-10 md:mb-12">
          Upload your resume and paste a job description. Get an AI score,
          skill gaps, and actionable suggestions in under 30 seconds.
        </p>
        <div className="animate-fade-up delay-3 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <Link href="/register"
            className="font-mono text-sm font-medium text-bg bg-white px-6 py-3 rounded hover:opacity-80 transition-opacity">
            start free →
          </Link>
          <span className="font-mono text-sm text-muted">
            3 analyses/month free · no credit card
          </span>
        </div>
      </div>

      <div className="animate-fade-in delay-5 px-5 md:px-8 py-4 flex flex-wrap gap-4 md:gap-8 border-t border-border">
        {['PDF upload', 'URL scraping', 'Skill gap analysis', 'Pro plan unlimited'].map((f) => (
          <span key={f} className="font-mono text-sm text-muted">{f}</span>
        ))}
      </div>
    </main>
  )
}
