export interface AudiotekaLanguageConfig {
  searchUrl: string
  acceptLanguage: string
  labels: {
    narrator: string[]
    duration: string[]
    publisher: string[]
    category: string[]
    language: string[]
  }
  languageName: string
}

export const AUDIOTEKA_LANGUAGES: Record<string, AudiotekaLanguageConfig> = {
  pl: {
    searchUrl: 'https://audioteka.com/pl/szukaj/',
    acceptLanguage: 'pl-PL',
    labels: {
      narrator: ['Głosy'],
      duration: ['Długość'],
      publisher: ['Wydawca'],
      category: ['Kategoria'],
      language: ['Język']
    },
    languageName: 'polish'
  },
  cz: {
    searchUrl: 'https://audioteka.com/cz/vyhledavani/',
    acceptLanguage: 'cs-CZ',
    labels: {
      narrator: ['Interpret'],
      duration: ['Délka'],
      publisher: ['Vydavatel'],
      category: ['Kategorie'],
      language: ['Jazyk']
    },
    languageName: 'czech'
  },
  de: {
    searchUrl: 'https://audioteka.com/de/search/',
    acceptLanguage: 'de-DE',
    labels: {
      narrator: ['Sprecher'],
      duration: ['Dauer'],
      publisher: ['Verlag'],
      category: ['Kategorie'],
      language: ['Sprache']
    },
    languageName: 'german'
  },
  sk: {
    searchUrl: 'https://audioteka.com/sk/vyhladavanie/',
    acceptLanguage: 'sk-SK',
    labels: {
      narrator: ['Interpret'],
      duration: ['Dĺžka'],
      publisher: ['Vydavateľ'],
      category: ['Kategória'],
      language: ['Jazyk']
    },
    languageName: 'slovak'
  },
  lt: {
    searchUrl: 'https://audioteka.com/lt/search/',
    acceptLanguage: 'lt-LT',
    labels: {
      narrator: ['Skaito'],
      duration: ['Trukmė'],
      publisher: ['Leidėjas'],
      category: ['Kategorija'],
      language: ['Kalba']
    },
    languageName: 'lithuanian'
  }
}

export interface AudiotekaSearchMatch {
  id: string
  title: string
  authors: string[]
  url: string
  cover?: string
  rating?: number
}

export interface AudiotekaFullMetadata extends AudiotekaSearchMatch {
  narrator?: string
  duration?: number
  publisher?: string
  description?: string
  genres?: string[]
  series?: string[]
  language?: string
}
