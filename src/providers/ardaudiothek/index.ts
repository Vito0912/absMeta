import { BaseProvider } from '../BaseProvider'
import { BookMetadata, ParsedParameters, ProviderConfig } from '../../types'
import { normalizeBookMetadata } from '../../utils/helpers'
import { dbManager } from '../../database/manager'
import { httpClient } from '../../utils/httpClient'
import path from 'path'
import fs from 'fs'

const configPath = path.join(__dirname, 'config.json')
const config: ProviderConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

const ARD_API_URL = 'https://api.ardaudiothek.de/search/programsets'

interface ArdImage {
  url?: string
  url1X1?: string
  attribution?: string
  description?: string
}

interface ArdPublicationService {
  id?: string
  title?: string
  organizationName?: string
  genre?: string
  brandingColor?: string
}

interface ArdEditorialCategory {
  id?: string
  title?: string
}

interface ArdProgramSet {
  id?: string
  title?: string
  numberOfElements?: number
  synopsis?: string
  sharingUrl?: string
  image?: ArdImage
  publicationService?: ArdPublicationService
  editorialCategories?: {
    nodes?: ArdEditorialCategory[]
  }
}

interface ArdSearchResponse {
  data?: {
    search?: {
      programSets?: {
        numberOfElements?: number
        nodes?: ArdProgramSet[]
      }
    }
  }
}

export default class ArdAudiothekProvider extends BaseProvider {
  constructor() {
    super(config)
  }

  async search(
    title: string,
    author: string | null,
    params: ParsedParameters,
    options?: { skipCache?: boolean }
  ): Promise<BookMetadata[]> {
    const limit = Math.min((params.limit as number) || 5, 20)
    const skipCache = options?.skipCache === true

    const searchUrl = `${ARD_API_URL}?query=${encodeURIComponent(title)}`

    let searchResults: ArdProgramSet[] = []

    if (!skipCache) {
      const searchCache = dbManager.getSearchCache(this.config.id, title, author, searchUrl)
      if (searchCache) {
        try {
          const parsed = JSON.parse(searchCache) as ArdSearchResponse
          searchResults = parsed.data?.search?.programSets?.nodes || []
        } catch {}
      }
    }

    if (searchResults.length === 0) {
      const searchRes = await httpClient.get(searchUrl)
      if (searchRes.status !== 200) {
        throw new Error(`ARD Audiothek API error: ${searchRes.status}`)
      }
      const searchJson = searchRes.data as ArdSearchResponse
      searchResults = searchJson.data?.search?.programSets?.nodes || []

      if (!skipCache) {
        dbManager.setSearchCache(this.config.id, title, author, searchUrl, JSON.stringify(searchJson))
      }
    }

    const books: BookMetadata[] = []

    for (const item of searchResults.slice(0, limit)) {
      const metadata = this.mapArdToMetadata(item)
      if (metadata.title) {
        books.push(metadata)
      }
    }

    return books
  }

  private mapArdToMetadata(item: ArdProgramSet): BookMetadata {
    let rawTitle = item.title || ''
    rawTitle = rawTitle.replace(/[„"""\u201c\u201d\u201e\u201f»«]/g, '').trim()

    let authorName: string | undefined
    let cleanTitle = rawTitle

    if (rawTitle.includes(' von ')) {
      const parts = rawTitle.split(' von ')
      if (parts.length > 1) {
        cleanTitle = parts[0].trim()
        authorName = parts[1].trim()
      }
    } else if (rawTitle.includes(': ')) {
      const parts = rawTitle.split(': ')
      if (parts.length > 1) {
        const potentialAuthor = parts[0].trim()
        if (potentialAuthor.length < 50 && !this.looksLikeTitle(potentialAuthor)) {
          authorName = potentialAuthor
          cleanTitle = parts.slice(1).join(': ').trim()
        }
      }
    } else if (rawTitle.includes(' - ')) {
      const parts = rawTitle.split(' - ')
      if (parts.length === 2) {
        cleanTitle = parts[0].trim()
        authorName = parts[1].trim()
      }
    }

    const description = item.synopsis

    let coverUrl: string | undefined
    const imageTemplateUrl = item.image?.url1X1 || item.image?.url
    if (imageTemplateUrl) {
      coverUrl = imageTemplateUrl.replace('{width}', '1200')
    }

    const publisher = item.publicationService?.organizationName || 'ARD'

    const genres: string[] = []
    const publicationGenre = item.publicationService?.genre
    if (publicationGenre) {
      genres.push(publicationGenre)
    }

    const tags: string[] = []
    if (item.editorialCategories?.nodes) {
      for (const category of item.editorialCategories.nodes) {
        if (category.title) {
          tags.push(category.title.trim())
        }
      }
    }

    const series = cleanTitle
      ? [
          {
            series: cleanTitle,
            sequence: undefined
          }
        ]
      : undefined

    return normalizeBookMetadata({
      title: cleanTitle,
      author: authorName,
      description: description,
      cover: coverUrl,
      publisher: publisher,
      genres: genres.length > 0 ? genres : undefined,
      tags: tags.length > 0 ? tags : undefined,
      series: series,
      language: 'de'
    })
  }

  private looksLikeTitle(str: string): boolean {
    const titleIndicators = [
      'die ',
      'der ',
      'das ',
      'ein ',
      'eine ',
      'teil ',
      'folge ',
      'staffel ',
      'episode ',
      'kapitel '
    ]
    const lowerStr = str.toLowerCase()
    return titleIndicators.some((indicator) => lowerStr.startsWith(indicator) || lowerStr.includes(` ${indicator}`))
  }
}
