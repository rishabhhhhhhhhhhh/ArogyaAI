import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  glow?: 'teal' | 'emerald' | 'cyan' | 'none';
}

export function GlassCard({ children, className = '', hoverable = false, glow = 'none' }: GlassCardProps) {
  const glowClass = glow === 'teal' ? 'glow-teal' : glow === 'emerald' ? 'glow-emerald' : glow === 'cyan' ? 'glow-cyan' : '';

  const baseClasses = 'glass-panel rounded-2xl p-6';

  return (
    <div
      className={`${baseClasses} ${glowClass} ${className} ${hoverable ? 'cursor-pointer' : ''}`}
      style={{
        transition: 'all 0.3s ease-out',
        ...(hoverable && {
          ':hover': {
            transform: 'scale(1.05) translateY(-4px)',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 40px rgba(14, 122, 122, 0.3), 0 0 30px rgba(14, 122, 122, 0.2)',
            borderColor: 'rgba(14, 122, 122, 0.6)'
          }
        })
      }}
      onMouseEnter={(e) => {
        if (hoverable) {
          e.currentTarget.style.transform = 'scale(1.05) translateY(-4px)';
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.boxShadow = '0 20px 40px rgba(14, 122, 122, 0.3), 0 0 30px rgba(14, 122, 122, 0.2)';
          e.currentTarget.style.borderColor = 'rgba(14, 122, 122, 0.6)';
        }
      }}
      onMouseLeave={(e) => {
        if (hoverable) {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.backgroundColor = '';
          e.currentTarget.style.boxShadow = '';
          e.currentTarget.style.borderColor = '';
        }
      }}
    >
      {children}
    </div>
  );
}
