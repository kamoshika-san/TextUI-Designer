import { COMPONENT_DEFINITIONS } from '../components/definitions/component-definitions';
import type { ComponentDefinition } from '../components/definitions/types';

const descriptorMap = new Map<string, ComponentDefinition>(
  COMPONENT_DEFINITIONS.map(def => [def.name, def])
);

/**
 * コンポーネント定義への参照窓口。
 * 定義参照を this module に集約し、各レイヤの direct import を減らす。
 */
export class ComponentDescriptorRegistry {
  list(): readonly ComponentDefinition[] {
    return COMPONENT_DEFINITIONS;
  }

  get(name: string): ComponentDefinition | undefined {
    return descriptorMap.get(name);
  }

  getSchemaRefs(): string[] {
    return COMPONENT_DEFINITIONS.map(def => def.schemaRef);
  }

  getPreviewRenderer(name: string): ComponentDefinition['previewRendererKey'] | undefined {
    return this.get(name)?.previewRendererKey;
  }

  getExporterHandlerKey(name: string): ComponentDefinition['exporterRendererMethod'] | undefined {
    return this.get(name)?.exporterRendererMethod;
  }
}

export const componentDescriptorRegistry = new ComponentDescriptorRegistry();
