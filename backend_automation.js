const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ==========================================
// MEMBER 3: BACKEND ARCHITECT & FILE SYSTEM HANDLER
// Windows Edition with Backend Automation
// ==========================================
// This version:
// - Uses PowerShell file dialog (Windows)
// - Includes all Member 3 backend automation tasks
// - Ready for VS Code extension integration
// ==========================================

// ==========================================
// 0. Auto-Install Dependencies
// ==========================================
const requiredPackages = ['adm-zip', 'openai', 'dotenv'];
const missingPackages = [];

requiredPackages.forEach(pkg => {
    try {
        require.resolve(pkg);
    } catch (e) {
        missingPackages.push(pkg);
    }
});

if (missingPackages.length > 0) {
    console.log(`📦 Auto-installing missing packages: ${missingPackages.join(', ')}...`);
    try {
        execSync(`npm install ${missingPackages.join(' ')} --no-save`, { stdio: 'inherit' });
        console.log("✅ Installed successfully!\n");
    } catch (error) {
        console.error("❌ Failed to install packages. Make sure npm is installed.");
        process.exit(1);
    }
}

require('dotenv').config();
const AdmZip = require('adm-zip');
const { OpenAI } = require('openai');

// ==========================================
// 1. Configuration & API Setup
// ==========================================
const API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = "https://openrouter.ai/api/v1"; 

if (!API_KEY) {
    console.error("❌ ERROR: OPENROUTER_API_KEY not found in .env file!");
    console.log("💡 Create a .env file with: OPENROUTER_API_KEY=your_key_here");
    process.exit(1);
}

const client = new OpenAI({
    baseURL: BASE_URL,
    apiKey: API_KEY,
});

const MODEL_NAME = "nvidia/nemotron-3-nano-30b-a3b:free";
const EXTRACT_PATH = './unzipped_frontend'; 
const BACKEND_OUTPUT_DIR = './generated-backend'; 

// ==========================================
// 2. Windows File Dialog
// ==========================================
function getZipFileFromWindowsDialog() {
    console.log("📍 Opening Windows File Explorer to select your ZIP file...");
    
    try {
        const psScript = `Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.Filter = 'ZIP files (*.zip)|*.zip'; $f.Title = 'Select Figma Export (ZIP)'; if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $f.FileName }`;
        const result = execSync(`powershell -NoProfile -Command "${psScript}"`, { encoding: 'utf8' });
        return result.trim(); 
    } catch (error) {
        console.error("❌ Error or window closed:", error.message);
        return ""; 
    }
}

// ==========================================
// 3. File Extraction
// ==========================================
function getOrExtractFrontend(zipPath) {
    if (!zipPath) {
        if (fs.existsSync(EXTRACT_PATH)) {
            console.log(`📂 No new ZIP selected. Using existing folder at: ${EXTRACT_PATH}`);
            return EXTRACT_PATH;
        } else {
            console.error("❌ Error: No file selected and no existing folder found!");
            return null;
        }
    }

    try {
        console.log(`📂 Selected ZIP file: ${zipPath}. Extracting...`);
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(EXTRACT_PATH, true);
        console.log("✅ Extraction complete.");
        return EXTRACT_PATH;
    } catch (e) {
        console.error("❌ Failed to unzip: " + e.message);
        return null;
    }
}

// ==========================================
// 4. Smart Screen Extractor
// ==========================================
function extractScreenNames(dir, screenNames = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            const ignoreFolders = ['node_modules', '.git', 'ui', 'styles', 'icons', 'figma', 'assets', 'public', 'dist', 'build'];
            if (!ignoreFolders.includes(file.toLowerCase())) {
                extractScreenNames(filePath, screenNames);
            }
        } else {
            if (/\.(js|ts|jsx|tsx)$/.test(file)) {
                const ignoreFiles = [
                    'app.tsx', 'app.jsx', 'app.js', 'app.ts',
                    'index.tsx', 'index.jsx', 'index.js', 'index.ts',
                    'main.tsx', 'main.jsx', 'main.js', 'main.ts',
                    'vite.config.ts', 'vite.config.js',
                    'vite-env.d.ts',
                    'tailwind.config.js', 'tailwind.config.ts',
                    'postcss.config.js'
                ];
                
                if (!file.toLowerCase().startsWith('svg-') && 
                    !ignoreFiles.includes(file.toLowerCase())) {
                    screenNames.push(file);
                }
            }
        }
    });
    return [...new Set(screenNames)];
}

