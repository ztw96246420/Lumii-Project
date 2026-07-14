import type { ReactNode } from 'react';
import { Platform } from 'react-native';

import LumiiErrorBoundary from './src/mvp/LumiiErrorBoundary';
import LumiiMvpApp from './src/mvp/LumiiMvpApp';

function RuntimeErrorPreviewGate({ children }: { children: ReactNode }) {
  const search = Platform.OS === 'web'
    ? String((globalThis as typeof globalThis & { location?: { search?: string } }).location?.search || '')
    : '';
  if (__DEV__ && /(?:^|[?&])runtimeErrorPreview=1(?:&|$)/.test(search)) {
    throw new Error('Lumii runtime error boundary preview');
  }
  return children;
}

export default function App() {
  return (
    <LumiiErrorBoundary>
      <RuntimeErrorPreviewGate>
        <LumiiMvpApp />
      </RuntimeErrorPreviewGate>
    </LumiiErrorBoundary>
  );
}
