import { ReactNode } from 'react';
import { Badge } from './ui/badge';
import { cn } from './ui/utils';

export type StatusTone = 'success' | 'warning' | 'destructive' | 'neutral' | 'info';

const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'bg-success-light text-success border-transparent',
  warning: 'bg-warning-light text-warning border-transparent',
  destructive: 'bg-destructive-light text-destructive border-transparent',
  neutral: 'bg-muted text-muted-foreground border-transparent',
  info: 'bg-brand-light text-brand border-transparent',
};

interface StatusBadgeProps {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}

export function StatusBadge({ tone, children, className }: StatusBadgeProps) {
  return (
    <Badge className={cn(TONE_CLASSES[tone], 'font-medium', className)}>
      {children}
    </Badge>
  );
}
