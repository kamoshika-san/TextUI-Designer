/**
 * 互換レイヤ（registry）: 既存 import を壊さないための re-export 集約。
 *
 * - **新規コード**の参照先: `COMPONENT_DEFINITIONS`（`component-definitions`）、
 *   schema の列挙は `src/services/schema/schema-descriptor-selectors`、VS Code 補完は `completion-component-catalog`。
 * - **本ファイル**は compatibility のみ。新規機能ではここを経由せず、上記モジュールへ直接 import する。
 */
import { BUILT_IN_COMPONENTS, type BuiltInComponentName } from '../components/definitions/built-in-components';
import {
  COMPONENT_MANIFEST,
  type ComponentManifestEntry,
  type ComponentProperty,
  type CompletionValue
} from '../components/definitions/manifest';

export { getComponentSchemaRefs } from '../services/schema/schema-descriptor-selectors';

export { BUILT_IN_COMPONENTS, type BuiltInComponentName };
export { COMPONENT_MANIFEST, type ComponentManifestEntry, type ComponentProperty, type CompletionValue };

export function isBuiltInComponentName(name: string): name is BuiltInComponentName {
  return (BUILT_IN_COMPONENTS as readonly string[]).includes(name);
}
