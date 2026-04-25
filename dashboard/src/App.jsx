import { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import AccountPicker from './components/AccountPicker';
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
  const [account, setAccount] = useState(null); // the logged-in advertiser name

  useEffect(() => {
    fetch('/data.json')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(e => console.error('Failed to load data:', e));
  }, []);

  // Scoped data: filter everything to the logged-in account
  const scopedData = useMemo(() => {
    if (!data || !account) return null;

    const myCreatives = data.creatives.filter(c => c.advertiser === account);
    const myCampaigns = data.campaigns.filter(c => c.advertiser === account);
    const myCreativeIds = new Set(myCreatives.map(c => c.id));

    const myTimeSeries = {};
    for (const [cid, ts] of Object.entries(data.timeSeries)) {
      if (myCreativeIds.has(cid)) myTimeSeries[cid] = ts;
    }

    const myClusters = data.clusters
      .map(cl => ({ ...cl, creatives: cl.creatives.filter(id => myCreativeIds.has(id)) }))
      .filter(cl => cl.creatives.length > 0);

    const myStats = {
      totalCreatives: myCreatives.length,
      totalCampaigns: myCampaigns.length,
      totalSpend: myCreatives.reduce((s, c) => s + c.spend, 0),
      totalImpressions: myCreatives.reduce((s, c) => s + c.impressions, 0),
      totalClicks: myCreatives.reduce((s, c) => s + c.clicks, 0),
      totalConversions: myCreatives.reduce((s, c) => s + c.conversions, 0),
      totalRevenue: myCreatives.reduce((s, c) => s + c.revenue, 0),
      statusBreakdown: {
        top_performer: myCreatives.filter(c => c.status === 'top_performer').length,
        stable: myCreatives.filter(c => c.status === 'stable').length,
        fatigued: myCreatives.filter(c => c.status === 'fatigued').length,
        underperformer: myCreatives.filter(c => c.status === 'underperformer').length,
      }
    };

    const insight = data.advertiserInsights[account];

    return {
      creatives: myCreatives,
      campaigns: myCampaigns,
      timeSeries: myTimeSeries,
      clusters: myClusters,
      mlClusters: data.mlClusters,
      stats: myStats,
      countryPerf: insight?.countryPerf || {},
      osPerf: insight?.osPerf || {},
      traitAnalysis: insight?.advTraits || data.traitAnalysis,
    };
  }, [data, account]);

  if (!data) return (
    <div className="loading">
      <div className="spinner" />
      Loading Creative Intelligence…
    </div>
  );

  // Account picker screen (login simulation)
  if (!account) {
    return <AccountPicker advertisers={data.advertisers} insights={data.advertiserInsights} onSelect={setAccount} />;
  }

  const insight = data.advertiserInsights[account];
  const benchmark = insight ? data.verticalBenchmarks[insight.vertical] : null;

  const pages = {
    overview: <Overview data={scopedData} insight={insight} benchmark={benchmark} onNavigate={setPage} />,
    explorer: <Explorer data={scopedData} />,
    fatigue: <Fatigue data={scopedData} insight={insight} />,
    explainability: <Explainability data={scopedData} insight={insight} benchmark={benchmark} />,
    recommendations: <Recommendations data={scopedData} insight={insight} benchmark={benchmark} />,
    clusters: <Clusters data={scopedData} />,
    copilot: <Copilot data={scopedData} insight={insight} account={account} />,
  };

  return (
    <>
      <Sidebar
        active={page}
        onNavigate={setPage}
        account={account}
        insight={insight}
        onSwitchAccount={() => setAccount(null)}
      />
      <main className="main-content">
        {pages[page] || pages.overview}
      </main>
    </>
  );
}
