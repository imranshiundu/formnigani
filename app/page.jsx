import App from './components/App';
import { AuthProvider } from '@/lib/auth';

// Server component shell — the interactive phone experience hydrates
// client-side via <App/>, with three.js split into its own lazy chunk.
// AuthProvider is inert until Supabase env is configured.
export default function Page() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
