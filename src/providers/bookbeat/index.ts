import { BaseProvider } from '../BaseProvider'
import { BookMetadata, ParsedParameters, ProviderConfig } from '../../types'
import { normalizeBookMetadata } from '../../utils/helpers'
import { dbManager } from '../../database/manager'
import { httpClient } from '../../utils/httpClient'
import path from 'path'
import fs from 'fs'

const configPath = path.join(__dirname, 'config.json')
const config: ProviderConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

interface BookBeatSuggest {
  id: string
  value: string
  type: string
  _links: {
    search: {
      href: string
      method: string
    }
  }
}

interface BookBeatBook {
  id: number
  title: string
  description?: string
  image?: string
  author?: string
  language?: string
  audiobookisbn?: string
  ebookisbn?: string
  published?: string
  contenttypetags?: string[]
  series?: { name: string; displaypartnumber: string }
  _embedded?: {
    contributors?: Array<{ displayname: string; role: string }>
  }
}

export default class BookBeatProvider extends BaseProvider {
  constructor() {
    super(config)
  }

  async search(
    title: string,
    author: string | null,
    params: ParsedParameters,
    options?: { skipCache?: boolean }
  ): Promise<BookMetadata[]> {
    const market = params.market as string
    const includeErotic = params.includeErotic === 'true' ? 'true' : 'false'
    const suggestUrl = `https://search-api.bookbeat.com/api/appsearch/suggest?includeErotic=${includeErotic}&market=${encodeURIComponent(market)}&query=${encodeURIComponent(title)}&v=18`
    const skipCache = options?.skipCache === true

    let suggestions: BookBeatSuggest[] = []
    if (!skipCache) {
      const suggestCache = dbManager.getSearchCache(this.config.id, title, author, suggestUrl)
      if (suggestCache) {
        try {
          suggestions = JSON.parse(suggestCache)
        } catch { }
      }
    }

    if (suggestions.length === 0) {
      const suggestRes = await httpClient.get(suggestUrl)
      if (suggestRes.status !== 200) throw new Error('BookBeat suggest API error')
      const suggestJson = suggestRes.data
      suggestions = (suggestJson.suggestions || []).filter((s: any) => s.id && s.id.includes('BookTitle'))
      if (!skipCache) dbManager.setSearchCache(this.config.id, title, author, suggestUrl, JSON.stringify(suggestions))
    }

    const books: BookMetadata[] = []
    for (const suggestion of suggestions.slice(0, 3)) {
      const bookUrl = suggestion._links?.search?.href
      if (!bookUrl) continue
      // Caching: check book cache
      const bookCache = !skipCache ? dbManager.getBookCache(this.config.id, bookUrl) : null
      let bookData: BookBeatBook | undefined
      if (bookCache) {
        try {
          const parsed = JSON.parse(bookCache)
          bookData = parsed._embedded?.books?.[0]
        } catch { }
      } else {
        const bookRes = await httpClient.get(bookUrl)
        if (bookRes.status !== 200) continue
        const bookJson = bookRes.data
        bookData = bookJson._embedded?.books?.[0]
        if (!skipCache) dbManager.setBookCache(this.config.id, bookUrl, JSON.stringify(bookJson))
      }
      if (bookData) {
        books.push(this.mapBookBeatToMetadata(bookData))
      }
    }
    return books
  }

  private mapBookBeatToMetadata(book: BookBeatBook): BookMetadata {
    console.log(book)
    return normalizeBookMetadata({
      title: book.title,
      author: book.author || book._embedded?.contributors?.find((c) => c.role === 'bb-author')?.displayname,
      description: book.description,
      cover: book.image,
      isbn: book.audiobookisbn || book.ebookisbn,
      series: book.series ? [{ series: book.series.name, sequence: book.series.displaypartnumber }] : undefined,
      language: book.language,
      publishedYear: book.published ? book.published.slice(0, 4) : undefined,
      tags: book.contenttypetags || undefined
    })
  }
}
