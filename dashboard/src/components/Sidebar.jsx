import { fmtUSD } from '../utils';

const verticalIcons = {
  gaming: '🎮', ecommerce: '🛒', fintech: '💳',
  travel: '✈️', food_delivery: '🍔', entertainment: '🎬',
};

export default function Sidebar({ active, onNavigate, account, insight, onSwitchAccount }) {
  const items = [
    { id: 'overview', icon: '', label: 'Dashboard' },
    { id: 'explorer', icon: '', label: 'Creatives' },
    { id: 'fatigue', icon: '', label: 'Fatigue' },
    { id: 'explainability', icon: '', label: 'Why It Works' },
    { id: 'recommendations', icon: '', label: 'Recommendations' },
    { id: 'clusters', icon: '', label: 'Creative Groups' },
    { id: 'copilot', icon: '', label: 'AI Assistance' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">CI</div>
        <div>
          <h1>Creative Intel</h1>
          <span>by Smadex</span>
        </div>
      </div>

      {/* Account info */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'var(--bg-primary)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
          }}>
            {verticalIcons[insight?.vertical] || '📦'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{insight?.vertical} · {insight?.region}</div>
          </div>
        </div>

        {insight && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
            <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '7px 9px' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>ROAS</div>
              <div style={{ fontWeight: 700, color: insight.roas >= 1.5 ? 'var(--green)' : insight.roas >= 1 ? 'var(--blue)' : 'var(--red)' }}>
                {insight.roas.toFixed(2)}x
              </div>
            </div>
            <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '7px 9px' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Spend</div>
              <div style={{ fontWeight: 700 }}>{fmtUSD(insight.totalSpend)}</div>
            </div>
            <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '7px 9px' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Creatives</div>
              <div style={{ fontWeight: 700 }}>{insight.totalCreatives}</div>
            </div>
            <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '7px 9px' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Fatigued</div>
              <div style={{ fontWeight: 700, color: insight.statusBreakdown.fatigued > 0 ? 'var(--yellow)' : 'var(--green)' }}>
                {insight.statusBreakdown.fatigued}
              </div>
            </div>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">Navigation</div>
        {items.map(item => (
          <div
            key={item.id}
            className={`nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      {/* Switch account */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
        <div
          className="nav-item"
          onClick={onSwitchAccount}
          style={{ color: 'var(--text-muted)', fontSize: 12 }}
        >
          <span className="icon">🔄</span>
          <span>Switch Account</span>
        </div>
      </div>
    </aside>
  );
}
