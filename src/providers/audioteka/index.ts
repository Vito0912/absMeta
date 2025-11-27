import { BaseProvider } from '../BaseProvider'
import { BookMetadata, ParsedParameters, ProviderConfig } from '../../types'
import { normalizeBookMetadata } from '../../utils/helpers'
import { dbManager } from '../../database/manager'
import { httpClient } from '../../utils/httpClient'
import * as cheerio from 'cheerio'
import path from 'path'
import fs from 'fs'

import { AUDIOTEKA_LANGUAGES, AudiotekaSearchMatch, AudiotekaFullMetadata } from './types'
import { parseSearchResults, parseBookDetails } from './utils'

const configPath = path.join(__dirname, 'config.json')
const config: ProviderConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

export default class AudiotekaProvider extends BaseProvider {
  constructor() {
    super(config)
  }

  async search(
    title: string,
    author: string | null,
    params: ParsedParameters,
    options?: { skipCache?: boolean }
  ): Promise<BookMetadata[]> {
    const lang = params.lang as string
    const limit = Math.min((params.limit as number) || 5, 20)
    const skipCache = options?.skipCache === true

    const langConfig = AUDIOTEKA_LANGUAGES[lang]
    if (!langConfig) {
      throw new Error(`Unsupported language: ${lang}`)
    }

    const searchUrl = `${langConfig.searchUrl}?phrase=${encodeURIComponent(title)}`
    const cacheKey = `${searchUrl}_${lang}`

    let searchMatches: AudiotekaSearchMatch[] = []

    if (!skipCache) {
      const searchCache = dbManager.getSearchCache(this.config.id, title, author, cacheKey)
      if (searchCache) {
        try {
          searchMatches = JSON.parse(searchCache) as AudiotekaSearchMatch[]
        } catch {}
      }
    }

    if (searchMatches.length === 0) {
      const searchRes = await httpClient.get(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': langConfig.acceptLanguage
        }
      })

      if (searchRes.status !== 200) {
        console.warn(`Audioteka search returned status ${searchRes.status} for query: ${title}`)
        return []
      }

      const $ = cheerio.load(searchRes.data as string)
      searchMatches = parseSearchResults($)

      if (!skipCache && searchMatches.length > 0) {
        dbManager.setSearchCache(this.config.id, title, author, cacheKey, JSON.stringify(searchMatches))
      }
    }
    const books: BookMetadata[] = []
    const limitedMatches = searchMatches.slice(0, limit)

    for (const match of limitedMatches) {
      try {
        const fullMetadata = await this.fetchBookDetails(match, lang, skipCache)
        const metadata = this.mapToBookMetadata(fullMetadata)
        if (metadata.title) {
          books.push(metadata)
        }
      } catch (error) {
        console.error(`Error fetching details for ${match.title}:`, error)
        const basicMetadata = this.mapToBookMetadata({
          ...match,
          language: langConfig.languageName
        })
        if (basicMetadata.title) {
          books.push(basicMetadata)
        }
      }
    }

    return books
  }

  private async fetchBookDetails(
    match: AudiotekaSearchMatch,
    lang: string,
    skipCache: boolean
  ): Promise<AudiotekaFullMetadata> {
    const langConfig = AUDIOTEKA_LANGUAGES[lang]
    const cacheKey = `detail_${match.url}`

    if (!skipCache) {
      const detailCache = dbManager.getSearchCache(this.config.id, match.id, null, cacheKey)
      if (detailCache) {
        try {
          return JSON.parse(detailCache) as AudiotekaFullMetadata
        } catch {}
      }
    }

    const response = await httpClient.get(match.url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': langConfig.acceptLanguage
      }
    })

    if (response.status !== 200) {
      throw new Error(`Failed to fetch book details: ${response.status}`)
    }

    const $ = cheerio.load(response.data as string)
    const fullMetadata = parseBookDetails($, match, langConfig)

    if (!skipCache) {
      dbManager.setSearchCache(this.config.id, match.id, null, cacheKey, JSON.stringify(fullMetadata))
    }

    return fullMetadata
  }

  private mapToBookMetadata(data: AudiotekaFullMetadata): BookMetadata {
    return normalizeBookMetadata({
      title: data.title,
      author: data.authors.join(', '),
      narrator: data.narrator,
      publisher: data.publisher,
      description: data.description,
      cover: data.cover,
      genres: data.genres,
      tags: data.series,
      language: data.language,
      duration: data.duration
    })
  }
}
