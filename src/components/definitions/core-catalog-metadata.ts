import { BUILT_IN_COMPONENTS, type BuiltInComponentName } from './built-in-components';

/**
 * MCP / TextUICoreEngine `listComponents` 向けメタ（英語説明・必須任意・例）。
 * 旧 `core/component-catalog.ts` の単一情報源。
 */
export type CoreCatalogMeta = {
  catalogSummaryEn: string;
  requiredProps: string[];
  optionalProps: string[];
  supportsChildren: boolean;
  example: Record<string, unknown>;
};

export const CORE_CATALOG_METADATA: Record<BuiltInComponentName, CoreCatalogMeta> = {
  Text: {
    catalogSummaryEn: 'Heading/body text display.',
    requiredProps: ['variant', 'value'],
    optionalProps: ['token'],
    supportsChildren: false,
    example: { Text: { variant: 'h2', value: 'Login' } }
  },
  Input: {
    catalogSummaryEn: 'Single-line or multiline text input.',
    requiredProps: ['label', 'name', 'type'],
    optionalProps: ['required', 'placeholder', 'token'],
    supportsChildren: false,
    example: { Input: { label: 'Email', name: 'email', type: 'email', required: true } }
  },
  Button: {
    catalogSummaryEn: 'Action button.',
    requiredProps: ['label'],
    optionalProps: ['kind', 'submit', 'icon', 'iconPosition', 'token'],
    supportsChildren: false,
    example: { Button: { icon: '⭐', label: 'Submit', kind: 'primary' } }
  },
  Checkbox: {
    catalogSummaryEn: 'Checkbox input.',
    requiredProps: ['label', 'name'],
    optionalProps: ['required', 'token'],
    supportsChildren: false,
    example: { Checkbox: { label: 'I agree', name: 'terms', required: true } }
  },
  Radio: {
    catalogSummaryEn: 'Radio group input.',
    requiredProps: ['label', 'name', 'options'],
    optionalProps: ['token'],
    supportsChildren: false,
    example: {
      Radio: {
        label: 'Plan',
        name: 'plan',
        options: [
          { label: 'Basic', value: 'basic' },
          { label: 'Pro', value: 'pro' }
        ]
      }
    }
  },
  Select: {
    catalogSummaryEn: 'Select box input.',
    requiredProps: ['label', 'name', 'options'],
    optionalProps: ['multiple', 'placeholder', 'token'],
    supportsChildren: false,
    example: {
      Select: {
        label: 'Country',
        name: 'country',
        options: [
          { label: 'Japan', value: 'jp' },
          { label: 'United States', value: 'us' }
        ]
      }
    }
  },
  DatePicker: {
    catalogSummaryEn: 'Date selection input.',
    requiredProps: ['label', 'name'],
    optionalProps: ['required', 'disabled', 'min', 'max', 'value', 'token'],
    supportsChildren: false,
    example: { DatePicker: { label: 'Birthday', name: 'birthday', required: true } }
  },
  Divider: {
    catalogSummaryEn: 'Visual divider line.',
    requiredProps: [],
    optionalProps: ['orientation', 'token'],
    supportsChildren: false,
    example: { Divider: { orientation: 'horizontal' } }
  },
  Spacer: {
    catalogSummaryEn: 'Layout spacing element.',
    requiredProps: [],
    optionalProps: ['axis', 'size', 'width', 'height', 'token'],
    supportsChildren: false,
    example: { Spacer: { axis: 'vertical', size: 'md' } }
  },
  Alert: {
    catalogSummaryEn: 'Status or warning message.',
    requiredProps: ['variant', 'message'],
    optionalProps: ['token'],
    supportsChildren: false,
    example: { Alert: { variant: 'warning', message: 'There are missing fields.' } }
  },
  Container: {
    catalogSummaryEn: 'Group child components with layout.',
    requiredProps: ['components'],
    optionalProps: ['layout', 'width', 'token'],
    supportsChildren: true,
    example: {
      Container: {
        layout: 'vertical',
        components: [
          { Text: { variant: 'h3', value: 'Profile' } },
          { Input: { label: 'Name', name: 'name', type: 'text' } }
        ]
      }
    }
  },
  Form: {
    catalogSummaryEn: 'Group fields and action buttons.',
    requiredProps: ['fields'],
    optionalProps: ['id', 'actions', 'token'],
    supportsChildren: true,
    example: {
      Form: {
        id: 'login-form',
        fields: [{ Input: { label: 'Email', name: 'email', type: 'email', required: true } }],
        actions: [{ Button: { label: 'Login', kind: 'submit', submit: true } }]
      }
    }
  },
  Accordion: {
    catalogSummaryEn: 'Collapsible section list.',
    requiredProps: ['items'],
    optionalProps: ['allowMultiple', 'token', 'items[].title', 'items[].content', 'items[].components', 'items[].open'],
    supportsChildren: true,
    example: {
      Accordion: {
        items: [{ title: 'FAQ', content: 'You can put details here.' }]
      }
    }
  },
  Tabs: {
    catalogSummaryEn: 'Tabbed content switcher.',
    requiredProps: ['items', 'items[].label'],
    optionalProps: ['defaultTab', 'token', 'items[].disabled', 'items[].components'],
    supportsChildren: true,
    example: {
      Tabs: {
        defaultTab: 0,
        items: [
          { label: 'Profile', components: [{ Input: { label: 'Name', name: 'name', type: 'text' } }] },
          { label: 'Settings', components: [{ Checkbox: { label: 'Enable notifications', name: 'notify' } }] }
        ]
      }
    }
  },
  TreeView: {
    catalogSummaryEn: 'Hierarchical tree view.',
    requiredProps: ['items', 'items[].label'],
    optionalProps: ['showLines', 'expandAll', 'token', 'items[].icon', 'items[].expanded', 'items[].components', 'items[].children'],
    supportsChildren: true,
    example: {
      TreeView: {
        items: [
          { label: 'src', expanded: true, children: [{ label: 'index.ts' }] },
          { label: 'README.md' }
        ]
      }
    }
  },
  Table: {
    catalogSummaryEn: 'Tabular data display.',
    requiredProps: ['columns', 'rows', 'columns[].key', 'columns[].header'],
    optionalProps: ['striped', 'rowHover', 'width', 'token'],
    supportsChildren: false,
    example: {
      Table: {
        columns: [{ key: 'name', header: 'Name' }],
        rows: [{ name: 'Alice' }]
      }
    }
  },
  Link: {
    catalogSummaryEn: 'Hyperlink text.',
    requiredProps: ['href', 'label'],
    optionalProps: ['target', 'token'],
    supportsChildren: false,
    example: { Link: { href: 'https://example.com', label: 'Open docs', target: '_blank' } }
  },
  Breadcrumb: {
    catalogSummaryEn: 'Path-like hierarchical navigation.',
    requiredProps: ['items', 'items[].label'],
    optionalProps: ['separator', 'items[].href', 'items[].target', 'token'],
    supportsChildren: false,
    example: {
      Breadcrumb: {
        separator: '>',
        items: [
          { label: 'owner', href: 'https://github.com/owner' },
          { label: 'repo', href: 'https://github.com/owner/repo' }
        ]
      }
    }
  },
  Badge: {
    catalogSummaryEn: 'Tag/label pill (badge or chip).',
    requiredProps: ['label'],
    optionalProps: ['variant', 'size', 'token'],
    supportsChildren: false,
    example: { Badge: { label: 'react', variant: 'default' } }
  },
  Progress: {
    catalogSummaryEn: 'Horizontal progress bar for percentages.',
    requiredProps: ['value または segments'],
    optionalProps: ['segments', 'label', 'showValue', 'variant', 'token'],
    supportsChildren: false,
    example: {
      Progress: {
        label: 'Languages',
        segments: [
          { label: 'TypeScript', value: 54.5, variant: 'primary' },
          { label: 'JavaScript', value: 43.6, variant: 'warning' },
          { label: 'CSS', value: 1.8, variant: 'error' }
        ],
        showValue: true
      }
    }
  },
  Image: {
    catalogSummaryEn: 'Image display.',
    requiredProps: ['src'],
    optionalProps: ['alt', 'width', 'height', 'token'],
    supportsChildren: false,
    example: { Image: { src: 'https://example.com/logo.png', alt: 'Company logo', width: '120px', height: 'auto' } }
  },
  Icon: {
    catalogSummaryEn: 'Icon display (emoji/symbol).',
    requiredProps: ['name'],
    optionalProps: ['label', 'token'],
    supportsChildren: false,
    example: { Icon: { name: '📁', label: 'Folder' } }
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
BUILT_IN_COMPONENTS.every((name) => Boolean(CORE_CATALOG_METADATA[name]));
