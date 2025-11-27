# Metadata Providers

Total Providers: 7

## Table of Contents

- [ARD Audiothek](#ardaudiothek)
- [Big Finish](#bigfinish)
- [BookBeat](#bookbeat)
- [Graphic Audio](#graphicaudio)
- [Hardcover](#hardcover)
- [LibriVox](#librivox)
- [Storytel](#storytel)

---

## ARD Audiothek

**ID:** `ardaudiothek`

**Description:** Fetches audiobook metadata from the ARD Audiothek (public broadcasters in Germany).

**Metadata-URL:** [https://www.ardaudiothek.de/](https://www.ardaudiothek.de/)

### Parameters

#### Optional Parameters

| Name | Type | Validation | Description |
|------|------|------------|-------------|
| `limit` | int | 1-20 | Maximum number of results to return (default: 5, max: 20) |

### Returned Fields

- `title`
- `author`
- `description`
- `cover`
- `publisher`
- `genres`
- `tags`
- `series`
- `language`

### Example Request

```
GET /ardaudiothek/search?title=example&author=author
```

### Comments

- German language only provider.
- Credits https://github.com/h43lb1t0/ARD_Audiothek_provider for inital idea in Python

---

## Big Finish

**ID:** `bigfinish`

**Description:** Fetches audiobook metadata from Big Finish Productions (Doctor Who, Torchwood, and other audio dramas).

**Metadata-URL:** [https://www.bigfinish.com/](https://www.bigfinish.com/)

### Parameters

#### Optional Parameters

| Name | Type | Validation | Description |
|------|------|------------|-------------|
| `limit` | int | 1-10 | Maximum number of results to return (default: 5, max: 10) |

### Returned Fields

- `title`
- `author`
- `narrator`
- `description`
- `cover`
- `isbn`
- `series`
- `language`
- `publishedYear`
- `publisher`
- `duration`

### Example Request

```
GET /bigfinish/search?title=example&author=author
```

---

## BookBeat

**ID:** `bookbeat`

**Description:** Fetches metadata from BookBeat's public search API.

**Metadata-URL:** [https://www.bookbeat.com/](https://www.bookbeat.com/)

### Parameters

#### Required Parameters

| Name | Type | Validation | Description |
|------|------|------------|-------------|
| `market` | enum | [austria, belgium, bulgaria, croatia, cyprus, czechia, denmark, estonia, finland, france, germany, greece, hungary, ireland, italy, latvia, lithuania, luxembourg, malta, netherlands, norway, poland, portugal, romania, slovakia, slovenia, spain, sweden, switzerland, united-kingdom] | Market/country for the search (BookBeat region) |

#### Optional Parameters

| Name | Type | Validation | Description |
|------|------|------------|-------------|
| `includeErotic` | enum | [true, false] | Whether to include erotic books (default: false) |

### Returned Fields

- `title`
- `author`
- `description`
- `cover`
- `isbn`
- `series`
- `language`
- `publishedYear`

### Example Request

```
GET /bookbeat/market:austria/search?title=example&author=author
```

### Comments

- Data might be unrelated a bit.
- There are made up to 4 requests per search, so consider ratelimiting if self-hosted! Please check you local laws regarding web scraping and API usage.

---

## Graphic Audio

**ID:** `graphicaudio`

**Description:** Fetches metadata from Graphic Audio's catalog. Graphic Audio produces dramatized audiobooks with full cast, music, and sound effects.

**Metadata-URL:** [https://www.graphicaudiointernational.net/](https://www.graphicaudiointernational.net/)

### Parameters

#### Optional Parameters

| Name | Type | Validation | Description |
|------|------|------------|-------------|
| `limit` | int | 1-20 | Maximum number of results to return (default: 10, max: 20) |

### Returned Fields

- `title`
- `subtitle`
- `author`
- `narrator`
- `description`
- `cover`
- `isbn`
- `asin`
- `genres`
- `series`
- `publishedYear`

### Example Request

```
GET /graphicaudio/search?title=example&author=author
```

### Comments

- Credits to https://github.com/binyaminyblatt/graphicaudio_scraper

---

## Hardcover

**ID:** `hardcover`

**Description:** Book metadata from Hardcover.app

**Metadata-URL:** [https://hardcover.app](https://hardcover.app)

### Parameters

#### Optional Parameters

| Name | Type | Validation | Description |
|------|------|------------|-------------|
| `language` | string | - | Filter by language code (e.g., 'en', 'de') |
| `limit` | int | 1-25 | Maximum number of results to return (default: 10, max: 25) |

### Returned Fields

- `title`
- `subtitle`
- `author`
- `narrator`
- `description`
- `cover`
- `isbn`
- `asin`
- `publisher`
- `publishedYear`
- `language`
- `series`
- `tags`

### Example Request

```
GET /hardcover/search?title=example&author=author
```

### Comments

- The searching seems to be a bit broken, not finding results that exist.

---

## LibriVox

**ID:** `librivox`

**Description:** Fetches metadata from LibriVox's public domain audiobook API. LibriVox provides free public domain audiobooks read by volunteers.

**Metadata-URL:** [https://librivox.org/](https://librivox.org/)

### Parameters

#### Optional Parameters

| Name | Type | Validation | Description |
|------|------|------------|-------------|
| `genre` | string | - | Filter results by genre (e.g., 'Fiction', 'Science Fiction', 'Poetry') |
| `limit` | int | 1-20 | Maximum number of results to return (default: 10, max: 20) |

### Returned Fields

- `title`
- `author`
- `description`
- `cover`
- `genres`
- `language`
- `duration`
- `publishedYear`

### Example Request

```
GET /librivox/search?title=example&author=author
```

### Comments

- Use ^ prefix in title/author to anchor search to beginning of term

---

## Storytel

**ID:** `storytel`

**Description:** Fetches metadata from Storytel's public search API.

**Metadata-URL:** [https://www.storytel.com/](https://www.storytel.com/)

### Parameters

#### Required Parameters

| Name | Type | Validation | Description |
|------|------|------------|-------------|
| `language` | enum | [en, sv, no, dk, fi, is, de, es, fr, it, pl, nl, pt, bg, tr, ru, ar, hi, id, th] | Language/locale for the search (ISO language code) |

#### Optional Parameters

| Name | Type | Validation | Description |
|------|------|------------|-------------|
| `limit` | int | 1-10 | Maximum number of results to return (default: 3, max: 10) |
| `type` | enum | [audiobook, ebook, all] | Type of content to search for (default: all) |

### Returned Fields

- `title`
- `subtitle`
- `author`
- `narrator`
- `description`
- `cover`
- `isbn`
- `series`
- `language`
- `publishedYear`
- `publisher`
- `duration`
- `tags`

### Example Request

```
GET /storytel/language:en/search?title=example&author=author
```

### Comments

- Titles and series information are automatically cleaned using language-specific patterns.

---

