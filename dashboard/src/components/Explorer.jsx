import { useState, useMemo } from 'react';
import { fmt, fmtUSD, fmtPct, statusLabel } from '../utils';

export default function Explorer({ data }) {
  const [vertical, setVertical] = useState('all');
  const [format, setFormat] = useState('all');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('perf_score');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const perPage = 12;

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

  const SortIcon = ({ col }) => sortBy === col ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '';

  return (
    <div>
      <div className="page-header">
        <h2>🔍 Creative Performance Explorer</h2>
        <p>Explore and compare creative performance across dimensions</p>
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
        <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {filtered.length} creatives
        </span>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Preview</th>
              <th onClick={() => handleSort('headline')}>Creative<SortIcon col="headline" /></th>
              <th onClick={() => handleSort('vertical')}>Vertical<SortIcon col="vertical" /></th>
              <th onClick={() => handleSort('format')}>Format<SortIcon col="format" /></th>
              <th>Status</th>
              <th onClick={() => handleSort('perf_score')}>Score<SortIcon col="perf_score" /></th>
              <th onClick={() => handleSort('ctr')}>CTR<SortIcon col="ctr" /></th>
              <th onClick={() => handleSort('cvr')}>CVR<SortIcon col="cvr" /></th>
              <th onClick={() => handleSort('roas')}>ROAS<SortIcon col="roas" /></th>
              <th onClick={() => handleSort('impressions')}>Impr.<SortIcon col="impressions" /></th>
              <th onClick={() => handleSort('spend')}>Spend<SortIcon col="spend" /></th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map(c => (
              <tr key={c.id} onClick={() => setSelected(c)} style={{ cursor: 'pointer' }}>
                <td><img src={`/${c.asset_file}`} alt="" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4 }} /></td>
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
                <td>{c.roas.toFixed(2)}x</td>
                <td>{fmt(c.impressions)}</td>
                <td>{fmtUSD(c.spend)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="pagination">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span>Page {page + 1} of {pageCount}</span>
          <button disabled={page >= pageCount - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            <div style={{ display: 'flex', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
              <img src={`/${selected.asset_file}`} alt="" style={{ width: 200, borderRadius: 8, objectFit: 'cover' }} />
              <div style={{ flex: 1, minWidth: 250 }}>
                <h3 style={{ fontSize: 20, marginBottom: 4 }}>{selected.headline}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>{selected.subhead}</p>
                <span className={`status-badge ${selected.status}`}>{statusLabel(selected.status)}</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
                  {[
                    ['CTR', fmtPct(selected.ctr)], ['CVR', fmtPct(selected.cvr)], ['ROAS', selected.roas.toFixed(2) + 'x'],
                    ['Spend', fmtUSD(selected.spend)], ['Impressions', fmt(selected.impressions)], ['Conversions', fmt(selected.conversions)],
                    ['Days Active', selected.days_active], ['Theme', selected.theme], ['Hook', selected.hook_type],
                    ['CTA', selected.cta_text], ['Color', selected.dominant_color], ['Tone', selected.emotional_tone],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
