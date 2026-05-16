# BOB AI Full-Stack Generator - VS Code Extension

🤖 **Automatically generate a complete Node.js + Express + MongoDB backend for your frontend application using AI**

## Overview

BOB (Backend-Optimized Builder) is a powerful VS Code extension that analyzes your frontend React/TypeScript application and automatically generates a production-ready backend with:

- ✅ RESTful API routes
- ✅ MongoDB models with Mongoose
- ✅ TypeScript support
- ✅ Express server configuration
- ✅ CORS and middleware setup
- ✅ Automatic frontend integration
- ✅ Dependency management

## Features

### 🎯 Smart Analysis

- Scans your workspace for React/TypeScript components
- Intelligently infers application domain and requirements
- Identifies data models from component names

### 🤖 AI-Powered Generation

- Uses OpenRouter AI to generate backend architecture
- Creates complete, production-ready code
- Follows best practices and design patterns

### 🔄 Automatic Integration

- Updates frontend components to use generated API
- Removes mock data and hardcoded values
- Adds proper loading and error states
- Installs axios for API calls

### 📦 Dependency Management

- Automatically installs backend dependencies
- Adds frontend dependencies (axios)
- Creates proper package.json files

## Quick Start

### Prerequisites

1. **Node.js** (v14 or higher)
2. **npm** package manager
3. **OpenRouter API Key** - Get one from [OpenRouter](https://openrouter.ai/)

### Installation

#### Option 1: From Source (Development)

```bash
# Clone the repository
git clone <repository-url>
cd BOB-Back-to-Front-tool

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Press F5 in VS Code to launch Extension Development Host
```

#### Option 2: From VSIX Package

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
3. 📦 Install backend dependencies
4. 🔄 Refactor frontend components
5. ✅ Install frontend dependencies

### Step 4: Review Generated Backend

Your backend will be in the `generated-backend` folder:

```
generated-backend/
├── src/
│   ├── server.ts              # Main server
│   ├── config/
│   │   └── database.ts        # MongoDB connection
│   ├── routes/
│   │   └── *.ts              # API routes
│   ├── models/
│   │   └── *.ts              # Mongoose schemas
│   └── controllers/
│       └── *.ts              # Business logic
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### Step 5: Configure and Run

1. Copy `.env.example` to `.env` in the backend folder
2. Add your MongoDB connection string
3. Run the backend:

```bash
cd generated-backend
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

### 3. Frontend Integration

Updates your components to:

- Remove mock/hardcoded data
- Add API calls using axios
- Implement loading states
- Handle errors properly

### 4. Dependency Installation

Automatically runs:

- `npm install` in backend folder
- Adds axios to frontend dependencies

## Configuration

### Environment Variables

Create a `.env` file in your workspace root:

```env
# Required
OPENROUTER_API_KEY=sk-or-v1-...

# Optional (for backend)
MONGODB_URI=mongodb://localhost:27017/your-database
PORT=3000
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

### Frontend refactoring fails

**Causes:**

- Rate limiting
- Invalid component structure

**Solution:** The extension adds delays between requests. Check the Output panel for specific errors.

## Development

### Project Structure

```
BOB-Back-to-Front-tool/
├── src/
│   ├── extension.ts           # Main extension entry
│   ├── backendGenerator.ts    # AI backend generation
│   ├── frontendRefactor.ts    # Frontend integration
│   ├── screenExtractor.ts     # Component scanning
│   └── dependencyInstaller.ts # Package management
├── out/                       # Compiled JavaScript
├── package.json              # Extension manifest
├── tsconfig.json            # TypeScript config
└── .vscode/
    ├── launch.json          # Debug configuration
    └── tasks.json           # Build tasks
```

### Building

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (auto-compile on save)
npm run watch
```

### Debugging

1. Open project in VS Code
2. Press `F5` to launch Extension Development Host
3. Set breakpoints in TypeScript files
4. Test the extension in the new window

### Testing

```bash
# Run tests
npm test

# Run linter
npm run lint
```

## API Reference

### Commands

- `bob.generateBackend` - Generate backend from current workspace

### Configuration Options

Currently, all configuration is done via `.env` file. Future versions may add VS Code settings.

## Roadmap

- [ ] Support for additional frameworks (Vue, Angular)
- [ ] Multiple backend options (NestJS, Fastify)
- [ ] Database options (PostgreSQL, MySQL)
- [ ] Authentication/authorization generation
- [ ] API documentation generation
- [ ] Docker configuration
- [ ] CI/CD pipeline generation

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Credits

Developed by the BOB AI Team

## Support

For issues, questions, or suggestions:

- Open an issue on GitHub
- Check the [EXTENSION_README.md](EXTENSION_README.md) for detailed documentation

---

**Note:** This extension uses AI to generate code. Always review generated code before using in production.
