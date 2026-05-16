import * as fs from 'fs';
import * as path from 'path';
import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = "https://openrouter.ai/api/v1";
const MODEL_NAME = "nvidia/nemotron-3-nano-30b-a3b:free";

/**
 * Helper function to add delay between API calls
 */
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Recursively finds a file in a directory
 */
function findFilePath(directory: string, fileName: string): string | null {
    if (!fs.existsSync(directory)) {
        return null;
    }

    const files = fs.readdirSync(directory);
    
    for (const file of files) {
        const fullPath = path.join(directory, file);
        
        if (fs.statSync(fullPath).isDirectory()) {
            // Skip node_modules and other common directories
            if (file === 'node_modules' || file === '.git' || file === 'generated-backend') {
                continue;
            }
            
            const found = findFilePath(fullPath, fileName);
            if (found) return found;
        } else if (file === fileName) {
            return fullPath;
        }
    }
    
    return null;
}

/**
 * Refactors frontend components to connect to the generated backend API
 * @param dir The workspace directory
 * @param screens Array of screen names to refactor
 */
export async function refactorFrontend(dir: string, screens: string[]): Promise<void> {
    if (!API_KEY) {
        throw new Error('OPENROUTER_API_KEY not found in environment variables.');
    }

    console.log("\n✨ Refactoring Frontend: Removing mock data and linking to API...");

    const client = new OpenAI({
        baseURL: BASE_URL,
        apiKey: API_KEY,
    });

    for (const screen of screens) {
        const filePath = findFilePath(dir, screen);
        
        if (filePath) {
            console.log(`  🔄 Refactoring ${screen}...`);
            
            try {
                const oldContent = fs.readFileSync(filePath, 'utf8');

                const prompt = `You are a Senior React Developer.
Original Code:
${oldContent}

TASK:
1. REMOVE MOCK DATA (hardcoded arrays, objects, etc.).
2. INTEGRATE API using 'useEffect' and 'axios' or 'fetch' to 'http://localhost:3000/api/'.
3. UPDATE STATE with API data.
4. ADD loading and error states.
5. ENSURE proper TypeScript types if the file uses TypeScript.

CRITICAL:
Respond ONLY with the raw updated code. No markdown formatting (like \`\`\`tsx), no explanations, no comments about what you changed.`;

                const response = await client.chat.completions.create({
                    model: MODEL_NAME,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.5,
                });

                const aiContent = response.choices[0]?.message?.content;
                
                if (!aiContent) {
                    throw new Error("AI returned empty response (possible rate limit or API issue).");
                }

                let newContent = aiContent.trim();
                
                // Remove markdown code blocks if present
                if (newContent.startsWith("```")) {
                    newContent = newContent.replace(/^```(tsx|ts|js|jsx)?\n/i, '').replace(/```$/i, '').trim();
                }

                fs.writeFileSync(filePath, newContent, 'utf8');
                console.log(`  ✅ Successfully linked ${screen}.`);
                
                // Add delay to avoid rate limiting
                await sleep(2000);

            } catch (error) {
                if (error instanceof Error) {
                    console.error(`  ❌ Failed to refactor ${screen}:`, error.message);
                }
                // Add extra delay on error to let the API recover
                await sleep(3000);
            }
        } else {
            console.log(`  ⚠️ Could not find file: ${screen}`);
        }
    }
    
    console.log("\n🎉 Full-Stack integration complete! Your app is now connected to the Backend.");
}

// Made with Bob
