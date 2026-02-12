import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', icon, className = '', ...props 
}) => {
  const baseClasses = "flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-orange-600 text-white hover:bg-orange-700 shadow-sm",
    secondary: "bg-gray-800 text-white hover:bg-gray-900 shadow-sm",
    danger: "bg-white border border-red-500 text-red-600 hover:bg-red-50",
    outline: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
  };

  return (
    <button className={`${baseClasses} ${variants[variant]} ${className}`} {...props}>
      {icon}
      {children}
    </button>
  );
};