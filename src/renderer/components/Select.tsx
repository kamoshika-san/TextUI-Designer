import React from 'react';
import { SelectComponent, SelectOption } from '../types';
import { BaseComponent, BaseComponentProps } from './BaseComponent';

interface SelectProps extends SelectComponent, BaseComponentProps {}

interface SelectState {
  selectedValue: string;
}

export class Select extends BaseComponent<SelectProps, SelectState> {
  protected defaultClassName = 'textui-select';

  state: SelectState = { selectedValue: '' };

  constructor(props: SelectProps) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }

  private handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!this.props.disabled) {
      this.setState({ selectedValue: e.target.value });
    }
  }

  render() {
    const {
      label,
      name = 'select',
      options = [],
      placeholder,
      disabled = false,
      multiple = false,
      className,
    } = this.props;

    return (
      <div className={this.mergeClassName(className)}>
        {label && (
          <label htmlFor={name} className="textui-text">
            {label}
          </label>
        )}
        <select
          id={name}
          name={name}
          multiple={multiple}
          disabled={disabled}
          value={this.state.selectedValue}
          onChange={this.handleChange}
        >
          {placeholder && !multiple && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((option, index) => (
            <option key={index} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
}
