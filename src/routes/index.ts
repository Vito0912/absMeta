import express from 'express'
import { parseProviderParams } from '../middleware/params'
import { searchHandler } from './search'
import { attachRequestContext } from '../utils/requestContext'

export const router = express.Router()

router.get('/:providerId/{*params}/search', attachRequestContext, parseProviderParams, searchHandler)
router.get('/:providerId/search', attachRequestContext, parseProviderParams, searchHandler)
