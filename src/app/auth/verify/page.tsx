'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function VerifyInner() {
    const params = useSearchParams()
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

    useEffect(() => {
        const key = params.get('key')
        if (!key) { setStatus('error'); return }

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/registration/verify-email/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key }),
        }).then(r => setStatus(r.ok ? 'success' : 'error'))
            .catch(() => setStatus('error'))
    }, [params])

    return (
        <main className="min-h-screen flex items-center justify-center bg-bg px-4">
            <div className="animate-fade-up w-full max-w-sm text-center">
                {status === 'loading' && (
                    <>
                        <div className="animate-spin-sm w-6 h-6 border border-border border-t-white rounded-full mx-auto mb-4" />
                        <p className="font-mono text-xs text-muted">verifying your email...</p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <div className="w-12 h-12 rounded-full bg-score-green-bg border border-score-green/30 flex items-center justify-center mx-auto mb-6">
                            <span className="text-score-green text-xl">✓</span>
                        </div>
                        <h1 className="font-display font-extrabold text-2xl text-white tracking-tight mb-2">
                            Email verified
                        </h1>
                        <p className="font-mono text-xs text-muted mb-6">
                            Your account is active. You can now login.
                        </p>
                        <Link href="/login"
                            className="font-mono text-sm font-medium bg-white text-bg px-6 py-2.5 rounded hover:opacity-80 transition-opacity inline-block">
                            login →
                        </Link>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <div className="w-12 h-12 rounded-full bg-score-red-bg border border-score-red/30 flex items-center justify-center mx-auto mb-6">
                            <span className="text-score-red text-xl">✕</span>
                        </div>
                        <h1 className="font-display font-extrabold text-2xl text-white tracking-tight mb-2">
                            Invalid link
                        </h1>
                        <p className="font-mono text-xs text-muted mb-6">
                            This verification link is invalid or has expired.
                        </p>
                        <Link href="/register"
                            className="font-mono text-xs text-muted border border-border px-4 py-2 rounded hover:border-border-hover hover:text-white transition-all inline-block">
                            register again
                        </Link>
                    </>
                )}
            </div>
        </main>
    )
}

export default function VerifyPage() {
    return <Suspense><VerifyInner /></Suspense>
}