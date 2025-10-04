export interface ThaliaResponse {
  uuid: string
  artikelliste: ThaliaSearchResult[]
}

export interface ThaliaSearchResult {
  identifier: Identifier
  titel: string
  personen?: Produzent[]
  serie?: Serie
  link: string
  coverbild: Coverbild
  erscheinungsdatum?: Erscheinungsdatum
  formatbezeichnung: string
  anzahlSeiten?: string
  shop: Shop
  produzent?: Produzent
}

export interface BewertungsStatistik {
  anzahl: number
  durchschnittsBewertung: number
  anzahlSterne: string
}

export interface Coverbild {
  klein: Ereader
  liste: Ereader
  listeGross: Ereader
  gross: Ereader
  ereader: Ereader
  ereaderGross: Ereader
}

export interface Ereader {
  uri: string
  width: number
  height: number
}

export interface Erscheinungsdatum {
  jahr: number
  monat: number
  tag?: number
}

export interface Identifier {
  ean: string
  isbn13?: string
  isbn10?: string
  matnr: string
  mandantId: number
}

export interface Produzent {
  identNr?: number
  name: string
  typ: ProduzentTyp
  portrait?: string
}

export enum ProduzentTyp {
  Autor = 'Autor',
  Hersteller = 'Hersteller',
  Illustrator = 'Illustrator',
  Komponist = 'Komponist',
  Marke = 'Marke',
  Sprecher = 'Sprecher',
  Verlag = 'Verlag'
}

export interface Serie {
  name: string
  nummer?: string
  hatSerienslider: boolean
  teilString?: string
  link: string
}

export interface Shop {
  identNr: number
  label: string
  name: string
}

// https://app.quicktype.io/
