import React from 'react';
import { CheckboxComponent } from '../types';
import { BaseComponent, BaseComponentProps } from './BaseComponent';

interface CheckboxProps extends CheckboxComponent, BaseComponentProps {
  label: string;
}

interface CheckboxState {
  checked: boolean;
}

export class Checkbox extends BaseComponent<CheckboxProps, CheckboxState> {
  protected defaultClassName = 'textui-checkbox';

  state: CheckboxState = { checked: this.props.checked ?? false };

  constructor(props: CheckboxProps) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }

  private handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!this.props.disabled) {
      this.setState({ checked: e.target.checked });
    }
  }

  render() {
    const { label, name = 'checkbox', disabled = false, className } = this.props;

    return (
      <div className="flex items-center mb-4">
        <input
          type="checkbox"
          id={name}
          name={name}
          checked={this.state.checked}
          disabled={disabled}
          onChange={this.handleChange}
          className={this.mergeClassName(className)}
        />
        <label htmlFor={name} className="ml-2 block text-sm textui-text">
          {label}
        </label>
      </div>
    );
  }
}
