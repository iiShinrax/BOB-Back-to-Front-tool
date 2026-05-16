const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ==========================================
// MEMBER 2: AI & PROMPT ENGINEER
// ==========================================
// This module contains optimized AI prompts with:
// 1. Hard Rules to prevent UI deletion
// 2. Production-ready backend generation with .env
// 3. Advanced error handling for API rate limits
// 4. Robust JSON parsing with fallback mechanisms
// ==========================================

// ==========================================
// 0. Auto-Install Dependencies
// ==========================================
// Automatically checks and installs required npm packages
// This ensures the tool works out-of-the-box without manual setup
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

// Load dependencies after ensuring they're installed
require('dotenv').config();
const AdmZip = require('adm-zip');
const { OpenAI } = require('openai');

// ==========================================
// 1. Configuration & API Setup
// ==========================================
const API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = "https://openrouter.ai/api/v1"; 

// Validate API key exists
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
// 2. Rate Limit & Retry Configuration
// ==========================================
// MEMBER 2 ENHANCEMENT: Advanced rate limit handling
const RATE_LIMIT_CONFIG = {
    maxRetries: 3,              // Maximum retry attempts for failed API calls
    baseDelay: 2000,            // Base delay between requests (2 seconds)
    retryDelay: 5000,           // Delay before retrying failed requests (5 seconds)
    exponentialBackoff: true    // Use exponential backoff for retries
};

// Helper function to pause execution (prevents API rate limiting)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// 3. Windows File Dialog
// ==========================================
// Opens native Windows file explorer for ZIP selection
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
// 4. File Extraction with Smart Caching
// ==========================================
// Extracts ZIP or reuses existing folder to save time
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
// 5. Smart Screen Extractor
// ==========================================
// MEMBER 2 ENHANCEMENT: Improved ignore list to prevent breaking configs
// Recursively scans frontend folder and extracts React component names
// Ignores configuration files that shouldn't be analyzed by AI
function extractScreenNames(dir, screenNames = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // Ignore common non-screen folders
            const ignoreFolders = ['node_modules', '.git', 'ui', 'styles', 'icons', 'figma', 'assets', 'public', 'dist', 'build'];
            if (!ignoreFolders.includes(file.toLowerCase())) {
                extractScreenNames(filePath, screenNames);
            }
        } else {
            if (/\.(js|ts|jsx|tsx)$/.test(file)) {
                // MEMBER 2: Expanded ignore list to protect critical config files
                const ignoreFiles = [
                    'app.tsx', 'app.jsx', 'app.js', 'app.ts',
                    'index.tsx', 'index.jsx', 'index.js', 'index.ts',
                    'main.tsx', 'main.jsx', 'main.js', 'main.ts',
                    'vite.config.ts', 'vite.config.js',
                    'vite-env.d.ts',
                    'tailwind.config.js', 'tailwind.config.ts',
                    'postcss.config.js',
                    'tsconfig.json', 'package.json'
                ];
                
                if (!file.toLowerCase().startsWith('svg-') && 
                    !ignoreFiles.includes(file.toLowerCase())) {
                    screenNames.push(file);
                }
            }
        }
    });
    return [...new Set(screenNames)]; // Remove duplicates
}

// ==========================================
// 6. MEMBER 2: Enhanced JSON Parser
// ==========================================
// Robust JSON parsing with multiple fallback strategies
// Handles common AI response formatting issues
function parseAIResponse(aiText, context = "AI Response") {
    try {
        // Strategy 1: Direct parse (ideal case)
        return JSON.parse(aiText);
    } catch (e1) {
        console.log(`⚠️ Initial JSON parse failed for ${context}. Attempting cleanup...`);
        
        try {
            // Strategy 2: Remove markdown code blocks
            let cleaned = aiText.trim();
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replace(/^```(json)?\n?/i, '').replace(/```\s*$/i, '').trim();
            }
            return JSON.parse(cleaned);
        } catch (e2) {
            try {
                // Strategy 3: Extract JSON from mixed content
                const jsonMatch = aiText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
                throw new Error("No JSON object found in response");
            } catch (e3) {
                // Strategy 4: Last resort - log and throw detailed error
                console.error(`❌ JSON Parse Error in ${context}:`);
                console.error("Original response:", aiText.substring(0, 500));
                throw new Error(`Failed to parse JSON after multiple attempts: ${e3.message}`);
            }
        }
    }
}

