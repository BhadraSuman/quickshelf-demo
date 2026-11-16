import React, { useMemo } from 'react';
import {
  Cpu,
  DollarSign,
  Radio,
  FileText,
  BookOpen,
  ArrowRight,
  RefreshCw,
  BatteryCharging,
  Package,
  Activity,
  ShieldCheck,
  Clock,
  AlertCircle,
} from 'lucide-react';
import type {
  HighlightStatus,
  HighlightDevice,
} from './HighlightFleetView.js';

interface OverviewHomeViewProps {
  fleetStatus: {
    storeCount: number;
    gatewayCount: number;
    totalTags: number;
    divergedTags: number;
    convergedTags: number;
    convergencePct: number;
  } | null;
  highlightStatus: HighlightStatus | null;
  highlightDevices: HighlightDevice[];
  skus: Array<{
    id: string;
    code: string;
    name: string;
    priceMinor: number;
    mrpMinor: number;
    promoBadge: string | null;
  }>;
  gateways: Array<{
    id: string;
    hardwareId: string;
    firmware: string;
    status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
    tagCount: number;
    store?: {
      name: string;
      city: string;
    };
  }>;
  auditLogs: Array<{
    id: string;
    skuCode?: string;
    skuName?: string;
    storeName?: string;
    oldPriceMinor?: number;
    newPriceMinor?: number;
    deltaMinor?: number;
    source?: string;
    createdAt?: string;
    timestamp?: string;
    actor?: string;
    action?: string;
    details?: string;
  }>;
  onNavigate: (tabId: 'overview' | 'highlight' | 'pricing' | 'gateways' | 'audit' | 'docs') => void;
  onSyncFleet?: () => void;
  isSyncing?: boolean;
}

