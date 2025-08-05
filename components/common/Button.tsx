
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'light' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'xl'; // Added 'xl' for larger hero buttons
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isFullWidth?: boolean;
  isLoading?: boolean; // Added isLoading state
}

const ButtonComponent: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  className = '',
  isFullWidth = false,
  isLoading = false,
  disabled,
  ...props
}) => {
  const baseStyles = "font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ease-in-out inline-flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed shadow-subtle hover:shadow-card active:scale-[0.98]";
  
  const variantStyles = {
    primary: 'bg-accent hover:bg-accent-dark text-textOnDark focus:ring-accent/60', 
    secondary: 'bg-secondary text-textDarker border border-transparent hover:bg-secondary/80 focus:ring-accent/50', 
    danger: 'bg-danger hover:bg-red-700 text-white focus:ring-red-500/60',
    ghost: 'bg-transparent hover:bg-accent/10 text-accent focus:ring-accent/50 border border-transparent hover:border-accent/30',
    light: 'bg-primary hover:bg-secondary/60 text-textDarker focus:ring-accent/40 border border-secondary/70', 
    link: 'bg-transparent text-accent hover:underline focus:ring-accent/50 shadow-none hover:shadow-none active:scale-100'
  };

  const sizeStyles = {
    sm: 'px-3.5 py-2 text-xs', // Slightly adjusted
    md: 'px-5 py-2.5 text-sm', // Slightly adjusted
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-3.5 text-lg' // For hero/prominent CTAs
  };

  const fullWidthStyle = isFullWidth ? 'w-full' : '';
  const loadingStyle = isLoading ? 'opacity-75 cursor-wait' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidthStyle} ${loadingStyle} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className={`animate-spin h-5 w-5 ${leftIcon ? 'mr-2' : rightIcon ? '' : 'mr-0'} text-current`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {leftIcon && !isLoading && <span className="mr-2 flex-shrink-0">{leftIcon}</span>}
      <span className="truncate">{children}</span>
      {rightIcon && !isLoading && <span className="ml-2 flex-shrink-0">{rightIcon}</span>}
    </button>
  );
};

export const Button = React.memo(ButtonComponent);
