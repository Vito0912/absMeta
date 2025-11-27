import { BaseProvider } from '../BaseProvider'
import { BookMetadata, ParsedParameters, ProviderConfig } from '../../types'
import { normalizeBookMetadata } from '../../utils/helpers'
import { dbManager } from '../../database/manager'
import { httpClient } from '../../utils/httpClient'
import path from 'path'
import fs from 'fs'
import * as cheerio from 'cheerio'

const configPath = path.join(__dirname, 'config.json')
const config: ProviderConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

const GOODREADS_API_URL = 'https://www.goodreads.com'

const GENRE_SHELVES = new Set([
  'adventure',
  'art',
  'biography',
  'business',
  'chick-lit',
  'childrens',
  'christian',
  'classic',
  'comedy',
  'comic',
  'contemporary',
  'cookbook',
  'crime',
  'fantasy',
  'fiction',
  'gay-and-lesbian',
  'graphic-novel',
  'high-fantasy',
  'historical-fiction',
  'historical',
  'history',
  'horror',
  'humor-and-comedy',
  'humour',
  'manga',
  'memoir',
  'music',
  'mystery',
  'non-fiction',
  'nonfiction',
  'paranormal',
  'philosophy',
  'picture-book',
  'poetry',
  'politics',
  'psychology',
  'religion',
  'romance',
  'science-fiction',
  'science',
  'self-help',
  'spirituality',
  'sport',
  'suspense',
  'thriller',
  'travel',
  'young-adult'
])

interface GoodreadsSearchResult {
  id: string
  title: string
  authorName: string
  imageUrl?: string
}

export default class GoodreadsProvider extends BaseProvider {
  private apiKey: string

  constructor() {
    super(config)
    this.apiKey = process.env.GOODREADS_API_KEY || ''
  }

  async search(
    title: string,
    author: string | null,
    params: ParsedParameters,
    options?: { skipCache?: boolean }
  ): Promise<BookMetadata[]> {
    const limit = params.limit ? Number(params.limit) : 10
    const skipCache = options?.skipCache === true

    const searchUrl = `${GOODREADS_API_URL}/search/index.xml?key=${this.apiKey}&q=${encodeURIComponent(title)}&search[field]=title`

    if (!skipCache) {
      const cachedResult = dbManager.getSearchCache(this.config.id, title, author, searchUrl)
      if (cachedResult) {
        try {
          const cached = JSON.parse(cachedResult) as BookMetadata[]
          return cached.slice(0, limit)
        } catch {}
      }
    }

    const response = await httpClient.get(searchUrl, {
      headers: { Accept: 'application/xml' },
      responseType: 'text'
    })

    if (response.status === 404) {
      return []
    }

    if (response.status !== 200) {
      throw new Error(`Goodreads API error: ${response.status}`)
    }

    const xmlData = typeof response.data === 'string' ? response.data : String(response.data)
    const searchResults = this.parseSearchResults(xmlData)

    if (searchResults.length === 0) {
      return []
    }

    let sortedResults = searchResults
    if (author) {
      sortedResults = this.sortByAuthorSimilarity(searchResults, author)
    }

    const bookIds = sortedResults.slice(0, limit).map((r) => r.id)
    const books = await this.fetchBookDetails(bookIds, skipCache)

    if (!skipCache && books.length > 0) {
      dbManager.setSearchCache(this.config.id, title, author, searchUrl, JSON.stringify(books))
    }

    return books
  }

  async getBookById(bookId: string, _params: ParsedParameters): Promise<BookMetadata | null> {
    const cachedBook = dbManager.getBookCache(this.config.id, bookId)
    if (cachedBook) {
      try {
        return JSON.parse(cachedBook) as BookMetadata
      } catch {}
    }

    const bookUrl = `${GOODREADS_API_URL}/book/show.xml?key=${this.apiKey}&id=${encodeURIComponent(bookId)}`

    const response = await httpClient.get(bookUrl, {
      headers: { Accept: 'application/xml' },
      responseType: 'text'
    })

    if (response.status !== 200) {
      return null
    }

    const xmlData = typeof response.data === 'string' ? response.data : String(response.data)
    const metadata = this.parseBookDetails(xmlData)

    if (metadata) {
      dbManager.setBookCache(this.config.id, bookId, JSON.stringify(metadata))
    }

    return metadata
  }

  private parseSearchResults(xmlData: string): GoodreadsSearchResult[] {
    const results: GoodreadsSearchResult[] = []
    const $ = cheerio.load(xmlData, { xml: true })

    $('GoodreadsResponse search results work').each((_, work) => {
      const $work = $(work)
      const $bestBook = $work.find('best_book')

      const id = $bestBook.children('id').first().text().trim()
      const title = $bestBook.children('title').first().text().trim()
      const authorName = $bestBook.find('author name').first().text().trim()
      const imageUrl = $bestBook.children('image_url').first().text().trim()

      if (id && title) {
        results.push({
          id,
          title,
          authorName,
          imageUrl: imageUrl && !imageUrl.includes('nophoto') ? imageUrl : undefined
        })
      }
    })

    return results
  }

