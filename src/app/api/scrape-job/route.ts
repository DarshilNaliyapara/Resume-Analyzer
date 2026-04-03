import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

// Sites known to block scraping
const BLOCKED_SITES = ['indeed.com', 'linkedin.com', 'naukri.com', 'monster.com']

export async function POST(req: NextRequest) {
    const { url, title } = await req.json()

    try {
        if (url) {
            const isBlocked = BLOCKED_SITES.some(site => url.includes(site))
            if (isBlocked) {
                return NextResponse.json({
                    error: null,
                    blocked: true,
                    message: `This site blocks automated scraping. Please copy the job description text and paste it manually.`,
                })
            }

            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml',
                },
                signal: AbortSignal.timeout(8000), // 8 second timeout
            })

            if (!res.ok) {
                return NextResponse.json({
                    blocked: true,
                    message: 'Could not fetch this URL. Please paste the job description manually.',
                })
            }

            const html = await res.text()
            const $ = cheerio.load(html)
            $('script, style, nav, footer, header, aside, iframe, img, svg').remove()

            const selectors = [
                '.job-description',
                '.jobsearch-jobDescriptionText',
                '.description__text',
                '.job-details',
                '[data-testid="job-description"]',
                'article',
                'main',
            ]

            let text = ''
            for (const selector of selectors) {
                const el = $(selector)
                if (el.length && el.text().trim().length > 200) {
                    text = el.text().trim()
                    break
                }
            }

            if (!text) text = $('body').text().trim()
            text = text.replace(/\s+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()

            if (text.length < 100) {
                return NextResponse.json({
                    blocked: true,
                    message: 'Could not extract enough text from this page. Please paste the job description manually.',
                })
            }

            return NextResponse.json({ text: text.slice(0, 5000) })
        }

        if (title) {
            return NextResponse.json({
                text: '',
                searchUrl: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(title)}`,
                message: `Search for "${title}" jobs — open a listing, copy the description, and paste it below.`,
            })
        }

        return NextResponse.json({ error: 'Provide either a URL or job title.' }, { status: 400 })

    } catch (err) {
        return NextResponse.json({
            blocked: true,
            message: 'Request timed out or failed. Please paste the job description manually.',
        })
    }
}