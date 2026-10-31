import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],build:{rolldownOptions:{output:{codeSplitting:{groups:[{name:'react',test:/node_modules\/(react|react-dom|scheduler)\//},{name:'storage',test:/node_modules\/(dexie|zod)\//},{name:'temporal',test:/node_modules\/@js-temporal\//}]}}}},test:{include:['src/**/*.test.ts']}});
