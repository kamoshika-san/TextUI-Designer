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

/** エクスポート HTML 用: Tailwind CDN に依存せずレイアウトを成立させる必須ユーティリティ */
export function getExportCriticalLayoutUtilities(): string {
  return `
    .flex { display: flex; }
    .flex-row { flex-direction: row; align-items: flex-start; }
    .flex-col { flex-direction: column; }
    .flex-wrap { flex-wrap: wrap; }
    .min-w-full { min-width: 100%; }
    .overflow-x-auto { overflow-x: auto; }
    .space-y-4 > * + * { margin-top: 1rem; }
    .space-x-4 > * + * { margin-left: 1rem; }
    .space-y-3 > * + * { margin-top: 0.75rem; }
    .gap-4 { gap: 1rem; }
    .divide-y > * + * { border-top-width: 1px; }
    .divide-gray-200 > * + * { border-color: rgb(229 231 235); }
    .divide-gray-700 > * + * { border-color: rgb(55 65 81); }
    .border { border-width: 1px; }
    .border-gray-300 { border-color: rgb(209 213 219); }
    .border-gray-700 { border-color: rgb(55 65 81); }
    .border-b { border-bottom-width: 1px; }
    .border-r { border-right-width: 1px; }
    .rounded-md { border-radius: 0.375rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .p-4 { padding: 1rem; }
    .p-6 { padding: 1.5rem; }
    .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
    .text-left { text-align: left; }
    .font-semibold { font-weight: 600; }
    .font-medium { font-weight: 500; }
    .text-white { color: rgb(255 255 255); }
    .text-gray-100 { color: rgb(243 244 246); }
    .text-gray-200 { color: rgb(229 231 235); }
    .text-gray-300 { color: rgb(209 213 219); }
    .text-gray-400 { color: rgb(156 163 175); }
    .text-gray-700 { color: rgb(55 65 81); }
    .text-gray-900 { color: rgb(17 24 39); }
    .bg-gray-100 { background-color: rgb(243 244 246); }
    .bg-gray-200 { background-color: rgb(229 231 235); }
    .bg-gray-800 { background-color: rgb(31 41 55); }
    .bg-gray-800\\/70 { background-color: rgba(31, 41, 55, 0.7); }
    .bg-gray-900 { background-color: rgb(17 24 39); }
    .align-top { vertical-align: top; }
    .min-h-screen { min-height: 100vh; }
    .overflow-hidden { overflow: hidden; }
    .opacity-50 { opacity: 0.5; }
    .cursor-not-allowed { cursor: not-allowed; }
    .transition-colors { transition-property: color, background-color, border-color; transition-duration: 0.15s; }
    .hover\\:bg-gray-800\\/80:hover { background-color: rgba(31, 41, 55, 0.8); }
    .last\\:border-r-0:last-child { border-right-width: 0; }
    .my-2 { margin-top: 0.5rem; margin-bottom: 0.5rem; }
    .my-4 { margin-top: 1rem; margin-bottom: 1rem; }
    .my-6 { margin-top: 1.5rem; margin-bottom: 1.5rem; }
    .mx-4 { margin-left: 1rem; margin-right: 1rem; }
    .inline-block { display: inline-block; }
  `;
}
