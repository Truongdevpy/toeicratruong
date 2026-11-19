import React from 'react';
import { PackageOpen } from 'lucide-react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = '',
}) => {
  return (
    <div className={`p-8 text-center flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-surface text-steel flex items-center justify-center">
        {icon || <PackageOpen className="w-6 h-6" />}
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-bold text-charcoal">{title}</h4>
        {description && <p className="text-xs text-steel">{description}</p>}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};
