import { useId, useState } from 'react'
import { useGetSystemStatusQuery, useGetStatusHistoryQuery } from '../../store/api/statusApi'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

type HealthStatus = 'operational' | 'degraded' | 'down' | 'no_data'

const STATUS_COLORS: Record<HealthStatus, string> = {
  operational: '#15803D',
  degraded: '#92400E',
  down: '#B91C1C',
  no_data: '#6B7280',
}

const STATUS_BG_COLORS: Record<HealthStatus, string> = {
  operational: '#86EFAC',
  degraded: '#FDE68A',
  down: '#FECACA',
  no_data: '#E5E7EB',
}

const STATUS_LABELS: Record<HealthStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  down: 'Down',
  no_data: 'No data',
}

type UptimeDay = Readonly<{ date: string; status: HealthStatus }>

function formatHistoryDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function UptimeBar({
  history,
  serviceName,
  uptimePercentage,
}: {
  history: UptimeDay[]
  serviceName: string
  uptimePercentage: number
}) {
  const tooltipId = useId()
  const [activeDay, setActiveDay] = useState<{
    day: UptimeDay
    x: number
    y: number
  } | null>(null)
  const hasObservedData = history.some((day) => day.status !== 'no_data')
  const showDay = (element: HTMLElement, day: UptimeDay) => {
    const rect = element.getBoundingClientRect()
    setActiveDay({
      day,
      x: rect.left + rect.width / 2,
      y: rect.top,
    })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
      <span style={{ fontSize: '12px', color: '#666', minWidth: '70px' }}>90 days ago</span>
      <div
        style={{
          flex: 1,
          position: 'relative',
        }}
      >
        <div
          role="list"
          aria-label={`${serviceName} 90-day status history`}
          style={{ display: 'flex', gap: '2px' }}
        >
          {history.map((day) => {
            const label = `${formatHistoryDate(day.date)}: ${STATUS_LABELS[day.status]}`
            const isActive = activeDay?.day.date === day.date
            return (
              <span
                key={day.date}
                className="prism-uptime-segment"
                role="listitem"
                tabIndex={0}
                aria-label={label}
                aria-describedby={isActive ? tooltipId : undefined}
                style={{
                  flex: 1,
                  height: '34px',
                  backgroundColor: STATUS_COLORS[day.status],
                  borderRadius: '2px',
                  cursor: 'help',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(event) => showDay(event.currentTarget, day)}
                onMouseLeave={(event) => {
                  if (event.currentTarget !== document.activeElement) setActiveDay(null)
                }}
                onFocus={(event) => showDay(event.currentTarget, day)}
                onBlur={() => setActiveDay(null)}
              />
            )
          })}
        </div>
        {activeDay && (
          <div
            id={tooltipId}
            role="tooltip"
            style={{
              position: 'fixed',
              left: activeDay.x,
              top: activeDay.y - 50,
              transform: 'translateX(-50%)',
              backgroundColor: '#272727',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              zIndex: 1000,
              pointerEvents: 'none',
            }}
          >
            <div>{formatHistoryDate(activeDay.day.date)}</div>
            <div
              style={{
                color: STATUS_BG_COLORS[activeDay.day.status],
                marginTop: '2px',
              }}
            >
              {STATUS_LABELS[activeDay.day.status]}
            </div>
          </div>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: '120px',
          justifyContent: 'flex-end',
        }}
      >
        <span style={{ fontSize: '12px', color: '#666' }}>
          {hasObservedData ? `${uptimePercentage.toFixed(2)} % measured availability` : 'N/A'}
        </span>
        <span style={{ fontSize: '12px', color: '#666' }}>Today</span>
      </div>
    </div>
  )
}

function ServiceRow({
  displayName,
  status,
  history,
  uptimePercentage,
}: {
  displayName: string
  status: HealthStatus
  history: Array<{ date: string; status: HealthStatus }>
  uptimePercentage: number
}) {
  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '20px 24px',
        marginBottom: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#272727' }}>
          {displayName}
        </h3>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: STATUS_COLORS[status],
            textTransform: 'capitalize',
          }}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>
      <UptimeBar history={history} serviceName={displayName} uptimePercentage={uptimePercentage} />
    </div>
  )
}

export default function StatusPage() {
  const { data: status, isLoading: statusLoading, isError: statusError } = useGetSystemStatusQuery()
  const { data: history, isLoading: historyLoading } = useGetStatusHistoryQuery(90)

  const isLoading = statusLoading || historyLoading

  const overallStatus: HealthStatus = status?.status ?? 'no_data'
  const statusMessage = status?.message ?? (statusError ? 'Status unavailable' : 'Checking status')

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FAFAF9',
        fontFamily,
      }}
    >
      <header
        style={{
          backgroundColor: '#fff',
          borderBottom: '1px solid #E5E7EB',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#272727" strokeWidth="2" />
            <path d="M12 6v6l4 2" stroke="#272727" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: '18px', fontWeight: 600, color: '#272727' }}>Prism Status</span>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
        <div
          style={{
            backgroundColor: STATUS_BG_COLORS[overallStatus],
            borderRadius: '8px',
            padding: '20px 24px',
            marginBottom: '32px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {overallStatus === 'operational' && (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#22C55E" />
                <path
                  d="M8 12l3 3 5-6"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            {overallStatus === 'degraded' && (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#F59E0B" />
                <path d="M12 8v4M12 16h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
            {overallStatus === 'down' && (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#EF4444" />
                <path d="M15 9l-6 6M9 9l6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#272727' }}>
              {statusMessage}
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
            Recorded service history for the past 90 days.
          </p>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#666' }}>
            Loading status...
          </div>
        ) : (
          <div>
            {history?.services.map((service) => {
              const currentStatus =
                status?.services.find((s) => s.name === service.name)?.status ?? 'no_data'
              return (
                <ServiceRow
                  key={service.name}
                  displayName={service.displayName}
                  status={currentStatus}
                  history={service.history}
                  uptimePercentage={service.uptimePercentage}
                />
              )
            })}
          </div>
        )}

        {status?.lastUpdated && (
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
              Last updated: {new Date(status.lastUpdated).toLocaleString()}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
