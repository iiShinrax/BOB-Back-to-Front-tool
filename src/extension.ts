import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { generateBackend } from './backendGenerator';
import { refactorFrontend } from './frontendRefactor';
import { extractScreenNames } from './screenExtractor';
import { installDependencies } from './dependencyInstaller';

export function activate(context: vscode.ExtensionContext) {
    console.log('BOB Backend Generator extension is now active!');

    let disposable = vscode.commands.registerCommand('bob.generateBackend', async () => {
        // Get the current workspace folder
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder is open. Please open a folder first.');
            return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        
        // Show progress notification
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "BOB Backend Generator",
            cancellable: false
        }, async (progress) => {
            try {
                // Step 1: Extract screen names from current workspace
                progress.report({ increment: 10, message: "Analyzing frontend structure..." });
                const screens = extractScreenNames(workspaceRoot);
                
                if (screens.length === 0) {
                    vscode.window.showWarningMessage('No valid screens found in the workspace. Make sure you have React/TypeScript files.');
                    return;
                }

                vscode.window.showInformationMessage(`Found ${screens.length} screens: ${screens.join(', ')}`);

                // Step 2: Generate backend
                progress.report({ increment: 30, message: "Generating backend with AI..." });
                const backendDir = path.join(workspaceRoot, 'generated-backend');
                
                // Create backend directory if it doesn't exist
                if (!fs.existsSync(backendDir)) {
                    fs.mkdirSync(backendDir, { recursive: true });
                }

                await generateBackend(screens, backendDir);
                
                // Step 3: Install backend dependencies
                progress.report({ increment: 20, message: "Installing backend dependencies..." });
                await installDependencies(backendDir, 'backend');

                // Step 4: Refactor frontend
                progress.report({ increment: 20, message: "Refactoring frontend to connect to API..." });
                await refactorFrontend(workspaceRoot, screens);

                // Step 5: Install frontend dependencies
                progress.report({ increment: 10, message: "Installing frontend dependencies..." });
                await installDependencies(workspaceRoot, 'frontend');

                progress.report({ increment: 10, message: "Complete!" });

                // Show success message with actions
                const openBackend = 'Open Backend Folder';
                const viewReadme = 'View Instructions';
                const result = await vscode.window.showInformationMessage(
                    '✅ Backend generated successfully! Check the generated-backend folder.',
                    openBackend,
                    viewReadme
                );

                if (result === openBackend) {
                    const backendUri = vscode.Uri.file(backendDir);
                    await vscode.commands.executeCommand('revealFileInOS', backendUri);
                } else if (result === viewReadme) {
                    const readmePath = path.join(backendDir, 'README.md');
                    if (fs.existsSync(readmePath)) {
                        const doc = await vscode.workspace.openTextDocument(readmePath);
                        await vscode.window.showTextDocument(doc);
                    }
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

export function deactivate() {}

// Made with Bob
