import { BaseProvider } from '../BaseProvider'
import { BookMetadata, ParsedParameters, ProviderConfig } from '../../types'
import { normalizeBookMetadata } from '../../utils/helpers'
import { dbManager } from '../../database/manager'
import { HardcoverBook, HardcoverBooksResponse, HardcoverSearchResponse } from './types'
import { HARDCOVER_API_URL, SEARCH_QUERY, BOOK_DETAILS_QUERY } from './queries'
import path from 'path'
import fs from 'fs'
import axios from 'axios'

const configPath = path.join(__dirname, 'config.json')
const config: ProviderConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

export default class HardcoverProvider extends BaseProvider {
  private apiToken: string

  constructor() {
    super(config)
    this.apiToken = process.env.HARDCOVER_TOKEN || ''
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      authorization: `Bearer ${this.apiToken}`,
      'User-Agent': 'AudiobookshelfMetadataProvider/1.0'
    }
  }

  async search(
    title: string,
    author: string | null,
    params: ParsedParameters,
    options?: { skipCache?: boolean }
  ): Promise<BookMetadata[]> {
    const limit = Math.min((params.limit as number) || 10, 25)
    const skipCache = options?.skipCache === true
    const languageFilter = params.language as string | undefined

    const bookIds = await this.fetchBookIds(title, author, limit, skipCache)
    if (bookIds.length === 0) {
      return []
    }

    const books = await this.fetchBookDetails(bookIds, skipCache)
    return this.processResults(books, bookIds, languageFilter)
  }

  private async fetchBookIds(
    title: string,
    author: string | null,
    limit: number,
    skipCache: boolean
  ): Promise<number[]> {
    const searchQuery = author ? `${title} ${author}` : title
    const cacheKey = `hardcover:${searchQuery}:${limit}`

    if (!skipCache) {
      const searchCache = dbManager.getSearchCache(this.config.id, title, author, cacheKey)
      if (searchCache) {
        try {
          return JSON.parse(searchCache) as number[]
        } catch {}
      }
    }

    const searchResponse = await axios.post<{ data?: HardcoverSearchResponse }>(
      HARDCOVER_API_URL,
      {
        query: SEARCH_QUERY,
        variables: {
          query: searchQuery,
          perPage: limit,
          page: 1
        }
      },
      { headers: this.getHeaders() }
    )

    if (searchResponse.status !== 200) {
      throw new Error(`Hardcover API error: ${searchResponse.status}`)
    }

    const rawIds = searchResponse.data?.data?.search?.ids || []
    const bookIds = rawIds.map((id) => (typeof id === 'string' ? parseInt(id, 10) : id))

    if (!skipCache && bookIds.length > 0) {
      dbManager.setSearchCache(this.config.id, title, author, cacheKey, JSON.stringify(bookIds))
    }

    return bookIds
  }

  private async fetchBookDetails(bookIds: number[], skipCache: boolean): Promise<HardcoverBook[]> {
    const detailsCacheKey = `details:${bookIds.join(',')}`

    if (!skipCache) {
      const detailsCache = dbManager.getBookCache(this.config.id, detailsCacheKey)
      if (detailsCache) {
        try {
          return JSON.parse(detailsCache) as HardcoverBook[]
        } catch {}
      }
    }

    const detailsResponse = await axios.post<{ data?: HardcoverBooksResponse }>(
      HARDCOVER_API_URL,
      {
        query: BOOK_DETAILS_QUERY,
        variables: { ids: bookIds }
      },
      { headers: this.getHeaders() }
    )

    if (detailsResponse.status !== 200) {
      throw new Error(`Hardcover API error: ${detailsResponse.status}`)
    }

    const books = detailsResponse.data?.data?.books || []

    if (!skipCache && books.length > 0) {
      dbManager.setBookCache(this.config.id, detailsCacheKey, JSON.stringify(books))
    }

    return books
  }

  private processResults(books: HardcoverBook[], bookIds: number[], languageFilter?: string): BookMetadata[] {
    const idOrder = new Map(bookIds.map((id, index) => [id, index]))
    books.sort((a, b) => {
      const orderA = idOrder.get(a.id || 0) ?? Number.MAX_VALUE
      const orderB = idOrder.get(b.id || 0) ?? Number.MAX_VALUE
      return orderA - orderB
    })

    const results: BookMetadata[] = []

    for (const book of books) {
      const metadata = this.mapBookToMetadata(book)

      if (languageFilter && metadata.language && metadata.language !== languageFilter) {
        continue
      }

      if (metadata.title) {
        results.push(metadata)
      }
    }

    return results
  }

  private mapBookToMetadata(book: HardcoverBook): BookMetadata {
    const { authors, narrators } = this.extractContributors(book)
    const series = this.extractSeries(book)
    const coverUrl = this.extractCoverUrl(book)
    const { isbn, asin, publisher, language } = this.extractEditionInfo(book)
    const tags = this.extractTags(book)

    return normalizeBookMetadata({
      title: book.title,
      subtitle: book.subtitle,
      author: authors.length > 0 ? authors.join(', ') : undefined,
      narrator: narrators.length > 0 ? narrators.join(', ') : undefined,
      description: book.description,
      cover: coverUrl,
      isbn,
      asin,
      publisher,
      publishedYear: book.release_year,
      language,
      series: series.length > 0 ? series : undefined,
      tags: tags.length > 0 ? tags : undefined
    })
  }

  private extractContributors(book: HardcoverBook): { authors: string[]; narrators: string[] } {
    const authors: string[] = []
    const narrators: string[] = []

    if (book.contributions && book.contributions.length > 0) {
      for (const contribution of book.contributions) {
        if (contribution.author?.name) {
          const contributionType = (contribution.contribution || '').toLowerCase()
          if (contributionType.includes('narrator') || contributionType.includes('read by')) {
            narrators.push(contribution.author.name)
          } else {
            authors.push(contribution.author.name)
          }
        }
      }
    }

    return { authors, narrators }
  }

  private extractSeries(book: HardcoverBook): Array<{ series: string; sequence?: string }> {
    return (
      book.book_series
        ?.map((bs) => ({
          series: bs.series?.name || '',
          sequence: bs.position != null ? String(bs.position) : undefined
        }))
        .filter((s) => s.series) || []
    )
  }

  private extractCoverUrl(book: HardcoverBook): string | undefined {
    if (book.default_cover_edition?.image?.url) {
      return book.default_cover_edition.image.url
    }
    return book.image?.url
  }

  private extractEditionInfo(book: HardcoverBook): {
    isbn?: string
    asin?: string
    publisher?: string
    language?: string
  } {
    let isbn: string | undefined
    let asin: string | undefined
    let publisher: string | undefined
    let language: string | undefined

    const physicalEdition = book.default_physical_edition
    if (physicalEdition) {
      isbn = physicalEdition.isbn_13 || physicalEdition.isbn_10
      publisher = physicalEdition.publisher?.name
      language = physicalEdition.language?.language
    }

    const audioEdition = book.default_audio_edition
    if (audioEdition) {
      asin = audioEdition.asin
      if (!publisher) {
        publisher = audioEdition.publisher?.name
      }
      if (!language) {
        language = audioEdition.language?.language
      }
    }

    if (!isbn && book.editions && book.editions.length > 0) {
      for (const edition of book.editions) {
        if (edition.isbn_13 || edition.isbn_10) {
          isbn = edition.isbn_13 || edition.isbn_10
          break
        }
      }
    }

    if (!asin && book.editions && book.editions.length > 0) {
      for (const edition of book.editions) {
        if (edition.asin) {
          asin = edition.asin
          break
        }
      }
    }

    return { isbn, asin, publisher, language }
  }

  private extractTags(book: HardcoverBook): string[] {
    const tags: string[] = []
    const seen = new Set<string>()

    if (book.taggings && book.taggings.length > 0) {
      for (const tagging of book.taggings) {
        const tagName = tagging.tag?.tag
        if (tagName && !seen.has(tagName.toLowerCase())) {
          seen.add(tagName.toLowerCase())
          tags.push(tagName)
        }
      }
    }

    return tags
  }
}