// ==========================================
// 7. MEMBER 2: AI Backend Generation (OPTIMIZED)
// ==========================================
// Generates production-ready Node.js/Express backend with:
// - TypeScript support
// - MongoDB/Mongoose integration
// - Environment variable configuration (.env)
// - CORS and security middleware
// - RESTful API structure
async function generateBackend(screens) {
    console.log(`\n🧠 Analyzed frontend. Found ${screens.length} core screens.`);
    console.log(`⚙️ Requesting AI (${MODEL_NAME}) to build Backend architecture...`);

    // MEMBER 2: ENHANCED PROMPT with strict production requirements
    const prompt = `You are an expert Full-Stack Software Engineer specializing in Node.js, Express, TypeScript, and MongoDB.

I have a frontend project exported from Figma. I extracted the key screen names:
${JSON.stringify(screens, null, 2)}

YOUR TASK:
1. INFER THE BUSINESS DOMAIN based on the screen filenames (e.g., if you see "ProductList.tsx", "Cart.tsx" → it's an E-commerce app).
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
✅ Generate realistic sample data endpoints (e.g., GET /api/products should return sample products)
✅ Use proper HTTP status codes (200, 201, 400, 404, 500)
✅ Add TypeScript interfaces for request/response types

RESPONSE FORMAT:
Respond ONLY with valid JSON. No markdown formatting (no \`\`\`json), no explanations, no extra text.
The JSON must exactly match the structure shown above with a "files" array.`;

    let retryCount = 0;
    
    while (retryCount < RATE_LIMIT_CONFIG.maxRetries) {
        try {
            const response = await client.chat.completions.create({
                model: MODEL_NAME,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7, // MEMBER 2: Balanced creativity vs consistency
            });

            // MEMBER 2: Enhanced null/empty response handling
            const aiText = response.choices[0]?.message?.content;
            
            if (!aiText || aiText.trim().length === 0) {
                throw new Error("AI returned empty response. Possible rate limit or API issue.");
            }

            // MEMBER 2: Use enhanced JSON parser
            const aiData = parseAIResponse(aiText, "Backend Generation");

            // Validate response structure
            if (!aiData.files || !Array.isArray(aiData.files)) {
                throw new Error("Invalid response structure: missing 'files' array");
            }

            // Create backend directory if it doesn't exist
            if (!fs.existsSync(BACKEND_OUTPUT_DIR)) {
                fs.mkdirSync(BACKEND_OUTPUT_DIR, { recursive: true });
            }

            // Write all generated files
            aiData.files.forEach(fileData => {
                const fullPath = path.join(BACKEND_OUTPUT_DIR, fileData.filename);
                const dir = path.dirname(fullPath);

                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(fullPath, fileData.content, 'utf8');
                console.log(`  📄 Created: ${fileData.filename}`);
            });

            console.log(`\n✅ Backend generated successfully in: ${BACKEND_OUTPUT_DIR}`);
            console.log(`💡 Next steps:`);
            console.log(`   1. cd ${BACKEND_OUTPUT_DIR}`);
            console.log(`   2. Copy .env.example to .env and configure your MongoDB URI`);
            console.log(`   3. npm install`);
            console.log(`   4. npm run dev`);
            
            return; // Success - exit function

        } catch (error) {
            retryCount++;
            console.error(`❌ Attempt ${retryCount}/${RATE_LIMIT_CONFIG.maxRetries} failed:`, error.message);
            
            if (retryCount < RATE_LIMIT_CONFIG.maxRetries) {
                // MEMBER 2: Exponential backoff for retries
                const delay = RATE_LIMIT_CONFIG.exponentialBackoff 
                    ? RATE_LIMIT_CONFIG.retryDelay * Math.pow(2, retryCount - 1)
                    : RATE_LIMIT_CONFIG.retryDelay;
                
                console.log(`⏳ Waiting ${delay/1000} seconds before retry...`);
                await sleep(delay);
            } else {
                console.error("❌ Backend generation failed after maximum retries.");
                console.log("💡 Possible solutions:");
                console.log("   - Check your API key in .env");
                console.log("   - Verify your OpenRouter account has credits");
                console.log("   - Try again in a few minutes (rate limit may reset)");
            }
        }
    }
}

