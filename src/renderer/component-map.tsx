/**
 * WebView コンポーネントマップ
 * コンポーネント名 → Reactレンダラーのマッピングを一元管理し、
 * webview.tsx のif-else連鎖を排除する
 */
import React from 'react';
import { Text } from './components/Text';
import { Input } from './components/Input';
import { Button } from './components/Button';
import { Checkbox } from './components/Checkbox';
import { Container } from './components/Container';
import { Form } from './components/Form';
import { Radio } from './components/Radio';
import { Select } from './components/Select';
import { DatePicker } from './components/DatePicker';
import { Divider } from './components/Divider';
import { Spacer } from './components/Spacer';
import { Alert } from './components/Alert';
import { Accordion } from './components/Accordion';
import { Tabs } from './components/Tabs';
import { TreeView } from './components/TreeView';
import { Table } from './components/Table';
import { Link } from './components/Link';
import { Breadcrumb } from './components/Breadcrumb';
import { Badge } from './components/Badge';
import { Progress } from './components/Progress';
import { Image } from './components/Image';
import { Icon } from './components/Icon';
import { UnsupportedComponent } from './components/UnsupportedComponent';
import type {
  ComponentDef,
  FormComponent,
  FormField,
  FormAction,
  TextComponent,
  InputComponent,
  ButtonComponent,
  CheckboxComponent,
  RadioComponent,
  SelectComponent,
  DatePickerComponent,
  DividerComponent,
  SpacerComponent,
  AlertComponent,
  ContainerComponent,
  AccordionComponent,
  TabsComponent,
  TreeViewComponent,
  TableComponent,
  LinkComponent,
  BreadcrumbComponent,
  BadgeComponent,
  ProgressComponent,
  ImageComponent,
  IconComponent
} from './types';
import { getComponentName } from '../registry/component-registry';
import { BUILT_IN_COMPONENTS, type BuiltInComponentName } from '../registry/component-registry';
import {
  getWebViewComponentRenderer,
  registerWebViewComponent as registerRenderer,
  type WebViewComponentRenderer
} from '../registry/webview-component-registry';

interface RenderContext {
  dslPath: string;
  onJumpToDsl?: (dslPath: string, componentName: string) => void;
}

const isComponentProps = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** WebViewComponentRenderer の props を FormComponent として扱う（DSL 由来のため意図的なキャスト） */
function toFormComponent(props: Record<string, unknown>): FormComponent {
  return props as unknown as FormComponent;
}

function extractProps(
  component: Record<string, unknown>,
  name: string | null
): Record<string, unknown> | undefined {
  if (!name) {
    return undefined;
  }
  const value = component[name];
  return isComponentProps(value) ? value : undefined;
}

