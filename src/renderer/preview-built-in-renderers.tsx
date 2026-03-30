/**
 * WebView 組み込み preview レンダラーの実装（descriptor の previewRendererKey と対応）。
 * component-map はレジストリ登録と {@link renderRegisteredComponent} の公開に専念する。
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
  IconComponent,
  ModalComponent
} from '../domain/dsl-types';
import { decodeDslComponentObjectProps, decodeTextDslComponent } from '../registry/dsl-component-codec';
import { type BuiltInComponentName } from '../components/definitions/built-in-components';
import {
  getWebViewComponentRenderer,
  type WebViewComponentRenderer
} from '../registry/webview-component-registry';
import type { RenderContext } from './render-context';
import {
  attachRenderContext,
  createChildContext,
  extractRenderContext
} from './render-context';

export type PreviewRendererDeps = {
  renderRegisteredComponent: (
    comp: ComponentDef,
    key: React.Key,
    context?: RenderContext
  ) => React.ReactNode;
};

/** WebViewComponentRenderer の props を FormComponent として扱う（DSL 由来のため意図的なキャスト） */
function toFormComponent(props: Record<string, unknown>): FormComponent {
  return props as unknown as FormComponent;
}

/** プレビュー用 props から `__renderContext` を外し、codec に渡す DSL 形へ整える（T-182） */
function propsWithoutRenderContext(props: Record<string, unknown>): Record<string, unknown> {
  const { __renderContext: _c, ...rest } = props;
  return rest;
}

/** 単純な組み込み: props を型キャストしてそのままマウントする preview レンダラー */
function simplePreview<P extends object>(
  Ui: React.ComponentType<P>,
  cast: (props: unknown) => P
): WebViewComponentRenderer {
  return (props, key) => <Ui key={key} {...cast(props)} />;
}

/**
 * descriptor の各 `previewRendererKey` に対応する実装テーブル（`COMPONENT_DEFINITIONS` の built-in と 1:1）。
 */
export function createBuiltInPreviewRenderers(deps: PreviewRendererDeps): Record<
  BuiltInComponentName,
  WebViewComponentRenderer
> {
  const { renderRegisteredComponent } = deps;

  const renderFormField = (field: FormField, index: number, context?: RenderContext): React.ReactNode => {
    const decoded = decodeDslComponentObjectProps(field);
    const name = decoded.value?.name;
    const fieldProps = decoded.value?.props;
    const renderer = name ? getWebViewComponentRenderer(name) : undefined;
    if (name && fieldProps && renderer) {
      return renderer(attachRenderContext(fieldProps, context), index);
    }
    return null;
  };

  return {
    Text: (props, key) => {
      const raw = props as Record<string, unknown>;
      const decoded = decodeTextDslComponent({ Text: propsWithoutRenderContext(raw) });
      if (decoded.value) {
        return <Text key={key} {...decoded.value.props} />;
      }
      return <Text key={key} {...(props as unknown as TextComponent)} />;
    },
    Input: simplePreview(Input, p => p as InputComponent),
    Button: simplePreview(Button, p => p as ButtonComponent),
    Checkbox: simplePreview(Checkbox, p => p as CheckboxComponent),
    Radio: simplePreview(Radio, p => p as RadioComponent),
    Select: simplePreview(Select, p => p as SelectComponent),
    DatePicker: simplePreview(DatePicker, p => p as DatePickerComponent),
    Divider: simplePreview(Divider, p => p as DividerComponent),
    Spacer: simplePreview(Spacer, p => p as SpacerComponent),
    Alert: simplePreview(Alert, p => p as AlertComponent),
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
        renderComponent={(component, childKey) =>
          renderRegisteredComponent(component, childKey, extractRenderContext(props))
        }
      />
    ),
    Link: simplePreview(Link, p => p as LinkComponent),
    Breadcrumb: simplePreview(Breadcrumb, p => p as BreadcrumbComponent),
    Badge: simplePreview(Badge, p => p as BadgeComponent),
    Progress: simplePreview(Progress, p => p as ProgressComponent),
    Image: simplePreview(Image, p => p as ImageComponent),
    Icon: simplePreview(Icon, p => p as IconComponent),
    // TODO T-20260330-302: replace with real Modal preview renderer
    Modal: (_props, key) => {
      const modal = _props as unknown as ModalComponent;
      return (
        <div key={key} style={{ border: '1px dashed #6b7280', borderRadius: '0.5rem', padding: '1rem', color: '#9ca3af', fontSize: '0.875rem' }}>
          Modal{modal.title ? `: ${modal.title}` : ''} (preview pending T-20260330-302)
        </div>
      );
    },
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
            ? children.map((child: ComponentDef, i: number) =>
                renderRegisteredComponent(
                  child,
                  i,
                  createChildContext(context, `${containerPath}/Container/components/${i}`)
                )
              )
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
          {(form.fields || []).map((field: FormField, i: number) =>
            renderFormField(field, i, createChildContext(context, `${formPath}/Form/fields/${i}`))
          )}
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
}