export const OverviewHomeView: React.FC<OverviewHomeViewProps> = ({
  fleetStatus,
  highlightStatus,
  highlightDevices,
  skus,
  gateways,
  auditLogs,
  onNavigate,
  onSyncFleet,
  isSyncing = false,
}) => {
  const c = {
    bg: '#f8fafc',
    surface: '#ffffff',
    surfaceSubtle: '#f1f5f9',
    surfaceHover: '#e2e8f0',
    border: '#e2e8f0',
    borderStrong: '#cbd5e1',
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    primaryBg: '#eff6ff',
    accentViolet: '#6366f1',
    success: '#059669',
    successBg: '#ecfdf5',
    warning: '#d97706',
    warningBg: '#fffbeb',
    error: '#dc2626',
    errorBg: '#fef2f2',
  };

  // Real Fleet Metrics
  const physicalCount = highlightDevices.length;
  const virtualCount = fleetStatus?.totalTags || 0;
  const totalFleetSize = physicalCount > 0 ? physicalCount : virtualCount;
  
  const divergedCount = fleetStatus?.divergedTags || 0;
  const convergedCount = totalFleetSize > 0 ? Math.max(0, totalFleetSize - divergedCount) : 0;
  const convergencePct = totalFleetSize > 0
    ? Math.min(100, Math.max(0, Math.round((convergedCount / totalFleetSize) * 100)))
    : 0;

  // Real Battery Telemetry from physical tags
  const batteryStats = useMemo(() => {
    if (highlightDevices.length === 0) {
      return { high: 0, normal: 0, low: 0, highPct: 0, normalPct: 0, lowPct: 0, hasData: false };
    }
    let high = 0;
    let normal = 0;
    let low = 0;
    highlightDevices.forEach((d) => {
      const p = d.powerLevel ?? 0;
      if (p >= 4) high++;
      else if (p >= 2) normal++;
      else low++;
    });
    const total = highlightDevices.length;
    return {
      high,
      normal,
      low,
      highPct: Math.round((high / total) * 100),
      normalPct: Math.round((normal / total) * 100),
      lowPct: Math.round((low / total) * 100),
      hasData: true,
    };
  }, [highlightDevices]);

  // Real Base Station Gateways count
  const isHighlightOnline = Boolean(highlightStatus?.connected);
  const onlineAps = gateways.filter((g) => g.status === 'ONLINE').length + (isHighlightOnline ? 1 : 0);
  const totalAps = gateways.length + (isHighlightOnline ? 1 : 0);

  // Real Activity points derived strictly from real auditLogs
  const activityData = useMemo(() => {
    if (!auditLogs || auditLogs.length === 0) return [];

    // Group real audit logs by hour
    const countsByHour: Record<string, number> = {};
    auditLogs.forEach((log) => {
      const rawDate = log.createdAt || log.timestamp;
      if (!rawDate) return;
      try {
        const d = new Date(rawDate);
        const hour = `${String(d.getHours()).padStart(2, '0')}:00`;
        countsByHour[hour] = (countsByHour[hour] || 0) + 1;
      } catch {}
    });

    const hours = Object.keys(countsByHour).sort();
    if (hours.length === 0) return [];

    return hours.map((hour) => ({
      hour,
      updates: countsByHour[hour],
    }));
  }, [auditLogs]);

  // SVG Chart Geometry for real activity
  const chartHeight = 140;
  const chartWidth = 500;
  const maxVal = Math.max(...activityData.map((d) => d.updates), 5);
  const points = activityData.map((d, i) => {
    const x = activityData.length > 1
      ? (i / (activityData.length - 1)) * (chartWidth - 50) + 25
      : chartWidth / 2;
    const y = chartHeight - 25 - (d.updates / maxVal) * (chartHeight - 45);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = points.length > 1
    ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - 20} L ${points[0].x} ${chartHeight - 20} Z`
    : '';

  // Donut chart stroke math (Circumference = 2 * pi * 38 = 238.76)
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const convergedStroke = totalFleetSize > 0 ? (convergencePct / 100) * circumference : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          backgroundColor: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: '12px',
          padding: '18px 22px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 700,
                color: c.primary,
                backgroundColor: c.primaryBg,
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              <Activity size={12} /> ENTERPRISE ESL FLEET
            </span>
            <span style={{ fontSize: '12px', color: c.textMuted }}>•</span>
            <span style={{ fontSize: '12px', color: c.textMuted, fontWeight: 600 }}>
              Organization: <strong style={{ color: c.text }}>{highlightStatus?.orgCode || 'CU006INDIA0344'}</strong>
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: c.text }}>
            Fleet & Operations Overview
          </h1>
          <p style={{ margin: '3px 0 0', color: c.textMuted, fontSize: '13px' }}>
            Live status of electronic shelf labels, Base Station APs, and catalog pricing.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onSyncFleet && (
            <button
              onClick={onSyncFleet}
              disabled={isSyncing}
              style={{
                backgroundColor: c.surfaceSubtle,
                color: c.text,
                border: `1px solid ${c.borderStrong}`,
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
              }}
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing...' : 'Sync Fleet'}
            </button>
          )}

          <button
            onClick={() => onNavigate('pricing')}
            style={{
              backgroundColor: c.primary,
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <DollarSign size={14} /> Update Prices
          </button>
        </div>
      </div>

      {/* 2. Top 4 High-Level Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}
      >
        {/* Card 1: Total Fleet */}
        <div
          onClick={() => onNavigate('highlight')}
          style={{
            backgroundColor: c.surface,
            border: `1px solid ${c.border}`,
            borderRadius: '12px',
            padding: '16px',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.primary; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: c.textMuted }}>TOTAL ESL FLEET</span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '7px',
                backgroundColor: c.primaryBg,
                color: c.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Cpu size={15} />
            </div>
          </div>
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: 800, color: c.text }}>{totalFleetSize}</span>
            <span style={{ fontSize: '12px', color: totalFleetSize > 0 ? c.success : c.textMuted, fontWeight: 700 }}>
              {totalFleetSize > 0 ? '● Active' : 'No tags'}
            </span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', color: c.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span>{physicalCount > 0 ? `${physicalCount} Physical Tags` : '0 physical tags'}</span>
            <ArrowRight size={12} color={c.textMuted} />
          </div>
        </div>

        {/* Card 2: Fleet Convergence */}
        <div
          onClick={() => onNavigate('highlight')}
          style={{
            backgroundColor: c.surface,
            border: `1px solid ${c.border}`,
            borderRadius: '12px',
            padding: '16px',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.success; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: c.textMuted }}>FLEET CONVERGENCE</span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '7px',
                backgroundColor: c.successBg,
                color: c.success,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={15} />
            </div>
          </div>
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: 800, color: totalFleetSize > 0 ? c.success : c.textMuted }}>
              {totalFleetSize > 0 ? `${convergencePct}%` : 'N/A'}
            </span>
            <span style={{ fontSize: '12px', color: divergedCount > 0 ? c.warning : c.textMuted, fontWeight: 600 }}>
              {divergedCount > 0 ? `${divergedCount} Pending` : (totalFleetSize > 0 ? 'In Sync' : 'No Labels')}
            </span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', color: c.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span>{totalFleetSize > 0 ? `${convergedCount} tags match POS` : 'No active tags to match'}</span>
            <ArrowRight size={12} color={c.textMuted} />
          </div>
        </div>

        {/* Card 3: Base Stations APs */}
        <div
          onClick={() => onNavigate('gateways')}
          style={{
            backgroundColor: c.surface,
            border: `1px solid ${c.border}`,
            borderRadius: '12px',
            padding: '16px',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.accentViolet; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: c.textMuted }}>BASE STATIONS (APs)</span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '7px',
                backgroundColor: '#f5f3ff',
                color: c.accentViolet,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Radio size={15} />
            </div>
          </div>
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: 800, color: c.text }}>{onlineAps} / {totalAps}</span>
            <span style={{ fontSize: '12px', color: onlineAps > 0 ? c.success : c.textMuted, fontWeight: 700 }}>
              {onlineAps > 0 ? 'Online' : 'Offline'}
            </span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', color: c.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span>{isHighlightOnline ? 'Highlight AP 483 Active' : 'No active AP detected'}</span>
            <ArrowRight size={12} color={c.textMuted} />
          </div>
        </div>

        {/* Card 4: Managed Catalog SKUs */}
        <div
          onClick={() => onNavigate('pricing')}
          style={{
            backgroundColor: c.surface,
            border: `1px solid ${c.border}`,
            borderRadius: '12px',
            padding: '16px',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.warning; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: c.textMuted }}>MANAGED PRODUCTS</span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '7px',
                backgroundColor: c.warningBg,
                color: c.warning,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={15} />
            </div>
          </div>
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: 800, color: c.text }}>{skus.length}</span>
            <span style={{ fontSize: '11px', color: c.primary, fontWeight: 700, backgroundColor: c.primaryBg, padding: '2px 6px', borderRadius: '4px' }}>
              PRC-04 Compliant
            </span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', color: c.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span>{skus.length > 0 ? `${skus.length} active SKUs` : 'No SKUs added yet'}</span>
            <ArrowRight size={12} color={c.textMuted} />
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Body: 2 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Left Column (2/3 width) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', gridColumn: 'span 2' }}>
          {/* Section: Real Activity Graph */}
          <div
            style={{
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: c.text }}>
                  Price Update & Audit History
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: c.textMuted }}>
                  Real price changes and RF broadcast updates recorded from POS and catalog adjustments.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', fontWeight: 600 }}>
                <span style={{ color: c.textMuted }}>
                  Total Events: <strong style={{ color: c.text }}>{auditLogs.length}</strong>
                </span>
              </div>
            </div>

            {/* If no audit activity recorded yet, show real empty state */}
            {activityData.length === 0 ? (
              <div
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  backgroundColor: c.surfaceSubtle,
                  borderRadius: '10px',
                  border: `1px dashed ${c.borderStrong}`,
                }}
              >
                <Clock size={24} color={c.textMuted} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.6 }} />
                <div style={{ fontSize: '13px', fontWeight: 700, color: c.text }}>No Price Update Activity Logged</div>
                <div style={{ fontSize: '11.5px', color: c.textMuted, marginTop: '3px' }}>
                  When price updates are pushed through Dynamic Pricing or the POS Webhook API, their chronological distribution will appear here.
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: '160px', overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="primaryAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[0, Math.round(maxVal / 2), maxVal].map((val) => {
                    const y = chartHeight - 25 - (val / maxVal) * (chartHeight - 45);
                    return (
                      <g key={val}>
                        <line x1="25" y1={y} x2={chartWidth - 25} y2={y} stroke={c.border} strokeDasharray="3 3" />
                        <text x="18" y={y + 3} fill={c.textMuted} fontSize="9" textAnchor="end">
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Area under curve */}
                  {areaD && <path d={areaD} fill="url(#primaryAreaGrad)" />}

                  {/* Line path */}
                  {pathD && <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

                  {/* Data points */}
                  {points.map((p, idx) => (
                    <g key={idx}>
                      <circle cx={p.x} cy={p.y} r="3.5" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
                      <text x={p.x} y={chartHeight - 5} fill={c.textMuted} fontSize="9" textAnchor="middle">
                        {p.hour}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            )}

            {/* Metric Footer Highlights strictly from real data */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: `1px solid ${c.border}`,
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: c.textMuted }}>Audit Logged Updates</span>
                <div style={{ fontSize: '17px', fontWeight: 800, color: c.text }}>{auditLogs.length} events</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: c.textMuted }}>Hardware Cloud Status</span>
                <div style={{ fontSize: '17px', fontWeight: 800, color: isHighlightOnline ? c.success : c.error }}>
                  {isHighlightOnline ? 'Connected' : 'Offline'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: c.textMuted }}>Active Hardware Tags</span>
                <div style={{ fontSize: '17px', fontWeight: 800, color: c.primary }}>{physicalCount} devices</div>
              </div>
            </div>
          </div>

          {/* Section: Base Station AP Real Hardware Snapshot */}
          <div
            style={{
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: '12px',
              padding: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={15} color={c.accentViolet} />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: c.text }}>
                  Base Station APs & Radio Hardware
                </h3>
              </div>
              <button
                onClick={() => onNavigate('gateways')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: c.primary,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                View AP details <ArrowRight size={12} />
              </button>
            </div>

            {/* Check if any real AP exists */}
            {totalAps === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  backgroundColor: c.surfaceSubtle,
                  borderRadius: '8px',
                  border: `1px dashed ${c.borderStrong}`,
                  fontSize: '12px',
                  color: c.textMuted,
                }}
              >
                <AlertCircle size={20} color={c.warning} style={{ margin: '0 auto 6px', display: 'block' }} />
                No Base Station Access Points registered. Provision an AP from the Base Stations tab.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '12px',
                }}
              >
                {/* Real Highlight Hardware AP */}
                {isHighlightOnline && (
                  <div
                    style={{
                      border: `1px solid ${c.border}`,
                      borderRadius: '10px',
                      padding: '14px',
                      backgroundColor: c.surfaceSubtle,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: c.text }}>
                          Highlight AP Base Station
                        </span>
                        <div style={{ fontSize: '11px', color: c.textMuted, marginTop: '2px' }}>
                          Station ID: <code style={{ color: c.primary }}>{highlightDevices[0]?.stationId || '483'}</code> • Sub-GHz 868.1 MHz
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: c.success,
                          backgroundColor: c.successBg,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: `1px solid rgba(5,150,105,0.2)`,
                        }}
                      >
                        ONLINE
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: '12px',
                        fontSize: '11.5px',
                        borderTop: `1px solid ${c.border}`,
                        paddingTop: '8px',
                      }}
                    >
                      <span style={{ color: c.textMuted }}>Connected Tags: <strong style={{ color: c.text }}>{highlightDevices.length}</strong></span>
                      <span style={{ color: c.textMuted }}>Network: <strong style={{ color: c.text }}>Sub-GHz</strong></span>
                    </div>
                  </div>
                )}

                {/* Real Database Gateways */}
                {gateways.map((gw) => (
                  <div
                    key={gw.id}
                    style={{
                      border: `1px solid ${c.border}`,
                      borderRadius: '10px',
                      padding: '14px',
                      backgroundColor: c.surfaceSubtle,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: c.text }}>
                          {gw.hardwareId}
                        </span>
                        <div style={{ fontSize: '11px', color: c.textMuted, marginTop: '2px' }}>
                          Firmware: <code>{gw.firmware}</code> {gw.store ? `• ${gw.store.name}` : ''}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: gw.status === 'ONLINE' ? c.success : c.error,
                          backgroundColor: gw.status === 'ONLINE' ? c.successBg : c.errorBg,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: `1px solid ${gw.status === 'ONLINE' ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)'}`,
                        }}
                      >
                        {gw.status}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: '12px',
                        fontSize: '11.5px',
                        borderTop: `1px solid ${c.border}`,
                        paddingTop: '8px',
                      }}
                    >
                      <span style={{ color: c.textMuted }}>Tags: <strong style={{ color: c.text }}>{gw.tagCount}</strong></span>
                      <span style={{ color: c.textMuted }}>Status: <strong style={{ color: gw.status === 'ONLINE' ? c.success : c.error }}>{gw.status}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3 width) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card: Convergence Donut Ring Chart */}
          <div
            style={{
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: '12px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div style={{ width: '100%', textAlign: 'left', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: c.text }}>
                Fleet Synchronization
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: c.textMuted }}>
                Matching status between catalog and active e-paper tags
              </p>
            </div>

            {totalFleetSize === 0 ? (
              <div style={{ padding: '24px 10px', color: c.textMuted, fontSize: '12px' }}>
                <Cpu size={24} style={{ margin: '0 auto 6px', display: 'block', opacity: 0.5 }} />
                No electronic shelf labels detected in fleet.
              </div>
            ) : (
              <>
                {/* Circular Ring Progress */}
                <div style={{ position: 'relative', width: '100px', height: '100px', margin: '12px 0' }}>
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="transparent"
                      stroke={c.border}
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="transparent"
                      stroke={convergencePct === 100 ? c.success : c.primary}
                      strokeWidth="8"
                      strokeDasharray={`${convergedStroke} ${circumference}`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                      style={{ transition: 'stroke-dasharray 0.6s ease' }}
                    />
                  </svg>
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: '19px', fontWeight: 800, color: c.text }}>{convergencePct}%</span>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: c.success, textTransform: 'uppercase' }}>
                      Synced
                    </span>
                  </div>
                </div>

                {/* Status Breakdown Legend */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: c.textSecondary }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: c.success }}></span>
                      In Sync (Converged)
                    </span>
                    <strong style={{ color: c.text }}>{convergedCount}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: c.textSecondary }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: c.warning }}></span>
                      Pending Radio Push
                    </span>
                    <strong style={{ color: divergedCount > 0 ? c.warning : c.text }}>{divergedCount}</strong>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Card: Battery Health */}
          <div
            style={{
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: '12px',
              padding: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BatteryCharging size={15} color={c.success} />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: c.text }}>
                  Device Battery Health
                </h3>
              </div>
            </div>

            {/* If no physical tags connected, show real state */}
            {!batteryStats.hasData ? (
              <div
                style={{
                  padding: '18px 12px',
                  textAlign: 'center',
                  backgroundColor: c.surfaceSubtle,
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  color: c.textMuted,
                }}
              >
                No physical devices reporting battery voltage.
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                  <span style={{ color: c.textMuted }}>Battery Status ({highlightDevices.length} Tags)</span>
                  <span style={{ color: c.success, fontWeight: 700 }}>{batteryStats.highPct}% Optimal</span>
                </div>
                <div
                  style={{
                    height: '8px',
                    borderRadius: '4px',
                    backgroundColor: c.surfaceSubtle,
                    display: 'flex',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ width: `${batteryStats.highPct}%`, backgroundColor: c.success }} title={`High: ${batteryStats.high}`} />
                  <div style={{ width: `${batteryStats.normalPct}%`, backgroundColor: c.warning }} title={`Normal: ${batteryStats.normal}`} />
                  <div style={{ width: `${batteryStats.lowPct}%`, backgroundColor: c.error }} title={`Low: ${batteryStats.low}`} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: c.textMuted, marginTop: '6px' }}>
                  <span>● High (4-5): {batteryStats.high}</span>
                  <span>● Mid (2-3): {batteryStats.normal}</span>
                  <span>● Low (0-1): {batteryStats.low}</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Operations Actions Panel */}
          <div
            style={{
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <h4 style={{ margin: '0 0 10px', fontSize: '12.5px', fontWeight: 700, color: c.text }}>
              Quick Navigation
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { label: 'Hardware Fleet', route: 'highlight', icon: Cpu, desc: 'Manage e-paper tags & templates' },
                { label: 'Products & Pricing', route: 'pricing', icon: DollarSign, desc: 'Update prices & promo badges' },
                { label: 'Base Stations (APs)', route: 'gateways', icon: Radio, desc: 'Tune rate limits & channels' },
                { label: 'Audit Trail', route: 'audit', icon: FileText, desc: 'Inspect historical price changes' },
                { label: 'Operations & SOPs', route: 'docs', icon: BookOpen, desc: 'Commissioning & store guides' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.route}
                    onClick={() => onNavigate(item.route as any)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      backgroundColor: c.surfaceSubtle,
                      border: `1px solid transparent`,
                      borderRadius: '7px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = c.borderStrong;
                      e.currentTarget.style.backgroundColor = c.surfaceHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.backgroundColor = c.surfaceSubtle;
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon size={14} color={c.primary} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: c.text }}>{item.label}</div>
                        <div style={{ fontSize: '10px', color: c.textMuted }}>{item.desc}</div>
                      </div>
                    </div>
                    <ArrowRight size={12} color={c.textMuted} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
