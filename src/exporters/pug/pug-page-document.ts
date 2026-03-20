/**
 * Pug エクスポートのページシェル（doctype〜body ラッパー）
 */
export function buildPugPageDocument(componentCode: string): string {
  return `doctype html
html(lang="ja")
  head
    meta(charset="UTF-8")
    meta(name="viewport" content="width=device-width, initial-scale=1.0")
    title Generated UI
    script(src="https://cdn.tailwindcss.com")
  
  body.bg-gray-50
    .container.mx-auto.p-6
${componentCode}`;
}
