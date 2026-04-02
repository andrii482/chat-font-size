import * as vscode from 'vscode';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext): void {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    99,
  );
  statusBarItem.command = 'chatFontSize.set';
  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(
    vscode.commands.registerCommand('chatFontSize.increase', () => adjustSize(getStep())),
    vscode.commands.registerCommand('chatFontSize.decrease', () => adjustSize(-getStep())),
    vscode.commands.registerCommand('chatFontSize.reset', resetSize),
    vscode.commands.registerCommand('chatFontSize.set', setCustomSize),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('chat.fontSize') || e.affectsConfiguration('chat.editor.fontSize')) {
        updateStatusBar();
      }
    }),
  );

  updateStatusBar();
}

export function deactivate(): void {}

function getExtConfig() {
  return vscode.workspace.getConfiguration('chatFontSize');
}

function getStep(): number {
  return getExtConfig().get<number>('step', 1);
}

function getDefault(): number {
  return getExtConfig().get<number>('default', 13);
}

function getMin(): number {
  return getExtConfig().get<number>('min', 8);
}

function getMax(): number {
  return getExtConfig().get<number>('max', 30);
}

function getCurrentSize(): number {
  return vscode.workspace.getConfiguration('chat').get<number>('fontSize', getDefault());
}

function clamp(value: number): number {
  return Math.max(getMin(), Math.min(getMax(), value));
}

async function applySize(size: number): Promise<void> {
  const clamped = clamp(size);
  const chat = vscode.workspace.getConfiguration('chat');
  await chat.update('fontSize', clamped, vscode.ConfigurationTarget.Global);
  await chat.update('editor.fontSize', clamped, vscode.ConfigurationTarget.Global);
  updateStatusBar();
}

async function adjustSize(delta: number): Promise<void> {
  const current = getCurrentSize();
  await applySize(current + delta);
}

async function resetSize(): Promise<void> {
  await applySize(getDefault());
}

async function setCustomSize(): Promise<void> {
  const current = getCurrentSize();
  const input = await vscode.window.showInputBox({
    prompt: `Chat font size (${getMin()}\u2013${getMax()} px)`,
    value: String(current),
    validateInput: (v) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < getMin() || n > getMax()) {
        return `Enter a whole number between ${getMin()} and ${getMax()}`;
      }
      return null;
    },
  });
  if (input !== undefined) {
    await applySize(Number(input));
  }
}

function updateStatusBar(): void {
  const size = getCurrentSize();
  statusBarItem.text = `$(text-size) Chat: ${size}px`;
  statusBarItem.tooltip = 'Click to set chat font size';
  statusBarItem.show();
}
