import type { ComponentDef, FormAction, FormField, SpacerComponent } from '../../../domain/dsl-types';
import type { StyleManager } from '../../../utils/style-manager';

export type HtmlRendererUtils = {
  escapeHtml: (value: unknown) => string;
  escapeAttribute: (value: unknown) => string;
  getDisabledClass: (disabled?: boolean) => string;
  getHtmlTokenStyleAttr: (componentType: string, token?: string, tokenSlots?: string[]) => string;
  getStyleManager: () => typeof StyleManager;
  buildAttrs: (attrs: Record<string, string | boolean | undefined>) => string;
  buildLabeledFieldBlock: (
    label: string | undefined,
    fieldContent: string,
    wrapperStart: string,
    wrapperEnd: string,
    buildLabelLine: (safeLabel: string) => string
  ) => string;
  buildControlRowWithLabel: (
    label: string | undefined,
    controlContent: string,
    rowStart: string,
    rowEnd: string,
    buildLabelLine: (safeLabel: string) => string
  ) => string;
  resolveSpacerDimensions: (props: SpacerComponent) => { width: string; height: string };
  renderComponent: (component: ComponentDef, key: number) => string;
  renderFormField: (field: FormField, index: number) => string;
  renderFormAction: (action: FormAction, index: number) => string;
  resolveActiveTabIndex: (defaultTab: number, itemCount: number) => number;
  toTableCellText: (value: unknown) => string;
};
