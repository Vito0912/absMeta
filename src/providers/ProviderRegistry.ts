import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import { BaseProvider } from './BaseProvider'
import { ProviderConfig } from '../types'

export class ProviderRegistry {
  private providers: Map<string, BaseProvider> = new Map()

  public register(provider: BaseProvider): void {
    const config = provider.getConfig()
    this.providers.set(config.id, provider)
  }

  public get(providerId: string): BaseProvider | undefined {
    return this.providers.get(providerId)
  }

  public getAll(): BaseProvider[] {
    return Array.from(this.providers.values())
  }

  public getAllConfigs(): ProviderConfig[] {
    return this.getAll().map((p) => p.getConfig())
  }

  public has(providerId: string): boolean {
    return this.providers.has(providerId)
  }

  public async loadProviders(providersDir: string): Promise<void> {
    const providerDirs = fs.readdirSync(providersDir).filter((dir) => {
      const fullPath = path.join(providersDir, dir)
      return fs.statSync(fullPath).isDirectory()
    })

    for (const dir of providerDirs) {
      const providerPath = path.join(providersDir, dir)
      const configPath = path.join(providerPath, 'config.json')
      const indexPath = path.join(providerPath, 'index.ts')

      if (!fs.existsSync(configPath)) {
        console.warn(`No config.json found for provider: ${dir}`)
        continue
      }

      if (!fs.existsSync(indexPath)) {
        console.warn(`No index.ts found for provider: ${dir}`)
        continue
      }

      try {
        const configContent = fs.readFileSync(configPath, 'utf-8')
        const config = JSON.parse(configContent) as ProviderConfig

        const providerModule = await import(pathToFileURL(indexPath).href)
        const ProviderClass = providerModule.default || providerModule.Provider

        if (!ProviderClass) {
          console.warn(`No default export found in provider: ${dir}`)
          continue
        }

        const provider = new ProviderClass(config) as BaseProvider
        this.register(provider)
        console.log(`Loaded provider: ${config.name} (${config.id})`)
      } catch (error) {
        console.error(`Failed to load provider ${dir}:`, error)
      }
    }
  }
}

export const providerRegistry = new ProviderRegistry()
