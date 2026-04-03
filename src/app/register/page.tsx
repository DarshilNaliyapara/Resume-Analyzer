'use client'
import { useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { EyeOffIcon,EyeIcon } from 'lucide-react'
export default function Register() {
    const [form, setForm] = useState({
        email: '', name: '', password: '', confirmPassword: ''
    })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)
    const [showPassword1, setShowPassword1] = useState(false)
    const [showPassword2, setShowPassword2] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        // Client-side password match check
        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        if (form.password.length < 8) {
            setError('Password must be at least 8 characters.')
            return
        }

        setLoading(true)
        try {
            await api.post('/auth/register/', {
                email: form.email,
                name: form.name,
                password: form.password,
            })
            setSuccess(true)
        } catch (err: any) {
            const d = err.response?.data
            setError(d?.email?.[0] || d?.password?.[0] || 'Registration failed.')
        } finally { setLoading(false) }
    }

    if (success) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-bg px-5">
                <div className="animate-fade-up w-full max-w-sm text-center">
                    <div className="w-12 h-12 rounded-full bg-score-green-bg border border-score-green/30 flex items-center justify-center mx-auto mb-6">
                        <span className="text-score-green text-lg">✓</span>
                    </div>
                    <h1 className="font-display font-extrabold text-2xl text-white tracking-tight mb-2">
                        Check your email
                    </h1>
                    <p className="font-mono text-sm text-muted leading-relaxed mb-6">
                        We sent a verification link to{' '}
                        <span className="text-white">{form.email}</span>.
                        Click it to activate your account before logging in.
                    </p>
                    <Link href="/login"
                        className="font-mono text-sm text-muted border border-border px-4 py-2 rounded hover:border-border-hover hover:text-white transition-all inline-block">
                        back to login
                    </Link>
                </div>
            </main>
        )
    }

    const passwordsTyped = form.password.length > 0 && form.confirmPassword.length > 0
    const passwordsMismatch = passwordsTyped && form.password !== form.confirmPassword
    const passwordsMatch = passwordsTyped && form.password === form.confirmPassword

    return (
        <main className="min-h-screen flex items-center justify-center bg-bg px-5 py-10">
            <div className="animate-fade-up w-full max-w-sm">

                <div className="mb-8">
                    <Link href="/" className="font-mono text-sm text-muted tracking-widest hover:text-white transition-colors">
                        ← RESUME ANALYZER
                    </Link>
                </div>

                <h1 className="font-display font-extrabold text-2xl md:text-3xl text-white tracking-tight mb-1">
                    Create account
                </h1>
                <p className="font-mono text-xs text-muted mb-8">
                    3 free analyses per month
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">

                    <input
                        type="text" placeholder="full name" required
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        className="w-full px-4 py-3 bg-surface border border-border rounded text-white placeholder-muted outline-none focus:border-border-hover transition-colors"
                    />

                    <input
                        type="email" placeholder="email address" required
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        className="w-full px-4 py-3 bg-surface border border-border rounded text-white placeholder-muted outline-none focus:border-border-hover transition-colors"
                    />

                    {/* Password with match indicator */}
                    <div className="relative">
                        <input
                            type={showPassword1 ? 'text' : 'password'} placeholder="password (min 8 chars)" required minLength={8}
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            className={`w-full px-4 py-3 bg-surface border rounded text-white placeholder-muted outline-none transition-colors ${passwordsMismatch ? 'border-score-red/60' :
                                    passwordsMatch ? 'border-score-green/60' :
                                        'border-border focus:border-border-hover'
                                }`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword1(!showPassword1)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors cursor-pointer"
                        >
                            {showPassword1 ? (
                                <EyeOffIcon size={18} />
                            ) : (
                                <EyeIcon size={18} />
                            )}
                        </button>
                    </div>

                    <div className="relative">
                        <input
                            type= {showPassword2 ? 'text' : 'password'} placeholder="confirm password" required
                            value={form.confirmPassword}
                            onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                            className={`w-full px-4 py-3 bg-surface border rounded text-white placeholder-muted outline-none transition-colors ${passwordsMismatch ? 'border-score-red/60' :
                                    passwordsMatch ? 'border-score-green/60' :
                                        'border-border focus:border-border-hover'
                                }`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword2(!showPassword2)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors cursor-pointer"
                        >
                            {showPassword2 ? (
                                <EyeOffIcon size={18} />
                            ) : (
                                <EyeIcon size={18} />
                            )}
                        </button>
                        {/* Inline match indicator */}
                        {passwordsTyped && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                {passwordsMatch ? (
                                    <span className="font-mono text-sm text-score-green">✓</span>
                                ) : (
                                    <span className="font-mono text-sm text-score-red">✕</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Password match message */}
                    {passwordsMismatch && (
                        <p className="font-mono text-sm text-score-red -mt-1">
                            Passwords do not match
                        </p>
                    )}
                    {passwordsMatch && (
                        <p className="font-mono text-sm text-score-green -mt-1">
                            Passwords match
                        </p>
                    )}

                    {error && (
                        <div className="animate-slide-in px-4 py-3 bg-score-red-bg border border-score-red/30 rounded font-mono text-sm text-score-red">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || passwordsMismatch}
                        className="mt-2 py-3 bg-white text-bg rounded font-mono text-sm font-medium hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                        {loading ? 'creating account...' : 'create account →'}
                    </button>
                </form>

                <p className="text-center mt-6 font-mono text-sm text-muted">
                    have an account?{' '}
                    <Link href="/login" className="text-white hover:opacity-70 transition-opacity cursor-pointer">
                        login
                    </Link>
                </p>
            </div>
        </main>
    )
}