import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Zap,
  RotateCcw,
  Wifi,
  Battery,
  ShieldCheck,
  AlertCircle,
  Tag as TagIcon,
  Store,
  Radio,
  Clock,
  Flame,
  CheckCircle2,
  XCircle,
  Cpu,
} from 'lucide-react';

interface FleetStatus {
  storeCount: number;
  gatewayCount: number;
  totalTags: number;
  divergedTags: number;
  convergedTags: number;
  convergencePct: number;
}

interface ChaosMetrics {
  totalCommands: number;
  settledCommands: number;
  ackedTargets: number;
  supersededTargets: number;
  failedTargets: number;
}

interface TagItem {
  id: string;
  hardwareId: string;
  size: string;
  gatewayHardwareId: string;
  gatewayStatus: string;
  sku: {
    id: string;
    code: string;
    name: string;
    priceMinor: number;
    mrpMinor: number;
    promoBadge: string | null;
    version: number;
  } | null;
  desiredVersion: number;
  reportedVersion: number;
  desiredPayload: any;
  reportedAt: string | null;
  batteryPct: number;
  rssi: number;
  isDiverged: boolean;
  divergenceDelta: number;
}

const API_BASE = 'http://localhost:3000';

export default function App() {
  const [fleet, setFleet] = useState<FleetStatus | null>(null);
  const [chaos, setChaos] = useState<ChaosMetrics | null>(null);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Manual update form state
  const [selectedSku, setSelectedSku] = useState<string>('CAD-SILK-150');
  const [newPriceRupees, setNewPriceRupees] = useState<string>('175.00');
  const [promoText, setPromoText] = useState<string>('Special Offer');

  const fetchData = async () => {
    try {
      const [statusRes, tagsRes, chaosRes] = await Promise.all([
        fetch(`${API_BASE}/api/fleet/status`),
        fetch(`${API_BASE}/api/tags`),
        fetch(`${API_BASE}/api/chaos/metrics`),
      ]);

      if (statusRes.ok && tagsRes.ok) {
        const statusData = await statusRes.json();
        const tagsData = await tagsRes.json();
        setFleet(statusData);
        setTags(tagsData);
        setApiConnected(true);
      } else {
        setApiConnected(false);
      }

      if (chaosRes.ok) {
        const chaosData = await chaosRes.json();
        setChaos(chaosData);
      }
    } catch {
      setApiConnected(false);
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1200);
    return () => clearInterval(interval);
  }, []);

  const triggerFlashSale = async (discountPct: number) => {
    setActionMessage(`Triggering ${discountPct}% Flash Sale...`);
    try {
      const res = await fetch(`${API_BASE}/api/pos/flash-sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountPct }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`🚀 Blasted ${discountPct}% discount across fleet! Watch convergence.`);
        fetchData();
      }
    } catch {
      setActionMessage('Failed to trigger flash sale');
    }
    setTimeout(() => setActionMessage(null), 4000);
  };

  const resetPrices = async () => {
    setActionMessage('Resetting all prices to standard MRP...');
    try {
      const res = await fetch(`${API_BASE}/api/pos/reset-prices`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage('↺ Reset all prices to standard MRP.');
        fetchData();
      }
    } catch {
      setActionMessage('Failed to reset prices');
    }
    setTimeout(() => setActionMessage(null), 4000);
  };

  const submitManualPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceMinor = Math.round(parseFloat(newPriceRupees) * 100);
    if (isNaN(priceMinor) || priceMinor <= 0) return;

    setActionMessage(`Updating ${selectedSku} to ₹${newPriceRupees}...`);
    try {
      const res = await fetch(`${API_BASE}/webhooks/pos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: 'store-blr-koramangala',
          skuCode: selectedSku,
          newPriceMinor: priceMinor,
          promoBadge: promoText.trim() ? promoText : null,
          source: 'pos',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`✅ POS Webhook dispatched for ${selectedSku}!`);
        fetchData();
      }
    } catch {
      setActionMessage('Failed to dispatch POS webhook');
    }
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Chaos Actions
  const triggerHashSkipTest = async () => {
    setActionMessage('Running Hard Problem 3: Battery-Aware Hash Skip...');
    try {
      const res = await fetch(`${API_BASE}/api/chaos/hash-skip-test`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`⚡ ${data.message}`);
        fetchData();
      } else {
        setActionMessage(`❌ ${data.error}`);
      }
    } catch {
      setActionMessage('Failed to trigger hash-skip test');
    }
    setTimeout(() => setActionMessage(null), 5000);
  };

  const triggerBurstCollapseTest = async () => {
    setActionMessage('Running Hard Problem 2: Rapid Burst Collapse Test...');
    try {
      const res = await fetch(`${API_BASE}/api/chaos/burst-collapse-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skuCode: 'CAD-SILK-150' }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`🌪️ Dispatched 3 rapid updates! Intermediate targets collapsed into SUPERSEDED.`);
        fetchData();
      }
    } catch {
      setActionMessage('Failed to trigger burst collapse test');
    }
    setTimeout(() => setActionMessage(null), 5000);
  };

  const toggleLowBattery = async (low: boolean) => {
    const faultType = low ? 'LOW_BATTERY' : 'RESTORE';
    setActionMessage(`${low ? '⚠️ Injecting low battery (12%)' : '💚 Restoring battery (95%)'} on tag-001...`);
    try {
      const res = await fetch(`${API_BASE}/api/chaos/inject-fault`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId: 'tag-001', faultType }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message);
        fetchData();
      }
    } catch {
      setActionMessage('Failed to inject fault');
    }
    setTimeout(() => setActionMessage(null), 4000);
  };

  const formatRupees = (minorUnits: number) => {
    return (minorUnits / 100).toFixed(2);
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 20px' }}>
      {/* Top Brand & Status Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid #1e293b', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#3b82f6', color: '#fff', padding: '6px 10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '18px' }}>
              QS
            </div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px' }}>
              Quickshelf <span style={{ color: '#60a5fa', fontWeight: 500, fontSize: '18px' }}>/ ESL Ops Center</span>
            </h1>
          </div>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Continuous Reconciliation Engine & Virtual Fleet Simulator
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            background: apiConnected ? '#064e3b' : '#7f1d1d',
            color: apiConnected ? '#34d399' : '#f87171',
            border: `1px solid ${apiConnected ? '#059669' : '#dc2626'}`
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: apiConnected ? '#10b981' : '#ef4444' }}></span>
            {apiConnected ? 'API Connected (:3000)' : 'API Offline'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px' }}>
            <Clock size={14} />
            <span>{lastRefreshed.toLocaleTimeString()}</span>
          </div>
        </div>
      </header>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div style={{
          background: '#1e3a8a',
          color: '#93c5fd',
          border: '1px solid #3b82f6',
          borderRadius: '8px',
          padding: '10px 16px',
          marginBottom: '20px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Zap size={16} />
          {actionMessage}
        </div>
      )}

      {/* KPI Metrics Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {/* Core Metric: Diverged Tags */}
        <div style={{
          background: fleet && fleet.divergedTags > 0 ? '#451a03' : '#0f172a',
          border: `1px solid ${fleet && fleet.divergedTags > 0 ? '#f59e0b' : '#1e293b'}`,
          borderRadius: '12px',
          padding: '20px',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>
            <span>DIVERGED TAGS (CORE METRIC)</span>
            <AlertCircle size={18} color={fleet && fleet.divergedTags > 0 ? '#fbbf24' : '#10b981'} />
          </div>
          <div style={{ fontSize: '36px', fontWeight: 800, marginTop: '10px', color: fleet && fleet.divergedTags > 0 ? '#fbbf24' : '#f8fafc' }}>
            {fleet ? fleet.divergedTags : '-'}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
            {fleet && fleet.divergedTags > 0
              ? 'Control loop driving divergence to zero...'
              : 'Fleet is fully converged (0 divergence)'}
          </p>
        </div>

        {/* Fleet Convergence Progress */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>
            <span>CONVERGENCE RATE</span>
            <ShieldCheck size={18} color="#34d399" />
          </div>
          <div style={{ fontSize: '36px', fontWeight: 800, marginTop: '10px', color: '#34d399' }}>
            {fleet ? `${fleet.convergencePct.toFixed(0)}%` : '-'}
          </div>
          <div style={{ background: '#1e293b', height: '6px', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{
              width: fleet ? `${fleet.convergencePct}%` : '0%',
              background: fleet && fleet.divergedTags > 0 ? '#f59e0b' : '#10b981',
              height: '100%',
              transition: 'width 0.4s ease',
            }}></div>
          </div>
        </div>

        {/* Total Active Tags */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>
            <span>COLLAPSED / SUPERSEDED</span>
            <Cpu size={18} color="#a855f7" />
          </div>
          <div style={{ fontSize: '36px', fontWeight: 800, marginTop: '10px', color: '#c084fc' }}>
            {chaos ? chaos.supersededTargets : '0'}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
            Intermediate targets safely collapsed
          </p>
        </div>

        {/* Settled Commands */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>
            <span>SETTLED COMMANDS</span>
            <CheckCircle2 size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '36px', fontWeight: 800, marginTop: '10px' }}>
            {chaos ? chaos.settledCommands : '-'}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
            Idempotent batch settlements
          </p>
        </div>
      </section>

      {/* Side-by-Side: POS Console & Chaos Console */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {/* Commercial POS Simulation Console */}
        <section style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Store size={18} color="#3b82f6" />
                POS & Commercial Webhook Panel
              </h2>
              <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '12px' }}>
                Emits commercial price webhooks to trigger reconciliation
              </p>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => triggerFlashSale(20)}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Zap size={14} />
                20% Sale
              </button>

              <button
                onClick={resetPrices}
                style={{
                  background: '#1e293b',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <RotateCcw size={14} />
                Reset
              </button>
            </div>
          </div>

          {/* Individual SKU Price Form */}
          <form onSubmit={submitManualPrice} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid #1e293b' }}>
            <div style={{ flex: 1, minWidth: '130px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>PRODUCT</label>
              <select
                value={selectedSku}
                onChange={(e) => setSelectedSku(e.target.value)}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '7px 10px',
                  fontSize: '12px',
                }}
              >
                {tags.map((t) => t.sku && (
                  <option key={t.sku.code} value={t.sku.code}>
                    {t.sku.name} ({t.sku.code})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ width: '90px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>PRICE (₹)</label>
              <input
                type="text"
                value={newPriceRupees}
                onChange={(e) => setNewPriceRupees(e.target.value)}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '7px 10px',
                  fontSize: '12px',
                }}
              />
            </div>

            <div style={{ width: '110px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>PROMO</label>
              <input
                type="text"
                value={promoText}
                onChange={(e) => setPromoText(e.target.value)}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '7px 10px',
                  fontSize: '12px',
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                background: '#0284c7',
                color: '#fff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Update Price
            </button>
          </form>
        </section>

        {/* Chaos & Fault Injection Console */}
        <section style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
              <Flame size={18} color="#f59e0b" />
              Hardware Fault & Chaos Console (The 7 Hard Problems)
            </h2>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '12px' }}>
              Test battery skips, version collapse, and hardware rejection live
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', paddingTop: '10px', borderTop: '1px solid #1e293b' }}>
            {/* Hard Problem 3 */}
            <button
              onClick={triggerHashSkipTest}
              style={{
                background: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #0284c7',
                padding: '10px',
                borderRadius: '8px',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ShieldCheck size={14} /> Battery-Aware Hash Skip
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                Skips radio dispatch; advances DB version directly.
              </div>
            </button>

            {/* Hard Problem 2 */}
            <button
              onClick={triggerBurstCollapseTest}
              style={{
                background: '#1e293b',
                color: '#c084fc',
                border: '1px solid #9333ea',
                padding: '10px',
                borderRadius: '8px',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Cpu size={14} /> Rapid Burst (Collapse Test)
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                3 rapid updates; marks intermediate targets SUPERSEDED.
              </div>
            </button>

            {/* Hard Problem 7 (Fault) */}
            <button
              onClick={() => toggleLowBattery(true)}
              style={{
                background: '#1e293b',
                color: '#f87171',
                border: '1px solid #dc2626',
                padding: '10px',
                borderRadius: '8px',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Battery size={14} /> Inject Low Battery (&lt;15%)
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                Sets tag-001 to 12%; triggers LOW_BATTERY NACK.
              </div>
            </button>

            {/* Restore Battery */}
            <button
              onClick={() => toggleLowBattery(false)}
              style={{
                background: '#1e293b',
                color: '#34d399',
                border: '1px solid #059669',
                padding: '10px',
                borderRadius: '8px',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <RefreshCw size={14} /> Restore Battery (95%)
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                Restores tag-001 battery to healthy 95%.
              </div>
            </button>
          </div>
        </section>
      </div>

      {/* The Virtual ESL Shelf (E-Ink Tag Visualizer) */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '-0.3px' }}>
              Virtual ESL Shelf Fleet
            </h2>
            <p style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: '13px' }}>
              Authentic e-ink display simulation reflecting live hardware reported state vs cloud desired state
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '12px' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span>
            <span>Converged</span>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', marginLeft: '8px' }}></span>
            <span>Diverged (Syncing)</span>
          </div>
        </div>

        {/* Tag Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {tags.map((tag) => {
            const isDiverged = tag.isDiverged;
            const payload = tag.desiredPayload;
            const priceRupees = payload ? formatRupees(payload.priceMinor) : '-';
            const mrpRupees = payload ? formatRupees(payload.mrpMinor) : '-';
            const hasDiscount = payload && payload.mrpMinor > payload.priceMinor;

            return (
              <div
                key={tag.id}
                style={{
                  background: '#f8fafc',
                  color: '#0f172a',
                  borderRadius: '12px',
                  border: isDiverged ? '3px solid #f59e0b' : '3px solid #334155',
                  boxShadow: isDiverged ? '0 0 25px rgba(245, 158, 11, 0.4)' : '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  padding: '16px',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  fontFamily: 'monospace',
                }}
              >
                {/* Tag Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px dashed #cbd5e1', paddingBottom: '8px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ background: '#0f172a', color: '#f8fafc', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                      {tag.size}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                      {tag.hardwareId}
                    </span>
                  </div>

                  {/* Convergence Status Badge */}
                  <div style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: isDiverged ? '#fef3c7' : '#d1fae5',
                    color: isDiverged ? '#b45309' : '#065f46',
                    border: `1px solid ${isDiverged ? '#f59e0b' : '#10b981'}`,
                  }}>
                    {isDiverged ? `DIVERGED (Δ${tag.divergenceDelta})` : `SYNCED (v${tag.reportedVersion})`}
                  </div>
                </div>

                {/* Product Name */}
                <div style={{ height: '42px', overflow: 'hidden', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, lineHeight: '1.3', color: '#0f172a', fontFamily: 'sans-serif' }}>
                    {payload ? payload.name : 'Unknown Item'}
                  </h3>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    SKU: {tag.sku ? tag.sku.code : '-'}
                  </div>
                </div>

                {/* Simulated E-Ink Display Price Area */}
                <div style={{
                  background: '#f1f5f9',
                  border: '2px solid #0f172a',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '12px',
                  position: 'relative',
                }}>
                  {payload && payload.promoBadge && (
                    <div style={{
                      position: 'absolute',
                      top: '-10px',
                      right: '10px',
                      background: '#ef4444',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}>
                      {payload.promoBadge}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '18px', fontWeight: 700 }}>₹</span>
                      <span style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1px' }}>
                        {priceRupees}
                      </span>
                    </div>

                    {hasDiscount && (
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>MRP</span>
                        <span style={{ fontSize: '14px', textDecoration: 'line-through', color: '#94a3b8', fontWeight: 600 }}>
                          ₹{mrpRupees}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Simulated barcode */}
                  <div style={{
                    marginTop: '8px',
                    height: '16px',
                    background: 'repeating-linear-gradient(90deg, #0f172a, #0f172a 2px, transparent 2px, transparent 4px, #0f172a 4px, #0f172a 6px, transparent 6px, transparent 8px)',
                  }}></div>
                </div>

                {/* Hardware Telemetry & Version Details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#475569', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Battery size={13} color={tag.batteryPct > 20 ? '#10b981' : '#ef4444'} />
                      <span style={{ color: tag.batteryPct <= 15 ? '#ef4444' : 'inherit', fontWeight: tag.batteryPct <= 15 ? 700 : 'normal' }}>
                        {tag.batteryPct}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Wifi size={13} />
                      <span>{tag.rssi} dBm</span>
                    </div>
                  </div>

                  <div>
                    <span>Cloud: <b>v{tag.desiredVersion}</b> / E-Ink: <b>v{tag.reportedVersion}</b></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
