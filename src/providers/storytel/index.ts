import { BaseProvider } from '../BaseProvider'
import { BookMetadata, ParsedParameters, ProviderConfig } from '../../types'
import { normalizeBookMetadata } from '../../utils/helpers'
import { dbManager } from '../../database/manager'
import { httpClient } from '../../utils/httpClient'
import { cleanTitle, extractSubtitle } from './utils'
import path from 'path'
import fs from 'fs'

const configPath = path.join(__dirname, 'config.json')
const config: ProviderConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

interface StorytelBook {
  id: number
  name: string
  consumableId: string
  cover?: string
  coverE?: string
  largeCover?: string
  largeCoverE?: string
  authorsAsString?: string
  language?: {
    id: number
    isoValue: string
    name: string
  }
  category?: {
    id: number
    title: string
  }
  publisher?: {
    id: number
    name: string
  }
  releaseDate?: string
  series?: Array<{
    id: number
    name: string
  }>
  seriesOrder?: number
  tags?: Array<{
    id: number
    name: string
  }>
}

interface StorytelAbook {
  id: number
  isbn?: string
  length?: number
  narratorAsString?: string
  narrators?: Array<{
    id: number
    name: string
  }>
  description?: string
  publisher?: {
    id: number
    name: string
  }
  releaseDate?: string
}

interface StorytelEbook {
  id: number
  isbn?: string
  description?: string
  publisher?: {
    id: number
    name: string
  }
  releaseDate?: string
}

interface StorytelSearchResult {
  abook?: StorytelAbook | null
  book?: StorytelBook | null
  ebook?: StorytelEbook | null
  consumableId?: string
  shareUrl?: string
}

interface StorytelSearchResponse {
  books: StorytelSearchResult[]
  suggestions?: unknown[]
}

export default class StorytelProvider extends BaseProvider {
  constructor() {
    super(config)
  }

  async search(
    title: string,
    author: string | null,
    params: ParsedParameters,
    options?: { skipCache?: boolean }
  ): Promise<BookMetadata[]> {
    const language = params.language as string
    const limit = Math.min((params.limit as number) || 3, 10)
    const skipCache = options?.skipCache === true

    const searchUrl = `https://www.storytel.com/api/search.action?request_locale=${encodeURIComponent(language)}&q=${encodeURIComponent(title.replace(/\s+/g, '+'))}`

    let searchResults: StorytelSearchResult[] = []
    if (!skipCache) {
      const searchCache = dbManager.getSearchCache(this.config.id, title, author, searchUrl)
      if (searchCache) {
        try {
          const parsed = JSON.parse(searchCache) as StorytelSearchResponse
          searchResults = parsed.books || []
        } catch {}
      }
    }

    if (searchResults.length === 0) {
      const searchRes = await httpClient.get(searchUrl)
      if (searchRes.status !== 200) throw new Error('Storytel search API error')
      const searchJson = searchRes.data as StorytelSearchResponse
      searchResults = searchJson.books || []
      if (!skipCache) dbManager.setSearchCache(this.config.id, title, author, searchUrl, JSON.stringify(searchJson))
    }

    const books: BookMetadata[] = []
    for (const result of searchResults
      .filter((f) =>
        params.type
          ? (f.abook && f.abook != null && params.type === 'audiobook') ||
            (f.ebook && f.abook != null && params.type === 'ebook') ||
            (f.book && f.book != null && params.type === 'all')
          : true
      )
      .slice(0, limit)) {
      console.log(result)
      if (!result.book) continue

      const metadata = this.mapStorytelToMetadata(result, params)
      if (metadata.title) {
        books.push(metadata)
      }
    }

    return books
  }

  private mapStorytelToMetadata(result: StorytelSearchResult, params: ParsedParameters): BookMetadata {
    const book = result.book
    let abook = result.abook
    let ebook = result.ebook

    switch (params.type as string) {
      case 'audiobook':
        ebook = undefined
        break
      case 'ebook':
        abook = undefined
        break
    }

    if (!book) {
      return normalizeBookMetadata({ title: '' })
    }

    const seriesName = book.series && book.series.length > 0 ? book.series[0].name : undefined
    const rawTitle = book.name || ''
    const cleanedTitle = cleanTitle(rawTitle, seriesName)
    let { title, subtitle } = extractSubtitle(cleanedTitle)

    if (/^\d+$/.test(title)) {
      title = subtitle || title || ''
      subtitle = undefined
    }

    const description = abook?.description || ebook?.description
    const isbn = abook?.isbn || ebook?.isbn
    const cover =
      params.type === 'ebook'
        ? (book.largeCoverE || book.coverE || book.largeCover || book.cover)?.replace(/\d{3}x\d{3}/, '1200x1200')
        : (book.largeCover || book.cover || book.largeCoverE || book.coverE)?.replace(/\d{3}x\d{3}/, '1200x1200')
    const duration = abook?.length ? Math.round(abook.length / 1000 / 60) : undefined

    const narrators = abook?.narrators?.map((n) => n.name).join(', ') || abook?.narratorAsString

    const publisher = abook?.publisher?.name || ebook?.publisher?.name || book.publisher?.name

    const releaseDate = abook?.releaseDate || ebook?.releaseDate || book.releaseDate
    const publishedYear = releaseDate ? releaseDate.slice(0, 4) : undefined

    const series =
      book.series && book.series.length > 0
        ? [
            {
              series: book.series[0].name,
              sequence: book.seriesOrder ? String(book.seriesOrder) : undefined
            }
          ]
        : undefined

    const tags = book.tags?.map((t) => t.name)

    return normalizeBookMetadata({
      title,
      subtitle,
      author: book.authorsAsString,
      narrator: narrators,
      publisher,
      publishedYear,
      description,
      cover: cover ? `https://www.storytel.com${cover}` : undefined,
      isbn,
      series,
      language: book.language?.isoValue,
      duration,
      tags
    })
  }
}
