import logoSvg from '../assets/logo.svg'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

export default function OnboardingScreen() {
  return (
    <main
      style={{
        backgroundColor: '#FFFFFF',
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily,
        padding: '0 20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--content-gap, 24px)',
          maxWidth: '565px',
          textAlign: 'center',
        }}
      >
        <img src={logoSvg} alt="Prism Logo" style={{ width: '31px', height: '31px' }} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <h1
            style={{
              fontSize: 'var(--heading-size, 32px)',
              fontWeight: 590,
              lineHeight: 'var(--heading-line-height, 32px)',
              letterSpacing: '0.2px',
              color: '#272727',
              margin: 0,
            }}
          >
            Legal work in one place.
          </h1>
          <p
            style={{
              fontSize: 'var(--subheading-size, 14px)',
              fontWeight: 400,
              lineHeight: '21px',
              letterSpacing: '0.1px',
              color: '#454545',
              margin: 0,
              maxWidth: '309px',
            }}
          >
            Draft, review, and organize legal documents.
          </p>
        </div>
      </div>
      <footer
        style={{
          position: 'absolute',
          bottom: 'var(--footer-bottom, 40px)',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          width: '90%',
          maxWidth: '300px',
        }}
      >
        <p
          role="status"
          aria-live="polite"
          style={{
            fontSize: '12px',
            fontWeight: 510,
            lineHeight: '16px',
            letterSpacing: '0.2px',
            color: '#999999',
            textAlign: 'center',
            margin: 0,
          }}
        >
          Loading Prism...
        </p>
      </footer>
    </main>
  )
}
