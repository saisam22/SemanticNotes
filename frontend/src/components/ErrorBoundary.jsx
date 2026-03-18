import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReload = () => {
        window.location.href = '/dashboard';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <div className="error-boundary-card">
                        <span className="error-boundary-icon">⚠</span>
                        <h2>Something went wrong</h2>
                        <p className="error-boundary-message">
                            {this.state.error?.message || 'An unexpected error occurred.'}
                        </p>
                        <button className="btn btn-primary" onClick={this.handleReload}>
                            ← Back to Dashboard
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
