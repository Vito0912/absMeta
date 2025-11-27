import { BaseProvider } from '../BaseProvider'
import { BookMetadata, ParsedParameters, ProviderConfig } from '../../types'
import { normalizeBookMetadata } from '../../utils/helpers'
import { dbManager } from '../../database/manager'
import { httpClient } from '../../utils/httpClient'
import path from 'path'
import fs from 'fs'
import * as cheerio from 'cheerio'
import type { Element } from 'domhandler'

const configPath = path.join(__dirname, 'config.json')
const config: ProviderConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

const BASE_URL = 'https://www.bigfinish.com'
const SEARCH_URL = `${BASE_URL}/search_results/suggest`

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  Connection: 'keep-alive'
}

interface BigFinishSearchResult {
  id: string
  name?: string
  range?: string
}

interface ParsedBookData {
  url: string
  title: string | null
  series: string | null
  seriesTag: string | null
  releaseDate: string | null
  about: string | null
  duration: string | null
  isbn: string | null
  writtenBy: string | null
  narratedBy: string | null
  coverUrl: string | null
}

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12
}

export default class BigFinishProvider extends BaseProvider {
  constructor() {
    super(config)
  }

  async search(
    title: string,
    author: string | null,
    params: ParsedParameters,
    options?: { skipCache?: boolean }
  ): Promise<BookMetadata[]> {
    const limit = Math.min((params.limit as number) || 5, 10)
    const skipCache = options?.skipCache === true

    const query = title.replace(/:/g, ' ')
    const searchUrl = `${SEARCH_URL}/${encodeURIComponent(query)}`

    let searchResults: Record<string, BigFinishSearchResult> = {}

    if (!skipCache) {
      const searchCache = dbManager.getSearchCache(this.config.id, title, author, searchUrl)
      if (searchCache) {
        try {
          searchResults = JSON.parse(searchCache)
        } catch {}
      }
    }

    if (Object.keys(searchResults).length === 0) {
      const searchRes = await httpClient.get(searchUrl, {
        headers: { ...BROWSER_HEADERS, Accept: 'application/json' }
      })

      if (searchRes.status !== 200) {
        throw new Error(`Big Finish search API error: ${searchRes.status}`)
      }

      if (typeof searchRes.data === 'object' && searchRes.data !== null) {
        searchResults = searchRes.data as Record<string, BigFinishSearchResult>
      }

      if (!skipCache && Object.keys(searchResults).length > 0) {
        dbManager.setSearchCache(this.config.id, title, author, searchUrl, JSON.stringify(searchResults))
      }
    }

    const books: BookMetadata[] = []
    const entries = Object.entries(searchResults).slice(0, limit)

    for (const [, result] of entries) {
      if (!result.id) continue

      const productUrl = `${BASE_URL}/releases/v/${result.id}`

      let bookData: ParsedBookData | null = null

      if (!skipCache) {
        const bookCache = dbManager.getBookCache(this.config.id, productUrl)
        if (bookCache) {
          try {
            bookData = JSON.parse(bookCache)
          } catch {}
        }
      }

      if (!bookData) {
        const pageRes = await httpClient.get(productUrl, {
          headers: BROWSER_HEADERS,
          responseType: 'text'
        })

        if (pageRes.status === 200) {
          const html = typeof pageRes.data === 'string' ? pageRes.data : String(pageRes.data)
          bookData = this.parseProductPage(productUrl, html)

          if (bookData && !skipCache) {
            dbManager.setBookCache(this.config.id, productUrl, JSON.stringify(bookData))
          }
        }
      }

      if (bookData) {
        const metadata = this.mapToMetadata(bookData)
        if (metadata.title) {
          books.push(metadata)
        }
      }
    }

    return books
  }

