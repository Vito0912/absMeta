# Metadata Providers

Total Providers: 2

## Table of Contents

- [BookBeat](#bookbeat)
- [Storytel](#storytel)

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

