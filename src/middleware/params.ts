import { Request, Response, NextFunction } from 'express'
import { providerRegistry } from '../providers/ProviderRegistry'
import { ParameterValidator } from '../utils/validator'
import { ParsedParameters } from '../types'

export function parseProviderParams(req: Request, res: Response, next: NextFunction): void {
  const { providerId, params } = req.params
  const provider = providerRegistry.get(providerId)

  if (!provider) {
    res.status(404).json({ error: `Provider not found: ${providerId}` })
    return
  }

  const config = provider.getConfig()
  const parsedParams: ParsedParameters = {}
  const paramString: string[] = (params as unknown as string[]) || []

  console.log('Parameter string:', paramString)

  const paramPairs = paramString
    .filter((p) => p.length > 0)
    .map((p) => {
      const colonIndex = p.indexOf(':')
      if (colonIndex === -1) {
        return null
      }
      return {
        name: p.substring(0, colonIndex),
        value: p.substring(colonIndex + 1)
      }
    })
    .filter((p): p is { name: string; value: string } => p !== null)

  const providedParamNames = new Set(paramPairs.map((p) => p.name))

  for (const paramDef of config.parameters) {
    const paramPair = paramPairs.find((p) => p.name === paramDef.name)

    if (!paramPair) {
      if (paramDef.required) {
        res.status(400).json({
          error: `Missing required parameter: ${paramDef.name}`
        })
        return
      }
      continue
    }

    const validation = ParameterValidator.validate(paramPair.value, paramDef.validation)

    if (!validation.valid) {
      res.status(400).json({
        error: `Invalid parameter ${paramDef.name}: ${validation.error}`
      })
      return
    }

    parsedParams[paramDef.name] = validation.parsedValue!
  }

  const validParamNames = new Set(config.parameters.map((p) => p.name))
  for (const paramName of providedParamNames) {
    if (!validParamNames.has(paramName)) {
      res.status(400).json({
        error: `Unknown parameter: ${paramName}`
      })
      return
    }
  }

  req.parsedParams = parsedParams
  req.provider = provider
  next()
}

declare global {
  namespace Express {
    interface Request {
      parsedParams?: ParsedParameters
      provider?: import('../providers/BaseProvider').BaseProvider
    }
  }
}
