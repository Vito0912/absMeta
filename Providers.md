# Metadata Providers

Total Providers: 2

## Table of Contents

- [BookBeat](#bookbeat)
- [Example Provider](#example)

---

## BookBeat

**ID:** `bookbeat`

**Description:** Fetches metadata from BookBeat's public search API.

**Metadata-URL:** [https://www.bookbeat.com/](https://www.bookbeat.com/)

### Parameters

#### Required Parameters

| Name | Type | Validation | Description |
|------|------|------------|-------------|
| `market` | enum | [germany, sweden, finland, denmark, norway, poland, netherlands, austria, switzerland] | Market/country for the search (BookBeat region) |

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
GET /bookbeat/market:germany/search?title=example&author=author
```

### Comments

- Data might be unrelated a bit.
- There are made up to 4 requests per search, so consider ratelimiting if self-hosted! Please check you local laws regarding web scraping and API usage.

---

## Example Provider

**ID:** `example`

**Description:** An example metadata provider that demonstrates the framework capabilities

**Metadata-URL:** [https://example.com](https://example.com)

### Parameters

#### Required Parameters

| Name | Type | Validation | Description |
|------|------|------------|-------------|
| `lang` | enum | [en, de, fr, es] | Language code for the search results |

#### Optional Parameters

| Name | Type | Validation | Description |
|------|------|------------|-------------|
| `limit` | int | 1-50 | Maximum number of results to return |

### Returned Fields

- `title`
- `subtitle`
- `author`
- `narrator`
- `publisher`
- `publishedYear`
- `description`
- `cover`
- `isbn`
- `asin`
- `genres`
- `series`
- `language`
- `duration`

### Example Request

```
GET /example/lang:en/search?title=example&author=author
```

### Comments

- This is an example provider for demonstration purposes
- It returns mock data and does not connect to a real API
- Use this as a template for creating new providers

---

