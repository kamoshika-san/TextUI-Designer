import React from 'react';
import { InputComponent } from '../types';
import { BaseComponent, BaseComponentProps } from './BaseComponent';

interface InputProps extends InputComponent, BaseComponentProps {}

interface InputState {
  value: string;
}

export class Input extends BaseComponent<InputProps, InputState> {
  protected defaultClassName = 'textui-input';

  state: InputState = { value: '' };

  constructor(props: InputProps) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }

  private handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (!this.props.disabled) {
      this.setState({ value: e.target.value });
    }
  }

  render() {
    const {
      label,
      name = 'input',
      type = 'text',
      required = false,
      placeholder,
      disabled = false,
      multiline = false,
      className,
    } = this.props;

    const inputType = multiline ? 'multiline' : type;

    if (inputType === 'multiline') {
      return (
        <div className="mb-4">
          {label && (
            <label htmlFor={name} className="block text-sm font-medium mb-2 textui-text">
              {label}
            </label>
          )}
          <textarea
            id={name}
            name={name}
            value={this.state.value}
            required={required}
            placeholder={placeholder}
            disabled={disabled}
            onChange={this.handleChange}
            className={this.mergeClassName(className)}
            rows={4}
          />
        </div>
      );
    }

    return (
      <div className="mb-4">
        {label && (
          <label htmlFor={name} className="block text-sm font-medium mb-2 textui-text">
            {label}
          </label>
        )}
        <input
          id={name}
          name={name}
          type={inputType}
          value={this.state.value}
          required={required}
          placeholder={placeholder}
          disabled={disabled}
          onChange={this.handleChange}
          className={this.mergeClassName(className)}
        />
      </div>
    );
  }
}
