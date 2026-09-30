import { defineConfig } from '@playwright/test';
import base from './playwright.config.ts';
export default defineConfig({ ...base, testMatch: '**/*.speech.ts', webServer: { command: 'node tests/speech-ui-server.ts', url: 'http://127.0.0.1:3098', reuseExistingServer: false } });
