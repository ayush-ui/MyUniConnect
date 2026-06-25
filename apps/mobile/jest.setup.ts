// Silence console.error for known noisy warnings in tests
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const msg = String(args[0]);
  if (
    msg.includes('Warning: ReactDOM.render') ||
    msg.includes('Warning: An update to') ||
    msg.includes('act(')
  ) {
    return;
  }
  originalConsoleError(...args);
};
