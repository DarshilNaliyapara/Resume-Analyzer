import api, { clearTokens } from "@/lib/api";
import { useState } from "react";
import { useRouter } from 'next/navigation'
export type Plan = { plan: string; analyses_remaining: number; limit: number | string }
type user = { display_name: string }
type Prop = {
    plan: Plan | null
    user: user | null
    fetchData: () => void
}

export default function Navbar({ plan, user, fetchData }: Prop) {
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false)

    const handleLogout = () => { clearTokens(); router.push('/login') }
    const handleUpgrade = async () => { await api.post('/auth/upgrade/'); fetchData() }
    return (
        <nav className="animate-fade-in sticky top-0 z-50 bg-bg border-b border-border">
            <div className="flex justify-between items-center px-4 md:px-6 py-4">
                <span className="font-display font-extrabold text-sm md:text-base text-white tracking-tight">
                    RESUMALYZE
                </span>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-3">
                    {plan && (
                        <span className={`font-mono text-sm px-2.5 py-1 rounded-sm ${plan.plan === 'pro' ? 'bg-white text-bg font-medium' : 'border border-border text-muted'
                            }`}>
                            {plan.plan === 'pro' ? 'PRO' : `${plan.analyses_remaining} / ${plan.limit} left`}
                        </span>
                    )}
                    {plan?.plan === 'free' && (
                        <button onClick={handleUpgrade}
                            className="font-mono text-sm bg-white text-bg px-2.5 py-1 rounded-sm hover:opacity-80 transition-opacity">
                            upgrade
                        </button>
                    )}
                    <span className="font-mono text-sm text-muted">{user?.display_name}</span>
                    <button onClick={handleLogout}
                        className="font-mono text-sm text-muted border border-border px-2.5 py-1 rounded-sm hover:border-border-hover hover:text-white transition-all cursor-pointer">
                        logout
                    </button>
                </div>

                {/* Mobile hamburger */}
                <button onClick={() => setMenuOpen(!menuOpen)}
                    className="md:hidden flex flex-col gap-1.5 p-1"
                    aria-label="menu">
                    <span className={`block w-5 h-px bg-white transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                    <span className={`block w-5 h-px bg-white transition-all ${menuOpen ? 'opacity-0' : ''}`} />
                    <span className={`block w-5 h-px bg-white transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
                </button>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="md:hidden border-t border-border px-4 py-4 flex flex-col gap-3 animate-fade-in">
                    {plan && (
                        <span className={`font-mono text-sm px-3 py-2 rounded text-center ${plan.plan === 'pro' ? 'bg-white text-bg font-medium' : 'border border-border text-muted'
                            }`}>
                            {plan.plan === 'pro' ? 'PRO' : `${plan.analyses_remaining} / 3 analyses left this month`}
                        </span>
                    )}
                    {plan?.plan === 'free' && (
                        <button onClick={() => { handleUpgrade(); setMenuOpen(false) }}
                            className="font-mono text-sm bg-white text-bg px-3 py-2 rounded hover:opacity-80 transition-opacity w-full">
                            upgrade to pro
                        </button>
                    )}
                    <div className="flex items-center justify-between border-t border-border pt-3">
                        <span className="font-mono text-sm text-muted">{user?.display_name}</span>
                        <button onClick={handleLogout}
                            className="font-mono text-sm text-muted border border-border px-3 py-1.5 rounded hover:border-border-hover hover:text-white transition-all">
                            logout
                        </button>
                    </div>
                </div>
            )}
        </nav>
    )
}
