import { Brain, Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  neural?: boolean;
}

export function LoadingSpinner({ message = 'Loading...', neural = false }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      {neural ? (
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full rotate-neural" />
          <Brain className="w-8 h-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
      ) : (
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      )}
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
