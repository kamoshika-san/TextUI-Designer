import type { TextVariant, ButtonKind } from '../renderer/types';

export type ExportFormat = 'html' | 'react' | 'pug';

export interface StyleConfig {
  variantClasses: Record<string, string>;
  kindClasses: Record<string, string>;
  sizeClasses: Record<string, string>;
  weightClasses: Record<string, string>;
  spacingClasses: Record<string, string>;
  alertVariantClasses: Record<string, string>;
}

/**
 * スタイル設定を一元管理するクラス
 */
export class StyleManager {
  private static readonly HTML_STYLES: StyleConfig = {
    variantClasses: {
      h1: 'text-4xl font-bold mb-4 text-gray-300',
      h2: 'text-3xl font-semibold mb-3 text-gray-300',
      h3: 'text-2xl font-medium mb-2 text-gray-300',
      p: 'text-base mb-2 text-gray-300',
      small: 'text-sm text-gray-400',
      caption: 'text-xs text-gray-500',
    },
    kindClasses: {
      primary: 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
      secondary: 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm bg-gray-700 hover:bg-gray-600 text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500',
      submit: 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
    },
    sizeClasses: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl'
    },
    weightClasses: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold'
    },
    spacingClasses: {
      sm: 'my-2',
      md: 'my-4',
      lg: 'my-6'
    },
    alertVariantClasses: {
      info: 'bg-blue-900 border-blue-700 text-blue-200',
      success: 'bg-green-900 border-green-700 text-green-200',
      warning: 'bg-yellow-900 border-yellow-700 text-yellow-200',
      error: 'bg-red-900 border-red-700 text-red-200'
    }
  };

  private static readonly REACT_STYLES: StyleConfig = {
    variantClasses: {
      h1: 'text-4xl font-bold mb-4 text-gray-900',
      h2: 'text-3xl font-semibold mb-3 text-gray-900',
      h3: 'text-2xl font-medium mb-2 text-gray-900',
      p: 'text-base mb-2 text-gray-700',
      small: 'text-sm text-gray-600',
      caption: 'text-xs text-gray-500'
    },
    kindClasses: {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
      submit: 'bg-green-600 hover:bg-green-700 text-white'
    },
    sizeClasses: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl'
    },
    weightClasses: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold'
    },
    spacingClasses: {
      sm: 'my-2',
      md: 'my-4',
      lg: 'my-6'
    },
    alertVariantClasses: {
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      success: 'bg-green-50 border-green-200 text-green-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      error: 'bg-red-50 border-red-200 text-red-800'
    }
  };

  private static readonly PUG_STYLES: StyleConfig = {
    variantClasses: {
      h1: 'text-4xl font-bold mb-4 text-gray-900',
      h2: 'text-3xl font-semibold mb-3 text-gray-900',
      h3: 'text-2xl font-medium mb-2 text-gray-900',
      p: 'text-base mb-2 text-gray-700',
      small: 'text-sm text-gray-600',
      caption: 'text-xs text-gray-500'
    },
    kindClasses: {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
      submit: 'bg-green-600 hover:bg-green-700 text-white'
    },
    sizeClasses: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl'
    },
    weightClasses: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold'
    },
    spacingClasses: {
      sm: 'my-2',
      md: 'my-4',
      lg: 'my-6'
    },
    alertVariantClasses: {
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      success: 'bg-green-50 border-green-200 text-green-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      error: 'bg-red-50 border-red-200 text-red-800'
    }
  };

  /**
   * 指定されたフォーマットのスタイル設定を取得
   */
  static getStyles(format: ExportFormat): StyleConfig {
    switch (format) {
      case 'html':
        return this.HTML_STYLES;
      case 'react':
        return this.REACT_STYLES;
      case 'pug':
        return this.PUG_STYLES;
      default:
        return this.HTML_STYLES;
    }
  }

  /**
   * バリアントクラスを取得
   */
  static getVariantClasses(format: ExportFormat): Record<string, string> {
    return this.getStyles(format).variantClasses;
  }

  /**
   * ボタン種別クラスを取得
   */
  static getKindClasses(format: ExportFormat): Record<string, string> {
    return this.getStyles(format).kindClasses;
  }

  /**
   * サイズクラスを取得
   */
  static getSizeClasses(format: ExportFormat): Record<string, string> {
    return this.getStyles(format).sizeClasses;
  }

  /**
   * ウェイトクラスを取得
   */
  static getWeightClasses(format: ExportFormat): Record<string, string> {
    return this.getStyles(format).weightClasses;
  }

  /**
   * スペーシングクラスを取得
   */
  static getSpacingClasses(format: ExportFormat): Record<string, string> {
    return this.getStyles(format).spacingClasses;
  }

  /**
   * アラートバリアントクラスを取得
   */
  static getAlertVariantClasses(format: ExportFormat): Record<string, string> {
    return this.getStyles(format).alertVariantClasses;
  }

  /**
   * テキストバリアントのデフォルト設定を取得
   */
  static getTextVariantConfig(variant: TextVariant, format: ExportFormat): { element: string; className: string } {
    const variantClasses = this.getVariantClasses(format);
    const className = variantClasses[variant] || variantClasses.p;
    
    const element = variant.startsWith('h') ? variant : 'p';
    
    return { element, className };
  }

  /**
   * ボタン種別のクラスを取得
   */
  static getButtonKindClass(kind: ButtonKind, format: ExportFormat): string {
    const kindClasses = this.getKindClasses(format);
    return kindClasses[kind] || kindClasses.primary;
  }
} 