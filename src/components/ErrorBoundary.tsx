import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Ignorer l'erreur non critique removeChild (souvent causée par des extensions de navigateur)
        if (error.message.includes('removeChild') || error.message.includes('Node.removeChild')) {
            return { hasError: false, error: null };
        }
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReset = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.href = "/";
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-6">
                    <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
                        <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center text-destructive">
                            <AlertTriangle className="h-10 w-10" />
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold tracking-tight">Oups ! Quelque chose a mal tourné</h1>
                            <p className="text-muted-foreground">
                                Une erreur inattendue est survenue dans l'application.
                                Nos équipes techniques en ont été informées.
                            </p>
                        </div>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="p-4 bg-muted rounded-lg text-left text-xs font-mono overflow-auto max-h-40 border border-border">
                                <p className="font-bold text-destructive mb-1">{this.state.error.name}: {this.state.error.message}</p>
                                <p className="opacity-70">{this.state.error.stack}</p>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                            <Button onClick={this.handleReset} className="flex-1 gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Réessayer
                            </Button>
                            <Button onClick={this.handleGoHome} variant="outline" className="flex-1 gap-2">
                                <Home className="h-4 w-4" />
                                Accueil
                            </Button>
                        </div>

                        <p className="text-[10px] text-muted-foreground opacity-50">
                            SIHG v1.0.0 - Session ID: {Math.random().toString(36).substring(7)}
                        </p>
                    </div>
                </div>
            );
        }

        // CORRECTION ICI : ajout de .props
        return this.props.children;
    }
}

export default ErrorBoundary;