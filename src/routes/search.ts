import { Request, Response } from 'express'
import { dbManager } from '../database/manager'
import { createParametersHash } from '../utils/helpers'

export async function searchHandler(req: Request, res: Response): Promise<void> {
  const { title, author } = req.query
  const { provider, parsedParams } = req

  if (!provider || !parsedParams) {
    res.status(500).json({ error: 'Internal error: provider or params not set' })
    return
  }

  if (!title || typeof title !== 'string') {
    res.status(400).json({ error: 'Missing required query parameter: title' })
    return
  }

  const authorStr = author && typeof author === 'string' ? author : null
  const config = provider.getConfig()
  const paramsHash = createParametersHash(parsedParams)

  const skipCache = req.query.cache === 'false'

  if (!skipCache) {
    const cached = dbManager.getSearchCache(config.id, title, authorStr, paramsHash)
    if (cached) {
      try {
        const cachedData = JSON.parse(cached)
        res.json({ matches: cachedData })
        return
      } catch (e) {
        console.error('Failed to parse cached data:', e)
      }
    }
  }

  try {
    const matches = await provider.search(title, authorStr, parsedParams, { skipCache })

    if (!skipCache) {
      dbManager.setSearchCache(config.id, title, authorStr, paramsHash, JSON.stringify(matches))
    }

    res.json({ matches })
  } catch (error) {
    console.error('Search error:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' })
  }
}
