'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { saveTokens } from '@/lib/api'
import api from '@/lib/api'
import { Suspense } from 'react'

function GitHubCallbackInner() {
    const router = useRouter()
    const params = useSearchParams()

    useEffect(() => {
        const code = params.get('code')
        if (!code) { router.push('/login'); return }

        api.post('/auth/github/', {
            code,
            redirect_uri: 'http://localhost:3000/auth/callback/github',
        }).then(res => {
            saveTokens(res.data.access, res.data.refresh)
            router.push('/dashboard')
        }).catch(() => router.push('/login?error=github'))
    }, [params, router])

    return (
        <main className="min-h-screen flex items-center justify-center bg-bg">
            <div className="text-center">
                <div className="animate-spin-sm w-6 h-6 border border-border border-t-white rounded-full mx-auto mb-4" />
                <p className="font-mono text-xs text-muted">completing github login...</p>
            </div>
        </main>
    )
}

export default function GitHubCallback() {
    return (
        <Suspense>
            <GitHubCallbackInner />
        </Suspense>
    )
}