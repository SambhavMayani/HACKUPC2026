import { useMemo } from 'react';
import { fmtPct, fmtUSD, fmt, statusLabel, explainPerformance } from '../utils';

export default function Recommendations({ data }) {
  const recs = useMemo(() => {
    const list = [];

    // SCALE: top performers with room to grow
    data.creatives
      .filter(c => c.status === 'top_performer')
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 6)
      .forEach(c => {
        list.push({
          action: 'scale',
          creative: c,
          title: `Scale "${c.headline}"`,
          reason: `ROAS of ${c.roas.toFixed(2)}x with a ${fmtPct(c.ctr)} CTR. This creative is converting efficiently — increase budget allocation to maximize returns.`,
          impact: 'high',
        });
      });

    // PAUSE: underperformers burning budget
    data.creatives
      .filter(c => c.status === 'underperformer' && c.spend > 10000)
      .sort((a, b) => a.roas - b.roas)
      .slice(0, 4)
      .forEach(c => {
        list.push({
          action: 'pause',
          creative: c,
          title: `Pause "${c.headline}"`,
          reason: `Spent ${fmtUSD(c.spend)} with only ${c.roas.toFixed(2)}x ROAS. This creative is underperforming — reallocate budget to higher performers.`,
          impact: 'high',
        });
      });

    // REFRESH: fatigued creatives that were once good
    data.creatives
      .filter(c => c.status === 'fatigued' && c.first_7d_ctr > 0.005)
      .sort((a, b) => b.first_7d_ctr - a.first_7d_ctr)
      .slice(0, 4)
      .forEach(c => {
        list.push({
          action: 'refresh',
          creative: c,
          title: `Refresh "${c.headline}"`,
          reason: `Strong initial CTR of ${fmtPct(c.first_7d_ctr)} dropped to ${fmtPct(c.last_7d_ctr)} after day ${c.fatigue_day}. The concept works — try a visual refresh with new colors or copy.`,
          impact: 'medium',
        });
      });

    // TEST: suggest new creative based on top-performing traits
    const topFormats = {};
    const topThemes = {};
    data.creatives.filter(c => c.status === 'top_performer').forEach(c => {
      topFormats[c.format] = (topFormats[c.format] || 0) + 1;
      topThemes[c.theme] = (topThemes[c.theme] || 0) + 1;
    });
    const bestFormat = Object.entries(topFormats).sort((a, b) => b[1] - a[1])[0];
    const bestTheme = Object.entries(topThemes).sort((a, b) => b[1] - a[1])[0];

    if (bestFormat && bestTheme) {
      // Find campaigns that don't have this winning combo
      const campaignsWithCombo = new Set(
        data.creatives
          .filter(c => c.format === bestFormat[0] && c.theme === bestTheme[0])
          .map(c => c.campaign_id)
      );
      const campaignsWithout = data.campaigns.filter(c => !campaignsWithCombo.has(c.id));
      campaignsWithout.slice(0, 3).forEach(camp => {
        list.push({
          action: 'test',
          creative: null,
          campaign: camp,
          title: `Test ${bestFormat[0]} + ${bestTheme[0]} in ${camp.app}`,
          reason: `The combination of "${bestFormat[0]}" format with "${bestTheme[0]}" theme drives top performance. Campaign "${camp.app}" hasn't tried this combo yet.`,
          impact: 'medium',
        });
      });
    }

    return list;
  }, [data]);

  const actionOrder = { scale: 0, pause: 1, refresh: 2, test: 3 };
  const sortedRecs = [...recs].sort((a, b) => actionOrder[a.action] - actionOrder[b.action]);

  const actionIcons = { scale: '🚀', pause: '⏸️', refresh: '🔄', test: '🧪' };
  const actionLabels = { scale: 'Scale Up', pause: 'Pause', refresh: 'Refresh', test: 'Test New' };

  return (
    <div>
      <div className="page-header">
        <h2>🎯 Recommendation Engine</h2>
        <p>Actionable recommendations to optimize your creative portfolio</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Scale Recommendations</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{recs.filter(r => r.action === 'scale').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pause Recommendations</div>
          <div className="stat-value" style={{ color: 'var(--red)' }}>{recs.filter(r => r.action === 'pause').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Refresh Recommendations</div>
          <div className="stat-value" style={{ color: 'var(--yellow)' }}>{recs.filter(r => r.action === 'refresh').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Test Recommendations</div>
          <div className="stat-value" style={{ color: 'var(--blue)' }}>{recs.filter(r => r.action === 'test').length}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
        {sortedRecs.map((rec, i) => (
          <div key={i} className="rec-card">
            <div className={`rec-action ${rec.action}`}>
              {actionIcons[rec.action]} {actionLabels[rec.action]}
            </div>
            <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, lineHeight: 1.3 }}>{rec.title}</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>{rec.reason}</p>
            {rec.creative && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                <img src={`/${rec.creative.asset_file}`} alt="" style={{ width: 56, height: 42, objectFit: 'cover', borderRadius: 4 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{rec.creative.advertiser}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {rec.creative.format} · {rec.creative.vertical} · ROAS {rec.creative.roas.toFixed(2)}x
                  </div>
                </div>
                <span className={`status-badge ${rec.creative.status}`} style={{ marginLeft: 'auto' }}>
                  {statusLabel(rec.creative.status)}
                </span>
              </div>
            )}
            {rec.campaign && (
              <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 12 }}>
                <div style={{ fontWeight: 600 }}>{rec.campaign.app}</div>
                <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{rec.campaign.vertical} · {rec.campaign.objective} · {rec.campaign.countries}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
