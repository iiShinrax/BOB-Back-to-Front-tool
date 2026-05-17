import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function installDependencies(directory: string, type: 'frontend' | 'backend'): Promise<void> {
    const packageJsonPath = path.join(directory, 'package.json');
    if (!fs.existsSync(packageJsonPath)) return;

    const outputChannel = vscode.window.createOutputChannel(`BOB - ${type} Install`);
    outputChannel.show();
    outputChannel.appendLine(`Installing ${type} dependencies...`);

    try {
        const { stdout, stderr } = await execAsync('npm install', { cwd: directory });
        if (stdout) outputChannel.appendLine(stdout);
        if (stderr) outputChannel.appendLine(stderr);
        outputChannel.appendLine(`✅ ${type} dependencies installed!`);
    } catch (error: any) {
        outputChannel.appendLine(`❌ Failed: ${error.message}`);
    }
}