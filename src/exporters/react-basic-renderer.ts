import type { AlertComponent, BadgeComponent, BreadcrumbComponent, ButtonComponent, DividerComponent, ImageComponent, LinkComponent, ProgressComponent, TextComponent } from '../renderer/types';
import type { StyleManager } from '../utils/style-manager';

export function renderTextTemplate(props: TextComponent, key: number, tokenStyle: string, styleManager: typeof StyleManager, format: string): string {
  const { value, variant = 'p' } = props;
  const config = styleManager.getTextVariantConfig(variant, format);
  return `      <${config.element} key={${key}} className="${config.className}"${tokenStyle}>${value}</${config.element}>`;
}

export function renderButtonTemplate(props: ButtonComponent, key: number, tokenStyle: string, styleManager: typeof StyleManager, format: string): string {
  const { label, icon, iconPosition = 'left', kind = 'primary' } = props;
  const className = styleManager.getButtonKindClass(kind, format);
  const content = [
    icon && iconPosition === 'left' ? `<span className=\"textui-button-icon\" aria-hidden=\"true\">${icon}</span>` : '',
    label ? `<span className=\"textui-button-label\">${label}</span>` : '',
    icon && iconPosition === 'right' ? `<span className=\"textui-button-icon\" aria-hidden=\"true\">${icon}</span>` : ''
  ].filter(Boolean).join('');
  return `      <button
        key={${key}}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${className} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        ${tokenStyle}
      >
        ${content}
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




export function renderBreadcrumbTemplate(props: BreadcrumbComponent, key: number, tokenStyle: string): string {
  const { items = [], separator = '/' } = props;

  const itemsMarkup = items
    .map((item, index) => {
      const isLast = index === items.length - 1;
      const separatorMarkup = isLast
        ? ''
        : `<span className="textui-breadcrumb-separator" aria-hidden="true">${separator}</span>`;

      if (item.href && !isLast) {
        const rel = item.target === '_blank' ? ' rel="noopener noreferrer"' : '';
        const targetAttr = item.target ? ` target="${item.target}"` : '';
        return `          <span className="textui-breadcrumb-item"><a className="textui-breadcrumb-link" href="${item.href}"${targetAttr}${rel}>${item.label}</a>${separatorMarkup}</span>`;
      }

      return `          <span className="textui-breadcrumb-item"><span className="${isLast ? 'textui-breadcrumb-current' : 'textui-breadcrumb-label'}">${item.label}</span>${separatorMarkup}</span>`;
    })
    .join('\n');

  return `      <nav key={${key}} className="textui-breadcrumb" aria-label="Breadcrumb"${tokenStyle}>
${itemsMarkup}
      </nav>`;
}

export function renderBadgeTemplate(props: BadgeComponent, key: number, tokenStyle: string): string {
  const { label, variant = 'default', size = 'md' } = props;
  return `      <span key={${key}} className="textui-badge textui-badge-${variant} textui-badge-${size}"${tokenStyle}>${label}</span>`;
}


export function renderProgressTemplate(props: ProgressComponent, key: number): string {
  const { value = 0, segments, label, showValue = true, variant = 'default' } = props;
  const normalizeValue = (raw: number): number => Math.min(100, Math.max(0, raw));
  const normalizedValue = normalizeValue(value);
  const hasSegments = Array.isArray(segments) && segments.length > 0;
  const totalValue = hasSegments
    ? segments.reduce((sum, segment) => sum + normalizeValue(segment.value), 0)
    : normalizedValue;
  const displayValue = Number(Math.min(100, totalValue).toFixed(1));

  const fillMarkup = hasSegments
    ? segments.map((segment, index) => {
        const segmentVariant = segment.variant ?? variant;
        const segmentWidth = `${normalizeValue(segment.value)}%`;
        const segmentTitle = segment.label ? ` title=${JSON.stringify(segment.label)}` : '';
        const segmentStyle = `{ width: ${JSON.stringify(segmentWidth)}, ...( ${segment.token ? `{ backgroundColor: ${JSON.stringify(segment.token)} }` : '{}'} ) }`;
        return `          <div key={${index}} className="textui-progress-fill textui-progress-${segmentVariant}"${segmentTitle} style={${segmentStyle}}></div>`;
      }).join('\n')
    : `          <div className="textui-progress-fill textui-progress-${variant}" style={{ width: ${JSON.stringify(`${normalizedValue}%`)}, ...( ${props.token ? `{ backgroundColor: ${JSON.stringify(props.token)} }` : '{}'} ) }}></div>`;

  return `      <div key={${key}} className="textui-progress">
        ${(label || showValue) ? `<div className="textui-progress-header">
          <span className="textui-progress-label">${label ?? ''}</span>
          ${showValue ? `<span className="textui-progress-value">${displayValue}%</span>` : ''}
        </div>` : ''}
        <div className="textui-progress-track">
${fillMarkup}
        </div>
      </div>`;
}

export function renderImageTemplate(props: ImageComponent, key: number, tokenStyle: string): string {
  const { src, alt = '', width, height, variant = 'default' } = props;
  const stylePairs: string[] = [];
  if (width) {
    stylePairs.push(`width: ${JSON.stringify(width)}`);
  }
  if (height) {
    stylePairs.push(`height: ${JSON.stringify(height)}`);
  }
  const styleAttr = stylePairs.length > 0 ? ` style={{ ${stylePairs.join(', ')} }}` : '';
  const variantClass = variant === 'avatar' ? ' rounded-full' : '';
  return `      <img key={${key}} src={${JSON.stringify(src)}} alt={${JSON.stringify(alt)}} className="textui-image${variantClass}"${styleAttr}${tokenStyle} />`;
}

export function renderIconTemplate(props: IconComponent, key: number, tokenStyle: string): string {
  const { name, label } = props;
  return `      <span key={${key}} className="textui-icon" role="img" aria-label={${JSON.stringify(label || name)}}${tokenStyle}><span className="textui-icon-glyph">${name}</span>${label ? `<span className="textui-icon-label">${label}</span>` : ''}</span>`;
}
