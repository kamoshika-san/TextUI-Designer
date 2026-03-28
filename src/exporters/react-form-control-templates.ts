import type { SelectOption } from '../domain/dsl-types';

/** `<select>` 内の `<option>` 行（インデント付き）を連結した文字列 */
export function buildReactSelectOptionsLines(options: SelectOption[]): string {
  return options
    .map((opt) => `          <option key="${opt.value}" value="${opt.value}">${opt.label}</option>`)
    .join('\n');
}

export function buildReactInputInnerHtml(params: {
  type: string;
  placeholder: string;
  inputAttrs: string;
  disabledClass: string;
  tokenStyle: string;
}): string {
  const { type, placeholder, inputAttrs, disabledClass, tokenStyle } = params;
  return `        <input
          type="${type}"
          placeholder="${placeholder}"${inputAttrs}
          className="textui-input w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}"
          ${tokenStyle}
        />`;
}

export function buildReactCheckboxInputInnerHtml(params: {
  checked: boolean;
  checkboxAttrs: string;
  disabledClass: string;
  tokenStyle: string;
}): string {
  const { checked, checkboxAttrs, disabledClass, tokenStyle } = params;
  return `        <input
          type="checkbox"
          defaultChecked={${checked}}${checkboxAttrs}
          className="textui-checkbox h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${disabledClass}"
          ${tokenStyle}
        />`;
}

export function buildReactRadioInputInnerHtml(params: {
  name: string;
  value: string;
  checked: boolean;
  radioAttrs: string;
  disabledClass: string;
  tokenStyle: string;
}): string {
  const { name, value, checked, radioAttrs, disabledClass, tokenStyle } = params;
  return `        <input
          type="radio"
          name="${name}"
          value="${value}"
          defaultChecked={${checked}}${radioAttrs}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 ${disabledClass}"
          ${tokenStyle}
        />`;
}

export function buildReactSelectInnerHtml(params: {
  selectAttrs: string;
  disabledClass: string;
  tokenStyle: string;
  /** `placeholder` があるときは `<option value="">...</option>`、無いときは空文字 */
  placeholderSegment: string;
  optionsCode: string;
}): string {
  const { selectAttrs, disabledClass, tokenStyle, placeholderSegment, optionsCode } = params;
  return `        <select${selectAttrs}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}"
          ${tokenStyle}
        >
          ${placeholderSegment}
${optionsCode}
        </select>`;
}

export function buildReactDateInputInnerHtml(params: {
  name: string;
  dateInputAttrs: string;
  disabledClass: string;
  tokenStyle: string;
}): string {
  const { name, dateInputAttrs, disabledClass, tokenStyle } = params;
  return `        <input
          id="${name}"
          name="${name}"
          type="date"${dateInputAttrs}
          className="textui-input w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}"
          ${tokenStyle}
        />`;
}
