export const BUILT_IN_COMPONENTS = [
  'Text',
  'Input',
  'Button',
  'Checkbox',
  'Radio',
  'Select',
  'DatePicker',
  'Divider',
  'Spacer',
  'Alert',
  'Container',
  'Form',
  'Accordion',
  'Tabs',
  'TreeView',
  'Table',
  'Link',
  'Breadcrumb',
  'Badge',
  'Progress',
  'Image',
  'Icon',
  'Modal'
] as const;

export type BuiltInComponentName = typeof BUILT_IN_COMPONENTS[number];

