import { useState, useEffect, useMemo } from 'react';
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
  const [selectedAdvertiser, setSelectedAdvertiser] = useState('all');

  useEffect(() => {
    fetch('/data.json')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(e => console.error('Failed to load data:', e));
  }, []);

  // Filter data by selected advertiser
  const filteredData = useMemo(() => {
    if (!data) return null;
    if (selectedAdvertiser === 'all') return data;

    const advCreatives = data.creatives.filter(c => c.advertiser === selectedAdvertiser);
    const advCampaigns = data.campaigns.filter(c => c.advertiser === selectedAdvertiser);
    const advCreativeIds = new Set(advCreatives.map(c => c.id));

    const advTimeSeries = {};
    for (const [cid, ts] of Object.entries(data.timeSeries)) {
      if (advCreativeIds.has(cid)) advTimeSeries[cid] = ts;
    }

    const advClusters = data.clusters
      .map(cl => ({
        ...cl,
        creatives: cl.creatives.filter(id => advCreativeIds.has(id)),
      }))
      .filter(cl => cl.creatives.length > 0);

    const advStats = {
      totalCreatives: advCreatives.length,
      totalCampaigns: advCampaigns.length,
      totalAdvertisers: 1,
      totalSpend: advCreatives.reduce((s, c) => s + c.spend, 0),
      totalImpressions: advCreatives.reduce((s, c) => s + c.impressions, 0),
      totalConversions: advCreatives.reduce((s, c) => s + c.conversions, 0),
      totalRevenue: advCreatives.reduce((s, c) => s + c.revenue, 0),
      statusBreakdown: {
        top_performer: advCreatives.filter(c => c.status === 'top_performer').length,
        stable: advCreatives.filter(c => c.status === 'stable').length,
        fatigued: advCreatives.filter(c => c.status === 'fatigued').length,
        underperformer: advCreatives.filter(c => c.status === 'underperformer').length,
      }
    };

    return {
      ...data,
      creatives: advCreatives,
      campaigns: advCampaigns,
      timeSeries: advTimeSeries,
      clusters: advClusters,
      stats: advStats,
      countryPerf: data.advertiserInsights[selectedAdvertiser]?.countryPerf || {},
      osPerf: data.advertiserInsights[selectedAdvertiser]?.osPerf || {},
    };
  }, [data, selectedAdvertiser]);

  if (!data) return (
    <div className="loading">
      <div className="spinner" />
      Loading Creative Intelligence Data…
    </div>
  );

  const advInsight = selectedAdvertiser !== 'all' ? data.advertiserInsights[selectedAdvertiser] : null;
  const benchmark = advInsight ? data.verticalBenchmarks[advInsight.vertical] : null;

  const pages = {
    overview: <Overview data={filteredData} fullData={data} advInsight={advInsight} benchmark={benchmark} onNavigate={setPage} selectedAdvertiser={selectedAdvertiser} />,
    explorer: <Explorer data={filteredData} />,
    fatigue: <Fatigue data={filteredData} advInsight={advInsight} />,
    explainability: <Explainability data={filteredData} advInsight={advInsight} benchmark={benchmark} />,
    recommendations: <Recommendations data={filteredData} advInsight={advInsight} benchmark={benchmark} />,
    clusters: <Clusters data={filteredData} />,
    copilot: <Copilot data={filteredData} advInsight={advInsight} selectedAdvertiser={selectedAdvertiser} />,
  };

  return (
    <>
      <Sidebar
        active={page}
        onNavigate={setPage}
        advertisers={data.advertisers}
        selectedAdvertiser={selectedAdvertiser}
        onSelectAdvertiser={setSelectedAdvertiser}
        advInsight={advInsight}
      />
      <main className="main-content">
        {pages[page] || pages.overview}
      </main>
    </>
  );
}
