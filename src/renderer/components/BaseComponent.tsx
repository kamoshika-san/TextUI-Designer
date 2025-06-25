import React from 'react';

export interface BaseComponentProps {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * TextUIコンポーネントの基底クラス
 * 共通プロパティとクラス名結合処理を提供する
 */
export abstract class BaseComponent<P extends BaseComponentProps, S = {}> extends React.PureComponent<P, S> {
  /** 各コンポーネントで使用するデフォルトクラス名 */
  protected abstract defaultClassName: string;

  /**
   * デフォルトクラス名とprops.classNameを結合した文字列を返す
   */
  protected getMergedClassName(): string {
    const { className } = this.props;
    return [this.defaultClassName, className].filter(Boolean).join(' ');
  }
}
