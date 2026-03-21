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
import { decodeDslComponentObjectProps, decodeTextDslComponent } from '../registry/dsl-component-codec';
import { type BuiltInComponentName } from '../components/definitions/built-in-components';
import { componentDescriptorRegistry } from '../registry/component-descriptor-registry';
import {
  getWebViewComponentRenderer,
  registerWebViewComponent as registerRenderer,
  type WebViewComponentRenderer
} from '../registry/webview-component-registry';
import type { RenderContext } from './render-context';
import {
  attachRenderContext,
  createChildContext,
  extractRenderContext
} from './render-context';
import { composeRegisteredComponent } from './registered-component-kernel';

/** WebViewComponentRenderer の props を FormComponent として扱う（DSL 由来のため意図的なキャスト） */
function toFormComponent(props: Record<string, unknown>): FormComponent {
  return props as unknown as FormComponent;
}

/** プレビュー用 props から `__renderContext` を外し、codec に渡す DSL 形へ整える（T-182） */
function propsWithoutRenderContext(props: Record<string, unknown>): Record<string, unknown> {
  const { __renderContext: _c, ...rest } = props;
  return rest;
}

// --- 組み込みコンポーネントの登録 ---
const builtInRenderers: Record<BuiltInComponentName, WebViewComponentRenderer> = {
  Text: (props, key) => {
    const raw = props as Record<string, unknown>;
    const decoded = decodeTextDslComponent({ Text: propsWithoutRenderContext(raw) });
    if (decoded.value) {
      return <Text key={key} {...decoded.value.props} />;
    }
    return <Text key={key} {...(props as unknown as TextComponent)} />;
  },
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
  for (const def of componentDescriptorRegistry.list()) {
    const rendererKey = componentDescriptorRegistry.getPreviewRenderer(def.name);
    if (!rendererKey) {
      continue;
    }
    registerRenderer(def.name, builtInRenderers[rendererKey]);
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
  const decoded = decodeDslComponentObjectProps(field);
  const name = decoded.value?.name;
  const props = decoded.value?.props;
  const renderer = name ? getWebViewComponentRenderer(name) : undefined;

  if (name && props && renderer) {
    return renderer(attachRenderContext(props, context), index);
  }
  return null;
}

/**
 * ComponentDef をレンダリング（Map ベースのディスパッチ）。webview / 静的 HTML から利用。
 * WebView は DSL コンポーネントキーの大小文字揺れを吸収しない（exact match のみ T-20260317-006）。
 * 共有カーネル + プレビュー専用 jump 枠は composeRegisteredComponent（T-193）。
 */
export function renderRegisteredComponent(
  comp: ComponentDef,
  key: React.Key,
  context?: RenderContext
): React.ReactNode {
  return composeRegisteredComponent(comp, key, context);
}

/**
 * カスタムコンポーネントを登録するための公開API
 */
export function registerWebViewComponent(name: string, renderer: WebViewComponentRenderer): void {
  registerRenderer(name, renderer);
}

