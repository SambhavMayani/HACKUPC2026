export function fmt(n, decimals = 0) {
  if (n == null || isNaN(n)) return '—';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(decimals);
}

export function fmtPct(n) {
  if (n == null || isNaN(n)) return '—';
  return (n * 100).toFixed(2) + '%';
}

export function fmtUSD(n) {
  if (n == null || isNaN(n)) return '—';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(2);
}

export function statusColor(status) {
  switch (status) {
    case 'top_performer': return 'var(--green)';
    case 'stable': return 'var(--blue)';
    case 'fatigued': return 'var(--yellow)';
    case 'underperformer': return 'var(--red)';
    default: return 'var(--text-muted)';
  }
}

export function statusLabel(status) {
  switch (status) {
    case 'top_performer': return '🏆 Top Performer';
    case 'stable': return '✅ Stable';
    case 'fatigued': return '⚠️ Fatigued';
    case 'underperformer': return '📉 Underperformer';
    default: return status;
  }
}

export function getTopTraits(creative) {
  const traits = [];
  if (creative.novelty > 0.7) traits.push('High novelty');
  if (creative.brand_visibility > 0.7) traits.push('Strong branding');
  if (creative.motion > 0.7) traits.push('High motion');
  if (creative.has_gameplay) traits.push('Shows gameplay');
  if (creative.has_ugc_style) traits.push('UGC style');
  if (creative.has_discount) traits.push('Discount badge');
  if (creative.has_price) traits.push('Shows price');
  if (creative.faces_count > 0) traits.push(`${creative.faces_count} face(s)`);
  if (creative.readability > 0.7) traits.push('Highly readable');
  if (creative.clutter < 0.3) traits.push('Clean layout');
  return traits;
}

export function explainPerformance(creative) {
  const reasons = [];
  if (creative.status === 'top_performer') {
    if (creative.ctr > 0.005) reasons.push('Exceptionally high click-through rate');
    if (creative.cvr > 0.15) reasons.push('Strong conversion rate');
    if (creative.roas > 2) reasons.push('Excellent return on ad spend');
    if (creative.novelty > 0.6) reasons.push('Novel creative approach stands out');
    if (creative.has_gameplay) reasons.push('Gameplay preview drives engagement');
    if (creative.motion > 0.5) reasons.push('Motion elements capture attention');
    if (reasons.length === 0) reasons.push('Consistently strong across all metrics');
  } else if (creative.status === 'fatigued') {
    reasons.push(`Performance declined after day ${creative.fatigue_day || '~14'}`);
    if (creative.ctr_decay < -0.5) reasons.push(`CTR dropped ${Math.abs(creative.ctr_decay * 100).toFixed(0)}% from launch`);
    if (creative.cvr_decay < -0.3) reasons.push('Conversion rate degrading over time');
    reasons.push('Audience has likely seen this creative too many times');
  } else if (creative.status === 'underperformer') {
    if (creative.ctr < 0.002) reasons.push('Very low click-through rate');
    if (creative.cvr < 0.05) reasons.push('Poor conversion rate');
    if (creative.roas < 0.5) reasons.push('Revenue not covering spend');
    if (creative.clutter > 0.6) reasons.push('Cluttered layout may confuse viewers');
    if (creative.readability < 0.4) reasons.push('Low readability may reduce engagement');
    if (reasons.length === 0) reasons.push('Underperforming relative to campaign peers');
  } else {
    reasons.push('Delivering consistent, reliable results');
    if (creative.ctr_decay > -0.2) reasons.push('Maintaining engagement over time');
  }
  return reasons;
}

export const CHART_COLORS = ['#6c5ce7', '#a855f7', '#00d2a0', '#54a0ff', '#ffc857', '#ff6b6b', '#f78fb3', '#3dc1d3', '#e77f67', '#778beb'];
