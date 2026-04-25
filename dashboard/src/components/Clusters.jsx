import { useState, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fmtPct, fmt, statusLabel, CHART_COLORS } from '../utils';

export default function Clusters({ data }) {
  const [selectedCluster, setSelectedCluster] = useState(null);

  const clusters = useMemo(() =>
    data.clusters
      .map(cl => {
        const crs = cl.creatives.map(id => data.creatives.find(c => c.id === id)).filter(Boolean);
        const avgPerf = crs.reduce((s, c) => s + c.perf_score, 0) / crs.length;
        const avgCtr = crs.reduce((s, c) => s + c.ctr, 0) / crs.length;
        const avgRoas = crs.reduce((s, c) => s + c.roas, 0) / crs.length;
        const statuses = {};
        crs.forEach(c => { statuses[c.status] = (statuses[c.status] || 0) + 1; });
        return {
          ...cl,
          label: `${cl.vertical} · ${cl.format}`,
          count: crs.length,
          avgPerf,
          avgCtr,
          avgRoas,
          statuses,
          creativesData: crs,
        };
      })
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

  const CustomTooltip = ({ active: isActive, payload }) => {
    if (!isActive || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
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
        <h2>🧩 Creative Similarity & Clustering</h2>
        <p>Group similar creatives and compare cluster performance</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3>Cluster Map (CTR vs ROAS)</h3></div>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart margin={{ bottom: 20, left: 10 }}>
              <XAxis type="number" dataKey="x" name="CTR %" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Avg CTR %', position: 'bottom', fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis type="number" dataKey="y" name="ROAS" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Avg ROAS', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Scatter data={scatterData} onClick={(d) => setSelectedCluster(d.idx)}>
                {scatterData.map((entry, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} r={Math.max(6, Math.min(20, entry.z / 2))} cursor="pointer" />
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
                padding: '12px 14px', borderRadius: 8, cursor: 'pointer', marginBottom: 6,
                background: selectedCluster === i ? 'var(--bg-card-hover)' : 'transparent',
                border: selectedCluster === i ? '1px solid var(--accent)' : '1px solid transparent',
                transition: 'var(--transition)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{cl.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{cl.count} creatives</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{(cl.avgPerf * 100).toFixed(0)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>avg score</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {Object.entries(cl.statuses).map(([s, n]) => (
                  <span key={s} className={`status-badge ${s}`} style={{ fontSize: 10 }}>{n}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {active && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <h3>Creatives in: {active.label}</h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Avg CTR: {fmtPct(active.avgCtr)} · Avg ROAS: {active.avgRoas.toFixed(2)}x · {active.count} creatives
            </span>
          </div>
          <div className="creatives-grid">
            {active.creativesData.slice(0, 12).map(c => (
              <div key={c.id} className="creative-card">
                <img src={`/${c.asset_file}`} alt={c.headline} loading="lazy" />
                <div className="info">
                  <h4>{c.headline}</h4>
                  <div className="meta">{c.advertiser} · {c.theme}</div>
                  <span className={`status-badge ${c.status}`}>{statusLabel(c.status)}</span>
                  <div className="metrics" style={{ marginTop: 8 }}>
                    <div className="metric"><div className="label">CTR</div><div className="val">{fmtPct(c.ctr)}</div></div>
                    <div className="metric"><div className="label">ROAS</div><div className="val">{c.roas.toFixed(2)}x</div></div>
                    <div className="metric"><div className="label">Score</div><div className="val" style={{ color: 'var(--accent)' }}>{(c.perf_score * 100).toFixed(0)}</div></div>
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
