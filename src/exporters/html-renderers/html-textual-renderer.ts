import type {
  AlertComponent,
  DividerComponent,
  ImageComponent,
  LinkComponent,
  BadgeComponent,
  ProgressComponent,
  SpacerComponent,
  TextComponent
} from '../../renderer/types';
import type { HtmlRendererUtils } from './html-renderer-utils';

export class HtmlTextualRenderer {
  constructor(private readonly utils: HtmlRendererUtils) {}

  renderText(props: TextComponent): string {
    const { value, variant = 'p', size = 'base', weight = 'normal', color = 'text-gray-300', token } = props;
    const safeValue = this.utils.escapeHtml(value ?? '');

    const styleManager = this.utils.getStyleManager();
    const variantClasses = styleManager.getVariantClasses('html');
    const sizeClasses = styleManager.getSizeClasses('html');
    const weightClasses = styleManager.getWeightClasses('html');

    let className: string;
    let tag: string;

    if (variant && variantClasses[variant]) {
      className = variantClasses[variant];
      tag = variant.startsWith('h') ? variant : 'p';
    } else {
      className = `${sizeClasses[size as keyof typeof sizeClasses]} ${weightClasses[weight as keyof typeof weightClasses]} ${color}`;
      tag = 'p';
    }

    const tokenStyle = this.utils.getHtmlTokenStyleAttr('Text', token);
    return `    <${tag} class="${className}"${tokenStyle}>${safeValue}</${tag}>`;
  }


  renderImage(props: ImageComponent): string {
    const { src, alt, width, height, variant = 'default', token } = props;
    const safeSrc = this.utils.escapeAttribute(src ?? '');
    const safeAlt = this.utils.escapeAttribute(alt ?? '');
    const widthAttr = width ? ` width="${this.utils.escapeAttribute(width)}"` : '';
    const heightAttr = height ? ` height="${this.utils.escapeAttribute(height)}"` : '';
    const variantClass = variant === 'avatar' ? ' rounded-full' : '';
    const tokenStyle = this.utils.getHtmlTokenStyleAttr('Image', token);

    return `    <img src="${safeSrc}" alt="${safeAlt}" class="textui-image${variantClass}"${widthAttr}${heightAttr}${tokenStyle} />`;
  }

  renderLink(props: LinkComponent): string {
    const { href, label, target, token } = props;
    const safeHref = this.utils.escapeAttribute(href ?? '');
    const safeLabel = this.utils.escapeHtml(label ?? '');
    const safeTarget = target ? ` target="${this.utils.escapeAttribute(target)}"` : '';
    const rel = target === '_blank' ? ' rel="noopener noreferrer"' : '';
    const tokenStyle = this.utils.getHtmlTokenStyleAttr('Link', token);

    return `    <a href="${safeHref}"${safeTarget}${rel} class="textui-link"${tokenStyle}>${safeLabel}</a>`;
  }

  renderBadge(props: BadgeComponent): string {
    const { label, variant = 'default', size = 'md', token } = props;
    const safeLabel = this.utils.escapeHtml(label ?? '');
    const safeVariant = this.utils.escapeAttribute(variant);
    const safeSize = this.utils.escapeAttribute(size);
    const tokenStyle = this.utils.getHtmlTokenStyleAttr('Badge', token);

    return `    <span class="textui-badge textui-badge-${safeVariant} textui-badge-${safeSize}"${tokenStyle}>${safeLabel}</span>`;
  }


  renderProgress(props: ProgressComponent): string {
    const { value, label, showValue = true, variant = 'default', token } = props;
    const normalizedValue = Math.min(100, Math.max(0, value));
    const safeVariant = this.utils.escapeAttribute(variant);
    const labelBlock = (label || showValue)
      ? `\n      <div class="textui-progress-header">\n        <span class="textui-progress-label">${this.utils.escapeHtml(label ?? '')}</span>\n        ${showValue ? `<span class="textui-progress-value">${normalizedValue}%</span>` : ''}\n      </div>`
      : '';

    return `    <div class="textui-progress">${labelBlock}\n      <div class="textui-progress-track">\n        <div class="textui-progress-fill textui-progress-${safeVariant}" style="width: ${this.utils.escapeAttribute(String(normalizedValue))}%;${token ? ` background-color: ${this.utils.escapeAttribute(token)};` : ''}"></div>\n      </div>\n    </div>`;
  }
  renderDivider(props: DividerComponent): string {
    const { orientation = 'horizontal', spacing = 'md', token } = props;
    const spacingClasses = this.utils.getStyleManager().getSpacingClasses('html');
    const spacingClass = spacingClasses[spacing as keyof typeof spacingClasses] ?? spacingClasses.md;
    const tokenStyle = this.utils.getHtmlTokenStyleAttr('Divider', token);

    if (orientation === 'vertical') {
      return `    <div class="textui-divider vertical ${spacingClass}"${tokenStyle}></div>`;
    }

    return `    <hr class="textui-divider ${spacingClass}"${tokenStyle}>`;
  }

  renderSpacer(props: SpacerComponent): string {
    const { width, height } = this.utils.resolveSpacerDimensions(props);
    return `    <div class="textui-spacer" style="width: ${this.utils.escapeAttribute(width)}; height: ${this.utils.escapeAttribute(height)}; flex-shrink: 0;" aria-hidden="true"></div>`;
  }

  renderAlert(props: AlertComponent): string {
    const { message, variant = 'info', title, token } = props;
    const safeTitle = title ? this.utils.escapeHtml(title) : '';
    const safeMessage = this.utils.escapeHtml(message ?? '');
    const safeVariant = this.utils.escapeAttribute(variant);
    const variantClasses = this.utils.getStyleManager().getAlertVariantClasses('html');

    const tokenStyle = this.utils.getHtmlTokenStyleAttr('Alert', token);
    let code = `    <div data-alert-variant="${safeVariant}" class="p-4 border rounded-md ${variantClasses[variant as keyof typeof variantClasses]}"${tokenStyle}>`;
    if (title) {
      code += `\n      <h3 class="text-sm font-medium mb-1">${safeTitle}</h3>`;
    }
    code += `\n      <p class="text-sm">${safeMessage}</p>`;
    code += `\n    </div>`;

    return code;
  }
}
