import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import Explorer from './components/Explorer';
import Fatigue from './components/Fatigue';
import Explainability from './components/Explainability';
import Recommendations from './components/Recommendations';
import Clusters from './components/Clusters';
import Copilot from './components/Copilot';

export default function App() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState('overview');

  useEffect(() => {
    fetch('/data.json')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(e => console.error('Failed to load data:', e));
  }, []);

  if (!data) return (
    <div className="loading">
      <div className="spinner" />
      Loading Creative Intelligence Data…
    </div>
  );

  const pages = {
    overview: <Overview data={data} onNavigate={setPage} />,
    explorer: <Explorer data={data} />,
    fatigue: <Fatigue data={data} />,
    explainability: <Explainability data={data} />,
    recommendations: <Recommendations data={data} />,
    clusters: <Clusters data={data} />,
    copilot: <Copilot data={data} />,
  };

  return (
    <>
      <Sidebar active={page} onNavigate={setPage} />
      <main className="main-content">
        {pages[page] || pages.overview}
      </main>
    </>
  );
}
