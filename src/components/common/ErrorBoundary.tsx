import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Radio } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[LiveErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full min-h-[300px] flex-col items-center justify-center bg-black/90 p-6 text-center text-white backdrop-blur-md select-none">
          <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-600/20 border border-rose-500/40 text-rose-500">
            <Radio className="h-8 w-8 animate-pulse text-rose-500" />
            <AlertTriangle className="absolute -top-1 -right-1 h-5 w-5 text-amber-400" />
          </div>

          <h2 className="text-lg font-black text-white mb-1">
            {this.props.fallbackTitle || 'प्रसारण लोड गर्न समस्या भयो (Room Error)'}
          </h2>
          <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
            लाइभ स्ट्रिम वा भ्वाइस पार्टी खोल्दा त्रुटि भेटियो। तलको बटन थिचेर तुरुन्त पुन: सुरु गर्नुहोस्।
          </p>

          <button
            type="button"
            onClick={this.handleReset}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 px-6 py-3 text-sm font-black text-white shadow-xl shadow-rose-600/30 active:scale-95 transition-all cursor-pointer border border-white/20"
          >
            <RefreshCw className="h-4 w-4" />
            <span>तुरुन्तै पुन: प्रयास गर्नुहोस् (Retry & Reopen)</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
