const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
require('dotenv').config();

const BASE_URL = "https://openrouter.ai/api/v1";
const MODEL_NAME = "nvidia/nemotron-3-nano-30b-a3b:free";

function activate(context) {
    console.log('BOB Backend Generator is now active!');

    let disposable = vscode.commands.registerCommand('bob.generateBackend', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder is open. Please open a folder first.');
            return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "BOB Backend Generator",
            cancellable: false
        }, async (progress) => {
            try {
                // Step 1: Extract screen names
                progress.report({ increment: 10, message: "Analyzing frontend structure..." });
                const screens = extractScreenNames(workspaceRoot);
                
                if (screens.length === 0) {
                    vscode.window.showWarningMessage('No valid screens found in the workspace.');
                    return;
                }

                vscode.window.showInformationMessage(`Found ${screens.length} screens: ${screens.join(', ')}`);

                // Step 2: Generate backend
                progress.report({ increment: 40, message: "Generating backend with AI..." });
                const backendDir = path.join(workspaceRoot, 'generated-backend');
                
                if (!fs.existsSync(backendDir)) {
                    fs.mkdirSync(backendDir, { recursive: true });
                }

                await generateBackend(screens, backendDir, workspaceRoot);

                progress.report({ increment: 50, message: "Complete!" });

                const openBackend = 'Open Backend Folder';
                const result = await vscode.window.showInformationMessage(
                    '✅ Backend generated successfully!',
                    openBackend
                );

                if (result === openBackend) {
                    const backendUri = vscode.Uri.file(backendDir);
                    await vscode.commands.executeCommand('revealFileInOS', backendUri);
                }

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Failed to generate backend: ${errorMessage}`);
                console.error('Backend generation error:', error);
            }
        });
    });

    context.subscriptions.push(disposable);
}

function extractScreenNames(dir, screenNames = []) {
    if (!fs.existsSync(dir)) return [];
    
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            const ignoreFolders = ['node_modules', '.git', 'ui', 'styles', 'icons', 'figma', 'assets', 'dist', 'build', 'generated-backend'];
            if (!ignoreFolders.includes(file.toLowerCase())) {
                extractScreenNames(filePath, screenNames);
            }
        } else {
            if (/\.(js|ts|jsx|tsx)$/.test(file)) {
                const ignoreFiles = ['app.tsx', 'index.tsx', 'main.tsx', 'vite-env.d.ts', 'vite.config.ts', 'vite.config.js', 'eslint.config.js'];
                if (!file.toLowerCase().startsWith('svg-') && !ignoreFiles.includes(file.toLowerCase())) {
                    screenNames.push(file);
                }
            }
        }
    });
    return [...new Set(screenNames)];
}

async function generateBackend(screens, backendDir, workspaceRoot) {
    // Find .env file
    let envPath = path.join(workspaceRoot, '.env');
    if (!fs.existsSync(envPath)) {
        envPath = path.join(__dirname, '.env');
    }
    
    require('dotenv').config({ path: envPath });
    
    const API_KEY = process.env.OPENROUTER_API_KEY;

    if (!API_KEY) {
        throw new Error('OPENROUTER_API_KEY not found in .env file');
    }

    const client = new OpenAI({
        baseURL: BASE_URL,
        apiKey: API_KEY,
    });

    const prompt = `You are an expert Full-Stack Software Engineer.
    I have a frontend project. I extracted the key screen names:
    ${JSON.stringify(screens, null, 2)}
    
    INSTRUCTIONS:
    1. INFER THE DOMAIN based on filenames.
    2. ARCHITECT a Node.js + Express + TypeScript backend.
    3. FOLDER STRUCTURE: 'src/server.ts', 'src/routes/...', 'src/models/...'.
    4. DATABASE: Use Mongoose schemas.
    5. MIDDLEWARE: Ensure 'cors' and 'express.json()' are in server.ts.
    
    CRITICAL CONSTRAINT: 
    Respond ONLY with valid JSON matching this exact structure. No markdown formatting (like \`\`\`json), no explanations.
    
    {
      "files": [
        { "filename": "src/server.ts", "content": "..." },
        { "filename": "src/routes/productRoutes.ts", "content": "..." }
      ]
    }`;

    const response = await client.chat.completions.create({
        model: MODEL_NAME,
        messages: [{ role: "user", content: prompt }]
    });

    let aiText = response.choices[0].message.content.trim();
    
    if (aiText.startsWith("```")) {
        aiText = aiText.replace(/^```(json)?\n/, '').replace(/```$/, '').trim();
    }

    const aiData = JSON.parse(aiText);

    aiData.files.forEach(fileData => {
        const fullPath = path.join(backendDir, fileData.filename);
        const dir = path.dirname(fullPath);

        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullPath, fileData.content, 'utf8');
    });

    // Create package.json
    const packageJson = {
        name: 'generated-backend',
        version: '1.0.0',
        scripts: {
            dev: 'ts-node-dev --respawn src/server.ts',
            build: 'tsc',
            start: 'node dist/server.js'
        },
        dependencies: {
            cors: '^2.8.5',
            dotenv: '^16.3.1',
            express: '^4.18.2',
            mongoose: '^8.0.3'
        },
        devDependencies: {
            '@types/cors': '^2.8.17',
            '@types/express': '^4.17.21',
            '@types/node': '^20.11.0',
            'ts-node-dev': '^2.0.0',
            typescript: '^5.3.3'
        }
    };

    fs.writeFileSync(path.join(backendDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    
    // Create .env
    fs.writeFileSync(path.join(backendDir, '.env'), 'PORT=3000\nMONGO_URI=mongodb://localhost:27017/myapp\n');
}


function deactivate() {}

module.exports = {
    activate,
    deactivate
};

// Made with Bob