  private sortByAuthorSimilarity(results: GoodreadsSearchResult[], author: string): GoodreadsSearchResult[] {
    const authorLower = author.toLowerCase()

    return [...results].sort((a, b) => {
      const aName = a.authorName.toLowerCase()
      const bName = b.authorName.toLowerCase()

      const aMatch = aName.includes(authorLower) || authorLower.includes(aName)
      const bMatch = bName.includes(authorLower) || authorLower.includes(bName)

      if (aMatch && !bMatch) return -1
      if (!aMatch && bMatch) return 1
      return 0
    })
  }

  private async fetchBookDetails(bookIds: string[], skipCache: boolean): Promise<BookMetadata[]> {
    const books: BookMetadata[] = []

    for (const bookId of bookIds) {
      const cachedBook = !skipCache ? dbManager.getBookCache(this.config.id, bookId) : null
      if (cachedBook) {
        try {
          books.push(JSON.parse(cachedBook) as BookMetadata)
          continue
        } catch {}
      }

      const bookUrl = `${GOODREADS_API_URL}/book/show.xml?key=${this.apiKey}&id=${encodeURIComponent(bookId)}`

      const response = await httpClient.get(bookUrl, {
        headers: { Accept: 'application/xml' },
        responseType: 'text'
      })

      if (response.status !== 200) continue

      const xmlData = typeof response.data === 'string' ? response.data : String(response.data)
      const metadata = this.parseBookDetails(xmlData)

      if (metadata) {
        books.push(metadata)
        if (!skipCache) {
          dbManager.setBookCache(this.config.id, bookId, JSON.stringify(metadata))
        }
      }
    }

    return books
  }

  private parseBookDetails(xmlData: string): BookMetadata | null {
    const $ = cheerio.load(xmlData, { xml: true })
    const $book = $('GoodreadsResponse book').first()

    if ($book.length === 0) {
      return null
    }

    const fullTitle = $book.children('title').first().text().trim()
    const title = this.extractTitle(fullTitle)
    const subtitle = this.extractSubtitle(fullTitle)

    const authorName = $book.find('authors author').first().find('name').first().text().trim()

    const description = $book.children('description').first().text().trim()

    let imageUrl = $book.children('image_url').first().text().trim()
    if (imageUrl && imageUrl.includes('nophoto')) {
      imageUrl = ''
    }

    const isbn13 = $book.children('isbn13').first().text().trim()
    const publisher = $book.children('publisher').first().text().trim()
    const languageCode = $book.children('language_code').first().text().trim()

    const originalPubYear = $book.find('work original_publication_year').first().text().trim()
    const pubYear = $book.children('publication_year').first().text().trim()
    const publishedYear = originalPubYear || pubYear

    const series: { series: string; sequence?: string }[] = []
    $book.find('series_works series_work').each((_, sw) => {
      const $sw = $(sw)
      const seriesTitle = $sw.find('series title').first().text().trim()
      const position = $sw.children('user_position').first().text().trim()
      if (seriesTitle) {
        series.push({
          series: seriesTitle,
          sequence: position || undefined
        })
      }
    })

    const genres: string[] = []
    $book.find('popular_shelves shelf').each((_, shelf) => {
      if (genres.length >= 3) return
      const name = $(shelf).attr('name')?.toLowerCase()
      if (name && GENRE_SHELVES.has(name)) {
        const genre = name
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
        genres.push(genre)
      }
    })

    return normalizeBookMetadata({
      title,
      subtitle: subtitle || undefined,
      author: authorName || undefined,
      description: description || undefined,
      cover: imageUrl || undefined,
      isbn: isbn13 || undefined,
      publisher: publisher || undefined,
      publishedYear: publishedYear || undefined,
      language: languageCode || undefined,
      series: series.length > 0 ? series : undefined,
      genres: genres.length > 0 ? genres : undefined
    })
  }

  private extractTitle(fullTitle: string): string {
    const titleParts = fullTitle.split(':')
    let title = titleParts[0].trim()
    title = title.replace(/\([^)]*#\d+(\.\d+)?\)$/, '').trim()
    return title
  }

  private extractSubtitle(fullTitle: string): string {
    const colonIdx = fullTitle.indexOf(':')
    if (colonIdx === -1) return ''

    let subtitle = fullTitle.slice(colonIdx + 1).trim()
    subtitle = subtitle.replace(/\([^)]*#\d+(\.\d+)?\)$/, '').trim()
    return subtitle
  }
}
