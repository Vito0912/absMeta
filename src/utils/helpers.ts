import crypto from 'crypto'
import { BookMetadata, SeriesMetadata } from '../types'
import { htmlSanitizer } from './sanitizer'

export function toStringOrUndefined(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  return undefined
}

export function validateSeriesArray(series: unknown): SeriesMetadata[] | undefined {
  if (!Array.isArray(series)) return undefined

  const validated = series
    .filter((item): item is { series: string; sequence?: string } => {
      return (
        typeof item === 'object' &&
        item !== null &&
        'series' in item &&
        typeof item.series === 'string' &&
        item.series.trim().length > 0
      )
    })
    .map((item) => ({
      series: item.series.trim(),
      sequence: toStringOrUndefined(item.sequence)
    }))

  return validated.length > 0 ? validated : undefined
}

export function normalizeBookMetadata(data: Record<string, unknown>): BookMetadata {
  const {
    title,
    subtitle,
    author,
    narrator,
    publisher,
    publishedYear,
    description,
    cover,
    isbn,
    asin,
    genres,
    tags,
    series,
    language,
    duration
  } = data

  return {
    title: toStringOrUndefined(title) ?? '',
    subtitle: toStringOrUndefined(subtitle),
    author: toStringOrUndefined(author),
    narrator: toStringOrUndefined(narrator),
    publisher: toStringOrUndefined(publisher),
    publishedYear: toStringOrUndefined(publishedYear),
    description: description && typeof description === 'string' ? htmlSanitizer.sanitize(description) : undefined,
    cover: toStringOrUndefined(cover),
    isbn: toStringOrUndefined(isbn),
    asin: toStringOrUndefined(asin),
    genres: Array.isArray(genres) && genres.every((g) => typeof g === 'string') ? genres : undefined,
    tags: Array.isArray(tags) && tags.every((t) => typeof t === 'string') ? tags : undefined,
    series: validateSeriesArray(series),
    language: toStringOrUndefined(language),
    duration: !isNaN(Number(duration)) && duration !== null ? Number(duration) : undefined
  }
}

export function createParametersHash(params: Record<string, string | number>): string {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
  return crypto.createHash('md5').update(sorted).digest('hex')
}
