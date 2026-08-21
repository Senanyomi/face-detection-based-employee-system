import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface ErrorStateProps {
  title?: string;
  message?: string;
}

export function ErrorState({ title = 'Something went wrong', message = 'Failed to load data. Please try again.' }: ErrorStateProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
