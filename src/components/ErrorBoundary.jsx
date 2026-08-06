import { Component } from "react";
import Background from "@/components/Background";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Healen crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-6" style={{ background: "var(--app-bg)", color: "var(--text-primary)" }}>
          <Background />
          <div className="relative z-10 glass-strong glass-sheen rounded-3xl p-6 text-center max-w-sm w-full">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xl mb-4 mx-auto">💜</div>
            <h1 className="text-lg font-bold text-white mb-1">Something went wrong</h1>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Your data is safe — it all stays on your device. Tap below to reload and keep going.
            </p>
            <button
              onClick={() => this.setState({ error: null })}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full mt-2 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-medium text-sm hover:bg-white/10 transition-colors"
            >
              Reload Healen
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
