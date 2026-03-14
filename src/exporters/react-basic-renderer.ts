import type { AlertComponent, BadgeComponent, ButtonComponent, DividerComponent, ImageComponent, LinkComponent, TextComponent } from '../renderer/types';
import type { StyleManager } from '../utils/style-manager';

export function renderTextTemplate(props: TextComponent, key: number, tokenStyle: string, styleManager: typeof StyleManager, format: string): string {
  const { value, variant = 'p' } = props;
  const config = styleManager.getTextVariantConfig(variant, format);
  return `      <${config.element} key={${key}} className="${config.className}"${tokenStyle}>${value}</${config.element}>`;
}

export function renderButtonTemplate(props: ButtonComponent, key: number, tokenStyle: string, styleManager: typeof StyleManager, format: string): string {
  const { label, kind = 'primary' } = props;
  const className = styleManager.getButtonKindClass(kind, format);
  return `      <button
        key={${key}}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${className} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        ${tokenStyle}
      >
        ${label}
      </button>`;
}

export function renderDividerTemplate(props: DividerComponent, key: number, tokenStyle: string, styleManager: typeof StyleManager, format: string): string {
  const { orientation = 'horizontal', spacing = 'md' } = props;
  const spacingClasses = styleManager.getSpacingClasses(format);

  if (orientation === 'vertical') {
    return `      <div key={${key}} className="inline-block w-px h-6 bg-gray-300 mx-4"${tokenStyle}></div>`;
  }

  return `      <hr key={${key}} className="border-gray-300 ${spacingClasses[spacing as keyof typeof spacingClasses]}"${tokenStyle} />`;
}

export function renderSpacerTemplate(key: number, resolvedWidth: string, resolvedHeight: string): string {
  return `      <div key={${key}} className="textui-spacer" style={{ width: ${JSON.stringify(resolvedWidth)}, height: ${JSON.stringify(resolvedHeight)}, flexShrink: 0 }} aria-hidden="true" />`;
}

export function renderAlertTemplate(props: AlertComponent, key: number, tokenStyle: string, styleManager: typeof StyleManager, format: string): string {
  const { message, variant = 'info' } = props;
  const variantClasses = styleManager.getAlertVariantClasses(format);
  const className = variantClasses[variant as keyof typeof variantClasses] || variantClasses.info;

  return `      <div key={${key}} className="p-4 border rounded-md ${className}"${tokenStyle}>
        <p className="text-sm">${message}</p>
      </div>`;
}

export function renderLinkTemplate(props: LinkComponent, key: number, tokenStyle: string): string {
  const { href, label, target } = props;
  const rel = target === '_blank' ? ' rel=\"noopener noreferrer\"' : '';
  const targetAttr = target ? ` target=\"${target}\"` : '';
  return `      <a key={${key}} href=\"${href}\"${targetAttr}${rel} className=\"textui-link\"${tokenStyle}>${label}</a>`;
}



export function renderBadgeTemplate(props: BadgeComponent, key: number, tokenStyle: string): string {
  const { label, variant = 'default', size = 'md' } = props;
  return `      <span key={${key}} className="textui-badge textui-badge-${variant} textui-badge-${size}"${tokenStyle}>${label}</span>`;
}

export function renderImageTemplate(props: ImageComponent, key: number, tokenStyle: string): string {
  const { src, alt = '', width, height } = props;
  const stylePairs: string[] = [];
  if (width) {
    stylePairs.push(`width: ${JSON.stringify(width)}`);
  }
  if (height) {
    stylePairs.push(`height: ${JSON.stringify(height)}`);
  }
  const styleAttr = stylePairs.length > 0 ? ` style={{ ${stylePairs.join(', ')} }}` : '';
  return `      <img key={${key}} src={${JSON.stringify(src)}} alt={${JSON.stringify(alt)}} className="textui-image"${styleAttr}${tokenStyle} />`;
}
