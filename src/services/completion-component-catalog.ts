import {
  BUILT_IN_COMPONENTS,
  COMPONENT_MANIFEST,
  type CompletionValue as ManifestCompletionValue,
  type ComponentProperty as ManifestComponentProperty
} from '../registry/component-manifest';

export type CompletionValue = ManifestCompletionValue;
export type ComponentProperty = ManifestComponentProperty;

export const COMPONENT_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
  BUILT_IN_COMPONENTS.map(componentName => [componentName, COMPONENT_MANIFEST[componentName].description])
);

export const COMPONENT_PROPERTIES: Record<string, ComponentProperty[]> = Object.fromEntries(
  BUILT_IN_COMPONENTS.map(componentName => [
    componentName,
    COMPONENT_MANIFEST[componentName].properties.map(property => {
      if (property.values) {
        return {
          ...property,
          values: [...property.values]
        };
      }
      return {
        ...property
      };
    })
  ])
);
