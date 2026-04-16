import React from 'react';
import type { FormComponent, FormField, FormAction } from '../../domain/dsl-types';
import { Input } from './Input';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { Radio } from './Radio';
import { Select } from './Select';
import { DatePicker } from './DatePicker';
import { Text } from './Text';

interface FormProps extends FormComponent {
  id?: string;
  fields: FormField[];
  actions?: FormAction[];
  onSubmit: (data: Record<string, FormDataEntryValue>) => void;
  children?: React.ReactNode;
}

function renderField(field: FormField, index: number): React.ReactNode {
  if (field.Input) return <Input key={index} {...field.Input} />;
  if (field.Checkbox) return <Checkbox key={index} {...field.Checkbox} />;
  if (field.Radio) return <Radio key={index} {...field.Radio} />;
  if (field.Select) return <Select key={index} {...field.Select} />;
  if (field.DatePicker) return <DatePicker key={index} {...field.DatePicker} />;
  if (field.Text) return <Text key={index} {...field.Text} />;
  return null;
}

export const Form: React.FC<FormProps> = ({
  id,
  fields,
  actions,
  onSubmit,
  children,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries()) as Record<string, FormDataEntryValue>;
    onSubmit(data);
  };

  return (
    <form id={id} onSubmit={handleSubmit} className="textui-container">
      {children ?? (
        <>
          {fields.map((field, i) => renderField(field, i))}
          {actions && actions.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              {actions.map((action, i) => (
                action.Button ? <Button key={i} {...action.Button} /> : null
              ))}
            </div>
          )}
        </>
      )}
    </form>
  );
};
