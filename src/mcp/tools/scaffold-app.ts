import * as YAML from 'yaml';
import type { TextUICoreEngine } from '../../core/textui-core-engine';
import { generateFlowDsl } from './generate-flow-dsl';

export interface ScaffoldScreenInput {
  id: string;
  title: string;
  components?: unknown[];
}

export interface ScaffoldTransitionInput {
  from: string;
  trigger: string;
  to: string;
}

export interface ScaffoldAppInput {
  title: string;
  outputDir?: string;
  screens: ScaffoldScreenInput[];
  transitions?: ScaffoldTransitionInput[];
}

export interface ScaffoldFile {
  path: string;
  content: string;
}

export interface ScaffoldAppResult {
  files: ScaffoldFile[];
  flowYaml: string;
  valid: boolean;
  diagnostics: unknown[];
}

export async function scaffoldApp(input: ScaffoldAppInput, engine: TextUICoreEngine): Promise<ScaffoldAppResult> {
  const { title, outputDir = '.', screens, transitions = [] } = input;
  const files: ScaffoldFile[] = [];
  const allDiagnostics: unknown[] = [];

  // Generate each screen DSL
  for (const screen of screens) {
    const result = await engine.generateUi({
      title: screen.title,
      pageId: screen.id,
      layout: 'vertical'
    });
    const screenPath = `${outputDir}/${screen.id}.tui.yml`;
    const content = typeof result.dsl === 'string' ? result.dsl : YAML.stringify(result.dsl);
    files.push({ path: screenPath, content });
  }

  // Generate flow DSL
  const flowResult = generateFlowDsl({
    title,
    screens: screens.map(s => ({ id: s.id, file: `${outputDir}/${s.id}.tui.yml` })),
    transitions
  });

  // Validate flow
  const parsed = YAML.parse(flowResult.yaml);
  const validation = engine.validateFlow({ dsl: parsed });
  allDiagnostics.push(...validation.diagnostics);

  return {
    files,
    flowYaml: flowResult.yaml,
    valid: validation.valid,
    diagnostics: allDiagnostics
  };
}
