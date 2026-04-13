export interface GenerateFlowScreenInput {
  id: string;
  file?: string;
}

export interface GenerateFlowTransitionInput {
  from: string;
  trigger: string;
  to: string;
}

export interface GenerateFlowInput {
  title: string;
  flowId?: string;
  entry?: string;
  screens: GenerateFlowScreenInput[];
  transitions?: GenerateFlowTransitionInput[];
}

export interface GenerateFlowResult {
  yaml: string;
  flowId: string;
  entry: string;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function generateFlowDsl(input: GenerateFlowInput): GenerateFlowResult {
  const { title, screens, transitions = [] } = input;
  const flowId = input.flowId ?? slugify(title);
  const entry = input.entry ?? screens[0].id;

  const screensYaml = screens
    .map(s => {
      const page = s.file ?? `${s.id}.tui.yml`;
      return `    - id: ${s.id}\n      page: ${page}`;
    })
    .join('\n');

  const transitionsYaml = transitions.length > 0
    ? transitions
        .map(t => `    - from: ${t.from}\n      trigger: "${t.trigger}"\n      to: ${t.to}`)
        .join('\n')
    : '';

  const transitionsBlock = transitionsYaml
    ? `  transitions:\n${transitionsYaml}\n`
    : '';

  const yaml =
    `flow:\n` +
    `  id: ${flowId}\n` +
    `  title: "${title}"\n` +
    `  entry: ${entry}\n` +
    `  screens:\n${screensYaml}\n` +
    transitionsBlock;

  return { yaml, flowId, entry };
}
