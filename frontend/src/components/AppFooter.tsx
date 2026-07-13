// Global footer pinned to the bottom-left across every route.
// Version is injected at build time from package.json (see vite.config.ts).
export default function AppFooter() {
  return (
    <footer className="app-footer" aria-label="Hak cipta dan versi aplikasi">
      © CBQA Global 2026 · v{__APP_VERSION__}
    </footer>
  )
}
