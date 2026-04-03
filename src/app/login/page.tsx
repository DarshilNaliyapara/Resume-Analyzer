'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveTokens } from '@/lib/api'
import api from '@/lib/api'
import OAuthButtons from '@/components/OAuthButtons'
import { EyeOffIcon, EyeIcon } from 'lucide-react'

export default function Login() {
    const router = useRouter()
    const [form, setForm] = useState({ email: '', password: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true); setError('')
        try {
            const res = await api.post('/auth/login/', form)
            saveTokens(res.data.access, res.data.refresh)
            router.push('/dashboard')
        } catch (err: any) {
            setError(err.response?.status === 401
                ? 'Invalid credentials or email not verified yet.'
                : 'Login failed. Please try again.')
        } finally { setLoading(false) }
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-bg px-5 py-10">
            <div className="animate-fade-up w-full max-w-sm">
                <div className="mb-8 md:mb-10">
                    <Link href="/" className="font-mono text-sm text-muted tracking-widest hover:text-white transition-colors">
                        ← RESUME ANALYZER
                    </Link>
                </div>

                <h1 className="font-display font-extrabold text-2xl md:text-3xl text-white tracking-tight mb-1">
                    Welcome back
                </h1>
                <p className="font-mono text-xs text-muted mb-8">login to your account</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    {[
                        { key: 'email', type: 'email', ph: 'email address' },
                        { key: 'password', type: 'password', ph: 'password' },
                    ].map(({ key, type, ph }) => (
                        <div key={key} className="relative w-full">
                            <input
                                type={key === 'password' ? (showPassword ? 'text' : 'password') : type}
                                placeholder={ph}
                                required
                                value={(form as any)[key]}
                                onChange={e => setForm({ ...form, [key]: e.target.value })}
                                className="w-full px-4 py-3 bg-surface border border-border rounded text-white placeholder-muted outline-none focus:border-border-hover transition-colors"
                            />

                            {key === 'password' && (
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors cursor-pointer"
                                >
                                    {showPassword ? (
                                        <EyeOffIcon size={18} />
                                    ) : (
                                        <EyeIcon size={18} />
                                    )}
                                </button>
                            )}
                        </div>
                    ))}

                    {error && (
                        <div className="animate-slide-in px-4 py-3 bg-score-red-bg border border-score-red/30 rounded font-mono text-sm text-score-red">
                            {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading}
                        className="mt-2 py-3 bg-white text-bg rounded font-mono text-sm font-medium hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer">
                        {loading ? 'logging in...' : 'login →'}
                    </button>
                </form>

                <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-border" />
                    <span className="font-mono text-sm text-muted">or</span>
                    <div className="flex-1 h-px bg-border" />
                </div>

                <OAuthButtons />

                <p className="text-center mt-6 font-mono text-sm text-muted">
                    no account?{' '}
                    <Link href="/register" className="text-white hover:opacity-70 transition-opacity cursor-pointer">register free</Link>
                </p>
            </div>
        </main>
    )
}