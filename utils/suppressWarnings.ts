// Suppress known non-actionable dev-mode warnings
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  const orig = console.error.bind(console);
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('__sourceLocation')) return;
    orig(...args);
  };
}
