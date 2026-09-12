import type { ReactNode } from 'react'
import activityIcon from '../../assets/dashboard/activity-icon.svg'
import arrowRight from '../../assets/dashboard/arrow-right.svg'
import attentionEmptyIllustration from '../../assets/dashboard/icons/empty-attention.svg'
import emptyContinue from '../../assets/dashboard/icons/empty-continue.svg'
import directNormalIcon from '../../assets/dashboard/direct-normal-icon.svg'
import documentIcon from '../../assets/dashboard/document-icon.svg'
import tickCircleIcon from '../../assets/dashboard/tick-circle-icon.svg'
import { Button } from '../../components/ui/Button'
import {
  type AttentionItemModel,
  type ContinueWorkingItem,
  dashboardFontFamily,
} from './dashboardModel'
import type { DashboardSession } from './useDashboard'

function AttentionItemRow({
  item,
  isLast,
  onView,
}: {
  item: AttentionItemModel
  isLast: boolean
  onView?: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '18px',
        padding: '10px 15px',
        borderBottom: isLast ? 'none' : '1px solid #EDEDED',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1, minWidth: 0 }}>
        <div
          style={{
            background: '#5C81CF',
            borderRadius: '6px',
            padding: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <img src={directNormalIcon} alt="" style={{ width: '14px', height: '14px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, flex: 1 }}>
          <p
            style={{
              fontFamily: dashboardFontFamily,
              fontSize: '16px',
              fontWeight: 510,
              color: '#272727',
              letterSpacing: '-0.8px',
              lineHeight: '21px',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.title}
          </p>
          <p
            style={{
              fontFamily: dashboardFontFamily,
              fontSize: '14px',
              fontWeight: 400,
              color: '#6B6B6B',
              letterSpacing: '-0.7px',
              lineHeight: '16px',
              margin: 0,
            }}
          >
            {item.description}
          </p>
        </div>
      </div>
      <Button
        disabled={!onView}
        onClick={onView}
        style={{
          fontFamily: dashboardFontFamily,
          fontSize: '14px',
          fontWeight: 510,
          color: '#338CE4',
          letterSpacing: '-0.7px',
          lineHeight: '16px',
          margin: 0,
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          flexShrink: 0,
          padding: 0,
          border: 'none',
          background: 'transparent',
        }}
      >
        view
      </Button>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #EDEDED',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      <div
        style={{
          padding: '10px 15px',
          height: '48px',
          boxSizing: 'border-box',
          borderBottom: '1px solid #EDEDED',
          display: 'flex',
          alignItems: 'center',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
        }}
      >
        <p
          style={{
            fontFamily: dashboardFontFamily,
            fontSize: '18px',
            fontWeight: 510,
            color: '#272727',
            letterSpacing: '-0.9px',
            lineHeight: '21px',
            margin: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </p>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          overflow: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function MetadataDot() {
  return (
    <div
      style={{
        width: '4px',
        height: '4px',
        borderRadius: '50%',
        background: '#999999',
        flexShrink: 0,
      }}
    />
  )
}

function ContinueWorkingItemRow({
  item,
  isLast,
  onClick,
}: {
  item: ContinueWorkingItem
  isLast: boolean
  onClick: () => void
}) {
  return (
    <Button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        padding: '10px',
        height: '64px',
        boxSizing: 'border-box',
        borderBottom: isLast ? 'none' : '1px solid #EDEDED',
        width: '100%',
        cursor: 'pointer',
        border: 'none',
        background: 'transparent',
        textAlign: 'left',
        fontFamily: dashboardFontFamily,
      }}
    >
      {item.type === 'document' ? (
        <div
          style={{
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <img src={documentIcon} alt="" style={{ width: '15px', height: '19px' }} />
        </div>
      ) : (
        <div
          style={{
            background: '#E4EFE7',
            border: '1px solid #4BB23D',
            borderRadius: '6px',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <img src={tickCircleIcon} alt="" style={{ width: '16px', height: '16px' }} />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, flex: 1 }}>
        <p
          style={{
            fontFamily: dashboardFontFamily,
            fontSize: '16px',
            fontWeight: 510,
            color: '#272727',
            letterSpacing: '-0.8px',
            lineHeight: '21px',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.title}
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {item.metadata.map((text, index) => (
            <div
              key={index}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}
            >
              {index > 0 && <MetadataDot />}
              <p
                style={{
                  fontFamily: dashboardFontFamily,
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#6B6B6B',
                  letterSpacing: '-0.7px',
                  lineHeight: '16px',
                  margin: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Button>
  )
}

function EmptyPanel({ kind }: { kind: 'attention' | 'continue' }) {
  const attention = kind === 'attention'
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #EDEDED',
        borderRadius: '12px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: attention ? '11px' : '24px',
          maxWidth: attention ? '283px' : '292px',
          textAlign: 'center',
        }}
      >
        <img
          src={attention ? attentionEmptyIllustration : emptyContinue}
          alt=""
          style={attention ? undefined : { width: '68px', height: '83px' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p
            style={{
              fontFamily: dashboardFontFamily,
              fontSize: '16px',
              fontWeight: 510,
              color: '#272727',
              letterSpacing: '-0.8px',
              lineHeight: '21px',
              margin: 0,
            }}
          >
            {attention ? 'Nothing needs your attention right now.' : 'Nothing to continue yet.'}
          </p>
          <p
            style={{
              fontFamily: dashboardFontFamily,
              fontSize: '14px',
              fontWeight: 510,
              color: '#6B6B6B',
              letterSpacing: '-0.7px',
              lineHeight: '16px',
              margin: 0,
            }}
          >
            {attention
              ? 'Prism will notify you when reviews, approvals, or compliance actions require attention.'
              : 'Your recently opened documents, AI reviews, and active workflows will appear here.'}
          </p>
        </div>
      </div>
    </div>
  )
}

export function DashboardActivityPanels({ session }: { session: DashboardSession }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <img src={activityIcon} alt="" style={{ width: '20px', height: '20px' }} />
          <p
            style={{
              fontFamily: dashboardFontFamily,
              fontSize: '18px',
              fontWeight: 510,
              color: '#454545',
              letterSpacing: '-0.9px',
              lineHeight: '21px',
              margin: 0,
            }}
          >
            Activity
          </p>
        </div>
        <img src={arrowRight} alt="" style={{ width: '5px', height: '12px' }} />
      </div>

      <div
        style={{
          display: 'flex',
          gap: '16px',
          width: '100%',
          flexDirection: session.isMobile ? 'column' : 'row',
        }}
      >
        <div style={{ flex: 1, height: '423px' }}>
          {session.attentionItems.length > 0 ? (
            <Panel title="Attention Needed">
              {session.attentionItems.map((item, index) => (
                <AttentionItemRow
                  key={item.id}
                  item={item}
                  isLast={index === session.attentionItems.length - 1}
                  onView={() => void session.actions.viewAttentionItem(item)}
                />
              ))}
            </Panel>
          ) : (
            <EmptyPanel kind="attention" />
          )}
        </div>

        <div style={{ flex: 1, height: '423px' }}>
          {session.continueWorkingItems.length > 0 ? (
            <Panel title="Continue Working">
              {session.continueWorkingItems.map((item, index) => (
                <ContinueWorkingItemRow
                  key={item.id}
                  item={item}
                  isLast={index === session.continueWorkingItems.length - 1}
                  onClick={() => session.actions.openContinueWorkingItem(item)}
                />
              ))}
            </Panel>
          ) : (
            <EmptyPanel kind="continue" />
          )}
        </div>
      </div>
    </>
  )
}
