import * as fs from 'fs';
import * as path from 'path';

/**
 * Extracts screen names from the workspace by scanning for React/TypeScript component files
 * @param dir The directory to scan
 * @param screenNames Array to accumulate screen names
 * @returns Array of unique screen names
 */
export function extractScreenNames(dir: string, screenNames: string[] = []): string[] {
    if (!fs.existsSync(dir)) {
        return screenNames;
    }

    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // Skip common directories that don't contain screens
            const ignoreFolders = [
                'node_modules', 
                '.git', 
                'ui', 
                'styles', 
                'icons', 
                'figma', 
                'assets',
                'dist',
                'build',
                'out',
                '.vscode',
                'generated-backend'
            ];
            
            if (!ignoreFolders.includes(file.toLowerCase())) {
                extractScreenNames(filePath, screenNames);
            }
        } else {
            // Look for React/TypeScript component files
            if (/\.(js|ts|jsx|tsx)$/.test(file)) {
                // Skip common utility files
                const ignoreFiles = [
                    'app.tsx', 
                    'index.tsx', 
                    'main.tsx', 
                    'vite-env.d.ts',
                    'index.ts',
                    'index.js',
                    'app.js',
                    'main.js'
                ];
                
                const lowerFile = file.toLowerCase();
                
                // Skip SVG components and ignored files
                if (!lowerFile.startsWith('svg-') && !ignoreFiles.includes(lowerFile)) {
                    screenNames.push(file);
                }
            }
        }
    });

    // Return unique screen names
    return [...new Set(screenNames)];
}

// Made with Bob
