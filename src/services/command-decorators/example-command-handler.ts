import * as vscode from 'vscode';
import { SafeCommand } from './safe-command-decorator';

/**
 * Example command handler demonstrating consistent command registration
 * Commands are registered in CommandManager, not via decorators
 */
export class ExampleCommandHandler {
  private counter: number = 0;
  private status: string = 'Ready';

  /**
   * Increment the counter
   */
  @SafeCommand({
    errorMessage: 'Failed to increment counter',
    successMessage: 'Counter incremented successfully'
  })
  async incrementCounter(): Promise<void> {
    this.counter++;
    vscode.window.showInformationMessage(`Counter: ${this.counter}`);
  }

  /**
   * Show current status
   */
  @SafeCommand({
    errorMessage: 'Failed to show status'
  })
  async showStatus(): Promise<void> {
    vscode.window.showInformationMessage(`Status: ${this.status}, Counter: ${this.counter}`);
  }

  /**
   * Reset the counter
   */
  @SafeCommand({
    errorMessage: 'Failed to reset counter',
    successMessage: 'Counter reset successfully'
  })
  async resetCounter(): Promise<void> {
    this.counter = 0;
    this.status = 'Reset';
    vscode.window.showInformationMessage('Counter has been reset');
  }

  /**
   * Access a property value
   */
  @SafeCommand({
    errorMessage: 'Failed to access property'
  })
  async accessProperty(): Promise<void> {
    const value = this.getPropertyValue();
    vscode.window.showInformationMessage(`Property value: ${value}`);
  }

  /**
   * Call an instance method
   */
  @SafeCommand({
    errorMessage: 'Failed to call instance method'
  })
  async callInstanceMethod(): Promise<void> {
    const result = this.performCalculation();
    vscode.window.showInformationMessage(`Calculation result: ${result}`);
  }

  /**
   * Helper method to get property value
   */
  private getPropertyValue(): string {
    return `Counter=${this.counter}, Status=${this.status}`;
  }

  /**
   * Helper method to perform calculation
   */
  private performCalculation(): number {
    return this.counter * 2 + 1;
  }
}