import * as fs from 'fs';
import * as path from 'path';
import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = "https://openrouter.ai/api/v1";
const MODEL_NAME = "nvidia/nemotron-3-nano-30b-a3b:free";

interface BackendFile {
    filename: string;
    content: string;
}

interface AIResponse {
    files: BackendFile[];
}

/**
 * Generates backend architecture using AI based on frontend screens
 * @param screens Array of screen names from the frontend
 * @param outputDir Directory where backend files will be generated
 */
export async function generateBackend(screens: string[], outputDir: string): Promise<void> {
    if (!API_KEY) {
        throw new Error('OPENROUTER_API_KEY not found in environment variables. Please create a .env file with your API key.');
    }

    console.log(`\n🧠 Analyzed frontend. Found ${screens.length} core screens.`);
    console.log(`⚙️ Requesting AI (${MODEL_NAME}) to build Backend architecture...`);

    const client = new OpenAI({
        baseURL: BASE_URL,
        apiKey: API_KEY,
    });

    const prompt = `You are an expert Full-Stack Software Engineer specializing in Node.js, Express, TypeScript, and MongoDB.

FRONTEND COMPONENTS DETECTED:
${JSON.stringify(screens, null, 2)}

YOUR TASK:
Analyze these component names and generate a complete, production-ready backend architecture.

REQUIREMENTS:
1. DOMAIN INFERENCE: Determine the application type from component names (e.g., "ProductList", "Cart" = e-commerce)
2. ARCHITECTURE: Node.js + Express + TypeScript + MongoDB (Mongoose)
3. FILE STRUCTURE:
   - src/server.ts: Main server with CORS, body-parser, error handling
   - src/routes/*.ts: RESTful API routes
   - src/models/*.ts: Mongoose schemas with TypeScript interfaces
   - src/controllers/*.ts: Business logic separated from routes
   - src/config/database.ts: MongoDB connection configuration
4. BEST PRACTICES:
   - Use async/await for all database operations
   - Include proper error handling middleware
   - Add input validation
   - Use environment variables for configuration
   - Include TypeScript types for all functions
5. DEPENDENCIES: Include in package.json:
   - express, mongoose, cors, dotenv
   - @types/express, @types/node, @types/cors
   - typescript, ts-node, nodemon
6. CONFIGURATION FILES:
   - package.json with scripts (dev, build, start)
   - tsconfig.json with proper compiler options
   - .env.example with all required variables
   - README.md with setup instructions

OUTPUT FORMAT:
Return ONLY valid JSON. No markdown, no code blocks, no explanations.

{
  "files": [
    { "filename": "src/server.ts", "content": "complete server code here" },
    { "filename": "src/config/database.ts", "content": "database connection code" },
    { "filename": "src/routes/exampleRoutes.ts", "content": "route definitions" },
    { "filename": "src/models/ExampleModel.ts", "content": "mongoose schema" },
    { "filename": "src/controllers/exampleController.ts", "content": "controller logic" },
    { "filename": "package.json", "content": "complete package.json" },
    { "filename": "tsconfig.json", "content": "typescript config" },
    { "filename": ".env.example", "content": "environment variables template" },
    { "filename": "README.md", "content": "setup and usage instructions" }
  ]
}`;

    try {
        const response = await client.chat.completions.create({
            model: MODEL_NAME,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        });

        let aiText = response.choices[0].message.content?.trim();
        
        if (!aiText) {
            throw new Error('AI returned empty response. This might be due to rate limiting or API issues.');
        }

        // Remove markdown code blocks if present
        if (aiText.startsWith("```")) {
            aiText = aiText.replace(/^```(json)?\n/, '').replace(/```$/, '').trim();
        }

        // Try to extract JSON if there's extra text
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            aiText = jsonMatch[0];
        }

        let aiData: AIResponse;
        try {
            aiData = JSON.parse(aiText);
        } catch (parseError) {
            console.error('Failed to parse AI response as JSON:', aiText.substring(0, 500));
            throw new Error('AI response is not valid JSON. The AI might have included explanatory text instead of pure JSON.');
        }

        if (!aiData.files || !Array.isArray(aiData.files)) {
            throw new Error('Invalid AI response format: missing or invalid "files" array');
        }

        // Create all backend files
        aiData.files.forEach((fileData: BackendFile) => {
            const fullPath = path.join(outputDir, fileData.filename);
            const dir = path.dirname(fullPath);

            // Create directory if it doesn't exist
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Write file content
            fs.writeFileSync(fullPath, fileData.content, 'utf8');
            console.log(`  📄 Created: ${fileData.filename}`);
        });

        console.log(`\n✅ Backend generated successfully in: ${outputDir}`);

    } catch (error) {
        if (error instanceof Error) {
            console.error("❌ Error during backend generation:", error.message);
            throw new Error(`Backend generation failed: ${error.message}`);
        }
        throw error;
    }
}

// Made with Bob
