import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['scraper/src/**/*.test.ts'] },
})
