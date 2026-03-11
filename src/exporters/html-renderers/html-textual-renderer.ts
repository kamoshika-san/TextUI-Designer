import type {
  AlertComponent,
  DividerComponent,
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

  renderDivider(props: DividerComponent): string {
    const { orientation = 'horizontal', spacing = 'md', token } = props;
    const spacingClasses = this.utils.getStyleManager().getSpacingClasses('html');
    const tokenStyle = this.utils.getHtmlTokenStyleAttr('Divider', token);

    if (orientation === 'vertical') {
      return `    <div class="inline-block w-px h-6 bg-gray-700 mx-4"${tokenStyle}></div>`;
    }

    return `    <hr class="border-gray-700 ${spacingClasses[spacing as keyof typeof spacingClasses]}"${tokenStyle}>`;
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
