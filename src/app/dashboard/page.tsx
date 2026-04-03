'use client'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { clearTokens, saveTokens } from '@/lib/api'
import api from '@/lib/api'
import { extractTextFromPDF } from '@/lib/pdf'

type Plan = { plan: string; analyses_remaining: number; limit: number | string }
type Result = { fit_score: number; matched_skills: string[]; missing_skills: string[]; suggestions: string[]; summary: string }
type Job = { id: number; status: string; created_at: string; result: Result | null, error_message: string }
type JobsPage = { results: Job[]; next: string | null;  previous: string | null }

function DashboardInner() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const replaceRef = useRef<HTMLInputElement>(null)

    const [user, setUser] = useState<{ display_name: string } | null>(null)
    const [plan, setPlan] = useState<Plan | null>(null)
    const [jobs, setJobs] = useState<Job[]>([])
    const [menuOpen, setMenuOpen] = useState(false)

    const [resumeText, setResumeText] = useState('')
    const [resumeFileName, setResumeFileName] = useState('')
    const [resumePageCount, setResumePageCount] = useState(0)
    const [pdfLoading, setPdfLoading] = useState(false)
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)

    const [jobDescription, setJobDescription] = useState('')
    const [jdMode, setJdMode] = useState<'paste' | 'url' | 'title'>('paste')
    const [jdUrl, setJdUrl] = useState('')
    const [jdTitle, setJdTitle] = useState('')
    const [jdLoading, setJdLoading] = useState(false)
    const [jdMessage, setJdMessage] = useState('')
    const [jdSearchUrl, setJdSearchUrl] = useState('')

    const [jobsPage, setJobsPage] = useState<JobsPage>({ results: [], next: null, previous: null })
    const [pageStack, setPageStack] = useState<string[]>([])  // stack of previous cursors
    const [currentCursor, setCurrentCursor] = useState<string | null>(null)

    const [submitting, setSubmitting] = useState(false)
    const [pollingId, setPollingId] = useState<number | null>(null)
    const [activeJob, setActiveJob] = useState<Job | null>(null)
    const [error, setError] = useState('')

    const fetchJobs = useCallback(async (cursor: string | null = null) => {
        const url = cursor ? `/jobs/?cursor=${cursor}` : '/jobs/'
        const res = await api.get(url)
        setJobsPage(res.data)
    }, [])

    const fetchData = useCallback(async () => {
        try {
            const [u, p] = await Promise.all([
                api.get('/auth/me/'),
                api.get('/auth/plan/'),
            ])
            setUser(u.data)
            setPlan(p.data)
            await fetchJobs(null)  // always start from first page
        } catch (err: any) {
            if (err.response?.status === 401 || err.response?.status === 403) {
                router.push('/login')
            }
        }
    }, [router, fetchJobs])

    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        const jobId = searchParams.get('job')
        if (!jobId || jobsPage.results.length === 0) return
        const job = jobsPage.results.find(j => j.id === parseInt(jobId))
        if (job?.result) setActiveJob(job)
    }, [jobsPage.results, searchParams])

    useEffect(() => {
        if (!pollingId) return
        const iv = setInterval(async () => {
            const res = await api.get(`/jobs/${pollingId}/`)
            if (res.data.status === 'done' || res.data.status === 'failed') {
                setActiveJob(res.data)
                setPollingId(null)
                setCurrentCursor(null)   // reset to first page
                setPageStack([])
                await fetchJobs(null)    // refresh first page
                clearInterval(iv)
            }
        }, 2000)
        return () => clearInterval(iv)
    }, [pollingId, fetchJobs])

    const processPDF = async (file: File) => {
        if (file.type !== 'application/pdf') { setError('Only PDF supported.'); return }
        setPdfLoading(true); setError('')
        if (pdfUrl) URL.revokeObjectURL(pdfUrl)
        try {
            const text = await extractTextFromPDF(file)
            if (text.length < 100) { setError('Could not extract text. Try another PDF.'); return }
            const url = URL.createObjectURL(file)
            setPdfUrl(url)
            setResumeText(text)
            setResumeFileName(file.name)
            setResumePageCount(Math.max(1, Math.round(text.length / 3000)))
        } catch { setError('Failed to read PDF.') }
        finally { setPdfLoading(false) }
    }

    const handlePDFUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) processPDF(f) }
    const handleRemovePDF = () => {
        if (pdfUrl) URL.revokeObjectURL(pdfUrl)
        setPdfUrl(null); setResumeText(''); setResumeFileName(''); setResumePageCount(0)
        if (fileInputRef.current) fileInputRef.current.value = ''
        if (replaceRef.current) replaceRef.current.value = ''
    }

    const handleScrapeJD = async () => {
        setJdLoading(true); setJdMessage(''); setJdSearchUrl(''); setError('')
        try {
            const res = await fetch('/api/scrape-job', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jdMode === 'url' ? { url: jdUrl } : { title: jdTitle }),
            })
            const data = await res.json()
            if (data.blocked) { setJdMessage(data.message); setJdMode('paste') }
            else if (data.error) { setError(data.error) }
            else if (data.text) { setJobDescription(data.text); setJdMessage('Extracted successfully.') }
            else if (data.searchUrl) { setJdSearchUrl(data.searchUrl); setJdMessage(data.message) }
        } catch { setJdMessage('Failed. Please paste manually.'); setJdMode('paste') }
        finally { setJdLoading(false) }
    }

    const handleSubmit = async () => {
        if (!resumeText) { setError('Please upload your resume PDF.'); return }
        if (!jobDescription.trim()) { setError('Job description is required.'); return }
        setError(''); setSubmitting(true); setActiveJob(null)
        try {
            const res = await api.post('/analyze/', { resume_text: resumeText, job_description: jobDescription })
            setPollingId(res.data.job_id)
        } catch (err: any) {
            setError(err.response?.status === 403
                ? 'Free plan limit reached. Upgrade to Pro.'
                : err.response?.data?.error || 'Something went wrong.')
        } finally { setSubmitting(false) }
    }

    const handleNextPage = async () => {
        if (!jobsPage.next) return
        const cursor = new URL(jobsPage.next).searchParams.get('cursor')!
        setPageStack(prev => [...prev, currentCursor ?? ''])
        setCurrentCursor(cursor)
        await fetchJobs(cursor)
    }

    const handlePrevPage = async () => {
        const stack = [...pageStack]
        const prev = stack.pop() || null
        setPageStack(stack)
        setCurrentCursor(prev)
        await fetchJobs(prev)
    }

    const currentPage = pageStack.length + 1
    const handleLogout = () => { clearTokens(); router.push('/login') }
    const handleUpgrade = async () => { await api.post('/auth/upgrade/'); fetchData() }
    const isAnalyzing = submitting || !!pollingId

    return (
        <div className="min-h-screen bg-bg text-text">

            {/* Navbar */}
            <nav className="animate-fade-in sticky top-0 z-50 bg-bg border-b border-border">
                <div className="flex justify-between items-center px-4 md:px-6 py-4">
                    <span className="font-display font-extrabold text-sm md:text-base text-white tracking-tight">
                        RESUME ANALYZER
                    </span>

                    {/* Desktop nav */}
                    <div className="hidden md:flex items-center gap-3">
                        {plan && (
                            <span className={`font-mono text-sm px-2.5 py-1 rounded-sm ${plan.plan === 'pro' ? 'bg-white text-bg font-medium' : 'border border-border text-muted'
                                }`}>
                                {plan.plan === 'pro' ? 'PRO' : `${plan.analyses_remaining} / 3 left`}
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

            <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10">

                {/* Input grid — stacks on mobile */}
                <div className="animate-fade-up grid grid-cols-1 md:grid-cols-2 border border-border rounded-md overflow-hidden mb-px">

                    {/* Resume panel */}
                    <div className="bg-bg p-4 md:p-6 flex flex-col gap-4 border-b md:border-b-0 md:border-r border-border">
                        <span className="font-mono text-sm text-muted tracking-widest">RESUME</span>
                        {!resumeFileName ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 border-2 border-dashed border-border hover:border-border-hover rounded-lg flex flex-col items-center justify-center gap-3 cursor-pointer transition-all min-h-64 md:min-h-96 group"
                            >
                                <input ref={fileInputRef} type="file" accept=".pdf" onChange={handlePDFUpload} className="hidden" />
                                {pdfLoading ? (
                                    <>
                                        <div className="animate-spin-sm w-6 h-6 border border-border border-t-white rounded-full" />
                                        <p className="font-mono text-sm text-muted">extracting text...</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-14 h-16 border border-border rounded-sm flex flex-col items-center justify-center gap-1 group-hover:border-border-hover transition-colors">
                                            <span className="font-mono text-sm text-muted">PDF</span>
                                            <div className="w-5 h-px bg-border" />
                                            <div className="w-5 h-px bg-border" />
                                            <div className="w-3 h-px bg-border" />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-mono text-sm text-white">upload resume</p>
                                            <p className="font-mono text-sm text-muted mt-1">PDF only · click to browse</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col gap-3">
                                <div className="flex items-center gap-4 px-4 py-3 bg-surface border border-border rounded">
                                    <div className="w-10 h-12 bg-surface2 border border-border rounded-sm flex flex-col items-center justify-center gap-0.5 shrink-0">
                                        <span className="font-mono text-muted" style={{ fontSize: '0.6rem' }}>PDF</span>
                                        <div className="w-5 h-px bg-border" />
                                        <div className="w-5 h-px bg-border" />
                                        <div className="w-3 h-px bg-border" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-mono text-xs text-white truncate">{resumeFileName}</p>
                                        <p className="font-mono text-xs text-muted mt-0.5">
                                            ~{resumePageCount} page{resumePageCount !== 1 ? 's' : ''} · {(resumeText.length / 1000).toFixed(1)}k chars extracted
                                        </p>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-score-green shrink-0 animate-pulse-dot" />
                                </div>

                                {pdfUrl && (
                                    <div className="flex-1 border border-border rounded overflow-hidden bg-[#1a1a1a]" style={{ minHeight: '420px' }}>
                                        <div className="relative w-full h-full overflow-hidden" style={{ marginTop: '-34px', height: 'calc(100% + 36px)' }}>
                                            <iframe
                                                width="100%"
                                                height="100%"
                                                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                                                className="w-full h-full border-none"
                                                title="Resume preview"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => replaceRef.current?.click()}
                                        className="flex-1 font-mono text-xs text-muted border border-border px-3 py-2 rounded hover:border-border-hover hover:text-white transition-all text-center cursor-pointer"
                                    >
                                        replace pdf
                                    </button>
                                    {resumeFileName && (
                                        <button onClick={handleRemovePDF}
                                            className="flex-1 font-mono text-xs text-muted border border-border px-3 py-2 rounded hover:border-border-hover hover:text-score-red transition-all text-center cursor-pointer">
                                            remove
                                        </button>
                                    )}
                                    <input ref={replaceRef} type="file" accept=".pdf" onChange={handlePDFUpload} className="hidden" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* JD panel */}
                    <div className="bg-bg p-4 md:p-6 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <span className="font-mono text-sm text-muted tracking-widest">JOB DESCRIPTION</span>
                            {jobDescription && (
                                <span className="font-mono text-sm text-muted">{jobDescription.length} chars</span>
                            )}
                        </div>

                        <div className="flex border border-border rounded overflow-hidden">
                            {(['paste', 'url', 'title'] as const).map((mode, i) => (
                                <button key={mode}
                                    onClick={() => { setJdMode(mode); setJdMessage(''); setJdSearchUrl('') }}
                                    className={`flex-1 py-2.5 font-mono text-xs font-medium transition-all ${i > 0 ? 'border-l border-border' : ''
                                        } ${jdMode === mode ? 'bg-white text-bg' : 'bg-transparent text-muted hover:text-white'}`}>
                                    {mode === 'paste' ? '↓ paste' : mode === 'url' ? '⌁ url' : '⊙ title'}
                                </button>
                            ))}
                        </div>

                        {(jdMode === 'url' || jdMode === 'title') && (
                            <div className="animate-slide-in flex gap-2">
                                <input
                                    type={jdMode === 'url' ? 'url' : 'text'}
                                    placeholder={jdMode === 'url' ? 'https://...' : 'e.g. Django Backend Developer'}
                                    value={jdMode === 'url' ? jdUrl : jdTitle}
                                    onChange={e => jdMode === 'url' ? setJdUrl(e.target.value) : setJdTitle(e.target.value)}
                                    className="flex-1 px-3 py-2.5 bg-surface border border-border rounded text-white placeholder-muted outline-none focus:border-border-hover transition-colors"
                                />
                                <button onClick={handleScrapeJD}
                                    disabled={jdLoading || (jdMode === 'url' ? !jdUrl : !jdTitle)}
                                    className="px-4 py-2.5 bg-white text-bg rounded font-mono text-sm font-medium hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition-all whitespace-nowrap">
                                    {jdLoading ? '...' : jdMode === 'url' ? 'fetch' : 'search'}
                                </button>
                            </div>
                        )}

                        {jdMessage && (
                            <div className="animate-slide-in px-3 py-2.5 bg-surface border border-border rounded">
                                <p className="font-mono text-sm text-muted">{jdMessage}</p>
                                {jdSearchUrl && (
                                    <a href={jdSearchUrl} target="_blank" rel="noreferrer"
                                        className="font-mono text-sm text-white hover:opacity-70 mt-1 block transition-opacity">
                                        open search →
                                    </a>
                                )}
                            </div>
                        )}

                        <textarea
                            placeholder="paste job description here..."
                            value={jobDescription}
                            onChange={e => setJobDescription(e.target.value)}
                            rows={14}
                            className="w-full px-4 py-3 bg-surface border border-border rounded text-white placeholder-muted outline-none focus:border-border-hover transition-colors resize-y leading-relaxed flex-1"
                        />
                    </div>
                </div>

                {/* Submit bar */}
                <div className="animate-fade-up delay-1 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-4 md:px-6 py-4 bg-surface border border-border border-t-0 rounded-b-md mb-8 md:mb-10">
                    <div className="min-h-5 flex items-center">
                        {error && (
                            <span className="animate-slide-in font-mono text-sm text-score-red">✕ {error}</span>
                        )}
                        {isAnalyzing && !error && (
                            <div className="flex items-center gap-2">
                                <div className="animate-pulse-dot w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                                <span className="font-mono text-sm text-muted">
                                    analyzing — result will be emailed to you
                                </span>
                            </div>
                        )}
                    </div>
                    <button onClick={handleSubmit} disabled={isAnalyzing}
                        className={`w-full sm:w-auto font-mono text-sm font-medium px-6 py-2.5 rounded transition-all ${isAnalyzing || error
                            ? 'bg-surface2 text-muted border border-border cursor-not-allowed'
                            : 'bg-white text-bg hover:opacity-80'
                            }`}>
                        {isAnalyzing ? 'analyzing...' : 'analyze resume →'}
                    </button>
                </div>

                {/* Result */}
                {activeJob?.result && <ResultCard result={activeJob.result} />}

                {/* History */}
                {/* History */}
                {(jobsPage.results.length > 0 || pageStack.length > 0) && (
                    <div className="animate-fade-up">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="font-mono text-sm text-muted tracking-widest">HISTORY</span>
                            <div className="flex-1 h-px bg-border" />
                        </div>

                        <div className="flex flex-col border border-border rounded-md overflow-hidden"
                            style={{ gap: '1px', background: 'var(--color-border)' }}>
                            {jobsPage.results.map(job => (
                                <div key={job.id}
                                    onClick={() => job.result && setActiveJob(job)}
                                    className={`bg-bg flex justify-between items-center px-4 md:px-5 py-4 transition-colors ${activeJob?.id === job.id ? 'bg-surface2' : ''
                                        } ${job.result ? 'cursor-pointer hover:bg-surface' : ''}`}
                                >
                                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                        <span className="font-mono text-sm text-muted w-16 md:w-20 shrink-0">
                                            {new Date(job.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        </span>
                                        <span className={`font-mono text-sm px-2 py-0.5 rounded-sm shrink-0 ${job.status === 'done' ? 'bg-score-green-bg text-score-green' :
                                                job.status === 'failed' ? 'bg-score-red-bg text-score-red' :
                                                    'bg-score-yellow-bg text-score-yellow'
                                            }`}>
                                            {job.status}
                                        </span>
                                        {job.status === 'failed' && job.error_message && (
                                            <span className="font-mono text-sm text-score-red hidden md:inline truncate max-w-xs">
                                                {job.error_message}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                                        {job.result && (
                                            <span className={`font-display font-bold text-lg ${job.result.fit_score >= 80 ? 'text-score-green' :
                                                    job.result.fit_score >= 60 ? 'text-score-yellow' : 'text-score-red'
                                                }`}>
                                                {job.result.fit_score}
                                            </span>
                                        )}
                                        {job.result && activeJob?.id !== job.id && (
                                            <span className="hidden sm:inline font-mono text-sm text-muted">view →</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination controls */}
                        {(jobsPage.next || jobsPage.previous || pageStack.length > 0) && (
                            <div className="flex items-center justify-between mt-3">
                                <span className="font-mono text-sm text-muted">
                                    page {currentPage}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handlePrevPage}
                                        disabled={pageStack.length === 0}
                                        className="font-mono text-sm text-muted border border-border px-3 py-1.5 rounded-sm hover:border-border-hover hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        ← prev
                                    </button>
                                    <button
                                        onClick={handleNextPage}
                                        disabled={!jobsPage.next}
                                        className="font-mono text-sm text-muted border border-border px-3 py-1.5 rounded-sm hover:border-border-hover hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        next →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

function ResultCard({ result }: { result: Result }) {
    const scoreCls = result.fit_score >= 80 ? 'text-score-green' : result.fit_score >= 60 ? 'text-score-yellow' : 'text-score-red'
    const bgCls = result.fit_score >= 80 ? 'bg-score-green-bg' : result.fit_score >= 60 ? 'bg-score-yellow-bg' : 'bg-score-red-bg'

    return (
        <div className="animate-fade-up border border-border rounded-md overflow-hidden mb-8 md:mb-10">

            {/* Score header */}
            <div className={`flex items-start gap-4 md:gap-5 px-5 md:px-8 py-5 md:py-6 ${bgCls} border-b border-border`}>
                <div className={`animate-score font-display font-extrabold ${scoreCls} shrink-0`}
                    style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', lineHeight: 1 }}>
                    {result.fit_score}
                </div>
                <div>
                    <p className={`font-mono text-xs tracking-widest mb-2 ${scoreCls}`}>FIT SCORE / 100</p>
                    <p className="font-mono text-xs text-muted leading-relaxed">{result.summary}</p>
                </div>
            </div>

            {/* Skills — stacks on mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b border-border"
                style={{ gap: '1px', background: 'var(--color-border)' }}>
                <div className="bg-bg px-5 md:px-6 py-5">
                    <p className="font-mono text-sm text-score-green tracking-widest mb-4">MATCHED SKILLS</p>
                    <div className="flex flex-wrap gap-2">
                        {result.matched_skills.map((s, i) => (
                            <span key={i} className="animate-fade-in font-mono text-xs px-3 py-1 bg-score-green-bg text-score-green rounded-sm border border-score-green/15"
                                style={{ animationDelay: `${i * 0.05}s` }}>
                                {s}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="bg-bg px-5 md:px-6 py-5">
                    <p className="font-mono text-sm text-score-red tracking-widest mb-4">MISSING SKILLS</p>
                    <div className="flex flex-wrap gap-2">
                        {result.missing_skills.map((s, i) => (
                            <span key={i} className="animate-fade-in font-mono text-xs px-3 py-1 bg-score-red-bg text-score-red rounded-sm border border-score-red/15"
                                style={{ animationDelay: `${i * 0.05}s` }}>
                                {s}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Suggestions */}
            <div className="bg-bg px-5 md:px-6 py-5">
                <p className="font-mono text-sm text-muted tracking-widest mb-4">SUGGESTIONS</p>
                <div className="flex flex-col gap-4">
                    {result.suggestions.map((s, i) => (
                        <div key={i} className="animate-fade-up flex gap-4 items-start"
                            style={{ animationDelay: `${i * 0.08}s` }}>
                            <span className="font-mono text-sm pt-0.5 w-6 shrink-0">
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            <p className="font-mono text-sm leading-relaxed">{s}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default function Dashboard() {
    return <Suspense><DashboardInner /></Suspense>
}