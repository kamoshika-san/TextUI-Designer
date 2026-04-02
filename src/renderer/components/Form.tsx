import React from 'react';
import type { FormComponent, FormField, FormAction } from '../../domain/dsl-types';

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
      {children}
    </form>
  );
}; 
