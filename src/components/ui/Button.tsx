'use client';

import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary: 'bg-cafeteria-600 hover:bg-cafeteria-700 text-cream-50',
  secondary: 'bg-cafeteria-200 hover:bg-cafeteria-300 text-cafeteria-900',
  outline: 'border-2 border-cafeteria-600 text-cafeteria-700 hover:bg-cafeteria-50',
  ghost: 'text-cafeteria-700 hover:bg-cafeteria-100',
};

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`rounded-lg font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
