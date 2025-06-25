import React from 'react';
import { RadioComponent, RadioOption } from '../types';
import { BaseComponent, BaseComponentProps } from './BaseComponent';

interface RadioProps extends RadioComponent, BaseComponentProps {}

interface RadioState {
  selectedValue: string;
}

export class Radio extends BaseComponent<RadioProps, RadioState> {
  protected defaultClassName = 'textui-radio';

  state: RadioState = { selectedValue: this.props.value || '' };

  constructor(props: RadioProps) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }

  private handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!this.props.disabled) {
      this.setState({ selectedValue: e.target.value });
    }
  }

  render() {
    const { label, name = 'radio', disabled = false, options = [], className } = this.props;

    return (
      <div className="textui-radio-group">
        {label && (
          <label className="block text-sm font-medium mb-2 textui-text">{label}</label>
        )}
        {options.map((option, index) => (
          <div key={index} className="textui-radio-option">
            <input
              type="radio"
              id={`${name}-${index}`}
              name={name}
              value={option.value}
              checked={this.state.selectedValue === option.value}
              disabled={disabled}
              onChange={this.handleChange}
              className={this.mergeClassName(className)}
            />
            <label htmlFor={`${name}-${index}`} className="textui-text">
              {option.label}
            </label>
          </div>
        ))}
      </div>
    );
  }
}
