import * as fs from 'fs';
import type { SchemaDefinition } from '../../types';

export type SchemaKind = 'main' | 'template' | 'theme';

interface SchemaSlot {
  getPath: () => string;
  cache: SchemaDefinition | null;
  lastLoad: number;
  cacheHitLog: string;
  cacheSetLog: string;
  readErrorPrefix: string;
}

export class SchemaCacheStore {
  private readonly slots: Record<SchemaKind, SchemaSlot>;

  constructor(paths: { main: () => string; template: () => string; theme: () => string }) {
    this.slots = {
      main: {
        getPath: paths.main,
        cache: null,
        lastLoad: 0,
        cacheHitLog: '[SchemaManager] キャッシュされたスキーマを使用',
        cacheSetLog: '[SchemaManager] スキーマをキャッシュに保存',
        readErrorPrefix: 'スキーマファイルの読み込みに失敗しました'
      },
      template: {
        getPath: paths.template,
        cache: null,
        lastLoad: 0,
        cacheHitLog: '[SchemaManager] キャッシュされたテンプレートスキーマを使用',
        cacheSetLog: '[SchemaManager] テンプレートスキーマをキャッシュに保存',
        readErrorPrefix: 'テンプレートスキーマファイルの読み込みに失敗しました'
      },
      theme: {
        getPath: paths.theme,
        cache: null,
        lastLoad: 0,
        cacheHitLog: '[SchemaManager] キャッシュされたテーマスキーマを使用',
        cacheSetLog: '[SchemaManager] テーマスキーマをキャッシュに保存',
        readErrorPrefix: 'テーマスキーマファイルの読み込みに失敗しました'
      }
    };
  }

  load(kind: SchemaKind, cacheTTL: number, debug: (message: string, ...args: unknown[]) => void): SchemaDefinition {
    const slot = this.slots[kind];
    const now = Date.now();

    if (slot.cache && now - slot.lastLoad < cacheTTL) {
      debug(slot.cacheHitLog);
      return slot.cache;
    }

    try {
      const parsedSchema = JSON.parse(fs.readFileSync(slot.getPath(), 'utf-8')) as SchemaDefinition;
      slot.cache = parsedSchema;
      slot.lastLoad = now;
      debug(slot.cacheSetLog);
      return parsedSchema;
    } catch (error) {
      throw new Error(`${slot.readErrorPrefix}: ${error}`);
    }
  }

  clear(): void {
    Object.values(this.slots).forEach(slot => {
      slot.cache = null;
      slot.lastLoad = 0;
    });
  }

  getDebugSnapshot(): Record<SchemaKind, { cached: boolean; lastLoad: number }> {
    return {
      main: { cached: this.slots.main.cache !== null, lastLoad: this.slots.main.lastLoad },
      template: { cached: this.slots.template.cache !== null, lastLoad: this.slots.template.lastLoad },
      theme: { cached: this.slots.theme.cache !== null, lastLoad: this.slots.theme.lastLoad }
    };
  }
}
