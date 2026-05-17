'use strict';

// ============================================================
// BOB AI FULL-STACK GENERATOR — v3.1 (Auto-Install Edition)
// Output: a full-stack app you run with:
//   cd generated-backend && npm run dev
//   cd <frontend>        && npm run dev
// ============================================================

// ── 0. Bootstrap ─────────────────────────────────────────────
const { execSync } = require('child_process');
const REQUIRED = ['adm-zip', 'openai', 'dotenv', 'commander', 'chalk@4.1.2'];

(function bootstrap() {
  const missing = REQUIRED.filter(p => {
    const pkgName = p.split('@')[0] || p;
    try { require.resolve(pkgName); return false; } catch { return true; }
  });
  if (!missing.length) return;
  console.log(`\n📦 Installing tool dependencies: ${missing.join(', ')} …`);
  try {
    execSync(`npm install ${missing.join(' ')} --no-save --loglevel=error`, { stdio: 'inherit' });
    console.log('✅ Done.\n');
  } catch {
    console.error('❌ npm install failed. Ensure Node ≥ 16 + npm are on PATH.');
    process.exit(1);
  }
})();

// ── 1. Imports ────────────────────────────────────────────────
require('dotenv').config();
const fs          = require('fs');
const path        = require('path');
const AdmZip      = require('adm-zip');
const { OpenAI }  = require('openai');
const { Command } = require('commander');
const chalk       = require('chalk');

// ── 2. Logger ─────────────────────────────────────────────────
const LOG_FILE = path.resolve('./bob-generator.log');
const log = {
  _w(lvl, col, msg) {
    const line = `[${new Date().toISOString()}] [${lvl}] ${msg}`;
    process.stdout.write(chalk[col](line) + '\n');
    fs.appendFileSync(LOG_FILE, line + '\n');
  },
  info : m => log._w('INFO ', 'cyan',    m),
  ok   : m => log._w('OK   ', 'green',   m),
  warn : m => log._w('WARN ', 'yellow',  m),
  error: m => log._w('ERROR', 'red',     m),
  step : m => log._w('STEP ', 'magenta', m),
};

// ── 3. Config ─────────────────────────────────────────────────
function loadConfig() {
  if (!process.env.OPENROUTER_API_KEY) {
    log.error('OPENROUTER_API_KEY is not set. Copy .env.example → .env and fill it in.');
    process.exit(1);
  }
  return {
    apiKey      : process.env.OPENROUTER_API_KEY,
    baseURL     : process.env.OPENROUTER_BASE_URL  || 'https://openrouter.ai/api/v1',
    model       : process.env.MODEL_NAME           || 'nvidia/nemotron-3-nano-30b-a3b:free',
    extractPath : process.env.EXTRACT_PATH         || './unzipped_frontend',
    backendDir  : process.env.BACKEND_OUTPUT_DIR   || './generated-backend',
    maxRetries  : parseInt(process.env.MAX_RETRIES    || '3',    10),
    retryDelay  : parseInt(process.env.RETRY_DELAY_MS || '3000', 10),
    requestGap  : parseInt(process.env.REQUEST_GAP_MS || '2000', 10),
    mongoUri    : process.env.MONGO_URI            || 'mongodb://localhost:27017/myapp',
    backendPort : process.env.BACKEND_PORT         || '3000',
  };
}

// ── 4. CLI ────────────────────────────────────────────────────
function parseCLI() {
  const p = new Command();
  p.name('bob-generator').version('3.1.0')
   .option('-z, --zip <path>', 'Path to Figma export ZIP')
   .option('-d, --dir <path>', 'Path to already-extracted frontend folder')
   .option('--backend-only',   'Skip frontend refactoring')
   .option('--frontend-only',  'Skip backend generation')
   .parse(process.argv);
  return p.opts();
}

// ── 5. Windows File Dialog ────────────────────────────────────
function getZipFileFromWindowsDialog() {
  console.log('📍 Opening Windows File Explorer to select your ZIP file...');
  try {
    const psScript = `Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.Filter = 'ZIP files (*.zip)|*.zip'; $f.Title = 'Select Figma Export (ZIP)'; if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $f.FileName }`;
    const result = execSync(`powershell -NoProfile -Command "${psScript}"`, { encoding: 'utf8' });
    return result.trim();
  } catch (error) {
    console.error('❌ Error or window closed:', error.message);
    return '';
  }
}

