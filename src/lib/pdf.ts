// src/lib/pdf.ts
import * as pdfjsLib from 'pdfjs-dist'

export async function extractTextFromPDF(file: File): Promise<string> {
    // Use CDN worker — avoids all bundler issues
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

    const arrayBuffer = await file.arrayBuffer()

    const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
    }).promise

    let fullText = ''
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        const pageText = content.items
            .map((item: any) => item.str)
            .join(' ')
        fullText += pageText + '\n'
    }

    return fullText.replace(/\s+/g, ' ').trim()
}