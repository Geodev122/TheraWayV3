
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './common/Button';
import { ExclamationTriangleIcon } from './icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
         <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
            <div className="bg-primary p-8 sm:p-12 rounded-xl shadow-2xl max-w-lg w-full">
                <ExclamationTriangleIcon className="w-16 h-16 text-danger mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-danger mb-3">Something went wrong.</h1>
                <p className="text-textOnLight/80 mb-4">
                    We've encountered an unexpected error. Please try refreshing the page.
                </p>
                {this.state.error && (
                    <details className="text-left text-xs text-textOnLight/70 bg-secondary/30 p-3 rounded-md font-mono overflow-auto max-h-40">
                        <summary className="cursor-pointer font-semibold mb-1">Error Details</summary>
                        <pre className="whitespace-pre-wrap">
                            {this.state.error.name}: {this.state.error.message}
                            {this.state.error.stack && `\n\n${this.state.error.stack}`}
                        </pre>
                    </details>
                )}
                <Button
                    onClick={() => window.location.reload()}
                    variant="primary"
                    className="mt-6"
                >
                    Refresh Page
                </Button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}
