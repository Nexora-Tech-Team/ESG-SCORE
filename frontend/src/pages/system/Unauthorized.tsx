import { Link } from 'react-router-dom'

export default function Unauthorized() {
  return (
    <main className="system-page">
      <section className="system-card">
        <span>403</span>
        <h1>Access denied</h1>
        <p>Your account role does not have access to that page.</p>
        <Link to="/">Back to dashboard</Link>
      </section>
    </main>
  )
}