// ── 6. ZIP / folder resolution ────────────────────────────────
function resolveSourceDir(opts, config) {
  if (opts.dir) {
    const abs = path.resolve(opts.dir);
    if (!fs.existsSync(abs)) throw new Error(`Directory not found: ${abs}`);
    return abs;
  }
  if (opts.zip) {
    const abs = path.resolve(opts.zip);
    if (!fs.existsSync(abs)) throw new Error(`ZIP not found: ${abs}`);
    log.step(`Extracting ${abs} → ${config.extractPath}`);
    new AdmZip(abs).extractAllTo(config.extractPath, true);
    log.ok('Extraction complete.');
    return config.extractPath;
  }

  const selectedZip = getZipFileFromWindowsDialog();
  if (selectedZip && fs.existsSync(selectedZip)) {
    log.step(`Extracting ${selectedZip} → ${config.extractPath}`);
    new AdmZip(selectedZip).extractAllTo(config.extractPath, true);
    log.ok('Extraction complete.');
    return config.extractPath;
  }

  if (fs.existsSync(config.extractPath)) {
    log.warn(`No input given. Reusing existing folder: ${config.extractPath}`);
    return config.extractPath;
  }
  throw new Error('No input source. Use --zip <file> or --dir <folder>.');
}

// ── 7. Screen discovery ───────────────────────────────────────
const SKIP_DIRS  = new Set(['node_modules', '.git', 'ui', 'styles', 'icons', 'figma',
                             'assets', 'dist', 'build', '__tests__']);
const SKIP_FILES = new Set(['app.tsx', 'app.ts', 'index.tsx', 'index.ts', 'main.tsx',
                             'main.ts', 'vite-env.d.ts', 'vite.config.ts',
                             'vite.config.js', 'setupTests.ts']);

function discoverScreens(dir, found = new Set()) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(entry.toLowerCase())) discoverScreens(full, found);
    } else if (/\.(js|ts|jsx|tsx)$/.test(entry)) {
      if (!entry.toLowerCase().startsWith('svg-') && !SKIP_FILES.has(entry.toLowerCase()))
        found.add(entry);
    }
  }
  return [...found];
}

// ── 8. AI helpers ─────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function aiCall(client, config, messages, ctx) {
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      const res  = await client.chat.completions.create({ model: config.model, messages });
      const text = res.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error('Empty AI response (rate-limit or quota exhausted)');
      return text;
    } catch (err) {
      log.warn(`[${ctx}] attempt ${attempt}/${config.maxRetries}: ${err.message}`);
      if (attempt === config.maxRetries) throw err;
      await sleep(config.retryDelay * attempt);
    }
  }
}

