import { Component } from "react";

// Catches render/runtime errors anywhere below it so a bug (or a mid-session
// service-worker update swapping out stale chunks) shows a recoverable screen
// instead of a silent blank/white page.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("App crashed:", error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: "#020c18", color: "#dde", textAlign: "center", fontFamily: "monospace" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⛳</div>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: 12, color: "#8899aa", marginBottom: 20, maxWidth: 320 }}>
            The app hit an error and couldn't continue. This usually clears up with a reload.
          </div>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{ padding: "12px 24px", background: "#C4A44A", border: "none", borderRadius: 10, color: "#000", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "monospace" }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
