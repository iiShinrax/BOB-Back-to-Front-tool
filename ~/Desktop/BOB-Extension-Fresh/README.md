# BOB Backend Generator - VS Code Extension

🤖 **Automatically generate a complete Node.js + Express + MongoDB backend from your frontend application using AI**

## Overview

BOB (Backend-Optimized Builder) is a powerful VS Code extension that analyzes your frontend React/TypeScript application and automatically generates a production-ready backend with:

- ✅ RESTful API routes
- ✅ MongoDB models with Mongoose
- ✅ TypeScript support
- ✅ Express server configuration
- ✅ CORS and middleware setup
- ✅ Complete dependency management

## Features

### 🎯 Smart Analysis

- Scans your workspace for React/TypeScript components
- Intelligently infers application domain and requirements
- Identifies data models from component names

### 🤖 AI-Powered Generation

- Uses OpenRouter AI to generate backend architecture
- Creates complete, production-ready code
- Follows best practices and design patterns

### 📦 Complete Backend Structure

- Organized folder structure (routes, models, controllers)
- TypeScript configuration
- Environment setup
- Package.json with all dependencies

## Quick Start

### Prerequisites

1. **Node.js** (v14 or higher)
2. **npm** package manager
3. **OpenRouter API Key** - Get one from [OpenRouter](https://openrouter.ai/)

### Installation

#### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "BOB Backend Generator"
4. Click Install

#### From VSIX Package

1. Download the `.vsix` file
2. In VS Code: Extensions → `...` menu → "Install from VSIX..."
3. Select the downloaded file

### Setup

1. Create a `.env` file in your workspace root:

```env
OPENROUTER_API_KEY=your_api_key_here
```

2. Get your API key from [OpenRouter](https://openrouter.ai/)

## Usage

### Step 1: Open Your Frontend Project

Open your React/TypeScript frontend project in VS Code.

### Step 2: Run the Extension

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type: **"BOB: Generate Backend from Current Workspace"**
3. Press Enter

### Step 3: Wait for Generation

The extension will:

1. 🔍 Analyze your frontend structure
2. 🧠 Generate backend with AI
3. 📁 Create organized backend folder
4. ✅ Set up all dependencies

### Step 4: Review Generated Backend

Your backend will be in the `generated-backend` folder:

```
generated-backend/
├── src/
│   ├── server.ts              # Main server
│   ├── routes/
│   │   └── *.ts              # API routes
│   └── models/
│       └── *.ts              # Mongoose schemas
├── package.json
├── .env
└── README.md
```

### Step 5: Configure and Run

1. Update `.env` in the backend folder with your MongoDB URI
2. Install dependencies and run:

```bash
cd generated-backend
npm install
npm run dev
```

## How It Works

### 1. Frontend Analysis

The extension scans your workspace for:

- `.js`, `.jsx` - JavaScript/React files
- `.ts`, `.tsx` - TypeScript/React files

It excludes common directories:

- `node_modules`, `.git`, `dist`, `build`
- `ui`, `styles`, `icons`, `assets`

### 2. AI Generation

Sends component names to OpenRouter AI which:

- Infers the application domain
- Designs appropriate data models
- Creates RESTful API endpoints
- Generates complete backend code

### 3. Backend Structure

Creates a complete backend with:

- Express server setup
- MongoDB connection
- API routes for each entity
- Mongoose models
- TypeScript configuration
- All necessary dependencies

## Configuration

### Environment Variables

Create a `.env` file in your workspace root:

```env
# Required
OPENROUTER_API_KEY=sk-or-v1-...
```

Backend `.env` will be created with:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/myapp
```

### Supported File Types

- JavaScript: `.js`, `.jsx`
- TypeScript: `.ts`, `.tsx`

### Excluded Patterns

The extension automatically excludes:

- Common utility files: `app.tsx`, `index.tsx`, `main.tsx`
- SVG components: `svg-*.tsx`
- Configuration files
- Test files

## Troubleshooting

### "No workspace folder is open"

**Solution:** Open a folder in VS Code before running the command.

### "No valid screens found"

**Causes:**

- No React/TypeScript files in workspace
- All files are in excluded directories

**Solution:** Ensure you have component files in non-excluded directories.

### "OPENROUTER_API_KEY not found"

**Solution:** Create `.env` file with your API key in workspace root.

### Backend generation fails

**Possible causes:**

- Invalid API key
- Network issues
- Rate limiting

**Solution:**

1. Check API key validity
2. Verify internet connection
3. Check Output panel for detailed errors
4. Wait a few minutes if rate limited

## What Gets Generated

### Backend Files

- **server.ts** - Express server with CORS and middleware
- **routes/** - RESTful API endpoints for each entity
- **models/** - Mongoose schemas for MongoDB
- **package.json** - All backend dependencies
- **.env** - Environment configuration template

### Dependencies Included

**Production:**
- express - Web framework
- mongoose - MongoDB ODM
- cors - CORS middleware
- dotenv - Environment variables

**Development:**
- typescript - TypeScript compiler
- ts-node-dev - Development server
- @types/* - TypeScript definitions

## Roadmap

- [ ] Support for additional frameworks (Vue, Angular)
- [ ] Multiple backend options (NestJS, Fastify)
- [ ] Database options (PostgreSQL, MySQL)
- [ ] Authentication/authorization generation
- [ ] API documentation generation
- [ ] Docker configuration

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Credits

Developed by the KND249 Team

## Support

For issues, questions, or suggestions:

- Open an issue on [GitHub](https://github.com/Mohamedahmed-Abdelgadir/BOB-Back-to-Front-tool)

---

**Note:** This extension uses AI to generate code. Always review generated code before using in production.