function stripFences(t) {
  return t.replace(/^```[\w]*\n?/m, '').replace(/```\s*$/m, '').trim();
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

// ── 9. Backend scaffold ───────────────────────────────────────
function writeBackendScaffold(backendDir, config) {
  log.step('Writing backend scaffold (package.json, tsconfig.json, .env) …');

  const pkg = {
    name: 'generated-backend',
    version: '1.0.0',
    description: 'AI-generated Express + TypeScript backend',
    scripts: {
      dev  : 'ts-node-dev --respawn --transpile-only src/server.ts',
      build: 'tsc',
      start: 'node dist/server.js',
    },
    dependencies: {
      cors    : '^2.8.5',
      dotenv  : '^16.3.1',
      express : '^4.18.2',
      mongoose: '^8.0.3',
      uuid    : '^9.0.0',
    },
    devDependencies: {
      '@types/cors'   : '^2.8.17',
      '@types/express': '^4.17.21',
      '@types/node'   : '^20.11.0',
      '@types/uuid'   : '^9.0.0',
      'ts-node-dev'   : '^2.0.0',
      typescript      : '^5.3.3',
    },
  };
  writeFile(path.join(backendDir, 'package.json'), JSON.stringify(pkg, null, 2));

  const tsconfig = {
    compilerOptions: {
      target           : 'ES2020',
      module           : 'commonjs',
      lib              : ['ES2020'],
      outDir           : './dist',
      rootDir          : './src',
      strict           : true,
      esModuleInterop  : true,
      skipLibCheck     : true,
      resolveJsonModule: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
  };
  writeFile(path.join(backendDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));

  writeFile(path.join(backendDir, '.env'),
    `PORT=${config.backendPort}\nMONGO_URI=${config.mongoUri}\nNODE_ENV=development\nJWT_SECRET=change-me-in-production\nFRONTEND_URL=http://localhost:5173\n`);

  writeFile(path.join(backendDir, '.env.example'),
    `PORT=3000\nMONGO_URI=mongodb://localhost:27017/myapp\nNODE_ENV=development\nJWT_SECRET=your-secret-key\nFRONTEND_URL=http://localhost:5173\n`);

  writeFile(path.join(backendDir, '.gitignore'), 'node_modules/\ndist/\n.env\n');

  log.ok('Scaffold files written.');
}

// ── 10. Smart Frontend Dependency Scanner ─────────────────────
function ensureFrontendDependencies(frontendDir) {
  log.step('Scanning frontend code for required dependencies…');

  const pkgPath = path.join(frontendDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    log.warn('Frontend package.json not found — skipping dependency check.');
    return;
  }

  let pkg;
  try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); }
  catch { log.warn('Could not parse frontend package.json.'); return; }

  pkg.dependencies = pkg.dependencies || {};

  const requiredDeps = new Set();

  const scanForImports = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (!['node_modules', 'dist', 'build', '.git'].includes(entry)) {
          scanForImports(fullPath);
        }
      } else if (/\.(js|jsx|ts|tsx)$/.test(entry)) {
        const content = fs.readFileSync(fullPath, 'utf8');

        const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          const importPath = match[1];
          if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
            const pkgName = importPath.startsWith('@')
              ? importPath.split('/').slice(0, 2).join('/')
              : importPath.split('/')[0];
            requiredDeps.add(pkgName);
          }
        }

        const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
        while ((match = requireRegex.exec(content)) !== null) {
          const importPath = match[1];
          if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
            const pkgName = importPath.startsWith('@')
              ? importPath.split('/').slice(0, 2).join('/')
              : importPath.split('/')[0];
            requiredDeps.add(pkgName);
          }
        }
      }
    }
  };

  scanForImports(path.join(frontendDir, 'src'));

  const knownVersions = {
    'axios'                : '^1.6.7',
    'react'                : '^18.2.0',
    'react-dom'            : '^18.2.0',
    'react-router-dom'     : '^6.20.0',
    '@tanstack/react-query': '^5.17.0',
    'zustand'              : '^4.4.7',
    'date-fns'             : '^3.0.0',
    'lodash'               : '^4.17.21',
    'clsx'                 : '^2.1.0',
    'tailwind-merge'       : '^2.2.0',
  };

  const builtInModules = new Set(['fs', 'path', 'http', 'https', 'crypto', 'util', 'stream', 'events']);

  // Clean up malformed dependency entries
  let cleaned = 0;
  for (const key in pkg.dependencies) {
    // Check if key contains @ followed by a version number (malformed)
    // OR contains invalid characters like colons (e.g., "figma:asset")
    if ((key.includes('@') && /\d+\.\d+\.\d+/.test(key)) || key.includes(':')) {
      delete pkg.dependencies[key];
      cleaned++;
    }
  }
  if (cleaned > 0) {
    log.ok(`  ✔ Cleaned ${cleaned} malformed dependency entries`);
  }

  let added = 0;
  for (const dep of requiredDeps) {
    if (pkg.dependencies[dep] || pkg.devDependencies?.[dep]) continue;
    if (builtInModules.has(dep)) continue;
    const version = knownVersions[dep] || 'latest';
    pkg.dependencies[dep] = version;
    log.ok(`  ✔ Added ${dep}@${version}`);
    added++;
  }

  if (added > 0 || cleaned > 0) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
    log.ok(`Frontend dependencies updated: ${added} package(s) added, ${cleaned} cleaned.`);
  } else {
    log.ok('All required frontend dependencies already present.');
  }
}

