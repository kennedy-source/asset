import React from "react";

interface State { error: Error | null }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-background p-8">
          <div className="max-w-lg w-full space-y-4">
            <h1 className="text-2xl font-bold text-destructive">Application Error</h1>
            <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto whitespace-pre-wrap text-destructive">
              {this.state.error.message}
              {"\n\n"}
              {this.state.error.stack}
            </pre>
            <button
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
