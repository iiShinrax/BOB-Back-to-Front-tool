const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process'); // هذي بتفيدنا في التحميل التلقائي ونافذة الويندوز

// ==========================================
// 0. Auto-Install Dependencies (التحميل التلقائي للمكتبات)
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

// الآن نستدعي المكتبات بعد ما تأكدنا من وجودها
require('dotenv').config();
const AdmZip = require('adm-zip');
const { OpenAI } = require('openai');

// ==========================================
// 1. Basic Configuration
// ==========================================
// حط مفتاح الـ API حقك هنا (اللي يبدأ بـ sk-or-v1...)
const API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = "https://openrouter.ai/api/v1"; 

const client = new OpenAI({
    baseURL: BASE_URL,
    apiKey: API_KEY,
});

const MODEL_NAME = "nvidia/nemotron-3-nano-30b-a3b:free";

const EXTRACT_PATH = './unzipped_frontend'; 
const BACKEND_OUTPUT_DIR = './generated-backend'; 

// ==========================================
// 2. Windows File Dialog (نافذة الويندوز)
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
// 3. File Extract / Skip Logic
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
            const ignoreFolders = ['node_modules', '.git', 'ui', 'styles', 'icons', 'figma', 'assets'];
            if (!ignoreFolders.includes(file.toLowerCase())) {
                extractScreenNames(filePath, screenNames);
            }
        } else {
            if (/\.(js|ts|jsx|tsx)$/.test(file)) {
                const ignoreFiles = ['app.tsx', 'index.tsx', 'main.tsx', 'vite-env.d.ts'];
                if (!file.toLowerCase().startsWith('svg-') && !ignoreFiles.includes(file.toLowerCase())) {
                    screenNames.push(file);
                }
            }
        }
    });
    return [...new Set(screenNames)]; 
}

// ==========================================
// 5. AI: Generate Backend
// ==========================================
async function generateBackend(screens) {
    console.log(`\n🧠 Analyzed frontend. Found ${screens.length} core screens.`);
    console.log(`⚙️ Requesting AI (${MODEL_NAME}) to build Backend architecture...`);

    const prompt = `You are an expert Full-Stack Software Engineer.
    I have a frontend project exported from Figma. I extracted the key screen names:
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

    try {
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
            const fullPath = path.join(BACKEND_OUTPUT_DIR, fileData.filename);
            const dir = path.dirname(fullPath);

            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(fullPath, fileData.content, 'utf8');
            console.log(`  📄 Created: ${fileData.filename}`);
        });

        console.log(`\n✅ Backend generated successfully in: ${BACKEND_OUTPUT_DIR}`);

    } catch (error) {
        console.error("❌ Error during backend generation:", error.message);
    }
}

// ==========================================
// 6. AI: Refactor Frontend (مع حماية الـ Rate Limit)
// ==========================================
// دالة مساعدة عشان نوقف السكربت ثواني (نريّح الـ API)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
            Original Code:
            ${oldContent}
            
            TASK:
            1. REMOVE MOCK DATA.
            2. INTEGRATE API using 'useEffect' and 'axios'/'fetch' to 'http://localhost:3000/api/'.
            3. UPDATE STATE with API data.
            4. ADD loading/error states.
            
            CRITICAL:
            Respond ONLY with the raw updated code. No markdown formatting (like \`\`\`tsx), no explanations.`;

            try {
                const response = await client.chat.completions.create({
                    model: MODEL_NAME,
                    messages: [{ role: "user", content: prompt }]
                });

                // الحماية من الرد الفاضي (Null)
                const aiContent = response.choices[0]?.message?.content;
                
                if (!aiContent) {
                    throw new Error("الذكاء الاصطناعي رجّع رد فاضي (ممكن بسبب ضغط الطلبات أو Rate Limit).");
                }

                let newContent = aiContent.trim();
                
                if (newContent.startsWith("```")) {
                    newContent = newContent.replace(/^```(tsx|ts|js|jsx)?\n/i, '').replace(/```$/i, '').trim();
                }

                fs.writeFileSync(filePath, newContent, 'utf8');
                console.log(`  ✅ Successfully linked ${screen}.`);
                
                // إعطاء الـ API راحة لمدة ثانيتين قبل الشاشة اللي بعدها
                await sleep(2000); 

            } catch (error) {
                console.error(`  ❌ Failed to refactor ${screen}:`, error.message);
                // لو فشل الطلب، نريّح 3 ثواني إضافية عشان السيرفر يهدأ
                await sleep(3000);
            }
        }
    }
    console.log("\n🎉 Full-Stack integration complete! Your app is now connected to the AI Backend.");
}

// ==========================================
// 7. Main Execution
// ==========================================
async function main() {
    console.log("=====================================================");
    console.log("🤖 BOB AI FULL-STACK GENERATOR (ULTIMATE EDITION)");
    console.log("=====================================================\n");

    // 1. نفتح النافذة للمستخدم يختار الملف
    const zipPath = getZipFileFromWindowsDialog();

    // 2. نفك الضغط ونجهز المجلد
    const targetDir = getOrExtractFrontend(zipPath);
    
    // 3. نبدأ الشغل الفعلي
    if (targetDir) {
        const screens = extractScreenNames(targetDir);
        if (screens.length === 0) {
            console.warn("⚠️ Warning: No valid screens found to infer backend logic.");
        } else {
            await generateBackend(screens);
            await refactorFrontend(targetDir, screens);
        }
    }
}

// التشغيل!
main();