// ── 11. Environment Variable Management ───────────────────────
// FIX: was missing its closing brace — setupProtectedRoutes was accidentally nested inside.
function setupEnvironmentVariables(frontendDir, backendDir, config) {
  log.step('Setting up environment variables…');

  const hardcodedValues = new Map();

  const scanForHardcodedValues = (dir, prefix = 'VITE_') => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (!['node_modules', 'dist', 'build', '.git'].includes(entry)) {
          scanForHardcodedValues(fullPath, prefix);
        }
      } else if (/\.(js|jsx|ts|tsx)$/.test(entry)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        let modified = false;

        const urlRegex = /(['"`])https?:\/\/localhost:\d+([^'"`]*)\1/g;
        content = content.replace(urlRegex, (match, quote, urlPath) => {
          const envVar = `${prefix}API_URL`;
          hardcodedValues.set(envVar, `http://localhost:${config.backendPort}`);
          modified = true;
          return urlPath
            ? `import.meta.env.${envVar} + '${urlPath}'`
            : `import.meta.env.${envVar}`;
        });

        if (modified) fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  };

  const scanBackendValues = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      if (fs.statSync(fullPath).isDirectory()) {
        if (!['node_modules', 'dist'].includes(entry)) scanBackendValues(fullPath);
      } else if (/\.(js|ts)$/.test(entry)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('mongodb://') || content.includes('mongodb+srv://')) {
          hardcodedValues.set('MONGO_URI', config.mongoUri);
        }
      }
    }
  };

  scanForHardcodedValues(path.join(frontendDir, 'src'));
  scanBackendValues(path.join(backendDir, 'src'));

  if (hardcodedValues.size > 0) {
    let frontendEnvContent        = '# Frontend Environment Variables\n';
    let frontendEnvExampleContent = '# Frontend Environment Variables (Example)\n';

    for (const [key, value] of hardcodedValues.entries()) {
      frontendEnvContent        += `${key}=${value}\n`;
      frontendEnvExampleContent += `${key}=${value}\n`;
    }

    writeFile(path.join(frontendDir, '.env'),         frontendEnvContent);
    writeFile(path.join(frontendDir, '.env.example'), frontendEnvExampleContent);
    log.ok('  ✔ Created frontend .env files');
  }

  const backendEnvPath = path.join(backendDir, '.env');
  if (fs.existsSync(backendEnvPath)) {
    let backendEnv = fs.readFileSync(backendEnvPath, 'utf8');
    const requiredVars = {
      PORT          : config.backendPort,
      MONGO_URI     : config.mongoUri,
      NODE_ENV      : 'development',
      JWT_SECRET    : 'your-secret-key-change-in-production',
      FRONTEND_URL  : 'http://localhost:5173',
    };
    for (const [key, value] of Object.entries(requiredVars)) {
      if (!backendEnv.includes(`${key}=`)) backendEnv += `${key}=${value}\n`;
    }
    fs.writeFileSync(backendEnvPath, backendEnv, 'utf8');
    log.ok('  ✔ Updated backend .env file');
  }

  writeFile(path.join(frontendDir, '.env.production.example'),
    '# Frontend Production\nVITE_API_URL=https://api.yourapp.com\n');

  writeFile(path.join(backendDir, '.env.production.example'),
    '# Backend Production\nPORT=3000\nMONGO_URI=mongodb+srv://user:pass@cluster/db\nNODE_ENV=production\nJWT_SECRET=your-production-secret\nFRONTEND_URL=https://yourapp.com\n');

  log.ok('Environment variable setup complete.');
} // ← FIX: closing brace that was missing in the original

