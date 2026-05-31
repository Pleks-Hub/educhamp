import { cn } from "@/lib/utils";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate a short error ID for support reference (never exposes stack)
    const errorId = Math.random().toString(36).slice(2, 9).toUpperCase();
    return { hasError: true, error, errorId };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log to console in all environments for Cloud Run log capture
    // Stack is NOT sent to the client — stays server-side in logs only
    console.error("[ErrorBoundary]", error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-dvh p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-md p-8 text-center">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
              <AlertTriangle size={32} className="text-destructive" />
            </div>

            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mb-1">
              EduChamp ran into an unexpected error.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Try reloading the page. If the problem persists, contact{" "}
              <a href="mailto:support@educhamp.app" className="underline hover:text-foreground">
                support@educhamp.app
              </a>{" "}
              with error code{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                {this.state.errorId}
              </code>.
            </p>

            {/* Dev-only stack trace — never visible in production */}
            {import.meta.env.DEV && this.state.error && (
              <div className="p-4 w-full rounded bg-muted overflow-auto mb-6 text-left">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Dev stack trace:</p>
                <pre className="text-xs text-muted-foreground whitespace-break-spaces">
                  {this.state.error.stack}
                </pre>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = "/"}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm",
                  "border border-border bg-background hover:bg-muted",
                  "transition-colors cursor-pointer"
                )}
              >
                <Home size={14} />
                Go Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm",
                  "bg-primary text-primary-foreground",
                  "hover:opacity-90 cursor-pointer"
                )}
              >
                <RotateCcw size={14} />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