// --- 組み込みコンポーネントの登録 ---
const builtInRenderers: Record<BuiltInComponentName, WebViewComponentRenderer> = {
  Text: (props, key) => <Text key={key} {...(props as unknown as TextComponent)} />,
  Input: (props, key) => <Input key={key} {...(props as unknown as InputComponent)} />,
  Button: (props, key) => <Button key={key} {...(props as unknown as ButtonComponent)} />,
  Checkbox: (props, key) => <Checkbox key={key} {...(props as unknown as CheckboxComponent)} />,
  Radio: (props, key) => <Radio key={key} {...(props as unknown as RadioComponent)} />,
  Select: (props, key) => <Select key={key} {...(props as unknown as SelectComponent)} />,
  DatePicker: (props, key) => <DatePicker key={key} {...(props as unknown as DatePickerComponent)} />,
  Divider: (props, key) => <Divider key={key} {...(props as unknown as DividerComponent)} />,
  Spacer: (props, key) => <Spacer key={key} {...(props as unknown as SpacerComponent)} />,
  Alert: (props, key) => <Alert key={key} {...(props as unknown as AlertComponent)} />,
  Accordion: (props, key) => (
    <Accordion
      key={key}
      {...(props as unknown as AccordionComponent)}
      renderComponent={renderRegisteredComponent}
      dslPath={extractRenderContext(props)?.dslPath}
      onJumpToDsl={extractRenderContext(props)?.onJumpToDsl}
    />
  ),
  Tabs: (props, key) => (
    <Tabs
      key={key}
      {...(props as unknown as TabsComponent)}
      renderComponent={renderRegisteredComponent}
      dslPath={extractRenderContext(props)?.dslPath}
      onJumpToDsl={extractRenderContext(props)?.onJumpToDsl}
    />
  ),
  TreeView: (props, key) => (
    <TreeView
      key={key}
      {...(props as unknown as TreeViewComponent)}
      renderComponent={renderRegisteredComponent}
      dslPath={extractRenderContext(props)?.dslPath}
      onJumpToDsl={extractRenderContext(props)?.onJumpToDsl}
    />
  ),
  Table: (props, key) => (
    <Table
      key={key}
      {...(props as unknown as TableComponent)}
      renderComponent={(component, childKey) => renderRegisteredComponent(component, childKey, extractRenderContext(props))}
    />
  ),
  Link: (props, key) => <Link key={key} {...(props as unknown as LinkComponent)} />,
  Breadcrumb: (props, key) => <Breadcrumb key={key} {...(props as unknown as BreadcrumbComponent)} />,
  Badge: (props, key) => <Badge key={key} {...(props as unknown as BadgeComponent)} />,
  Progress: (props, key) => <Progress key={key} {...(props as unknown as ProgressComponent)} />,
  Image: (props, key) => <Image key={key} {...(props as unknown as ImageComponent)} />,
  Icon: (props, key) => <Icon key={key} {...(props as unknown as IconComponent)} />,
  Container: (props, key) => {
    const containerProps = props as unknown as ContainerComponent;
    const children = containerProps.components;
    const context = extractRenderContext(props);
    const containerPath = context?.dslPath ?? '';
    return (
      <Container
        key={key}
        layout={containerProps.layout || 'vertical'}
        width={containerProps.width}
        flexGrow={containerProps.flexGrow}
        minWidth={containerProps.minWidth}
        token={containerProps.token}
      >
        {children
          ? children.map((child: ComponentDef, i: number) => renderRegisteredComponent(
              child,
              i,
              createChildContext(context, `${containerPath}/Container/components/${i}`)
            ))
          : null}
      </Container>
    );
  },
  Form: (props, key) => {
    const form = toFormComponent(props);
    const context = extractRenderContext(props);
    const formPath = context?.dslPath ?? '';
    return (
      <Form
        key={key}
        id={form.id || ''}
        fields={form.fields || []}
        actions={form.actions || []}
        onSubmit={data => {
          console.log('Form submit:', data);
        }}
      >
        {(form.fields || []).map((field: FormField, i: number) => renderFormField(
          field,
          i,
          createChildContext(context, `${formPath}/Form/fields/${i}`)
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          {(form.actions || []).map((action: FormAction, i: number) => {
            if (action.Button) {
              return renderRegisteredComponent(
                { Button: action.Button },
                i,
                createChildContext(context, `${formPath}/Form/actions/${i}`)
              );
            }
            return null;
          })}
        </div>
      </Form>
    );
  }
};

function registerBuiltInComponentsImpl(): void {
  for (const componentName of BUILT_IN_COMPONENTS) {
    registerRenderer(componentName, builtInRenderers[componentName]);
  }
}

registerBuiltInComponentsImpl();

/**
 * テスト等でレジストリがクリアされた後に組み込みコンポーネントを再登録する。
 */
export function registerBuiltInComponents(): void {
  registerBuiltInComponentsImpl();
}

/**
 * FormFieldをレンダリング（Mapベースのディスパッチ）
 */
function renderFormField(field: FormField, index: number, context?: RenderContext): React.ReactNode {
  const fieldRecord = field as unknown as Record<string, unknown>;
  const name = getComponentName(fieldRecord);
  const props = extractProps(fieldRecord, name ?? null);
  const renderer = name ? getWebViewComponentRenderer(name) : undefined;

  if (name && props && renderer) {
    return renderer(attachRenderContext(props, context), index);
  }
  return null;
}

/**
 * ComponentDefをレンダリング（Mapベースのディスパッチ）
 * webview.tsx から呼び出されるメイン関数
 */
/** DSL のキーが小文字（link / badge）の場合に PascalCase でレンダラーを探す */
function resolveRenderer(name: string | undefined): WebViewComponentRenderer | undefined {
  if (!name) return undefined;
  const exact = getWebViewComponentRenderer(name);
  if (exact) return exact;
  if (name.length === 0) return undefined;
  const pascal = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  return pascal !== name ? getWebViewComponentRenderer(pascal) : undefined;
}

export function renderRegisteredComponent(
  comp: ComponentDef,
  key: React.Key,
  context?: RenderContext
): React.ReactNode {
  const componentRecord = comp as unknown as Record<string, unknown>;
  const name = getComponentName(componentRecord);
  const props = extractProps(componentRecord, name ?? null);
  const renderer = resolveRenderer(name);

  if (name && props && renderer) {
    const rendered = renderer(attachRenderContext(props, context), key);
    return (
      <div
        key={key}
        className="textui-jump-target"
        title={context?.dslPath ? `Ctrl+Shift+クリックでDSLへジャンプ: ${context.dslPath}` : undefined}
        onClick={(event) => {
          if (!context?.dslPath || !context.onJumpToDsl || !name) {
            return;
          }
          if (!(event.ctrlKey && event.shiftKey)) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          context.onJumpToDsl(context.dslPath, name);
        }}
      >
        {rendered}
      </div>
    );
  }

  const fallback = (
    <UnsupportedComponent key={key} componentName={name ?? 'Unknown'} props={props} />
  );

  if (context?.dslPath) {
    return (
      <div
        key={key}
        className="textui-jump-target"
        title={`Ctrl+Shift+クリックでDSLへジャンプ: ${context.dslPath}`}
        onClick={(event) => {
          if (!context.onJumpToDsl || !name) return;
          if (!(event.ctrlKey && event.shiftKey)) return;
          event.preventDefault();
          event.stopPropagation();
          context.onJumpToDsl(context.dslPath, name);
        }}
      >
        {fallback}
      </div>
    );
  }

  return fallback;
}

/**
 * カスタムコンポーネントを登録するための公開API
 */
export function registerWebViewComponent(name: string, renderer: WebViewComponentRenderer): void {
  registerRenderer(name, renderer);
}

function attachRenderContext(
  props: Record<string, unknown>,
  context?: RenderContext
): Record<string, unknown> {
  if (!context) {
    return props;
  }
  return {
    ...props,
    __renderContext: context
  };
}

function extractRenderContext(props: unknown): RenderContext | undefined {
  if (!props || typeof props !== 'object') {
    return undefined;
  }
  const value = (props as Record<string, unknown>).__renderContext;
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const dslPath = (value as Record<string, unknown>).dslPath;
  if (typeof dslPath !== 'string') {
    return undefined;
  }
  const onJumpToDsl = (value as Record<string, unknown>).onJumpToDsl;
  return {
    dslPath,
    onJumpToDsl: typeof onJumpToDsl === 'function'
      ? (onJumpToDsl as (dslPath: string, componentName: string) => void)
      : undefined
  };
}

function createChildContext(parent: RenderContext | undefined, childPath: string): RenderContext | undefined {
  if (!parent) {
    return undefined;
  }
  return {
    dslPath: childPath,
    onJumpToDsl: parent.onJumpToDsl
  };
}
