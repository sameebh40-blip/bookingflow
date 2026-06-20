// Strip Newly edit-mode debug props (__sourceLocation etc.) from DOM host elements on web
if (typeof document !== 'undefined') {
  const _React = require('react');
  const _origCreateElement = _React.createElement;
  _React.createElement = function(type: any, props: any, ...children: any[]) {
    if (props && typeof type === 'string') {
      const filtered: Record<string, any> = {};
      for (const key in props) {
        if (!key.startsWith('__')) filtered[key] = props[key];
      }
      return _origCreateElement(type, filtered, ...children);
    }
    return _origCreateElement(type, props, ...children);
  };
}

// Initialize Newly console log capture before anything else
import './utils/errorLogger';

// Polyfills
import './utils/polyfills/alert';

import 'expo-router/entry';
