import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:4210',
    trace: 'retain-on-failure'
  },
  webServer: [
    {
      command:
        'java -jar ../taskmanager-service/target/taskmanager-0.0.1-SNAPSHOT.jar ' +
        '--spring.profiles.active=test,e2e-seed --server.port=8089',
      url: 'http://localhost:8089/actuator/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000
    },
    {
      command: 'npx ng serve --configuration=e2e --port=4210',
      url: 'http://localhost:4210',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000
    }
  ]
});
