import { Component } from 'react';

class ReactBitsErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('[ReactBits] Component error:', error, errorInfo);
  }

  render() {
    const { fallback, children } = this.props;
    if (this.state.hasError) {
      if (typeof fallback === 'function') {
        return fallback();
      }
      if (fallback !== undefined) {
        return fallback;
      }
      const childText = this._extractText(children);
      return <span>{childText}</span>;
    }
    return children;
  }

  _extractText(children) {
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) return children.map(c => this._extractText(c)).join('');
    if (children?.props?.children) return this._extractText(children.props.children);
    if (children?.props?.text) return children.props.text;
    return '';
  }
}

export default ReactBitsErrorBoundary;
