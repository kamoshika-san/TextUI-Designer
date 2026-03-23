/**
 * レイアウト・複合 DSL コンポーネント型（RF1-S2-T3）。
 * `ComponentDef` への再帰は `import('./component-def').ComponentDef` で前方参照し、循環 import を避ける。
 */

export type DividerOrientation = 'horizontal' | 'vertical';
export type DividerSpacing = 'sm' | 'md' | 'lg';
export type SpacerAxis = 'vertical' | 'horizontal';
export type SpacerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface DividerComponent {
  orientation?: DividerOrientation;
  spacing?: DividerSpacing;
  token?: string;
}

export interface SpacerComponent {
  axis?: SpacerAxis;
  size?: SpacerSize;
  width?: string;
  height?: string;
  token?: string;
}

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertComponent {
  variant?: AlertVariant;
  message: string;
  title?: string;
  token?: string;
}

export interface AccordionItem {
  title: string;
  content?: string;
  components?: import('./component-def').ComponentDef[];
  open?: boolean;
}

export interface AccordionComponent {
  allowMultiple?: boolean;
  items: AccordionItem[];
  token?: string;
}

export interface TabsItem {
  label: string;
  disabled?: boolean;
  components?: import('./component-def').ComponentDef[];
}

export interface TabsComponent {
  defaultTab?: number;
  items: TabsItem[];
  token?: string;
}

export interface TreeViewItem {
  label: string;
  icon?: string;
  expanded?: boolean;
  components?: import('./component-def').ComponentDef[];
  children?: TreeViewItem[];
}

export interface TreeViewComponent {
  items: TreeViewItem[];
  showLines?: boolean;
  expandAll?: boolean;
  token?: string;
}

export interface TableColumn {
  key: string;
  header: string;
  width?: string;
}

export type TableCellValue =
  | string
  | number
  | boolean
  | null
  | import('./component-def').ComponentDef;

export interface TableComponent {
  columns: TableColumn[];
  rows: Record<string, TableCellValue>[];
  striped?: boolean;
  rowHover?: boolean;
  width?: string;
  token?: string;
}

export type ContainerLayout = 'vertical' | 'horizontal' | 'flex' | 'grid';

export interface ContainerComponent {
  layout?: ContainerLayout;
  components?: import('./component-def').ComponentDef[];
  width?: string;
  flexGrow?: number;
  minWidth?: string;
  token?: string;
  tokenSlots?: string[];
}