  private parseProductPage(url: string, html: string): ParsedBookData {
    const $ = cheerio.load(html)

    const data: ParsedBookData = {
      url,
      title: null,
      series: null,
      seriesTag: null,
      releaseDate: null,
      about: null,
      duration: null,
      isbn: null,
      writtenBy: null,
      narratedBy: null,
      coverUrl: null
    }

    const productDesc = $('.product-desc')
    if (productDesc.length) {
      const rawTitle = productDesc.find('h3').first().text().trim() || null
      if (rawTitle) {
        const cleaned = this.cleanTitle(rawTitle)
        data.seriesTag = cleaned.prefix
        data.title = cleaned.rest

        if (data.title) {
          const cleaned2 = this.cleanTitle(data.title)
          if (cleaned2.prefix) {
            data.seriesTag = data.seriesTag ? `${data.seriesTag}.${cleaned2.prefix}` : cleaned2.prefix
            data.title = cleaned2.rest
          }
        }
      }

      data.series = productDesc.find('h6').first().text().trim() || null

      if (data.series && data.title) {
        const seriesPattern = new RegExp(`${this.escapeRegex(data.series)}:\\s*`, 'i')
        data.title = data.title.replace(seriesPattern, '')

        const altSeries = data.series.replace(/ -/g, ':')
        const altPattern = new RegExp(`${this.escapeRegex(altSeries)}:\\s*`, 'i')
        data.title = data.title.replace(altPattern, '')
      }

      const paragraphs = productDesc.find('p')
      if (paragraphs.length > 0) {
        const writers = $(paragraphs[0])
          .find('a')
          .map((_: number, el: Element) => $(el).text().trim())
          .get()
        data.writtenBy = writers.length > 0 ? writers.join(', ') : null
      }
      if (paragraphs.length > 1) {
        const narrators = $(paragraphs[1])
          .find('a')
          .map((_: number, el: Element) => $(el).text().trim())
          .get()
        data.narratedBy = narrators.length > 0 ? narrators.join(', ') : null
      }
    }

    const coverDiv = $('.detail-page-image')
    if (coverDiv.length) {
      const coverImg = coverDiv.find('img').first()
      if (coverImg.length) {
        let coverSrc = coverImg.attr('src') || null
        if (coverSrc && !coverSrc.startsWith('http')) {
          coverSrc = BASE_URL + coverSrc
        }
        data.coverUrl = coverSrc
        if (!data.title) {
          data.title = coverImg.attr('alt') || null
        }
      }
    }

    const releaseDateDiv = $('.release-date')
    if (releaseDateDiv.length) {
      const dateText = releaseDateDiv.text().trim()
      data.releaseDate = this.parseReleaseDate(dateText)
    }

    const tab1 = $('#tab1')
    if (tab1.length) {
      data.about = tab1.text().trim() || null
    }

    const tab5 = $('#tab5')
    if (tab5.length) {
      const narrators = tab5
        .find('a')
        .map((_: number, el: Element) => $(el).text().trim())
        .get()
      if (narrators.length > 0) {
        data.narratedBy = narrators.join(', ')
      }
    }

    const tab6 = $('#tab6')
    if (tab6.length) {
      const content = tab6.text()

      const durationMatch = content.match(/Duration:\s*(\d+)/)
      if (durationMatch) {
        data.duration = durationMatch[1]
      }

      const digitalIsbnMatch = content.match(/Digital Retail ISBN:\s*([\d-]+)/)
      if (digitalIsbnMatch) {
        const isbn = digitalIsbnMatch[1]
        if (/^\d{3}-\d{1,5}-\d{1,7}-\d{1,7}-\d{1}$/.test(isbn) || /^\d{13}$/.test(isbn.replace(/-/g, ''))) {
          data.isbn = isbn
        }
      }

      if (!data.isbn) {
        const physicalIsbnMatch = content.match(/Physical Retail ISBN:\s*([\d-]+)/)
        if (physicalIsbnMatch) {
          const isbn = physicalIsbnMatch[1]
          if (/^\d{3}-\d{1,5}-\d{1,7}-\d{1,7}-\d{1}$/.test(isbn) || /^\d{13}$/.test(isbn.replace(/-/g, ''))) {
            data.isbn = isbn
          }
        }
      }
    }

    return data
  }

  private cleanTitle(title: string): { prefix: string | null; rest: string } {
    const match = title.match(/^([^\s]{1,6})\.\s+(.+)$/)
    if (match) {
      return { prefix: match[1], rest: match[2] }
    }
    return { prefix: null, rest: title }
  }

  private parseReleaseDate(dateText: string): string | null {
    if (!dateText) return null

    let text = dateText.toLowerCase().trim()
    if (text.startsWith('released ')) {
      text = text.substring(9).trim()
    }

    const match = text.match(/([a-zA-Z]+)\s+(\d{4})/)
    if (!match) return null

    const monthStr = match[1].toLowerCase()
    const yearStr = match[2]

    const monthNum = MONTHS[monthStr]
    if (!monthNum) return null

    const month = monthNum.toString().padStart(2, '0')
    return `${yearStr}-${month}-01`
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  private mapToMetadata(data: ParsedBookData): BookMetadata {
    const publishedYear = data.releaseDate ? data.releaseDate.split('-')[0] : undefined

    const series = data.series
      ? [
          {
            series: data.series,
            sequence: data.seriesTag || undefined
          }
        ]
      : undefined

    const duration = data.duration ? parseInt(data.duration, 10) * 60 : undefined

    return normalizeBookMetadata({
      title: data.title,
      author: data.writtenBy,
      narrator: data.narratedBy,
      description: data.about,
      cover: data.coverUrl,
      isbn: data.isbn,
      series: series,
      language: 'en',
      publishedYear: publishedYear,
      publisher: 'Big Finish',
      duration: duration
    })
  }
}
