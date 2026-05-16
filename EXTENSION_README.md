# BOB Backend Generator - VS Code Extension

A powerful VS Code extension that automatically generates a complete Node.js + Express + MongoDB backend for your frontend application using AI.

## Features

- 🤖 **AI-Powered Backend Generation**: Analyzes your frontend structure and generates appropriate backend architecture
- 📁 **Workspace Integration**: Works directly with your current VS Code workspace - no ZIP files needed
- 🔄 **Frontend Refactoring**: Automatically updates frontend components to connect to the generated API
- 📦 **Dependency Management**: Installs all necessary dependencies for both frontend and backend
- 🎯 **Smart Screen Detection**: Intelligently identifies React/TypeScript components to infer backend requirements

## Prerequisites

- Node.js (v14 or higher)
- npm
- OpenRouter API Key (for AI backend generation)

## Installation

### From Source

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to compile the TypeScript code
4. Press `F5` to open a new VS Code window with the extension loaded

### From VSIX (if packaged)

1. Download the `.vsix` file
2. In VS Code, go to Extensions view (`Ctrl+Shift+X`)
3. Click the `...` menu and select "Install from VSIX..."
4. Select the downloaded `.vsix` file

## Setup

1. Create a `.env` file in your workspace root with your OpenRouter API key:

   ```
   OPENROUTER_API_KEY=your_api_key_here
   ```

2. Get your API key from [OpenRouter](https://openrouter.ai/)

## Usage

1. Open your frontend project in VS Code
2. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac)
3. Type "BOB: Generate Backend from Current Workspace" and select it
4. Wait for the extension to:
   - Analyze your frontend structure
   - Generate backend code using AI
   - Install backend dependencies
   - Refactor frontend to connect to API
   - Install frontend dependencies (axios)

5. Your backend will be generated in the `generated-backend` folder

## Generated Backend Structure

```
generated-backend/
├── src/
│   ├── server.ts           # Main server file
│   ├── routes/             # API route handlers
│   ├── models/             # Mongoose schemas
│   ├── controllers/        # Business logic
│   └── middleware/         # Custom middleware (if needed)
├── package.json            # Backend dependencies
├── tsconfig.json           # TypeScript configuration
├── .env.example            # Environment variables template
└── README.md               # Backend setup instructions
```

## How It Works

1. **Screen Detection**: The extension scans your workspace for React/TypeScript component files
2. **AI Analysis**: Sends the component names to AI to infer the application domain and requirements
3. **Backend Generation**: AI generates a complete backend with routes, models, and controllers
4. **Frontend Integration**: Updates your frontend components to use the generated API
5. **Dependency Installation**: Automatically installs all required packages

## Configuration

The extension uses the following environment variables:

- `OPENROUTER_API_KEY`: Your OpenRouter API key (required)

## Supported File Types

The extension looks for the following file types when analyzing your frontend:

- `.js` - JavaScript files
- `.jsx` - React JavaScript files
- `.ts` - TypeScript files
- `.tsx` - React TypeScript files

## Excluded Directories

The following directories are automatically excluded from analysis:

- `node_modules`
- `.git`
- `ui` (utility components)
- `styles`
- `icons`
- `figma`
- `assets`
- `dist`
- `build`
- `out`
- `.vscode`
- `generated-backend`

## Troubleshooting

### "No workspace folder is open"

- Make sure you have a folder open in VS Code before running the command

### "No valid screens found"

- Ensure your project contains React/TypeScript component files
- Check that your components are not in excluded directories

### "OPENROUTER_API_KEY not found"

- Create a `.env` file in your workspace root
- Add your API key: `OPENROUTER_API_KEY=your_key_here`

### Backend generation fails

- Check your internet connection
- Verify your API key is valid
- Check the Output panel for detailed error messages

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch
```

### Testing

Press `F5` in VS Code to open a new Extension Development Host window with the extension loaded.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Credits

Developed by the BOB AI Team
