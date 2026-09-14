import App from './components/App';

// Server component shell — the interactive phone experience hydrates
// client-side via <App/>, with three.js split into its own lazy chunk.
export default function Page() {
  return <App />;
}
