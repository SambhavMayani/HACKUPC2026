import { useState, useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, CartesianGrid, Legend,
} from 'recharts';
import { fmtPct, fmt, fmtUSD, statusLabel, CHART_COLORS } from '../utils';

const MODEL_OPTIONS = [
  { key: 'combined', label: '🧬 Combined', desc: 'Visual + Performance' },
  { key: 'performance', label: '📊 Performance', desc: 'Metrics only' },
  { key: 'visual', label: '🎨 Visual DNA', desc: 'Creative attributes' },
];

const CLUSTER_COLORS = ['#6c5ce7', '#00d2a0', '#ff6b6b', '#ffc857', '#54a0ff', '#f78fb3', '#3dc1d3', '#e77f67'];

export default function Clusters({ data }) {
  const [model, setModel] = useState('combined');
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [showNeighbors, setShowNeighbors] = useState(null);

  const mlData = data.mlClusters?.[model];
  const myCreativeIds = useMemo(() => new Set(data.creatives.map(c => c.id)), [data]);

  // Scope clusters to this advertiser's creatives
  const scopedClusters = useMemo(() => {
    if (!mlData) return [];
    return mlData.clusters.map(cl => {
      const myIds = cl.creativeIds.filter(id => myCreativeIds.has(id));
      const crs = myIds.map(id => data.creatives.find(c => c.id === id)).filter(Boolean);
      if (crs.length === 0) return null;
      const avgPerf = crs.reduce((s, c) => s + c.perf_score, 0) / crs.length;
      const avgCtr = crs.reduce((s, c) => s + c.ctr, 0) / crs.length;
      const avgRoas = crs.reduce((s, c) => s + c.roas, 0) / crs.length;
      const totalSpend = crs.reduce((s, c) => s + c.spend, 0);
      const statuses = {};
      crs.forEach(c => { statuses[c.status] = (statuses[c.status] || 0) + 1; });
      const healthPct = ((statuses.top_performer || 0) + (statuses.stable || 0)) / crs.length;
      return { ...cl, myCount: crs.length, myCreatives: crs, avgPerf, avgCtr, avgRoas, totalSpend, statuses, healthPct };
    }).filter(Boolean).sort((a, b) => b.avgPerf - a.avgPerf);
  }, [mlData, data, myCreativeIds]);

  // PCA scatter data (only my creatives)
  const scatterData = useMemo(() => {
    if (!mlData) return [];
    return data.creatives.map(c => {
      const a = mlData.assignments[c.id];
      if (!a) return null;
      return { x: a.pca.x, y: a.pca.y, cluster: a.cluster, id: c.id, headline: c.headline, perf: c.perf_score, status: c.status };
    }).filter(Boolean);
  }, [mlData, data]);

  // Radar data for centroid comparison
  const radarData = useMemo(() => {
    if (!mlData || scopedClusters.length === 0) return [];
    const keys = mlData.featureKeys.slice(0, 8); // top 8 features for readability
    const labels = mlData.features.slice(0, 8);
    return keys.map((key, i) => {
      const entry = { feature: labels[i] };
      scopedClusters.forEach((cl, ci) => {
        const raw = cl.centroid[key] || 0;
        entry[`c${cl.id}`] = Math.round((raw + 3) / 6 * 100); // normalize z-score [-3,3] to [0,100]
      });
      return entry;
    });
  }, [mlData, scopedClusters]);

  // Cluster comparison bar data
  const comparisonData = useMemo(() =>
    scopedClusters.map(cl => ({
      name: `C${cl.id}`,
      label: cl.label.split(',')[0],
      perf: Math.round(cl.avgPerf * 100),
      roas: Math.round(cl.avgRoas * 100) / 100,
      health: Math.round(cl.healthPct * 100),
      size: cl.myCount,
    })), [scopedClusters]);

  const active = selectedCluster != null ? scopedClusters.find(c => c.id === selectedCluster) : null;

  // Nearest neighbors for a creative
  const neighborsFor = showNeighbors ? data.creatives.find(c => c.id === showNeighbors) : null;
  const neighborsList = useMemo(() => {
    if (!neighborsFor || !mlData) return [];
    const nn = mlData.nearestNeighbors[neighborsFor.id] || [];
    return nn.map(n => ({ ...n, creative: data.creatives.find(c => c.id === n.id) })).filter(n => n.creative);
  }, [neighborsFor, mlData, data]);

  const ScatterTooltip = ({ active: isActive, payload }) => {
    if (!isActive || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: 'var(--shadow)' }}>
        <div style={{ fontWeight: 600 }}>{d?.headline}</div>
        <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>Cluster {d?.cluster} · Score {(d?.perf * 100).toFixed(0)}</div>
      </div>
    );
  };

  if (!mlData) return <div className="loading">No ML clustering data available</div>;

  return (
    <div>
      <div className="page-header">
        <h2>🧬 ML Creative Clustering</h2>
        <p>K-Means clustering with {mlData.featureKeys.length} features · {mlData.k} clusters · Silhouette {mlData.silhouette.toFixed(3)}</p>
      </div>

      {/* Model selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {MODEL_OPTIONS.map(m => (
          <button key={m.key} onClick={() => { setModel(m.key); setSelectedCluster(null); }}
            style={{
              padding: '10px 18px', borderRadius: 10, border: model === m.key ? '1.5px solid var(--accent)' : '1px solid var(--border)',
              background: model === m.key ? 'rgba(124,108,240,0.08)' : 'var(--bg-card)', cursor: 'pointer',
              color: 'var(--text-primary)', fontSize: 13, fontWeight: model === m.key ? 600 : 400, transition: 'var(--transition)',
            }}>
            {m.label} <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>{m.desc}</span>
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Clusters Found</div>
          <div className="stat-value">{scopedClusters.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Best Cluster</div>
          <div className="stat-value" style={{ fontSize: 14, color: 'var(--green)', WebkitBackgroundClip: 'unset', WebkitTextFillColor: 'unset' }}>
            {scopedClusters[0]?.label.split(',')[0] || '—'}
          </div>
          <div className="stat-change positive">Score {((scopedClusters[0]?.avgPerf || 0) * 100).toFixed(0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Silhouette Score</div>
          <div className="stat-value">{mlData.silhouette.toFixed(3)}</div>
          <div className="stat-change">{mlData.silhouette > 0.25 ? '✅ Good separation' : '⚠️ Overlapping clusters'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Features Used</div>
          <div className="stat-value">{mlData.featureKeys.length}</div>
        </div>
      </div>

      {/* Main grid: PCA scatter + cluster list */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3>PCA Projection (2D)</h3></div>
          <ResponsiveContainer width="100%" height={380}>
            <ScatterChart margin={{ bottom: 20, left: 10, right: 10 }}>
              <XAxis type="number" dataKey="x" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
                label={{ value: 'PC1', position: 'bottom', fill: 'var(--text-muted)', fontSize: 11, offset: 5 }} />
              <YAxis type="number" dataKey="y" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
                label={{ value: 'PC2', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip content={<ScatterTooltip />} />
              <Scatter data={scatterData} onClick={(d) => setShowNeighbors(d.id)}>
                {scatterData.map((entry, i) => (
                  <Cell key={i} fill={CLUSTER_COLORS[entry.cluster % CLUSTER_COLORS.length]}
                    r={selectedCluster == null || selectedCluster === entry.cluster ? 5 : 2}
                    opacity={selectedCluster == null || selectedCluster === entry.cluster ? 0.85 : 0.15}
                    cursor="pointer" />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', padding: '0 12px 8px' }}>
            {scopedClusters.map(cl => (
              <span key={cl.id} onClick={() => setSelectedCluster(selectedCluster === cl.id ? null : cl.id)}
                style={{ fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: selectedCluster == null || selectedCluster === cl.id ? 1 : 0.4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: CLUSTER_COLORS[cl.id % CLUSTER_COLORS.length] }} />
                C{cl.id}: {cl.label.split(',')[0]}
              </span>
            ))}
          </div>
        </div>

        <div className="card" style={{ maxHeight: 460, overflowY: 'auto' }}>
          <div className="card-header"><h3>Cluster Rankings</h3></div>
          {scopedClusters.map(cl => (
            <div key={cl.id} onClick={() => setSelectedCluster(selectedCluster === cl.id ? null : cl.id)}
              style={{
                padding: '12px 14px', borderRadius: 10, cursor: 'pointer', marginBottom: 6,
                background: selectedCluster === cl.id ? 'rgba(124,108,240,0.06)' : 'transparent',
                border: selectedCluster === cl.id ? '1px solid var(--border-accent)' : '1px solid transparent',
                transition: 'var(--transition)',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: CLUSTER_COLORS[cl.id % CLUSTER_COLORS.length], flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>C{cl.id}: {cl.label.split(',').slice(0, 2).join(', ')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {cl.myCount} creatives · {fmtUSD(cl.totalSpend)} · ROAS {cl.avgRoas.toFixed(2)}x
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>{(cl.avgPerf * 100).toFixed(0)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>score</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 6, alignItems: 'center' }}>
                <div className="bar-fill-bg" style={{ flex: 1 }}>
                  <div className="bar-fill" style={{
                    width: `${cl.healthPct * 100}%`,
                    background: cl.healthPct >= 0.6 ? 'var(--green)' : cl.healthPct >= 0.4 ? 'var(--yellow)' : 'var(--red)',
                  }} />
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 55 }}>{(cl.healthPct * 100).toFixed(0)}% healthy</span>
              </div>
              {/* Dominant traits */}
              <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                {Object.entries(cl.dominantTraits || {}).slice(0, 4).map(([k, v]) => (
                  <span key={k} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    {v}
                  </span>
                ))}
              </div>
              {/* LLM Insight */}
              {(cl.llmWhy || cl.llmCommon) && (
                <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(124,108,240,0.04)', borderLeft: '2px solid var(--accent)' }}>
                  {cl.llmWhy && <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>💡 {cl.llmWhy}</div>}
                  {cl.llmCommon && <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 2 }}>🔗 {cl.llmCommon}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Radar + Comparison */}
      <div className="grid-2" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card-header"><h3>🎯 Centroid Profiles</h3></div>
          {radarData.length > 0 && (
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="feature" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                {scopedClusters.map((cl, i) => (
                  <Radar key={cl.id} name={`C${cl.id}`} dataKey={`c${cl.id}`}
                    stroke={CLUSTER_COLORS[cl.id % CLUSTER_COLORS.length]}
                    fill={CLUSTER_COLORS[cl.id % CLUSTER_COLORS.length]}
                    fillOpacity={0.1} strokeWidth={2} />
                ))}
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div className="card-header"><h3>📊 Cluster Comparison</h3></div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={comparisonData} margin={{ bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="perf" name="Perf Score" fill="#6c5ce7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="health" name="Health %" fill="#00d2a0" radius={[4, 4, 0, 0]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Elbow chart */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h3>🔬 Model Selection (Elbow Method)</h3>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>K={mlData.k} selected by silhouette maximization</span>
        </div>
        <div style={{ display: 'flex', gap: 20, padding: '0 16px 16px', flexWrap: 'wrap' }}>
          {mlData.elbow.map(e => (
            <div key={e.k} style={{
              padding: '10px 16px', borderRadius: 10, flex: '1 1 100px', textAlign: 'center',
              background: e.k === mlData.k ? 'rgba(124,108,240,0.08)' : 'var(--bg-secondary)',
              border: e.k === mlData.k ? '1.5px solid var(--accent)' : '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: e.k === mlData.k ? 'var(--accent)' : 'var(--text-primary)' }}>K={e.k}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Silhouette: {e.silhouette.toFixed(3)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Inertia: {fmt(e.inertia)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Nearest neighbors panel */}
      {neighborsFor && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>🔗 Nearest Neighbors: "{neighborsFor.headline}"</h3>
            <button onClick={() => setShowNeighbors(null)}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12 }}>
              ✕ Close
            </button>
          </div>
          <div className="creatives-grid">
            {neighborsList.slice(0, 5).map(n => (
              <div key={n.id} className="creative-card">
                <img src={`/api/assets/${n.creative.asset_file}`} alt={n.creative.headline} loading="lazy" />
                <div className="info">
                  <h4>{n.creative.headline}</h4>
                  <div className="meta">Distance: {n.distance.toFixed(2)} · {n.creative.format}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className={`status-badge ${n.creative.status}`}>{statusLabel(n.creative.status)}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>{(n.creative.perf_score * 100).toFixed(0)}</span>
                  </div>
                  <div className="metrics">
                    <div className="metric"><div className="label">CTR</div><div className="val">{fmtPct(n.creative.ctr)}</div></div>
                    <div className="metric"><div className="label">ROAS</div><div className="val">{n.creative.roas.toFixed(2)}x</div></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cluster drill-down */}
      {active && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: CLUSTER_COLORS[active.id % CLUSTER_COLORS.length] }} />
              Cluster {active.id}: {active.label}
            </h3>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
              <span>CTR: {fmtPct(active.avgCtr)}</span>
              <span>ROAS: {active.avgRoas.toFixed(2)}x</span>
              <span>Spend: {fmtUSD(active.totalSpend)}</span>
              <span>{active.myCount} creatives</span>
            </div>
          </div>
          {/* LLM Cluster Insight */}
          {(active.llmWhy || active.llmCommon) && (
            <div style={{ margin: '0 16px 12px', padding: '12px 16px', borderRadius: 10, background: 'linear-gradient(135deg, rgba(124,108,240,0.06), rgba(0,210,160,0.04))', border: '1px solid var(--border)' }}>
              {active.llmWhy && <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, fontWeight: 500 }}>💡 {active.llmWhy}</div>}
              {active.llmCommon && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 4 }}>🔗 {active.llmCommon}</div>}
            </div>
          )}
          {/* Status breakdown */}
          <div style={{ display: 'flex', gap: 12, padding: '0 16px 12px', flexWrap: 'wrap' }}>
            {Object.entries(active.statuses).map(([s, count]) => count > 0 && (
              <span key={s} className={`status-badge ${s}`} style={{ fontSize: 11 }}>
                {statusLabel(s)} ({count})
              </span>
            ))}
          </div>
          <div className="creatives-grid">
            {active.myCreatives.sort((a, b) => b.perf_score - a.perf_score).slice(0, 12).map(c => (
              <div key={c.id} className="creative-card" onClick={() => setShowNeighbors(c.id)} style={{ cursor: 'pointer' }}>
                <img src={`/api/assets/${c.asset_file}`} alt={c.headline} loading="lazy" />
                <div className="info">
                  <h4>{c.headline}</h4>
                  <div className="meta">{c.theme} · {c.format}</div>
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
