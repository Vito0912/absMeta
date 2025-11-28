export interface ArdImage {
  url?: string
  url1X1?: string
  attribution?: string
  description?: string
}

export interface ArdPublicationService {
  id?: string
  title?: string
  organizationName?: string
  genre?: string
  brandingColor?: string
}

export interface ArdEditorialCategory {
  id?: string
  title?: string
}

export interface ArdProgramSet {
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

export interface ArdProgramSetSearchResponse {
  data?: {
    search?: {
      programSets?: {
        numberOfElements?: number
        nodes?: ArdProgramSet[]
      }
    }
  }
}

export interface ArdSearchItem {
  id?: string
  title?: string
  synopsis?: string
  publicationStartDateAndTime?: string
  duration?: number
  image?: ArdImage
  programSet?: ArdProgramSet
}

export interface ArdSearchProgramSet {
  id?: string
  title?: string
  numberOfElements?: number
  synopsis?: string
  image?: ArdImage
  sharingUrl?: string
  publicationService?: ArdPublicationService
  editorialCategories?: {
    nodes?: ArdEditorialCategory[]
  }
}

export interface ArdSearchEditorialCollection {
  id?: string
  title?: string
  numberOfElements?: number
  synopsis?: string
  broadcastDuration?: number
  image?: ArdImage
}

export interface ArdSearchResponse {
  data?: {
    search?: {
      items?: {
        numberOfElements?: number
        nodes?: ArdSearchItem[]
      }
      programSets?: {
        numberOfElements?: number
        nodes?: ArdSearchProgramSet[]
      }
      editorialCollections?: {
        numberOfElements?: number
        nodes?: ArdSearchEditorialCollection[]
      }
      editorialCategories?: {
        numberOfElements?: number
        nodes?: ArdEditorialCategory[]
      }
    }
  }
}

export type ArdSearchType = 'search' | 'programsets'
