import { ErrorHandler } from '../src/utils/error-handler';

/**
 * Example: Using ErrorHandler with different configurations
 */

// Example 1: Default behavior - errors are caught and logged, but not re-thrown
async function nonCriticalOperation() {
  const result = await ErrorHandler.withErrorHandling(
    async () => {
      // Some operation that might fail
      throw new Error('Non-critical error');
    },
    'NonCriticalOperation'
  );
  // result will be undefined, error is logged but not propagated
  console.log('Operation completed:', result);
}

// Example 2: With default value - errors are caught, logged, and default value returned
async function operationWithDefault() {
  const result = await ErrorHandler.withErrorHandling(
    async () => {
      // Some operation that might fail
      throw new Error('Error with default');
    },
    'OperationWithDefault',
    'default-value' // This will be returned if error occurs
  );
  // result will be 'default-value'
  console.log('Result:', result);
}

// Example 3: Critical operation with rethrow - errors are logged AND re-thrown
async function criticalOperation() {
  try {
    const result = await ErrorHandler.withErrorHandling(
      async () => {
        // Critical operation that must propagate errors
        throw new Error('Critical error that must propagate');
      },
      'CriticalOperation',
      { rethrow: true } // This ensures errors propagate to caller
    );
  } catch (error) {
    console.log('Caught re-thrown error:', error);
    // This error can now be handled by VS Code or parent error handlers
    throw error;
  }
}

// Example 4: Critical operation with default value AND rethrow
async function criticalOperationWithDefault() {
  try {
    const result = await ErrorHandler.withErrorHandling(
      async () => {
        // Critical operation
        throw new Error('Critical error');
      },
      'CriticalOperationWithDefault',
      'default-value', // Default value (won't be used if rethrow is true)
      { rethrow: true } // Error will be re-thrown
    );
  } catch (error) {
    console.log('Error was re-thrown despite default value');
    throw error;
  }
}

// Usage in extension activation (critical path)
export async function activate() {
  // Critical initialization that must propagate errors to VS Code
  await ErrorHandler.withErrorHandling(
    async () => {
      // Extension initialization code
      await initializeServices();
    },
    'ExtensionActivation',
    { rethrow: true } // Ensures VS Code knows if activation fails
  );
}

async function initializeServices() {
  // Service initialization logic
}