// ==========================================
// 5. Helper Functions
// ==========================================
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// 6. AI: Generate Backend
// ==========================================
async function generateBackend(screens) {
    console.log(`\n🧠 Analyzed frontend. Found ${screens.length} core screens.`);
    console.log(`⚙️ Requesting AI (${MODEL_NAME}) to build Backend architecture...`);

    const prompt = `You are an expert Full-Stack Software Engineer specializing in Node.js, Express, TypeScript, and MongoDB.

I have a frontend project exported from Figma. I extracted the key screen names:
${JSON.stringify(screens, null, 2)}

YOUR TASK:
1. INFER THE BUSINESS DOMAIN based on the screen filenames.
2. ARCHITECT a complete, production-ready Node.js + Express + TypeScript backend.
3. GENERATE the following files with COMPLETE, WORKING CODE:

REQUIRED FILE STRUCTURE:
{
  "files": [
    {
      "filename": "src/server.ts",
      "content": "// Complete Express server with CORS, JSON middleware, MongoDB connection, and all routes mounted"
    },
    {
      "filename": ".env.example",
      "content": "// Environment variables template with PORT, MONGODB_URI, etc."
    },
    {
      "filename": "src/models/[ModelName].ts",
      "content": "// Mongoose schema for each inferred entity"
    },
    {
      "filename": "src/routes/[routeName].ts",
      "content": "// Express router with CRUD operations (GET, POST, PUT, DELETE)"
    },
    {
      "filename": "package.json",
      "content": "// Complete package.json with all dependencies: express, mongoose, cors, dotenv, typescript, @types/node, @types/express, @types/cors, ts-node"
    },
    {
      "filename": "tsconfig.json",
      "content": "// TypeScript configuration for Node.js"
    }
  ]
}

CRITICAL REQUIREMENTS:
✅ Use TypeScript for all .ts files
✅ Include proper error handling in all routes
✅ Add input validation
✅ Use async/await for database operations
✅ Include CORS configuration in server.ts
✅ Add express.json() middleware
✅ Create a .env.example file with all required environment variables
✅ Generate realistic sample data endpoints
✅ Use proper HTTP status codes (200, 201, 400, 404, 500)

RESPONSE FORMAT:
Respond ONLY with valid JSON. No markdown formatting, no explanations.`;

    try {
        const response = await client.chat.completions.create({
            model: MODEL_NAME,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        });

        let aiText = response.choices[0]?.message?.content;
        
        if (!aiText || aiText.trim().length === 0) {
            throw new Error("AI returned empty response.");
        }

        if (aiText.startsWith("```")) {
            aiText = aiText.replace(/^```(json)?\n?/i, '').replace(/```\s*$/i, '').trim();
        }

        const aiData = JSON.parse(aiText);

        if (!aiData.files || !Array.isArray(aiData.files)) {
            throw new Error("Invalid response structure: missing 'files' array");
        }

        if (!fs.existsSync(BACKEND_OUTPUT_DIR)) {
            fs.mkdirSync(BACKEND_OUTPUT_DIR, { recursive: true });
        }

        aiData.files.forEach(fileData => {
            const fullPath = path.join(BACKEND_OUTPUT_DIR, fileData.filename);
            const dir = path.dirname(fullPath);

            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(fullPath, fileData.content, 'utf8');
            console.log(`  📄 Created: ${fileData.filename}`);
        });

        console.log(`\n✅ Backend generated successfully in: ${BACKEND_OUTPUT_DIR}`);
        return true;

    } catch (error) {
        console.error("❌ Error during backend generation:", error.message);
        return false;
    }
}

