import * as fs from 'fs';
import * as path from 'path';

const SKIP_DIRS = new Set(['node_modules', '.git', 'ui', 'styles', 'icons', 'figma', 'assets', 'dist', 'build', '__tests__', 'generated-backend']);
const SKIP_FILES = new Set(['app.tsx', 'app.ts', 'index.tsx', 'index.ts', 'main.tsx', 'main.ts', 'vite-env.d.ts', 'vite.config.ts', 'vite.config.js', 'setupTests.ts']);

export function extractScreenNames(dir: string, found = new Set<string>()): string[] {
    if (!fs.existsSync(dir)) return [];
    
    for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        const stat = fs.statSync(full);
        
        if (stat.isDirectory()) {
            if (!SKIP_DIRS.has(entry.toLowerCase())) {
                extractScreenNames(full, found);
            }
        } else if (/\.(js|ts|jsx|tsx)$/.test(entry)) {
            if (!entry.toLowerCase().startsWith('svg-') && !SKIP_FILES.has(entry.toLowerCase())) {
                found.add(entry);
            }
        }
    }
    return [...found];
}