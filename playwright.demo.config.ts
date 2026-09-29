import { defineConfig } from '@playwright/test';
import base from './playwright.config.ts';
export default defineConfig({ ...base, testMatch: '**/*.preview.ts', use: { ...base.use, baseURL: 'http://127.0.0.1:3099/jarvis/' }, webServer: { command: 'node tests/demo-server.ts', url: 'http://127.0.0.1:3099/jarvis/', reuseExistingServer: false } });