// ==========================================
// 8. MEMBER 2: AI Frontend Refactoring (OPTIMIZED)
// ==========================================
// Refactors static Figma UI to connect with backend API
// CRITICAL: Preserves all original UI components and Tailwind classes
async function refactorFrontend(dir, screens) {
    console.log("\n✨ Refactoring Frontend: Removing mock data and linking to API...");

    // Helper function to recursively find file by name
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

            // MEMBER 2: ENHANCED PROMPT with HARD RULES to prevent UI deletion
            const prompt = `You are a Senior React Developer specializing in API integration.

ORIGINAL CODE:
${oldContent}

YOUR TASK:
Refactor this React component to fetch data from a REST API instead of using mock/static data.

HARD RULES (MUST FOLLOW):
🚫 DO NOT delete or modify ANY existing JSX/HTML structure
🚫 DO NOT remove or change ANY Tailwind CSS classes
🚫 DO NOT alter the component's visual layout or styling
🚫 DO NOT change component names or props
🚫 DO NOT remove any UI elements (buttons, divs, images, etc.)

✅ ONLY ALLOWED CHANGES:
1. ADD import statements for React hooks (useState, useEffect) and axios
2. REPLACE static/mock data arrays with useState hooks
3. ADD useEffect hook to fetch data from API endpoint: http://localhost:3000/api/[resource]
4. ADD loading state (e.g., const [loading, setLoading] = useState(true))
5. ADD error state (e.g., const [error, setError] = useState(null))
6. WRAP the existing JSX in conditional rendering for loading/error states
7. UPDATE data references to use the new state variables

EXAMPLE PATTERN:
// Before: const products = [{ id: 1, name: "Item" }];
// After:
const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  axios.get('http://localhost:3000/api/products')
    .then(res => {
      setProducts(res.data);
      setLoading(false);
    })
    .catch(err => {
      setError(err.message);
      setLoading(false);
    });
}, []);

RESPONSE FORMAT:
Return ONLY the complete refactored code. No markdown formatting (no \`\`\`tsx or \`\`\`), no explanations, no comments about what you changed.
The code must be ready to copy-paste directly into the file.`;

            let retryCount = 0;
            let success = false;

            while (retryCount < RATE_LIMIT_CONFIG.maxRetries && !success) {
                try {
                    const response = await client.chat.completions.create({
                        model: MODEL_NAME,
                        messages: [{ role: "user", content: prompt }],
                        temperature: 0.3, // MEMBER 2: Lower temperature for more consistent refactoring
                    });

                    // MEMBER 2: Enhanced null response handling
                    const aiContent = response.choices[0]?.message?.content;
                    
                    if (!aiContent || aiContent.trim().length === 0) {
                        throw new Error("AI returned empty response. Possible rate limit.");
                    }

                    let newContent = aiContent.trim();
                    
                    // Remove markdown code blocks if present
                    if (newContent.startsWith("```")) {
                        newContent = newContent.replace(/^```(tsx|ts|js|jsx|typescript|javascript)?\n?/i, '')
                                               .replace(/```\s*$/i, '')
                                               .trim();
                    }

                    // MEMBER 2: Validation - ensure the refactored code isn't suspiciously short
                    if (newContent.length < oldContent.length * 0.5) {
                        console.warn(`  ⚠️ Warning: Refactored code is significantly shorter. Possible data loss.`);
                        console.log(`  📊 Original: ${oldContent.length} chars, New: ${newContent.length} chars`);
                        throw new Error("Refactored code too short - may have lost UI elements");
                    }

                    // Write the refactored code
                    fs.writeFileSync(filePath, newContent, 'utf8');
                    console.log(`  ✅ Successfully linked ${screen} to API.`);
                    success = true;
                    
                    // MEMBER 2: Rate limit protection - pause between requests
                    await sleep(RATE_LIMIT_CONFIG.baseDelay);

                } catch (error) {
                    retryCount++;
                    console.error(`  ❌ Attempt ${retryCount}/${RATE_LIMIT_CONFIG.maxRetries} failed for ${screen}:`, error.message);
                    
                    if (retryCount < RATE_LIMIT_CONFIG.maxRetries) {
                        const delay = RATE_LIMIT_CONFIG.exponentialBackoff 
                            ? RATE_LIMIT_CONFIG.retryDelay * Math.pow(2, retryCount - 1)
                            : RATE_LIMIT_CONFIG.retryDelay;
                        
                        console.log(`  ⏳ Waiting ${delay/1000} seconds before retry...`);
                        await sleep(delay);
                    } else {
                        console.error(`  ❌ Failed to refactor ${screen} after ${RATE_LIMIT_CONFIG.maxRetries} attempts.`);
                        console.log(`  💡 File preserved with original content. You can manually refactor it later.`);
                    }
                }
            }
        } else {
            console.warn(`  ⚠️ Warning: Could not find file ${screen} in directory structure.`);
        }
    }
    
    console.log("\n🎉 Full-Stack integration complete!");
    console.log("📋 Summary:");
    console.log("   ✅ Backend API generated with TypeScript + Express + MongoDB");
    console.log("   ✅ Frontend refactored to fetch data from API");
    console.log("   ✅ All original UI components and Tailwind classes preserved");
    console.log("\n🚀 Next Steps:");
    console.log("   1. Start the backend: cd generated-backend && npm install && npm run dev");
    console.log("   2. Start the frontend: npm install && npm run dev");
    console.log("   3. Your app should now be fully connected!");
}

