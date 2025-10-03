import { BaseProvider } from '../BaseProvider'
import { BookMetadata, ParsedParameters } from '../../types'
import { normalizeBookMetadata } from '../../utils/helpers'

export default class ExampleProvider extends BaseProvider {
  async search(
    title: string,
    author: string | null,
    params: ParsedParameters,
    _options?: { skipCache?: boolean }
  ): Promise<BookMetadata[]> {
    const lang = params.lang as string
    const limit = (params.limit as number) || 10

    const mockBooks = this.generateMockBooks(title, author, lang, limit)

    return mockBooks.map((book) => normalizeBookMetadata(book))
  }

  private generateMockBooks(
    title: string,
    author: string | null,
    lang: string,
    limit: number
  ): Record<string, unknown>[] {
    const books: Record<string, unknown>[] = []

    for (let i = 0; i < Math.min(limit, 3); i++) {
      books.push({
        title: `${title}${i > 0 ? ` ${i + 1}` : ''}`,
        subtitle: i === 0 ? 'The Beginning' : undefined,
        author: author || 'Unknown Author',
        narrator: i % 2 === 0 ? 'Jane Narrator' : 'John Narrator',
        publisher: 'Example Publishing House',
        publishedYear: String(2020 + i),
        description: `<p>This is a <strong>mock description</strong> for ${title}. Language: ${lang}</p>`,
        cover: `https://example.com/covers/${i}.jpg`,
        isbn: `978${Math.floor(Math.random() * 1000000000)}`,
        asin: `B${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
        genres: ['Fiction', i % 2 === 0 ? 'Fantasy' : 'Science Fiction'],
        tags: ['bestseller', 'award-winning'],
        series: i === 0 ? [{ series: `${title} Series`, sequence: String(i + 1) }] : undefined,
        language: lang,
        duration: 3600 * (8 + i)
      })
    }

    return books
  }
}
