import * as fs from 'fs';
import * as path from 'path';
import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';
import * as vscode from 'vscode';

const BASE_URL = "https://openrouter.ai/api/v1";
const MODEL_NAME = "nvidia/nemotron-3-nano-30b-a3b:free";

export async function generateBackend(screens: string[], outputDir: string, progress: vscode.Progress<{ message?: string; increment?: number }>): Promise<void> {
    const workspaceRoot = path.dirname(outputDir);
    
    // ذكاء برمجي: تحديد مسار الـ .env بدقة سواء في مشروع المستخدم أو في مجلد الإضافة
    let envPath = path.join(workspaceRoot, '.env');
    if (!fs.existsSync(envPath)) {
        envPath = path.join(__dirname, '..', '.env');
    }
    dotenv.config({ path: envPath });
    
    const API_KEY = process.env.OPENROUTER_API_KEY;

    if (!API_KEY) {
        throw new Error('OPENROUTER_API_KEY not found. Please put your .env file in the project folder.');
    }

    progress.report({ message: "Writing backend scaffold..." });
    writeBackendScaffold(outputDir);

    progress.report({ message: `Generating logic for ${screens.length} screens...` });
    const client = new OpenAI({ baseURL: BASE_URL, apiKey: API_KEY });

    const prompt = `You are an expert Node.js + TypeScript + Express engineer.
A React frontend has these screen filenames: ${JSON.stringify(screens, null, 2)}
TASK: Generate the TypeScript source files for the backend.
CRITICAL RULES:
1. Generate src/server.ts, src/routes/*.ts, src/models/*.ts, src/middleware/errorHandler.ts
2. server.ts MUST start with: import 'dotenv/config';
3. Mount routes under /api/*
RESPOND ONLY with valid JSON containing a "files" array.`;

    try {
        const res = await client.chat.completions.create({ model: MODEL_NAME, messages: [{ role: 'user', content: prompt }] });
        let aiText = res.choices[0]?.message?.content?.trim() || "";

        if (aiText.startsWith("```")) {
            aiText = aiText.replace(/^```(json)?\n/, '').replace(/```$/, '').trim();
        }

        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) { aiText = jsonMatch[0]; }

        let data;
        try { data = JSON.parse(aiText); } catch { throw new Error('AI returned invalid JSON.'); }

        for (const { filename, content } of data.files) {
            if (typeof filename !== 'string' || typeof content !== 'string') continue;
            const fullPath = path.join(outputDir, filename);
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(fullPath, content, 'utf8');
        }

        progress.report({ message: "Auto-fixing backend code..." });
        validateAndFixBackend(outputDir);
    } catch (error: any) {
        throw new Error(`AI Generation failed: ${error.message}`);
    }
}

function writeBackendScaffold(backendDir: string) {
    if (!fs.existsSync(backendDir)) fs.mkdirSync(backendDir, { recursive: true });
    const pkg = {
        name: 'generated-backend', version: '1.0.0',
        scripts: { dev: 'ts-node-dev --respawn --transpile-only src/server.ts', build: 'tsc', start: 'node dist/server.js' },
        dependencies: { cors: '^2.8.5', dotenv: '^16.3.1', express: '^4.18.2', mongoose: '^8.0.3' },
        devDependencies: { '@types/cors': '^2.8.17', '@types/express': '^4.17.21', '@types/node': '^20.11.0', 'ts-node-dev': '^2.0.0', typescript: '^5.3.3' }
    };
    const tsconfig = {
        compilerOptions: { target: "ES2020", module: "Node16", outDir: "./dist", lib: ["ES2020"], strict: true, esModuleInterop: true, moduleResolution: "Node16" }
    };
    fs.writeFileSync(path.join(backendDir, 'package.json'), JSON.stringify(pkg, null, 2));
    fs.writeFileSync(path.join(backendDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
    fs.writeFileSync(path.join(backendDir, '.env'), `PORT=3000\nMONGO_URI=mongodb://localhost:27017/myapp\nNODE_ENV=development\nFRONTEND_URL=http://localhost:5173\n`);
    fs.writeFileSync(path.join(backendDir, '.gitignore'), 'node_modules/\ndist/\n.env\n');
}

function validateAndFixBackend(backendDir: string) {
    const serverPath = path.join(backendDir, 'src/server.ts');
    if (fs.existsSync(serverPath)) {
        let code = fs.readFileSync(serverPath, 'utf8');
        if (!code.includes('app.listen(')) {
            code += '\napp.listen(process.env.PORT || 3000, () => console.log(`Server running on port ${process.env.PORT || 3000}`));\n';
            fs.writeFileSync(serverPath, code, 'utf8');
        }
    }
}