import React from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import type { FormComponent, FormField, FormAction } from '../domain/dsl-types';

interface FormProps extends FormComponent {
  id?: string;
  fields: FormField[];
  actions?: FormAction[];
  onSubmit: (data: Record<string, FormDataEntryValue>) => void;
  children: React.ReactNode;
}

export const Form: React.FC<FormProps> = ({
  id,
  fields: _fields,
  actions: _actions,
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
      {/* childrenでfields/actionsを描画する場合 */}
      {children}
      {/* 直接描画する場合は下記を有効化
      {fields.map((field, i) => {
        if (field.Input) return <Input key={i} {...field.Input} />;
        if (field.Checkbox) return <Checkbox key={i} {...field.Checkbox} />;
        return null;
      })}
      <div className="flex space-x-4">
        {actions.map((action, i) => {
          if (action.Button) return <Button key={i} {...action.Button} />;
          return null;
        })}
      </div>
      */}
    </form>
  );
}; 
