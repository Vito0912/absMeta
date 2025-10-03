import { BookMetadata, ParsedParameters, ProviderConfig } from '../types'

export abstract class BaseProvider {
  protected config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
  }

  public getConfig(): ProviderConfig {
    return this.config
  }

  public abstract search(
    title: string,
    author: string | null,
    params: ParsedParameters,
    options?: { skipCache?: boolean }
  ): Promise<BookMetadata[]>

  public async getBookById?(bookId: string, params: ParsedParameters): Promise<BookMetadata | null>
}
