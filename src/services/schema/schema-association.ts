export type JsonSchemaAssociation = {
  fileMatch?: string[];
  schema?: {
    $id?: string;
    title?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export function filterTextUiYamlSchemas(currentSchemas: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(currentSchemas).filter(([uri, patterns]) => {
      const isTextUIDesignerSchema = uri.includes('textui-designer')
        || uri.includes('schema.json')
        || uri.includes('navigation-schema.json')
        || uri.includes('template-schema.json')
        || uri.includes('theme-schema.json');
      const hasTextUIPatterns = patterns.some(pattern =>
        pattern.includes('tui') || pattern.includes('template') || pattern.includes('theme'));
      return !isTextUIDesignerSchema && !hasTextUIPatterns;
    })
  );
}

export function filterTextUiJsonSchemas(currentSchemas: JsonSchemaAssociation[]): JsonSchemaAssociation[] {
  return currentSchemas.filter((schema: JsonSchemaAssociation) => {
    const hasTextUIMatch = schema.fileMatch?.some((match: string) =>
      match.includes('tui') || match.includes('template') || match.includes('theme'));
    const isTextUISchema = schema.schema?.$id?.includes('textui') || schema.schema?.title?.includes('TextUI');
    return !hasTextUIMatch && !isTextUISchema;
  });
}

export function buildTextUiYamlSchemas(
  baseSchemas: Record<string, string[]>,
  schemaUri: string,
  navigationSchemaUri: string,
  templateSchemaUri: string,
  themeSchemaUri: string
): Record<string, string[]> {
  return {
    ...baseSchemas,
    [schemaUri]: ['*.tui.yml', '*.tui.yaml'],
    [navigationSchemaUri]: ['*.tui.flow.yml', '*.tui.flow.yaml'],
    [templateSchemaUri]: ['*.template.yml', '*.template.yaml'],
    [themeSchemaUri]: ['*-theme.yml', '*-theme.yaml', '*_theme.yml', '*_theme.yaml', 'textui-theme.yml', 'textui-theme.yaml']
  };
}

export function buildTextUiJsonSchemas(
  baseSchemas: JsonSchemaAssociation[],
  schemaContent: unknown,
  navigationSchemaContent: unknown,
  templateSchemaContent: unknown,
  themeSchemaContent: unknown
): JsonSchemaAssociation[] {
  return [
    ...baseSchemas,
    { fileMatch: ['*.tui.json'], schema: schemaContent as JsonSchemaAssociation['schema'] },
    { fileMatch: ['*.tui.flow.json'], schema: navigationSchemaContent as JsonSchemaAssociation['schema'] },
    { fileMatch: ['*.template.json'], schema: templateSchemaContent as JsonSchemaAssociation['schema'] },
    { fileMatch: ['*-theme.json', '*_theme.json', 'textui-theme.json'], schema: themeSchemaContent as JsonSchemaAssociation['schema'] }
  ];
}
