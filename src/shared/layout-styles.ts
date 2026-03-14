export function getSharedLayoutStyles(): string {
  return `
    .textui-container {
      width: 100%;
      max-width: none;
      margin-left: 0;
      margin-right: 0;
      padding: var(--spacing-lg, 1.5rem);
      border-radius: var(--borderRadius-lg, 0.75rem);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }

    .light .textui-container {
      background-color: var(--color-background);
    }

    .textui-spacer {
      display: block;
      background: transparent;
    }

    .textui-table {
      table-layout: fixed;
    }
  `;
}