// ── 12. Protected Routes System ───────────────────────────────
// FIX: was accidentally nested inside setupEnvironmentVariables; now a standalone function.
function setupProtectedRoutes(frontendDir) {
  log.step('Setting up protected routes system…');

  const srcDir = path.join(frontendDir, 'src');
  if (!fs.existsSync(srcDir)) {
    log.warn('Frontend src directory not found — skipping protected routes.');
    return;
  }

  const protectedPatterns = [/dashboard/i, /profile/i, /settings/i, /account/i,
                              /admin/i, /user/i, /my-/i, /private/i];
  const protectedPages = [];

  const scanForProtectedPages = (dir) => {
    for (const entry of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      if (fs.statSync(fullPath).isDirectory()) {
        if (!['node_modules', 'dist', 'build'].includes(entry)) scanForProtectedPages(fullPath);
      } else if (/\.(jsx?|tsx?)$/.test(entry)) {
        if (protectedPatterns.some(pat => pat.test(entry))) {
          protectedPages.push({ file: entry, path: fullPath });
        }
      }
    }
  };

  scanForProtectedPages(srcDir);

  if (protectedPages.length === 0) {
    log.info('  No protected pages detected.');
    return;
  }

  log.info(`  Found ${protectedPages.length} protected page(s): ${protectedPages.map(p => p.file).join(', ')}`);

  // AuthContext
  writeFile(path.join(srcDir, 'contexts', 'AuthContext.tsx'), `import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  login: (token: string, userData?: any) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token) {
      setIsAuthenticated(true);
      if (userData) {
        try { setUser(JSON.parse(userData)); } catch { /* ignore */ }
      }
    }
    setLoading(false);
  }, []);

  const login = (token: string, userData?: any) => {
    localStorage.setItem('token', token);
    if (userData) { localStorage.setItem('user', JSON.stringify(userData)); setUser(userData); }
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
`);
  log.ok('  ✔ Created AuthContext');

  // ProtectedRoute component
  writeFile(path.join(srcDir, 'components', 'ProtectedRoute.tsx'), `import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}>Loading…</div>;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
`);
  log.ok('  ✔ Created ProtectedRoute component');

  // Axios interceptor
  writeFile(path.join(srcDir, 'utils', 'axiosConfig.ts'), `import axios from 'axios';

axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = \`Bearer \${token}\`;
  return config;
}, error => Promise.reject(error));

axios.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
  return Promise.reject(error);
});

export default axios;
`);
  log.ok('  ✔ Created axios auth interceptor');

  log.ok(`Protected routes system complete (${protectedPages.length} page(s) detected).`);
} // ← FIX: this brace now correctly closes only setupProtectedRoutes

// ── 13. AI: generate backend business logic ───────────────────
async function generateBackendLogic(client, config, screens) {
  log.step(`Generating backend business logic for ${screens.length} screen(s) …`);

  const prompt = `You are an expert Node.js + TypeScript + Express engineer.

A React frontend has these screen filenames:
${JSON.stringify(screens, null, 2)}

TASK: Generate the TypeScript source files for the backend serving this frontend.

CRITICAL RULES:
1. FILE STRUCTURE: Generate src/server.ts, src/routes/*.ts, src/models/*.ts, src/middleware/errorHandler.ts
2. server.ts: first line MUST be "import 'dotenv/config';" — do NOT call dotenv.config() anywhere else.
3. Use: const PORT = process.env.PORT ?? 3000;
4. Mongoose: mongoose.connect(process.env.MONGO_URI!) with NO options object.
5. Apply: app.use(cors()); app.use(express.json());
6. Mount all routes under /api/*
7. Last middleware: app.use(errorHandler)
8. All imports: NO .js extensions
9. Every route handler: async/await with try/catch calling next(err)
10. Every model imported in a route MUST have a corresponding file in the response
11. Add app.listen(PORT, ...) at the bottom of server.ts

DO NOT generate package.json, tsconfig.json, or .env.

RESPOND ONLY with valid JSON — no markdown, no commentary:
{
  "files": [
    { "filename": "src/server.ts", "content": "…" },
    { "filename": "src/routes/itemRoutes.ts", "content": "…" },
    { "filename": "src/models/Item.ts", "content": "…" },
    { "filename": "src/middleware/errorHandler.ts", "content": "…" }
  ]
}`;

  const raw  = await aiCall(client, config, [{ role: 'user', content: prompt }], 'backend-logic');
  const text = stripFences(raw);

  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(`AI returned invalid JSON.\n---\n${text}`); }

  if (!Array.isArray(data?.files) || !data.files.length)
    throw new Error('AI response is missing the "files" array.');

  let written = 0;
  for (const { filename, content } of data.files) {
    if (typeof filename !== 'string' || typeof content !== 'string') continue;
    writeFile(path.join(config.backendDir, filename), content);
    log.ok(`  + ${filename}`);
    written++;
  }
  log.ok(`Backend logic: ${written} file(s) written.`);

  validateAndFixBackend(config.backendDir);
}