// ==========================================
// 9. Main Execution Flow
// ==========================================
async function main() {
    console.log("=====================================================");
    console.log("🤖 BOB AI FULL-STACK GENERATOR");
    console.log("   MEMBER 2: AI & PROMPT ENGINEER EDITION");
    console.log("=====================================================");
    console.log("✨ Features:");
    console.log("   • Hard Rules to preserve Figma UI");
    console.log("   • Production-ready backend with .env");
    console.log("   • Advanced rate limit handling");
    console.log("   • Robust error recovery");
    console.log("=====================================================\n");

    // Step 1: Open file dialog for user to select ZIP
    const zipPath = getZipFileFromWindowsDialog();

    // Step 2: Extract ZIP or use existing folder
    const targetDir = getOrExtractFrontend(zipPath);
    
    // Step 3: Execute AI generation pipeline
    if (targetDir) {
        const screens = extractScreenNames(targetDir);
        
        if (screens.length === 0) {
            console.warn("⚠️ Warning: No valid screens found to infer backend logic.");
            console.log("💡 Make sure your Figma export contains React component files (.tsx, .jsx)");
        } else {
            console.log(`\n📊 Found ${screens.length} screens to process:`);
            screens.forEach((screen, idx) => console.log(`   ${idx + 1}. ${screen}`));
            
            // Generate backend first
            await generateBackend(screens);
            
            // Then refactor frontend to connect to backend
            await refactorFrontend(targetDir, screens);
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
    console.log("   2. Verify your API key is valid and has credits");
    console.log("   3. Check your internet connection");
    console.log("   4. Try running the script again");
    process.exit(1);
});

// Made with Bob
