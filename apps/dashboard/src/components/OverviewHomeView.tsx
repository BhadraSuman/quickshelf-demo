import React, { useMemo } from 'react';
import {
  Cpu,
  DollarSign,
  Radio,
  FileText,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Zap,
  TrendingUp,
  RefreshCw,
  BatteryCharging,
  Wifi,
  Package,
  Layers,
  Activity,
  ShieldCheck,
  Server,
  Clock,
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

  // Fleet Calculations
  const physicalCount = highlightDevices.length;
  const virtualCount = fleetStatus?.totalTags || 0;
  const totalFleetSize = physicalCount > 0 ? physicalCount : (virtualCount > 0 ? virtualCount : 10);
  
  const divergedCount = fleetStatus?.divergedTags || 0;
  const convergedCount = totalFleetSize - divergedCount;
  const convergencePct = Math.min(100, Math.max(0, Math.round((convergedCount / totalFleetSize) * 100)));

  // Battery distribution from devices
  const batteryStats = useMemo(() => {
    if (highlightDevices.length === 0) {
      return { high: 8, normal: 2, low: 0, highPct: 80, normalPct: 20, lowPct: 0 };
    }
    let high = 0;
    let normal = 0;
    let low = 0;
    highlightDevices.forEach((d) => {
      const p = d.powerLevel ?? 5;
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
    };
  }, [highlightDevices]);

  // Online gateways
  const onlineAps = gateways.filter((g) => g.status === 'ONLINE').length;
  const totalAps = gateways.length > 0 ? gateways.length : 1;

  // Mock 24h Activity Data points for the chart
  const activityData = useMemo(() => [
    { hour: '00:00', updates: 12, rfPackets: 28 },
    { hour: '04:00', updates: 8, rfPackets: 19 },
    { hour: '08:00', updates: 65, rfPackets: 180 },
    { hour: '10:00', updates: 120, rfPackets: 340 },
    { hour: '12:00', updates: 95, rfPackets: 260 },
    { hour: '14:00', updates: 70, rfPackets: 210 },
    { hour: '16:00', updates: 145, rfPackets: 420 },
    { hour: '18:00', updates: 185, rfPackets: 510 },
    { hour: '20:00', updates: 80, rfPackets: 230 },
    { hour: '22:00', updates: 30, rfPackets: 75 },
  ], []);

  // SVG Chart Geometry
  const chartHeight = 140;
  const chartWidth = 500;
  const maxVal = 200;
  const points = activityData.map((d, i) => {
    const x = (i / (activityData.length - 1)) * (chartWidth - 40) + 20;
    const y = chartHeight - 25 - (d.updates / maxVal) * (chartHeight - 45);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - 20} L ${points[0].x} ${chartHeight - 20} Z`;

  // Donut chart stroke math (Circumference = 2 * pi * 40 = 251.32)
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const convergedStroke = (convergencePct / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          backgroundColor: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: '14px',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
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
              Organization: <strong style={{ color: c.text }}>CU006INDIA0344</strong>
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: c.text }}>
            Operations & Fleet Overview
          </h1>
          <p style={{ margin: '4px 0 0', color: c.textMuted, fontSize: '13px' }}>
            Central monitoring for physical electronic shelf labels, Base Station APs, and real-time catalog pricing.
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
                padding: '9px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                transition: 'background 0.15s ease',
              }}
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
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
              padding: '9px 16px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
            }}
          >
            <DollarSign size={14} /> Push Price Update
          </button>
        </div>
      </div>

      {/* 2. Top 4 High-Level Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: Total Fleet */}
        <div
          onClick={() => onNavigate('highlight')}
          style={{
            backgroundColor: c.surface,
            border: `1px solid ${c.border}`,
            borderRadius: '12px',
            padding: '18px',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = c.primary;
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = c.border;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: c.textMuted }}>TOTAL ESL FLEET</span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: c.primaryBg,
                color: c.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Cpu size={16} />
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: c.text }}>{totalFleetSize}</span>
            <span style={{ fontSize: '12px', color: c.success, fontWeight: 700 }}>
              ● 100% Online
            </span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '11.5px', color: c.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span>{physicalCount} Highlight Hardware Tags</span>
            <ArrowRight size={13} color={c.textMuted} />
          </div>
        </div>

        {/* Card 2: Fleet Convergence */}
        <div
          onClick={() => onNavigate('highlight')}
          style={{
            backgroundColor: c.surface,
            border: `1px solid ${c.border}`,
            borderRadius: '12px',
            padding: '18px',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = c.success;
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = c.border;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: c.textMuted }}>FLEET CONVERGENCE</span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: c.successBg,
                color: c.success,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={16} />
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: c.success }}>{convergencePct}%</span>
            <span style={{ fontSize: '12px', color: divergedCount > 0 ? c.warning : c.textMuted, fontWeight: 600 }}>
              {divergedCount > 0 ? `${divergedCount} Pending` : 'All Labels In Sync'}
            </span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '11.5px', color: c.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span>{convergedCount} tags showing exact POS price</span>
            <ArrowRight size={13} color={c.textMuted} />
          </div>
        </div>

        {/* Card 3: Base Stations APs */}
        <div
          onClick={() => onNavigate('gateways')}
          style={{
            backgroundColor: c.surface,
            border: `1px solid ${c.border}`,
            borderRadius: '12px',
            padding: '18px',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = c.accentViolet;
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = c.border;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: c.textMuted }}>BASE STATIONS (APs)</span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#f5f3ff',
                color: c.accentViolet,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Radio size={16} />
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: c.text }}>{onlineAps} / {totalAps}</span>
            <span style={{ fontSize: '12px', color: c.success, fontWeight: 700 }}>
              868 MHz India
            </span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '11.5px', color: c.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span>Highlight AP Station CU006</span>
            <ArrowRight size={13} color={c.textMuted} />
          </div>
        </div>

        {/* Card 4: Managed Catalog SKUs */}
        <div
          onClick={() => onNavigate('pricing')}
          style={{
            backgroundColor: c.surface,
            border: `1px solid ${c.border}`,
            borderRadius: '12px',
            padding: '18px',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = c.warning;
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = c.border;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: c.textMuted }}>MANAGED PRODUCTS</span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: c.warningBg,
                color: c.warning,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={16} />
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: c.text }}>{skus.length || 10}</span>
            <span style={{ fontSize: '11px', color: c.primary, fontWeight: 700, backgroundColor: c.primaryBg, padding: '2px 6px', borderRadius: '4px' }}>
              PRC-04 Guardrail
            </span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '11.5px', color: c.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span>Active SKUs with price compliance</span>
            <ArrowRight size={13} color={c.textMuted} />
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Body: 2 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Left Column (2/3 width) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', gridColumn: 'span 2' }}>
          {/* Section: 24h Activity Graph */}
          <div
            style={{
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: '14px',
              padding: '22px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: c.text }}>
                  Real-Time Fleet Sync & Price Broadcast Activity
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: c.textMuted }}>
                  Hourly price update triggers and Sub-GHz RF transmission packets over the last 24 hours.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11.5px', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: c.primary }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: c.primary }}></span>
                  Price Updates
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: c.textMuted }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: c.borderStrong }}></span>
                  RF Broadcasts
                </span>
              </div>
            </div>

            {/* SVG Interactive Area Chart */}
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: '160px', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="primaryAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {[0, 50, 100, 150, 200].map((val) => {
                  const y = chartHeight - 25 - (val / maxVal) * (chartHeight - 45);
                  return (
                    <g key={val}>
                      <line x1="20" y1={y} x2={chartWidth - 20} y2={y} stroke={c.border} strokeDasharray="3 3" />
                      <text x="12" y={y + 3} fill={c.textMuted} fontSize="9" textAnchor="end">
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Area under curve */}
                <path d={areaD} fill="url(#primaryAreaGrad)" />

                {/* Line path */}
                <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Data points & Hour labels */}
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

            {/* Metric Footer Highlights */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: `1px solid ${c.border}`,
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: c.textMuted }}>Total 24h Price Updates</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: c.text }}>830 changes</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: c.textMuted }}>Avg RF Tag ACK Latency</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: c.success }}>182 ms</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: c.textMuted }}>Broadcast Success Rate</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: c.primary }}>99.98%</div>
              </div>
            </div>
          </div>

          {/* Section: Base Station AP Hardware Snapshot */}
          <div
            style={{
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: '14px',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <Radio size={16} color={c.accentViolet} />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: c.text }}>
                  Active Base Station APs & Radio Coverage
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
                View all APs <ArrowRight size={13} />
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '12px',
              }}
            >
              {/* Highlight Hardware AP */}
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
                      Highlight AP Station CU006
                    </span>
                    <div style={{ fontSize: '11px', color: c.textMuted, marginTop: '2px' }}>
                      Station ID: <code style={{ color: c.primary }}>483</code> • Sub-GHz 868.1 MHz
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
                    paddingTop: '10px',
                  }}
                >
                  <span style={{ color: c.textMuted }}>Connected Tags: <strong style={{ color: c.text }}>{highlightDevices.length}</strong></span>
                  <span style={{ color: c.textMuted }}>Ping: <strong style={{ color: c.success }}>12 ms</strong></span>
                  <span style={{ color: c.textMuted }}>Firmware: <strong style={{ color: c.text }}>v3.4.1</strong></span>
                </div>
              </div>

              {/* Core Store Gateway */}
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
                      Store AP Gateway BLR-01
                    </span>
                    <div style={{ fontSize: '11px', color: c.textMuted, marginTop: '2px' }}>
                      Hardware ID: <code style={{ color: c.primary }}>gw-blr-01</code> • Koramangala
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
                    READY
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '12px',
                    fontSize: '11.5px',
                    borderTop: `1px solid ${c.border}`,
                    paddingTop: '10px',
                  }}
                >
                  <span style={{ color: c.textMuted }}>Channels: <strong style={{ color: c.text }}>Ch 1-4</strong></span>
                  <span style={{ color: c.textMuted }}>Rate: <strong style={{ color: c.text }}>100 tags/s</strong></span>
                  <span style={{ color: c.textMuted }}>Failover: <strong style={{ color: c.success }}>Active</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1/3 width) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card: Convergence Donut Ring Chart */}
          <div
            style={{
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: '14px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div style={{ width: '100%', textAlign: 'left', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: c.text }}>
                Fleet Synchronization Ratio
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: c.textMuted }}>
                Live match between Store POS database & E-Paper display memory
              </p>
            </div>

            {/* Circular Ring Progress */}
            <div style={{ position: 'relative', width: '110px', height: '110px', margin: '14px 0' }}>
              <svg width="110" height="110" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke={c.border}
                  strokeWidth="8"
                />
                {/* Active Progress Ring */}
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
                <span style={{ fontSize: '20px', fontWeight: 800, color: c.text }}>{convergencePct}%</span>
                <span style={{ fontSize: '9.5px', fontWeight: 700, color: c.success, textTransform: 'uppercase' }}>
                  Synced
                </span>
              </div>
            </div>

            {/* Status Breakdown Legend */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: c.textSecondary }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.success }}></span>
                  In Perfect Sync (Converged)
                </span>
                <strong style={{ color: c.text }}>{convergedCount}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: c.textSecondary }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.warning }}></span>
                  Price Update Pending (Diverged)
                </span>
                <strong style={{ color: divergedCount > 0 ? c.warning : c.text }}>{divergedCount}</strong>
              </div>
            </div>
          </div>

          {/* Card: Battery & Signal Health */}
          <div
            style={{
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: '14px',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BatteryCharging size={16} color={c.success} />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: c.text }}>
                  Tag Battery & Signal Health
                </h3>
              </div>
            </div>

            {/* Battery Distribution Bar */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                <span style={{ color: c.textMuted }}>Battery Level Distribution</span>
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
                <span>● High (&gt;80%): {batteryStats.high}</span>
                <span>● Good (40-80%): {batteryStats.normal}</span>
                <span>● Low (&lt;20%): {batteryStats.low}</span>
              </div>
            </div>

            {/* Signal Strength Overview */}
            <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: c.textSecondary }}>
                  <Wifi size={13} color={c.primary} />
                  Average RSSI Signal Quality
                </span>
                <span style={{ fontWeight: 700, color: c.success }}>-62 dBm (Excellent)</span>
              </div>
            </div>
          </div>

          {/* Quick Operations Actions Panel */}
          <div
            style={{
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: '14px',
              padding: '18px',
            }}
          >
            <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: c.text }}>
              Quick Navigation Shortcuts
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { label: 'Physical Highlight Tags', route: 'highlight', icon: Cpu, desc: 'Manage 2.13" & 4.2" E-Paper' },
                { label: 'Catalog & Dynamic Pricing', route: 'pricing', icon: DollarSign, desc: 'Update prices & promo badges' },
                { label: 'RF Base Stations (APs)', route: 'gateways', icon: Radio, desc: 'Tune rate limits & channels' },
                { label: 'Audit Trail & Compliance', route: 'audit', icon: FileText, desc: 'Inspect historical price changes' },
                { label: 'Operations & SOPs', route: 'docs', icon: BookOpen, desc: 'View setup documentation' },
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
                      borderRadius: '8px',
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
                        <div style={{ fontSize: '10.5px', color: c.textMuted }}>{item.desc}</div>
                      </div>
                    </div>
                    <ArrowRight size={13} color={c.textMuted} />
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