// ── 14. Validate & Auto-Fix Backend ───────────────────────────
// FIX: Fix 3's if-block no longer swallows Fixes 4–10.
//      fixImportsInDir is defined and called within its own self-contained block.
function validateAndFixBackend(backendDir) {
  log.step('Validating and auto-fixing backend code…');

  const serverPath = path.join(backendDir, 'src/server.ts');
  const routesDir  = path.join(backendDir, 'src/routes');
  const modelsDir  = path.join(backendDir, 'src/models');
  const srcDir     = path.join(backendDir, 'src');

  // Fix 1: Remove duplicate dotenv.config() calls
  if (fs.existsSync(serverPath)) {
    let code = fs.readFileSync(serverPath, 'utf8');
    if ((code.includes("import 'dotenv/config'") || code.includes('require("dotenv/config")'))
        && code.includes('dotenv.config()')) {
      code = code.replace(/\ndotenv\.config\(\);?\s*/g, '\n');
      fs.writeFileSync(serverPath, code, 'utf8');
      log.ok('  ✔ Removed duplicate dotenv.config() call');
    }
  }

  // Fix 2: Create missing model files referenced in routes
  if (fs.existsSync(routesDir)) {
    const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));
    const missingModels = new Set();

    for (const routeFile of routeFiles) {
      const routeCode = fs.readFileSync(path.join(routesDir, routeFile), 'utf8');
      for (const match of routeCode.matchAll(/import\s+\w+\s+from\s+['"]\.\.\/models\/(\w+)['"]/g)) {
        const modelPath = path.join(modelsDir, `${match[1]}.ts`);
        if (!fs.existsSync(modelPath)) missingModels.add(match[1]);
      }
    }

    for (const modelName of missingModels) {
      const stub = `import mongoose from 'mongoose';

const ${modelName.toLowerCase()}Schema = new mongoose.Schema({
  name    : { type: String, required: true },
  quantity: { type: Number, default: 1 },
}, { timestamps: true });

export default mongoose.model('${modelName}', ${modelName.toLowerCase()}Schema);
`;
      writeFile(path.join(modelsDir, `${modelName}.ts`), stub);
      log.ok(`  ✔ Created missing model: ${modelName}.ts`);
    }
  }

  // Fix 3: Remove .js extensions from relative imports
  // FIX: self-contained block — Fixes 4-10 are no longer trapped inside this if.
  if (fs.existsSync(srcDir)) {
    const fixImportsInDir = (dir) => {
      for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (fs.statSync(full).isDirectory()) {
          fixImportsInDir(full);
        } else if (entry.endsWith('.ts')) {
          let code = fs.readFileSync(full, 'utf8');
          const original = code;
          code = code.replace(/from\s+['"](\.[^'"]+)\.js['"]/g, "from '$1'");
          if (code !== original) fs.writeFileSync(full, code, 'utf8');
        }
      }
    };
    fixImportsInDir(srcDir);
    log.ok('  ✔ Fixed .js extensions in imports');
  }

  // Fix 4: Ensure server has app.listen()
  if (fs.existsSync(serverPath)) {
    let code = fs.readFileSync(serverPath, 'utf8');
    if (!code.includes('app.listen(') && !code.includes('.listen(')) {
      const hasExport = code.includes('export default app');
      if (hasExport) {
        code = code.replace(/export default app;?/,
          'app.listen(PORT, () => console.log(`Server running on port ${PORT}`));\n\nexport default app;');
      } else {
        code += '\napp.listen(PORT, () => console.log(`Server running on port ${PORT}`));\n';
      }
      fs.writeFileSync(serverPath, code, 'utf8');
      log.ok('  ✔ Added missing app.listen()');
    }
  }

  // Fix 5: Add MongoDB connection event handlers
  if (fs.existsSync(serverPath)) {
    let code = fs.readFileSync(serverPath, 'utf8');
    if (code.includes('mongoose.connect(') && !code.includes('mongoose.connection.on')) {
      const idx = code.indexOf(';', code.indexOf('mongoose.connect(')) + 1;
      const handlers = `\nmongoose.connection.on('connected', () => console.log('MongoDB connected'));\nmongoose.connection.on('error', err => console.error('MongoDB error:', err));\n`;
      code = code.slice(0, idx) + handlers + code.slice(idx);
      fs.writeFileSync(serverPath, code, 'utf8');
      log.ok('  ✔ Added MongoDB connection error handling');
    }
  }

  // Fix 6: Ensure error handler middleware file exists
  const errorHandlerPath = path.join(backendDir, 'src/middleware/errorHandler.ts');
  if (!fs.existsSync(errorHandlerPath)) {
    writeFile(errorHandlerPath, `import { Request, Response, NextFunction } from 'express';

export default function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  console.error('Error:', err.message);
  res.status(500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
`);
    log.ok('  ✔ Created missing error handler middleware');
  }

  // Fix 7: Ensure PORT is defined in server.ts
  if (fs.existsSync(serverPath)) {
    let code = fs.readFileSync(serverPath, 'utf8');
    if (code.includes('app.listen(PORT') && !code.includes('const PORT')) {
      const lastImportEnd = code.lastIndexOf('import ');
      const insertAt = code.indexOf('\n', lastImportEnd) + 1;
      code = code.slice(0, insertAt) + '\nconst PORT = process.env.PORT ?? 3000;\n' + code.slice(insertAt);
      fs.writeFileSync(serverPath, code, 'utf8');
      log.ok('  ✔ Added missing PORT variable');
    }
  }

  // Fix 8: Remove deprecated Mongoose options
  if (fs.existsSync(serverPath)) {
    let code = fs.readFileSync(serverPath, 'utf8');
    const original = code;
    code = code.replace(/mongoose\.connect\(([^,)]+),\s*\{[^}]*\}\s*\)/g, 'mongoose.connect($1)');
    if (code !== original) {
      fs.writeFileSync(serverPath, code, 'utf8');
      log.ok('  ✔ Removed deprecated Mongoose options');
    }
  }

  log.ok('Backend validation complete.');
}

