export interface HardcoverImage {
  url?: string
}

export interface HardcoverAuthor {
  id?: number
  name?: string
  slug?: string
}

export interface HardcoverContribution {
  author?: HardcoverAuthor
  contribution?: string
}

export interface HardcoverSeries {
  id?: number
  name?: string
  slug?: string
}

export interface HardcoverBookSeries {
  series?: HardcoverSeries
  position?: number | string
}

export interface HardcoverPublisher {
  id?: number
  name?: string
}

export interface HardcoverLanguage {
  language?: string
}

export interface HardcoverTag {
  tag?: string
}

export interface HardcoverTagging {
  tag?: HardcoverTag
}

export interface HardcoverEdition {
  id?: number
  title?: string
  subtitle?: string
  isbn_10?: string
  isbn_13?: string
  asin?: string
  pages?: number
  audio_seconds?: number
  release_date?: string
  release_year?: number
  description?: string
  physical_format?: string
  publisher?: HardcoverPublisher
  language?: HardcoverLanguage
  image?: HardcoverImage
}

export interface HardcoverBook {
  id?: number
  slug?: string
  title?: string
  subtitle?: string
  description?: string
  release_year?: number
  release_date?: string
  pages?: number
  audio_seconds?: number
  rating?: number
  headline?: string
  alternative_titles?: string[]
  image?: HardcoverImage
  contributions?: HardcoverContribution[]
  book_series?: HardcoverBookSeries[]
  taggings?: HardcoverTagging[]
  default_audio_edition?: HardcoverEdition
  default_physical_edition?: HardcoverEdition
  default_cover_edition?: HardcoverEdition
  editions?: HardcoverEdition[]
}

export interface HardcoverSearchResponse {
  search?: {
    ids?: (number | string)[]
    results?: string
  }
}

export interface HardcoverBooksResponse {
  books?: HardcoverBook[]
}
