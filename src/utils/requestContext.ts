import { AsyncLocalStorage } from 'async_hooks'
import { Request, Response, NextFunction } from 'express'

type ReqContext = {
  skipCache?: boolean
}

const asyncLocalStorage = new AsyncLocalStorage<ReqContext>()

export function getSkipCacheFlag(): boolean {
  return asyncLocalStorage.getStore()?.skipCache ?? false
}

export function runWithContext<T>(ctx: ReqContext, fn: () => T): T {
  return asyncLocalStorage.run(ctx, fn)
}

export function attachRequestContext(req: Request, _res: Response, next: NextFunction): void {
  const skip = req.query.cache === 'false'
  asyncLocalStorage.run({ skipCache: skip }, () => next())
}

export default asyncLocalStorage