// ── 15. AI: refactor frontend screens ─────────────────────────
function findFile(dir, name) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) { const f = findFile(full, name); if (f) return f; }
    else if (entry === name) return full;
  }
  return null;
}

async function refactorFrontend(client, config, dir, screens) {
  log.step(`Refactoring ${screens.length} frontend screen(s) …`);
  let ok = 0, fail = 0;

  for (const screen of screens) {
    const filePath = findFile(dir, screen);
    if (!filePath) { log.warn(`  Not found, skipping: ${screen}`); fail++; continue; }

    const original = fs.readFileSync(filePath, 'utf8');
    fs.writeFileSync(filePath + '.bak', original, 'utf8');

    const prompt = `You are a Senior React Developer.

ORIGINAL CODE:
${original}

TASK:
1. Add useState + useEffect to fetch data from "http://localhost:${config.backendPort}/api/" using axios.
2. Replace any hardcoded / mock data with real API data.

HARD RULES:
- Keep ALL original JSX, Tailwind/CSS classes, and HTML structure exactly as-is.
- Keep the original component name.
- Do NOT replace the entire screen with a generic loading spinner.
- Do NOT remove any existing import.
- Respond ONLY with the raw updated code. No markdown. No explanations.`;

    log.info(`  Refactoring ${screen} …`);
    try {
      const result = await aiCall(client, config, [{ role: 'user', content: prompt }], `refactor:${screen}`);
      writeFile(filePath, stripFences(result));
      log.ok(`  ✔ ${screen}`);
      ok++;
    } catch (err) {
      log.error(`  ✘ ${screen}: ${err.message}`);
      fs.copyFileSync(filePath + '.bak', filePath);
      log.warn(`  Restored original ${screen}.`);
      fail++;
    }
    await sleep(config.requestGap);
  }
  log.ok(`Frontend refactor complete — ${ok} succeeded, ${fail} failed.`);
}

