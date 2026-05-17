import * as fs from 'fs';
import * as path from 'path';
import { OpenAI } from 'openai';
import * as vscode from 'vscode';
import * as dotenv from 'dotenv';

const MODEL_NAME = "nvidia/nemotron-3-nano-30b-a3b:free";
const BASE_URL = "[https://openrouter.ai/api/v1](https://openrouter.ai/api/v1)";
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function stripFences(t: string) { return t.replace(/^```[\w]*\n?/m, '').replace(/```\s*$/m, '').trim(); }

function findFile(dir: string, name: string): string | null {
    if (!fs.existsSync(dir)) return null;
    for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (fs.statSync(full).isDirectory() && !['node_modules', '.git', 'generated-backend'].includes(entry)) {
            const f = findFile(full, name); if (f) return f;
        } else if (entry === name) return full;
    }
    return null;
}

export async function refactorFrontend(workspaceRoot: string, screens: string[], progress: vscode.Progress<{ message?: string; increment?: number }>): Promise<void> {
    // قراءة الـ API KEY بذكاء
    let envPath = path.join(workspaceRoot, '.env');
    if (!fs.existsSync(envPath)) {
        envPath = path.join(__dirname, '..', '.env');
    }
    dotenv.config({ path: envPath });
    
    const API_KEY = process.env.OPENROUTER_API_KEY;

    if (!API_KEY) {
        throw new Error('OPENROUTER_API_KEY not found. Please put your .env file in the project folder.');
    }

    const client = new OpenAI({ baseURL: BASE_URL, apiKey: API_KEY });
    
    progress.report({ message: "Setting up frontend environment variables..." });
    setupEnvironmentVariables(workspaceRoot);

    for (const screen of screens) {
        progress.report({ message: `Refactoring ${screen}...` });
        const filePath = findFile(workspaceRoot, screen);
        if (!filePath) continue;

        const original = fs.readFileSync(filePath, 'utf8');
        const prompt = `You are a Senior React Developer. ORIGINAL CODE: \n${original}\nTASK: Add useState + useEffect to fetch data from "http://localhost:3000/api/" using axios. Replace mock data. HARD RULES: Keep ALL original JSX and Tailwind exactly as-is. Respond ONLY with raw code.`;

        try {
            const res = await client.chat.completions.create({ model: MODEL_NAME, messages: [{ role: 'user', content: prompt }] });
            const result = res.choices[0]?.message?.content?.trim() || "";
            fs.writeFileSync(filePath, stripFences(result), 'utf8');
        } catch (err) {
            console.error(`Failed to refactor ${screen}:`, err);
        }
        await sleep(2000);
    }
}

function setupEnvironmentVariables(frontendDir: string) {
    fs.writeFileSync(path.join(frontendDir, '.env'), 'VITE_API_URL=http://localhost:3000\n');
}