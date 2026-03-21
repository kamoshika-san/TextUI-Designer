import type {
  TextComponent,
  DividerComponent,
  SpacerComponent,
  AlertComponent,
  BadgeComponent,
  ProgressComponent,
  ImageComponent,
  IconComponent,
  LinkComponent
} from '../../domain/dsl-types';
import { StyleManager } from '../../utils/style-manager';
import type { ExportFormat } from '../../utils/style-manager';

export function renderPugText(
  props: TextComponent,
  styleManager: typeof StyleManager,
  format: ExportFormat,
  tokenStyle: string
): string {
  const { value, size = 'base', weight = 'normal', color = 'text-gray-900' } = props;
  const sizeClasses = styleManager.getSizeClasses(format);
  const weightClasses = styleManager.getWeightClasses(format);

  return `      p(class="${sizeClasses[size as keyof typeof sizeClasses]} ${weightClasses[weight as keyof typeof weightClasses]} ${color}"${tokenStyle}) ${value}`;
}

export function renderPugDivider(
  props: DividerComponent,
  styleManager: typeof StyleManager,
  format: ExportFormat,
  tokenStyle: string,
  tokenStyleModifier: string
): string {
  const { orientation = 'horizontal', spacing = 'md' } = props;
  const spacingClasses = styleManager.getSpacingClasses(format);

  if (orientation === 'vertical') {
    return `      .inline-block.w-px.h-6.bg-gray-300.mx-4${tokenStyleModifier}`;
  }

  return `      hr(class="border-gray-300 ${spacingClasses[spacing as keyof typeof spacingClasses]}"${tokenStyle})`;
}

export function renderPugSpacer(resolvedWidth: string, resolvedHeight: string): string {
  return `      .textui-spacer(style="width: ${resolvedWidth}; height: ${resolvedHeight}; flex-shrink: 0;" aria-hidden="true")`;
}

export function renderPugAlert(
  props: AlertComponent,
  styleManager: typeof StyleManager,
  format: ExportFormat,
  tokenStyle: string
): string {
  const { message, variant = 'info', title } = props;
  const variantClasses = styleManager.getAlertVariantClasses(format);

  let code = `      .p-4.border.rounded-md(class="${variantClasses[variant as keyof typeof variantClasses]}"${tokenStyle})`;
  if (title) {
    code += `\n        h3.text-sm.font-medium.mb-1 ${title}`;
  }
  code += `\n        p.text-sm ${message}`;

  return code;
}

export function renderPugBadge(
  props: BadgeComponent,
  escapeHtml: (v: unknown) => string,
  escapeAttribute: (v: unknown) => string,
  tokenStyle: string
): string {
  const { label, variant = 'default', size = 'md' } = props;
  return `      span(class="textui-badge textui-badge-${escapeAttribute(variant)} textui-badge-${escapeAttribute(size)}"${tokenStyle}) ${escapeHtml(label)}`;
}

export function renderPugProgress(
  props: ProgressComponent,
  escapeHtml: (v: unknown) => string,
  escapeAttribute: (v: unknown) => string
): string {
  const { value = 0, segments, label, showValue = true, variant = 'default', token } = props;
  const normalizeValue = (raw: number): number => Math.min(100, Math.max(0, raw));
  const normalizedValue = normalizeValue(value);
  const hasSegments = Array.isArray(segments) && segments.length > 0;
  const totalValue = hasSegments
    ? segments!.reduce((sum, segment) => sum + normalizeValue(segment.value), 0)
    : normalizedValue;
  const displayValue = Number(Math.min(100, totalValue).toFixed(1));
  let code = '      .textui-progress';

  if (label || showValue) {
    code += '\\n        .textui-progress-header';
    code += `
          span.textui-progress-label ${escapeHtml(label ?? '')}`;
    if (showValue) {
      code += `
          span.textui-progress-value ${escapeHtml(`${displayValue}%`)}`;
    }
  }

  code += '\\n        .textui-progress-track';
  if (hasSegments) {
    segments!.forEach(segment => {
      const segmentVariant = escapeAttribute(segment.variant ?? variant);
      const segmentToken = segment.token ? ` background-color: ${escapeAttribute(segment.token)};` : '';
      const segmentTitle = segment.label ? ` title="${escapeAttribute(segment.label)}"` : '';
      code += `
          .textui-progress-fill.textui-progress-${segmentVariant}(style="width: ${escapeAttribute(`${normalizeValue(segment.value)}%`)};${segmentToken}"${segmentTitle})`;
    });
  } else {
    code += `
          .textui-progress-fill.textui-progress-${escapeAttribute(variant)}(style="width: ${escapeAttribute(`${normalizedValue}%`)};${token ? ` background-color: ${escapeAttribute(token)};` : ''}")`;
  }

  return code;
}

export function renderPugImage(
  props: ImageComponent,
  escapeAttribute: (v: unknown) => string,
  tokenStyle: string
): string {
  const { src, alt = '', width, height, variant = 'default' } = props;
  const styleChunks: string[] = [];
  if (width) {
    styleChunks.push(`width: ${escapeAttribute(width)};`);
  }
  if (height) {
    styleChunks.push(`height: ${escapeAttribute(height)};`);
  }
  const styleAttr = styleChunks.length > 0 ? ` style="${styleChunks.join(' ')}"` : '';
  const variantClass = variant === 'avatar' ? ' rounded-full' : '';
  return `      img(src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" class="textui-image${variantClass}"${styleAttr}${tokenStyle})`;
}

export function renderPugIcon(
  props: IconComponent,
  escapeHtml: (v: unknown) => string,
  escapeAttribute: (v: unknown) => string,
  tokenStyle: string
): string {
  const { name, label } = props;
  const content = label ? `${escapeHtml(name)} ${escapeHtml(label)}` : escapeHtml(name);
  return `      span(class="textui-icon" role="img" aria-label="${escapeAttribute(label ?? name)}"${tokenStyle}) ${content}`;
}

export function renderPugLink(
  props: LinkComponent,
  escapeHtml: (v: unknown) => string,
  escapeAttribute: (v: unknown) => string,
  tokenStyle: string
): string {
  const { href, label, target } = props;
  const targetAttr = target ? ` target=\"${escapeAttribute(target)}\"` : '';
  const relAttr = target === '_blank' ? ' rel=\"noopener noreferrer\"' : '';

  return `      a(href=\"${escapeAttribute(href)}\"${targetAttr}${relAttr} class=\"textui-link\"${tokenStyle}) ${escapeHtml(label)}`;
}