// ── 16. Auto-Install Project Dependencies ─────────────────────
function installProjectDependencies(backendDir, frontendDir) {
  log.step('Installing dependencies (this may take a minute) …');
  try {
    if (fs.existsSync(path.join(backendDir, 'package.json'))) {
      log.info('  📦 Installing backend packages…');
      execSync('npm install', { cwd: backendDir, stdio: 'pipe' });
      log.ok('  ✔ Backend ready.');
    }
    if (fs.existsSync(path.join(frontendDir, 'package.json'))) {
      log.info('  📦 Installing frontend packages…');
      execSync('npm install', { cwd: frontendDir, stdio: 'pipe' });
      log.ok('  ✔ Frontend ready.');
    }
  } catch (err) {
    log.error(`  Auto-install failed: ${err.message}`);
    log.warn('  Run "npm install" manually in each folder.');
  }
}

// ── 17. Final instructions ────────────────────────────────────
function printInstructions(config, frontendDir) {
  const b = path.resolve(config.backendDir);
  const f = path.resolve(frontendDir);
  console.log(chalk.bold.green('\n╔══════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.green('║   ✅  Your full-stack app is 100% ready to run!      ║'));
  console.log(chalk.bold.green('╚══════════════════════════════════════════════════════╝\n'));
  console.log(chalk.bold('── Terminal 1 — Backend ───────────────────────────────'));
  console.log(chalk.cyan(`  cd ${b}`));
  console.log(chalk.cyan('  npm run dev'));
  console.log(chalk.gray(`  → http://localhost:${config.backendPort}/api/\n`));
  console.log(chalk.bold('── Terminal 2 — Frontend ──────────────────────────────'));
  console.log(chalk.cyan(`  cd ${f}`));
  console.log(chalk.cyan('  npm run dev'));
  console.log(chalk.gray('  → Opens in browser\n'));
  console.log(chalk.yellow('⚠  MongoDB must be running, or update MONGO_URI'));
  console.log(chalk.yellow(`   in ${b}/.env\n`));
  console.log(chalk.gray(`Full log → ${LOG_FILE}\n`));
}

// ── 18. Main ──────────────────────────────────────────────────
async function main() {
  console.log(chalk.bold.blueBright('\n╔══════════════════════════════════════════════╗'));
  console.log(chalk.bold.blueBright('║   BOB AI FULL-STACK GENERATOR  v3.1          ║'));
  console.log(chalk.bold.blueBright('╚══════════════════════════════════════════════╝\n'));

  const opts   = parseCLI();
  const config = loadConfig();
  const client = new OpenAI({ baseURL: config.baseURL, apiKey: config.apiKey });

  let sourceDir;
  try   { sourceDir = resolveSourceDir(opts, config); }
  catch (e) { log.error(e.message); process.exit(1); }

  const screens = discoverScreens(sourceDir);
  if (!screens.length) { log.warn('No screen files found. Exiting.'); process.exit(0); }
  log.info(`Found ${screens.length} screen(s): ${screens.join(', ')}`);

  if (!opts.frontendOnly) {
    writeBackendScaffold(config.backendDir, config);
    try { await generateBackendLogic(client, config, screens); }
    catch (e) { log.error(`Backend logic failed: ${e.message}`); }
  }

  if (!opts.backendOnly) {
    try { await refactorFrontend(client, config, sourceDir, screens); }
    catch (e) { log.error(`Frontend refactor failed: ${e.message}`); }

    ensureFrontendDependencies(sourceDir);
    setupProtectedRoutes(sourceDir);
  }

  setupEnvironmentVariables(sourceDir, config.backendDir, config);
  installProjectDependencies(config.backendDir, sourceDir);
  printInstructions(config, sourceDir);
}

process.on('unhandledRejection', r => { log.error(`Unhandled: ${r}`); process.exit(1); });
main();