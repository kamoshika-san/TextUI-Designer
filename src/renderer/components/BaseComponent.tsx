import React from 'react';

export interface BaseComponentProps {
  className?: string;
}

export class BaseComponent<P extends BaseComponentProps, S = {}> extends React.Component<P, S> {
  protected defaultClassName = '';

  protected mergeClassName(custom?: string): string {
    return [this.defaultClassName, custom].filter(Boolean).join(' ');
  }
}
