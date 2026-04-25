import { useState, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, BarChart, Bar } from 'recharts';
import { fmtPct, fmt, fmtUSD, statusLabel, CHART_COLORS } from '../utils';

export default function Clusters({ data }) {
  const [selectedCluster, setSelectedCluster] = useState(null);

  const clusters = useMemo(() =>
    data.clusters
      .map(cl => {
        const crs = cl.creatives.map(id => data.creatives.find(c => c.id === id)).filter(Boolean);
        if (crs.length === 0) return null;
        const avgPerf = crs.reduce((s, c) => s + c.perf_score, 0) / crs.length;
        const avgCtr = crs.reduce((s, c) => s + c.ctr, 0) / crs.length;
        const avgRoas = crs.reduce((s, c) => s + c.roas, 0) / crs.length;
        const totalSpend = crs.reduce((s, c) => s + c.spend, 0);
        const statuses = {};
        crs.forEach(c => { statuses[c.status] = (statuses[c.status] || 0) + 1; });
        const healthPct = ((statuses.top_performer || 0) + (statuses.stable || 0)) / crs.length;
        return {
          ...cl,
          label: `${cl.vertical} · ${cl.format}`,
          count: crs.length,
          avgPerf,
          avgCtr,
          avgRoas,
          totalSpend,
          healthPct,
          statuses,
          creativesData: crs,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.avgPerf - a.avgPerf),
    [data]
  );

  const scatterData = useMemo(() =>
    clusters.map((cl, i) => ({
      x: cl.avgCtr * 100,
      y: cl.avgRoas,
      z: cl.count,
      name: cl.label,
      idx: i,
    })),
    [clusters]
  );

  const active = selectedCluster != null ? clusters[selectedCluster] : null;

  // Best/worst cluster
  const bestCluster = clusters[0];
  const worstCluster = clusters[clusters.length - 1];

  const CustomTooltip = ({ active: isActive, payload }) => {
    if (!isActive || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: 'var(--shadow)' }}>
        <div style={{ fontWeight: 600 }}>{d?.name}</div>
        <div style={{ marginTop: 4 }}>CTR: {d?.x?.toFixed(3)}%</div>
        <div>ROAS: {d?.y?.toFixed(2)}x</div>
        <div>Creatives: {d?.z}</div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h2>🧩 Creative Clustering & Similarity</h2>
        <p>Group similar creatives by vertical × format and identify winning clusters</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Clusters</div>
          <div className="stat-value">{clusters.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Best Cluster</div>
          <div className="stat-value" style={{ fontSize: 16, color: 'var(--green)', WebkitBackgroundClip: 'unset', WebkitTextFillColor: 'unset' }}>
            {bestCluster?.label || '—'}
          </div>
          <div className="stat-change positive">Score {((bestCluster?.avgPerf || 0) * 100).toFixed(0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Worst Cluster</div>
          <div className="stat-value" style={{ fontSize: 16, color: 'var(--red)', WebkitBackgroundClip: 'unset', WebkitTextFillColor: 'unset' }}>
            {worstCluster?.label || '—'}
          </div>
          <div className="stat-change negative">Score {((worstCluster?.avgPerf || 0) * 100).toFixed(0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Cluster Size</div>
          <div className="stat-value">{clusters.length > 0 ? (clusters.reduce((s, c) => s + c.count, 0) / clusters.length).toFixed(0) : '—'}</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3>Cluster Map (CTR vs ROAS)</h3></div>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart margin={{ bottom: 30, left: 10, right: 10 }}>
              <XAxis type="number" dataKey="x" name="CTR %" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
                label={{ value: 'Average CTR %', position: 'bottom', fill: 'var(--text-muted)', fontSize: 11, offset: 10 }} />
              <YAxis type="number" dataKey="y" name="ROAS" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
                label={{ value: 'Average ROAS', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Scatter data={scatterData} onClick={(d) => setSelectedCluster(d.idx)}>
                {scatterData.map((entry, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]}
                    r={Math.max(6, Math.min(22, entry.z / 2))}
                    cursor="pointer"
                    opacity={selectedCluster === null || selectedCluster === i ? 1 : 0.3}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ maxHeight: 430, overflowY: 'auto' }}>
          <div className="card-header"><h3>All Clusters</h3></div>
          {clusters.map((cl, i) => (
            <div
              key={i}
              onClick={() => setSelectedCluster(i)}
              style={{
                padding: '12px 14px', borderRadius: 10, cursor: 'pointer', marginBottom: 6,
                background: selectedCluster === i ? 'rgba(124,108,240,0.06)' : 'transparent',
                border: selectedCluster === i ? '1px solid var(--border-accent)' : '1px solid transparent',
                transition: 'var(--transition)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{cl.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {cl.count} creatives · {fmtUSD(cl.totalSpend)} spent
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>{(cl.avgPerf * 100).toFixed(0)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>avg score</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 6, alignItems: 'center' }}>
                {/* Health bar */}
                <div className="bar-fill-bg" style={{ flex: 1 }}>
                  <div className="bar-fill" style={{
                    width: `${cl.healthPct * 100}%`,
                    background: cl.healthPct >= 0.6 ? 'var(--green)' : cl.healthPct >= 0.4 ? 'var(--yellow)' : 'var(--red)',
                  }} />
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 30 }}>{(cl.healthPct * 100).toFixed(0)}% healthy</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {active && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <h3>📦 {active.label}</h3>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
              <span>CTR: {fmtPct(active.avgCtr)}</span>
              <span>ROAS: {active.avgRoas.toFixed(2)}x</span>
              <span>Spend: {fmtUSD(active.totalSpend)}</span>
              <span>{active.count} creatives</span>
            </div>
          </div>
          <div className="creatives-grid">
            {active.creativesData
              .sort((a, b) => b.perf_score - a.perf_score)
              .slice(0, 12)
              .map(c => (
              <div key={c.id} className="creative-card">
                <img src={`/${c.asset_file}`} alt={c.headline} loading="lazy" />
                <div className="info">
                  <h4>{c.headline}</h4>
                  <div className="meta">{c.advertiser} · {c.theme}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className={`status-badge ${c.status}`}>{statusLabel(c.status)}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>{(c.perf_score * 100).toFixed(0)}</span>
                  </div>
                  <div className="metrics">
                    <div className="metric"><div className="label">CTR</div><div className="val">{fmtPct(c.ctr)}</div></div>
                    <div className="metric"><div className="label">ROAS</div><div className="val">{c.roas.toFixed(2)}x</div></div>
                    <div className="metric"><div className="label">Spend</div><div className="val">{fmtUSD(c.spend)}</div></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
