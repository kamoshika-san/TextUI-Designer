import React from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import type { FormComponent, FormField, FormAction } from '../types';
import { BaseComponent, BaseComponentProps } from './BaseComponent';

interface FormProps extends FormComponent, BaseComponentProps {
  onSubmit: (data: any) => void;
  children: React.ReactNode;
}

export class Form extends BaseComponent<FormProps> {
  protected defaultClassName = 'textui-container';

  constructor(props: FormProps) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  private handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    this.props.onSubmit(data);
  }

  render() {
    const { id, children, className } = this.props;

    return (
      <form id={id} onSubmit={this.handleSubmit} className={this.mergeClassName(className)}>
        {children}
      </form>
    );
  }
}
