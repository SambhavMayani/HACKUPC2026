import {
  BarChart3,
  Bot,
  Boxes,
  Compass,
  Gauge,
  Lightbulb,
  RefreshCw,
  Sparkles,
  TrendingDown,
  WalletCards,
} from 'lucide-react';
import { fmtUSD } from '../utils';

const verticalIcons = {
  gaming: Gauge,
  ecommerce: WalletCards,
  fintech: WalletCards,
  travel: Compass,
  food_delivery: Sparkles,
  entertainment: Sparkles,
};

export default function Sidebar({ active, onNavigate, account, insight, onSwitchAccount }) {
  const items = [
    { id: 'overview', icon: BarChart3, label: 'Dashboard' },
    { id: 'explorer', icon: Compass, label: 'Creatives' },
    { id: 'fatigue', icon: TrendingDown, label: 'Fatigue' },
    { id: 'explainability', icon: Lightbulb, label: 'Why It Works' },
    { id: 'recommendations', icon: Sparkles, label: 'Recommendations' },
    { id: 'clusters', icon: Boxes, label: 'Creative Groups' },
    { id: 'copilot', icon: Bot, label: 'AI Assistance' },
  ];
  const VerticalIcon = verticalIcons[insight?.vertical] || Sparkles;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">AT</div>
        <div>
          <h1>ADtonomy</h1>
          <span>by Smadex</span>
        </div>
      </div>

      <div className="account-panel">
        <div className="account-identity">
          <div className="account-icon">
            <VerticalIcon size={19} strokeWidth={2.2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="account-name">{account}</div>
            <div className="account-meta">{insight?.vertical} · {insight?.region}</div>
          </div>
        </div>

        {insight && (
          <div className="account-metrics">
            <div className="account-metric">
              <div className="account-metric-label">ROAS</div>
              <div
                className="account-metric-value"
                style={{ color: insight.roas >= 1.5 ? 'var(--green)' : insight.roas >= 1 ? 'var(--blue)' : 'var(--red)' }}
              >
                {insight.roas.toFixed(2)}x
              </div>
            </div>
            <div className="account-metric">
              <div className="account-metric-label">Spend</div>
              <div className="account-metric-value">{fmtUSD(insight.totalSpend)}</div>
            </div>
            <div className="account-metric">
              <div className="account-metric-label">Creatives</div>
              <div className="account-metric-value">{insight.totalCreatives}</div>
            </div>
            <div className="account-metric">
              <div className="account-metric-label">Fatigued</div>
              <div
                className="account-metric-value"
                style={{ color: insight.statusBreakdown.fatigued > 0 ? 'var(--yellow)' : 'var(--green)' }}
              >
                {insight.statusBreakdown.fatigued}
              </div>
            </div>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">Navigation</div>
        {items.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${active === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="icon"><Icon size={17} strokeWidth={2.2} /></span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="nav-item" onClick={onSwitchAccount}>
          <span className="icon"><RefreshCw size={16} strokeWidth={2.2} /></span>
          <span>Switch Account</span>
        </button>
      </div>
    </aside>
  );
}
