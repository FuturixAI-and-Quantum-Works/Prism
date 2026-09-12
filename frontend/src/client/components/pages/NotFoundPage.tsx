import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        backgroundColor: '#F9F9F9',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif',
      }}
    >
      <section style={{ maxWidth: '460px', textAlign: 'center' }}>
        <p style={{ color: '#6B6B6B', fontSize: '14px', margin: '0 0 8px' }}>404</p>
        <h1 style={{ color: '#272727', fontSize: '28px', margin: '0 0 12px' }}>Page not found</h1>
        <p style={{ color: '#606060', margin: '0 0 20px' }}>
          The page you requested does not exist.
        </p>
        <Link to="/" style={{ color: '#272727', fontWeight: 600 }}>
          Return home
        </Link>
      </section>
    </main>
  )
}
