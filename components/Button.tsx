import React from 'react';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'active';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  onClick, 
  children, 
  className = '', 
  variant = 'primary',
  disabled = false
}) => {
  const baseStyles = "relative inline-flex items-center justify-center font-bold uppercase tracking-wider transition-all focus:outline-none active:scale-95 disabled:opacity-50 disabled:pointer-events-none touch-manipulation border-2 select-none";
  
  const variants = {
    primary: "bg-slate-900/80 text-cyan-400 border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-900/20 shadow-[0_0_10px_rgba(6,182,212,0.1)] hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] rounded-sm",
    secondary: "bg-slate-900/80 text-slate-500 border-slate-700 hover:border-slate-500 hover:text-slate-300 rounded-sm",
    accent: "bg-cyan-500/10 text-cyan-300 border-cyan-400 hover:bg-cyan-400 hover:text-black hover:border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] rounded-sm",
    danger: "bg-pink-600 text-white border-pink-500 hover:bg-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.5)] rounded-sm",
    active: "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)] rounded-sm"
  };

  return (
    <button 
      onClick={onClick} 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};