// ==========================================
// 7. MEMBER 3: Fix TypeScript Errors in Generated Code
// ==========================================
// Automatically fixes common TypeScript errors in AI-generated code
function fixTypeScriptErrors() {
    console.log("\n🔧 Fixing TypeScript errors in generated code...");
    
    const serverPath = path.join(BACKEND_OUTPUT_DIR, 'src', 'server.ts');
    
    if (!fs.existsSync(serverPath)) {
        console.log("⚠️  server.ts not found, skipping TypeScript fixes");
        return;
    }
    
    try {
        let content = fs.readFileSync(serverPath, 'utf8');
        
        // Fix 1: Add proper imports for Express types
        if (content.includes("import express from 'express'") &&
            !content.includes("Request, Response, NextFunction")) {
            content = content.replace(
                "import express from 'express';",
                "import express, { Request, Response, NextFunction } from 'express';"
            );
        }
        
        // Fix 2: Add types to error handler middleware
        if (content.includes("app.use((err, req, res, next)")) {
            content = content.replace(
                /app\.use\(\(err,\s*req,\s*res,\s*next\)\s*=>/g,
                "app.use((err: Error, req: Request, res: Response, next: NextFunction) =>"
            );
        }
        
        fs.writeFileSync(serverPath, content, 'utf8');
        console.log("✅ TypeScript errors fixed in server.ts");
    } catch (error) {
        console.warn("⚠️  Could not fix TypeScript errors:", error.message);
    }
}

// ==========================================
// 8. MEMBER 3: Automated Backend Setup
// ==========================================
// This is Member 3's core contribution:
// Automatically sets up the backend environment after AI generation
function setupBackendEnvironment() {
    console.log("\n🔧 MEMBER 3: Setting up backend environment...");
    
    const backendPath = path.resolve(BACKEND_OUTPUT_DIR);
    
    if (!fs.existsSync(backendPath)) {
        console.error("❌ Backend directory not found. Generate backend first.");
        return false;
    }

    try {
        // Check if package.json already exists (AI might have generated it)
        const packageJsonPath = path.join(backendPath, 'package.json');
        
        if (!fs.existsSync(packageJsonPath)) {
            console.log("📦 Running npm init -y...");
            execSync('npm init -y', { 
                cwd: backendPath, 
                stdio: 'inherit' 
            });
            console.log("✅ package.json created");
        } else {
            console.log("✅ package.json already exists (AI-generated)");
        }

        // Install backend dependencies
        console.log("\n📦 Installing backend dependencies...");
        console.log("   This may take a minute...");
        
        const dependencies = [
            'express',
            'mongoose',
            'cors',
            'dotenv',
            'express-validator',
            'typescript',
            '@types/node',
            '@types/express',
            '@types/cors',
            'ts-node',
            'nodemon'
        ];

        console.log(`   Installing: ${dependencies.join(', ')}`);
        
        execSync(`npm install ${dependencies.join(' ')}`, {
            cwd: backendPath,
            stdio: 'inherit'
        });

        console.log("\n✅ All backend dependencies installed successfully!");

        // Create .env file from .env.example if it doesn't exist
        const envExamplePath = path.join(backendPath, '.env.example');
        const envPath = path.join(backendPath, '.env');
        
        if (fs.existsSync(envExamplePath) && !fs.existsSync(envPath)) {
            console.log("\n📝 Creating .env file from template...");
            fs.copyFileSync(envExamplePath, envPath);
            console.log("✅ .env file created. Remember to configure your MongoDB URI!");
        }

        // Add dev script to package.json if not present
        console.log("\n📝 Configuring npm scripts...");
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        if (!packageJson.scripts) {
            packageJson.scripts = {};
        }
        
        if (!packageJson.scripts.dev) {
            packageJson.scripts.dev = "nodemon --exec ts-node src/server.ts";
            packageJson.scripts.build = "tsc";
            packageJson.scripts.start = "node dist/server.js";
            
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
            console.log("✅ Added dev, build, and start scripts");
        }

        // MEMBER 3: Fix TypeScript errors in generated code
        fixTypeScriptErrors();

        return true;

    } catch (error) {
        console.error("❌ Error during backend setup:", error.message);
        return false;
    }
}

// ==========================================
// 9. MEMBER 3: Display Setup Instructions
// ==========================================
function displayBackendInstructions() {
    console.log("\n" + "=".repeat(60));
    console.log("🎉 BACKEND IS READY TO USE!");
    console.log("=".repeat(60));
    console.log("\n📋 Next Steps:");
    console.log("\n1️⃣  Configure your database:");
    console.log(`   cd ${BACKEND_OUTPUT_DIR}`);
    console.log("   notepad .env  (or use your favorite editor)");
    console.log("   Set MONGODB_URI to your MongoDB connection string");
    console.log("\n2️⃣  Start the backend server:");
    console.log("   npm run dev");
    console.log("\n3️⃣  The API will be available at:");
    console.log("   http://localhost:3000/api/");
    console.log("\n💡 Tips:");
    console.log("   • Use MongoDB Atlas for free cloud database");
    console.log("   • Or install MongoDB locally");
    console.log("   • Test endpoints with Postman or curl");
    console.log("\n" + "=".repeat(60));
}

// ==========================================
// 10. AI: Refactor Frontend
// ==========================================
async function refactorFrontend(dir, screens) {
    console.log("\n✨ Refactoring Frontend: Removing mock data and linking to API...");

    function findFilePath(directory, fileName) {
        const files = fs.readdirSync(directory);
        for (const file of files) {
            const fullPath = path.join(directory, file);
            if (fs.statSync(fullPath).isDirectory()) {
                const found = findFilePath(fullPath, fileName);
                if (found) return found;
            } else if (file === fileName) {
                return fullPath;
            }
        }
        return null;
    }

    for (const screen of screens) {
        const filePath = findFilePath(dir, screen);
        
        if (filePath) {
            console.log(`  🔄 Refactoring ${screen}...`);
            const oldContent = fs.readFileSync(filePath, 'utf8');

            const prompt = `You are a Senior React Developer.

ORIGINAL CODE:
${oldContent}

TASK:
1. REMOVE MOCK DATA.
2. INTEGRATE API using 'useEffect' and 'axios' to 'http://localhost:3000/api/'.
3. UPDATE STATE with API data.
4. ADD loading/error states.

HARD RULES:
🚫 DO NOT delete or modify ANY existing JSX/HTML structure
🚫 DO NOT remove or change ANY Tailwind CSS classes
🚫 DO NOT alter the component's visual layout

RESPONSE FORMAT:
Return ONLY the complete refactored code. No markdown formatting, no explanations.`;

            try {
                const response = await client.chat.completions.create({
                    model: MODEL_NAME,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.3,
                });

                const aiContent = response.choices[0]?.message?.content;
                
                if (!aiContent || aiContent.trim().length === 0) {
                    throw new Error("AI returned empty response.");
                }

                let newContent = aiContent.trim();
                
                if (newContent.startsWith("```")) {
                    newContent = newContent.replace(/^```(tsx|ts|js|jsx)?\n?/i, '')
                                           .replace(/```\s*$/i, '')
                                           .trim();
                }

                fs.writeFileSync(filePath, newContent, 'utf8');
                console.log(`  ✅ Successfully linked ${screen} to API.`);
                
                await sleep(2000);

            } catch (error) {
                console.error(`  ❌ Failed to refactor ${screen}:`, error.message);
                await sleep(3000);
            }
        }
    }
    
    console.log("\n🎉 Full-Stack integration complete!");
}

// ==========================================
// 11. Main Execution Flow
// ==========================================
async function main() {
    console.log("=====================================================");
    console.log("🤖 BOB AI FULL-STACK GENERATOR");
    console.log("   MEMBER 3: BACKEND AUTOMATION (WINDOWS EDITION)");
    console.log("=====================================================");
    console.log("✨ Features:");
    console.log("   • Windows PowerShell file dialog");
    console.log("   • AI-powered backend generation");
    console.log("   • Automated backend environment setup");
    console.log("   • Auto npm init & dependency installation");
    console.log("   • Auto TypeScript error fixing");
    console.log("   • Plug-and-play backend ready to run");
    console.log("=====================================================\n");

    // Step 1: Get ZIP file (Windows dialog)
    const zipPath = getZipFileFromWindowsDialog();

    // Step 2: Extract ZIP or use existing folder
    const targetDir = getOrExtractFrontend(zipPath);
    
    // Step 3: Execute AI generation pipeline
    if (targetDir) {
        const screens = extractScreenNames(targetDir);
        
        if (screens.length === 0) {
            console.warn("⚠️ Warning: No valid screens found.");
        } else {
            console.log(`\n📊 Found ${screens.length} screens to process:`);
            screens.forEach((screen, idx) => console.log(`   ${idx + 1}. ${screen}`));
            
            // Generate backend
            const backendGenerated = await generateBackend(screens);
            
            if (backendGenerated) {
                // MEMBER 3: Automated backend setup
                const setupSuccess = setupBackendEnvironment();
                
                if (setupSuccess) {
                    // Refactor frontend
                    await refactorFrontend(targetDir, screens);
                    
                    // Display instructions
                    displayBackendInstructions();
                }
            }
        }
    } else {
        console.error("❌ Cannot proceed without a valid frontend directory.");
    }
}

// Execute the main function
main().catch(error => {
    console.error("\n❌ FATAL ERROR:", error.message);
    console.log("\n💡 Troubleshooting:");
    console.log("   1. Check your .env file has OPENROUTER_API_KEY");
    console.log("   2. Verify npm is installed: npm --version");
    console.log("   3. Check your internet connection");
    console.log("   4. Try running the script again");
    process.exit(1);
});

// ==========================================
// MEMBER 3 IMPLEMENTATION NOTES
// ==========================================
// This Windows edition includes all Member 3 tasks:
//
// ✅ Automated navigation to generated-backend folder
// ✅ Automated npm init -y execution
// ✅ Automated installation of backend dependencies:
//    - express, mongoose, cors, dotenv
//    - typescript, @types/node, @types/express, @types/cors
//    - ts-node, nodemon
// ✅ Plug-and-play backend preparation
// ✅ Automatic .env file creation
// ✅ npm scripts configuration (dev, build, start)
//
// Ready for VS Code extension integration!
// ==========================================

// Made with Bob
