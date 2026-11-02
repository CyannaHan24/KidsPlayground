import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',webServer:{command:'npm run preview -- --port 4173',url:'http://127.0.0.1:4173',reuseExistingServer:true,timeout:15000},use:{baseURL:'http://127.0.0.1:4173',launchOptions:{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}}});
