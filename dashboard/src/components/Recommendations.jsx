import { useMemo } from 'react';
import { fmtPct, fmtUSD, fmt, statusLabel } from '../utils';

export default function Recommendations({ data, insight, benchmark }) {
  const recs = useMemo(() => {
    const list = [];
    const creatives = data.creatives;

    // SCALE: top performers with strong ROAS
    creatives
      .filter(c => c.status === 'top_performer')
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 6)
      .forEach(c => {
        const potentialRevenue = c.roas * c.spend * 0.5; // estimated gain from 50% budget increase
        list.push({
          action: 'scale',
          creative: c,
          title: `Scale "${c.headline}"`,
          reason: `ROAS of ${c.roas.toFixed(2)}x with ${fmtPct(c.ctr)} CTR. Increasing budget by 50% could generate ~${fmtUSD(potentialRevenue)} additional revenue based on current efficiency.`,
          impact: 'high',
          savingsOrGain: potentialRevenue,
        });
      });

    // PAUSE: underperformers wasting budget
    creatives
      .filter(c => c.status === 'underperformer' && c.spend > 5000)
      .sort((a, b) => a.roas - b.roas)
      .slice(0, 6)
      .forEach(c => {
        const wasted = c.spend - c.revenue;
        list.push({
          action: 'pause',
          creative: c,
          title: `Pause "${c.headline}"`,
          reason: `Spent ${fmtUSD(c.spend)} but generated only ${fmtUSD(c.revenue)} — a net loss of ${fmtUSD(Math.max(0, wasted))}. Reallocate this budget to top performers.`,
          impact: 'high',
          savingsOrGain: Math.max(0, wasted),
        });
      });

    // REFRESH: fatigued creatives that showed strong initial performance
    creatives
      .filter(c => c.status === 'fatigued' && c.first_7d_ctr > 0.004)
      .sort((a, b) => b.first_7d_ctr - a.first_7d_ctr)
      .slice(0, 5)
      .forEach(c => {
        list.push({
          action: 'refresh',
          creative: c,
          title: `Refresh "${c.headline}"`,
          reason: `Initial CTR of ${fmtPct(c.first_7d_ctr)} dropped to ${fmtPct(c.last_7d_ctr)} after day ${c.fatigue_day}. The concept resonated — try a visual refresh with new imagery, color scheme, or updated copy.`,
          impact: 'medium',
          savingsOrGain: 0,
        });
      });

    // TEST: suggest untried format+theme combos based on top performers
    const topTraits = {};
    creatives.filter(c => c.status === 'top_performer').forEach(c => {
      const key = `${c.format}|${c.theme}`;
      topTraits[key] = (topTraits[key] || 0) + 1;
    });
    const bestCombos = Object.entries(topTraits).sort((a, b) => b[1] - a[1]).slice(0, 3);

    // Find campaigns missing these winning combos
    for (const [combo] of bestCombos) {
      const [bestFormat, bestTheme] = combo.split('|');
      const campaignsWithCombo = new Set(
        creatives
          .filter(c => c.format === bestFormat && c.theme === bestTheme)
          .map(c => c.campaign_id)
      );
      const missing = data.campaigns.filter(c => !campaignsWithCombo.has(c.id));
      missing.slice(0, 2).forEach(camp => {
        list.push({
          action: 'test',
          creative: null,
          campaign: camp,
          title: `Test ${bestFormat} + ${bestTheme} in ${camp.app}`,
          reason: `"${bestFormat}" format + "${bestTheme}" theme drives the best performance scores across your portfolio. Campaign "${camp.app}" hasn't tried this winning combination yet.`,
          impact: 'medium',
          savingsOrGain: 0,
        });
      });
    }

    // CLUSTER: underperformers in high-perf clusters → optimize, not kill
    if (data.mlClusters?.combined) {
      const ml = data.mlClusters.combined;
      const myIds = new Set(creatives.map(c => c.id));
      for (const cl of ml.clusters) {
        if (cl.avgPerf < 0.5) continue; // only high-perf clusters
        const myInCluster = cl.creativeIds
          .filter(id => myIds.has(id))
          .map(id => creatives.find(c => c.id === id))
          .filter(Boolean);
        const underperformersInGoodCluster = myInCluster
          .filter(c => c.status === 'underperformer' || (c.perf_score < cl.avgPerf * 0.6));
        underperformersInGoodCluster.slice(0, 2).forEach(c => {
          const bestInCluster = myInCluster.filter(x => x.id !== c.id).sort((a, b) => b.perf_score - a.perf_score)[0];
          list.push({
            action: 'refresh',
            creative: c,
            title: `Optimize "${c.headline}" (Cluster insight)`,
            reason: `This creative is in a high-performing cluster (avg score ${(cl.avgPerf * 100).toFixed(0)}) but scores only ${(c.perf_score * 100).toFixed(0)}. ${bestInCluster ? `Similar creative "${bestInCluster.headline}" scores ${(bestInCluster.perf_score * 100).toFixed(0)} — study its traits.` : 'Align with cluster patterns.'}`,
            impact: 'medium',
            savingsOrGain: 0,
          });
        });
      }
    }

    return list;
  }, [data]);

  const actionOrder = { scale: 0, pause: 1, refresh: 2, test: 3 };
  const sortedRecs = [...recs].sort((a, b) => actionOrder[a.action] - actionOrder[b.action]);

  const actionIcons = { scale: '🚀', pause: '⏸️', refresh: '🔄', test: '🧪' };
  const actionLabels = { scale: 'Scale Up', pause: 'Pause', refresh: 'Refresh', test: 'Test New' };

  // Calculate total potential impact
  const totalSavings = recs.filter(r => r.action === 'pause').reduce((s, r) => s + (r.savingsOrGain || 0), 0);
  const totalGain = recs.filter(r => r.action === 'scale').reduce((s, r) => s + (r.savingsOrGain || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h2>🎯 What You Should Do Next</h2>
        <p>Personalized actions to maximize your creative ROI</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Scale Opportunities</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{recs.filter(r => r.action === 'scale').length}</div>
          <div className="stat-change positive">potential +{fmtUSD(totalGain)} revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pause & Save</div>
          <div className="stat-value" style={{ color: 'var(--red)' }}>{recs.filter(r => r.action === 'pause').length}</div>
          <div className="stat-change negative">{fmtUSD(totalSavings)} recoverable</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Refresh Candidates</div>
          <div className="stat-value" style={{ color: 'var(--yellow)' }}>{recs.filter(r => r.action === 'refresh').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">New Tests</div>
          <div className="stat-value" style={{ color: 'var(--blue)' }}>{recs.filter(r => r.action === 'test').length}</div>
        </div>
      </div>

      {/* Budget reallocation insight */}
      {totalSavings > 0 && (
        <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, rgba(0,210,160,0.06), rgba(108,92,231,0.06))' }}>
          <div className="card-header"><h3>💰 Budget Reallocation Opportunity</h3></div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            By pausing {recs.filter(r => r.action === 'pause').length} underperforming creatives, you can recover
            <strong style={{ color: 'var(--green)' }}> {fmtUSD(totalSavings)}</strong> in wasted spend.
            Redirect this budget to your top {recs.filter(r => r.action === 'scale').length} performers for an estimated
            <strong style={{ color: 'var(--green)' }}> {fmtUSD(totalGain)}</strong> in additional revenue.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
        {sortedRecs.map((rec, i) => (
          <div key={i} className="rec-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div className={`rec-action ${rec.action}`}>
                {actionIcons[rec.action]} {actionLabels[rec.action]}
              </div>
              {rec.impact === 'high' && (
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>High Impact</span>
              )}
            </div>
            <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, lineHeight: 1.3 }}>{rec.title}</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>{rec.reason}</p>
            {rec.creative && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                <img src={`/${rec.creative.asset_file}`} alt="" style={{ width: 56, height: 42, objectFit: 'cover', borderRadius: 4 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{rec.creative.headline}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {rec.creative.format} · {rec.creative.vertical} · ROAS {rec.creative.roas.toFixed(2)}x
                  </div>
                </div>
                <span className={`status-badge ${rec.creative.status}`} style={{ whiteSpace: 'nowrap' }}>
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
