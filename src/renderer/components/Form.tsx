import React from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import type { FormField, FormAction } from '../types';

interface FormProps {
  id: string;
  fields: FormField[];
  actions: FormAction[];
  onSubmit?: (data: Record<string, any>) => void;
  children?: React.ReactNode;
}

export const Form: React.FC<FormProps> = ({
  id,
  fields,
  actions,
  onSubmit,
  children,
}) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onSubmit) {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      onSubmit(data);
    }
  };

  return (
    <form id={id} onSubmit={handleSubmit} className="space-y-6">
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