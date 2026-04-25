import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { fmt, fmtUSD, fmtPct, statusLabel, explainPerformance, getTopTraits } from '../utils';

export default function Explorer({ data }) {
  const [vertical, setVertical] = useState('all');
  const [format, setFormat] = useState('all');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('perf_score');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const perPage = viewMode === 'grid' ? 12 : 20;

  const verticals = useMemo(() => [...new Set(data.creatives.map(c => c.vertical))].sort(), [data]);
  const formats = useMemo(() => [...new Set(data.creatives.map(c => c.format))].sort(), [data]);

  const filtered = useMemo(() => {
    let list = data.creatives;
    if (vertical !== 'all') list = list.filter(c => c.vertical === vertical);
    if (format !== 'all') list = list.filter(c => c.format === format);
    if (status !== 'all') list = list.filter(c => c.status === status);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.headline?.toLowerCase().includes(q) ||
        c.advertiser?.toLowerCase().includes(q) ||
        c.app?.toLowerCase().includes(q) ||
        c.id?.toString().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      const av = a[sortBy] || 0, bv = b[sortBy] || 0;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return list;
  }, [data, vertical, format, status, search, sortBy, sortDir]);

  const pageCount = Math.ceil(filtered.length / perPage);
  const pageItems = filtered.slice(page * perPage, (page + 1) * perPage);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const Arrow = ({ col }) => sortBy === col ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '';

  // Detail modal time-series
  const selectedTs = selected ? (data.timeSeries[selected.id] || []) : [];
  const selectedReasons = selected ? explainPerformance(selected) : [];
  const selectedTraits = selected ? getTopTraits(selected) : [];

  return (
    <div>
      <div className="page-header">
        <h2>🔍 Creative Performance Explorer</h2>
        <p>Explore, compare, and drill into creative performance across all dimensions</p>
      </div>

      <div className="filters-bar">
        <input className="search-input" placeholder="Search creatives…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
        <select className="filter-select" value={vertical} onChange={e => { setVertical(e.target.value); setPage(0); }}>
          <option value="all">All Verticals</option>
          {verticals.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select className="filter-select" value={format} onChange={e => { setFormat(e.target.value); setPage(0); }}>
          <option value="all">All Formats</option>
          {formats.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="filter-select" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}>
          <option value="all">All Statuses</option>
          <option value="top_performer">Top Performer</option>
          <option value="stable">Stable</option>
          <option value="fatigued">Fatigued</option>
          <option value="underperformer">Underperformer</option>
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} creatives</span>
          <div className="view-toggle">
            <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => { setViewMode('grid'); setPage(0); }}>⊞</button>
            <button className={viewMode === 'table' ? 'active' : ''} onClick={() => { setViewMode('table'); setPage(0); }}>☰</button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="creatives-grid">
          {pageItems.map(c => (
            <div key={c.id} className="creative-card" onClick={() => setSelected(c)}>
              <img src={`/${c.asset_file}`} alt={c.headline} loading="lazy" />
              <div className="info">
                <h4>{c.headline}</h4>
                <div className="meta">{c.advertiser} · {c.format}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className={`status-badge ${c.status}`}>{statusLabel(c.status)}</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>{(c.perf_score * 100).toFixed(0)}</span>
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
      ) : (
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}></th>
                <th onClick={() => handleSort('headline')}>Creative<Arrow col="headline" /></th>
                <th onClick={() => handleSort('vertical')}>Vertical<Arrow col="vertical" /></th>
                <th onClick={() => handleSort('format')}>Format<Arrow col="format" /></th>
                <th>Status</th>
                <th onClick={() => handleSort('perf_score')}>Score<Arrow col="perf_score" /></th>
                <th onClick={() => handleSort('ctr')}>CTR<Arrow col="ctr" /></th>
                <th onClick={() => handleSort('cvr')}>CVR<Arrow col="cvr" /></th>
                <th onClick={() => handleSort('roas')}>ROAS<Arrow col="roas" /></th>
                <th onClick={() => handleSort('impressions')}>Impr.<Arrow col="impressions" /></th>
                <th onClick={() => handleSort('spend')}>Spend<Arrow col="spend" /></th>
                <th onClick={() => handleSort('ctr_decay')}>Decay<Arrow col="ctr_decay" /></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(c => (
                <tr key={c.id} onClick={() => setSelected(c)} style={{ cursor: 'pointer' }}>
                  <td><img src={`/${c.asset_file}`} alt="" style={{ width: 44, height: 33, objectFit: 'cover', borderRadius: 6 }} /></td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{c.headline}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.advertiser} · #{c.id}</div>
                  </td>
                  <td>{c.vertical}</td>
                  <td>{c.format}</td>
                  <td><span className={`status-badge ${c.status}`}>{statusLabel(c.status)}</span></td>
                  <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{(c.perf_score * 100).toFixed(0)}</td>
                  <td>{fmtPct(c.ctr)}</td>
                  <td>{fmtPct(c.cvr)}</td>
                  <td style={{ color: c.roas >= 1 ? 'var(--green)' : 'var(--red)' }}>{c.roas.toFixed(2)}x</td>
                  <td>{fmt(c.impressions)}</td>
                  <td>{fmtUSD(c.spend)}</td>
                  <td style={{ color: c.ctr_decay < -0.3 ? 'var(--red)' : c.ctr_decay > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                    {(c.ctr_decay * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <div className="pagination">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span>Page {page + 1} of {pageCount}</span>
          <button disabled={page >= pageCount - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}>✕ Close</button>

            {/* Header */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
              <img src={`/${selected.asset_file}`} alt="" style={{ width: 200, height: 160, borderRadius: 12, objectFit: 'cover', border: '1px solid var(--border)' }} />
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span className={`status-badge ${selected.status}`}>{statusLabel(selected.status)}</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{(selected.perf_score * 100).toFixed(0)}<span style={{ fontSize: 12, fontWeight: 500 }}>/100</span></span>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.3px' }}>{selected.headline}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>{selected.subhead}</p>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {selected.advertiser} · {selected.app} · {selected.vertical} · {selected.format}
                </div>

                {/* KPI grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 16 }}>
                  {[
                    ['CTR', fmtPct(selected.ctr), selected.ctr > 0.005 ? 'var(--green)' : null],
                    ['CVR', fmtPct(selected.cvr), selected.cvr > 0.15 ? 'var(--green)' : null],
                    ['ROAS', selected.roas.toFixed(2) + 'x', selected.roas >= 1 ? 'var(--green)' : 'var(--red)'],
                    ['IPM', selected.ipm.toFixed(2), null],
                    ['Spend', fmtUSD(selected.spend), null],
                    ['Revenue', fmtUSD(selected.revenue), null],
                    ['Conversions', fmt(selected.conversions), null],
                    ['Days Active', selected.days_active, null],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: color || 'var(--text-primary)', marginTop: 2 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Performance trend */}
            {selectedTs.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>📈 Performance Over Time</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={selectedTs}>
                    <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => (v * 100).toFixed(1) + '%'} />
                    <Tooltip
                      content={({ active, payload }) => active && payload?.length ? (
                        <div style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                          <div style={{ fontWeight: 600 }}>Day {payload[0]?.payload?.day}</div>
                          {payload.map((p, i) => <div key={i} style={{ color: p.color, marginTop: 2 }}>{p.name}: {fmtPct(p.value)}</div>)}
                        </div>
                      ) : null}
                    />
                    {selected.fatigue_day && <ReferenceLine x={selected.fatigue_day} stroke="var(--yellow)" strokeDasharray="4 4" />}
                    <Line type="monotone" dataKey="ctr" name="CTR" stroke="var(--accent)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="cvr" name="CVR" stroke="var(--green)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Insights & attributes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Why */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                  {selected.status === 'top_performer' || selected.status === 'stable' ? '✅ Why It Works' : '⚠️ What\'s Happening'}
                </h4>
                {selectedReasons.map((r, i) => (
                  <div key={i} style={{ fontSize: 13, marginBottom: 6, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: selected.status === 'underperformer' ? 'var(--red)' : selected.status === 'fatigued' ? 'var(--yellow)' : 'var(--green)', flexShrink: 0 }}>
                      {selected.status === 'underperformer' ? '✗' : selected.status === 'fatigued' ? '⚠' : '✓'}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{r}</span>
                  </div>
                ))}
                {selectedTraits.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 10 }}>
                    {selectedTraits.map((t, i) => (
                      <span key={i} style={{ fontSize: 10, background: 'rgba(124,108,240,0.1)', border: '1px solid var(--border-accent)', padding: '3px 8px', borderRadius: 12, color: 'var(--accent-light)' }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Creative attributes */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>🧬 Creative DNA</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    ['Theme', selected.theme],
                    ['Hook', selected.hook_type],
                    ['CTA', selected.cta_text],
                    ['Color', selected.dominant_color],
                    ['Tone', selected.emotional_tone],
                    ['Language', selected.language],
                  ].map(([label, val]) => (
                    <div key={label} style={{ fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{label}: </span>
                      <span style={{ fontWeight: 600 }}>{val}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    ['Novelty', selected.novelty],
                    ['Readability', selected.readability],
                    ['Brand Vis.', selected.brand_visibility],
                    ['Clutter', selected.clutter],
                    ['Motion', selected.motion],
                    ['Text Density', selected.text_density],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                      <div className="bar-fill-bg">
                        <div className="bar-fill" style={{
                          width: `${val * 100}%`,
                          background: label === 'Clutter'
                            ? (val > 0.5 ? 'var(--red)' : 'var(--green)')
                            : (val > 0.6 ? 'var(--green)' : val > 0.3 ? 'var(--blue)' : 'var(--red)')
                        }} />
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>{(val * 100).toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Decay info */}
            {(selected.ctr_decay < -0.2 || selected.cvr_decay < -0.2) && (
              <div style={{ marginTop: 20, padding: '14px 18px', background: selected.status === 'fatigued' ? 'var(--yellow-bg)' : 'var(--red-bg)', borderRadius: 10, fontSize: 13, border: `1px solid ${selected.status === 'fatigued' ? 'rgba(251,191,36,0.15)' : 'rgba(248,113,113,0.15)'}` }}>
                <strong style={{ color: selected.status === 'fatigued' ? 'var(--yellow)' : 'var(--red)' }}>
                  {selected.status === 'fatigued' ? '⏳ Fatigue Detected' : '📉 Performance Declining'}
                </strong>
                <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                  CTR: {fmtPct(selected.first_7d_ctr)} → {fmtPct(selected.last_7d_ctr)} ({(selected.ctr_decay * 100).toFixed(0)}%) &nbsp;·&nbsp;
                  CVR: {fmtPct(selected.first_7d_cvr)} → {fmtPct(selected.last_7d_cvr)} ({(selected.cvr_decay * 100).toFixed(0)}%)
                  {selected.fatigue_day && <> &nbsp;·&nbsp; Fatigue onset: Day {selected.fatigue_day}</>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
