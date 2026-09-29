import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/*.e2e.ts', workers: 1,
  timeout: 60000, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3098', viewport: { width: 1440, height: 1000 }, timezoneId: 'Europe/Dublin', headless: true, launchOptions: process.env.JARVIS_TEST_CHROME ? { executablePath: process.env.JARVIS_TEST_CHROME, args: ['--no-sandbox', '--no-zygote', '--disable-dev-shm-usage', '--disable-webgl'] } : {}, reducedMotion: 'reduce', trace: 'retain-on-failure' },
  webServer: { command: 'node --disable-sigusr1 tests/ui-server.ts', url: 'http://127.0.0.1:3098', reuseExistingServer: false },
});
