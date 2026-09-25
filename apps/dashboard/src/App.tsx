import React, { useState, useEffect, useMemo } from 'react';
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
  Plus,
  Search,
  Grid,
  List,
  ArrowRight,
  FileText,
  Activity,
  Layers,
  Settings,
  Edit3,
  SlidersHorizontal,
  Filter,
  X,
  ChevronRight,
  Send,
  Sliders,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';

const API_BASE = 'http://localhost:3000';

// ==========================================
// Types
// ==========================================

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

interface SkuItem {
  id: string;
  storeId: string;
  storeName?: string;
  code: string;
  name: string;
  priceMinor: number;
  mrpMinor: number;
  promoBadge: string | null;
  version: number;
  tagCount?: number;
}

interface StoreItem {
  id: string;
  name: string;
  city: string;
  gatewayCount: number;
  tagCount: number;
  divergedTags: number;
  convergedTags: number;
  convergencePct: number;
  skuCount: number;
}

interface GatewayItem {
  id: string;
  hardwareId: string;
  firmware: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  lastSeenAt: string | null;
  maxTagsPerSec: number;
  store: {
    id: string;
    name: string;
    city: string;
  };
  tagCount: number;
  divergedCount: number;
  convergedCount: number;
  convergencePct: number;
}

interface TagItem {
  id: string;
  hardwareId: string;
  size: string;
  storeId?: string;
  storeName?: string;
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
  desiredPayload: any;
  desiredHash: string | null;
  reportedVersion: number;
  reportedHash: string | null;
  reportedAt: string | null;
  batteryPct: number;
  rssi: number;
  isDiverged: boolean;
  divergenceDelta: number;
}

interface TagDetail extends TagItem {
  store: { id: string; name: string; city: string };
  gateway: {
    id: string;
    hardwareId: string;
    status: string;
    firmware: string;
    maxTagsPerSec: number;
  };
  recentTargets?: Array<{
    id: string;
    commandId: string;
    version: number;
    hash: string;
    status: string;
    ackedAt: string | null;
    failure: string | null;
    createdAt: string;
  }>;
}

interface AuditItem {
  id: string;
  skuCode: string;
  skuName: string;
  storeName: string;
  oldPriceMinor: number;
  newPriceMinor: number;
  deltaMinor: number;
  source: string;
  createdAt: string;
}

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'fleet' | 'gateways' | 'skus' | 'audit' | 'chaos'>('fleet');

  // Core Data
  const [fleet, setFleet] = useState<FleetStatus | null>(null);
  const [chaos, setChaos] = useState<ChaosMetrics | null>(null);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [gateways, setGateways] = useState<GatewayItem[]>([]);
  const [skus, setSkus] = useState<SkuItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditItem[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fleet View Controls
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStore, setFilterStore] = useState<string>('ALL');
  const [filterGateway, setFilterGateway] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'DIVERGED' | 'CONVERGED' | 'LOW_BATTERY'>('ALL');
  const [filterSize, setFilterSize] = useState<string>('ALL');
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());

  // Slide-over Tag Inspector Drawer
  const [inspectTagId, setInspectTagId] = useState<string | null>(null);
  const [tagDetail, setTagDetail] = useState<TagDetail | null>(null);
  const [tagDetailLoading, setTagDetailLoading] = useState(false);

  // Modals
  const [showAddSkuModal, setShowAddSkuModal] = useState(false);
  const [showEditSkuModal, setShowEditSkuModal] = useState<SkuItem | null>(null);
  const [showAddTagModal, setShowAddTagModal] = useState(false);
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);

  // Inspector Edit State
  const [inspectorSkuId, setInspectorSkuId] = useState<string>('');
  const [inspectorSize, setInspectorSize] = useState<string>('T290');
  const [inspectorPriceRupees, setInspectorPriceRupees] = useState<string>('');
  const [inspectorMrpRupees, setInspectorMrpRupees] = useState<string>('');
  const [inspectorPromo, setInspectorPromo] = useState<string>('');

  // Fetch all primary dashboard data
  const fetchData = async () => {
    try {
      const [statusRes, tagsRes, storesRes, gatewaysRes, skusRes, chaosRes] = await Promise.all([
        fetch(`${API_BASE}/api/fleet/status`),
        fetch(`${API_BASE}/api/tags`),
        fetch(`${API_BASE}/api/stores`),
        fetch(`${API_BASE}/api/gateways`),
        fetch(`${API_BASE}/api/skus`),
        fetch(`${API_BASE}/api/chaos/metrics`),
      ]);

      if (statusRes.ok && tagsRes.ok) {
        setFleet(await statusRes.json());
        setTags(await tagsRes.json());
        setApiConnected(true);
      } else {
        setApiConnected(false);
      }

      if (storesRes.ok) setStores(await storesRes.json());
      if (gatewaysRes.ok) setGateways(await gatewaysRes.json());
      if (skusRes.ok) setSkus(await skusRes.json());
      if (chaosRes.ok) setChaos(await chaosRes.json());
    } catch {
      setApiConnected(false);
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  };

  // Fetch Audit Logs when Audit tab is active
  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/audit`);
      if (res.ok) setAuditLogs(await res.json());
    } catch {}
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 1400);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  // Load Detailed Tag for Inspector
  useEffect(() => {
    if (!inspectTagId) {
      setTagDetail(null);
      return;
    }

    let isMounted = true;
    setTagDetailLoading(true);

    fetch(`${API_BASE}/api/tags/${inspectTagId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) {
          setTagDetail(data);
          setInspectorSkuId(data.sku?.id ?? '');
          setInspectorSize(data.size);
          setInspectorPriceRupees(data.sku ? (data.sku.priceMinor / 100).toFixed(2) : '');
          setInspectorMrpRupees(data.sku ? (data.sku.mrpMinor / 100).toFixed(2) : '');
          setInspectorPromo(data.sku?.promoBadge ?? '');
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setTagDetailLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [inspectTagId]);

  // Toast feedback
  const showToast = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Currency Formatter
  const formatRupees = (minorUnits: number) => {
    return (minorUnits / 100).toFixed(2);
  };

  // Filtered Tags computation
  const filteredTags = useMemo(() => {
    return tags.filter((t) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchHw = t.hardwareId.toLowerCase().includes(q);
        const matchSku = t.sku?.code.toLowerCase().includes(q);
        const matchName = t.sku?.name.toLowerCase().includes(q);
        if (!matchHw && !matchSku && !matchName) return false;
      }

      // Store
      if (filterStore !== 'ALL' && t.storeName !== filterStore) return false;

      // Gateway
      if (filterGateway !== 'ALL' && t.gatewayHardwareId !== filterGateway) return false;

      // Status
      if (filterStatus === 'DIVERGED' && !t.isDiverged) return false;
      if (filterStatus === 'CONVERGED' && t.isDiverged) return false;
      if (filterStatus === 'LOW_BATTERY' && t.batteryPct >= 20) return false;

      // Size
      if (filterSize !== 'ALL' && t.size !== filterSize) return false;

      return true;
    });
  }, [tags, searchQuery, filterStore, filterGateway, filterStatus, filterSize]);

  // Bulk Selection Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTagIds(new Set(filteredTags.map((t) => t.id)));
    } else {
      setSelectedTagIds(new Set());
    }
  };

  const handleToggleTagSelect = (id: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Actions
  const handleTriggerFlashSale = async (discountPct: number) => {
    showToast(`Triggering ${discountPct}% Flash Sale across fleet...`);
    try {
      const res = await fetch(`${API_BASE}/api/pos/flash-sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountPct }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🚀 Blasted ${discountPct}% discount! Reconciliation loop is driving divergence to zero.`);
        fetchData();
      }
    } catch {
      showToast('❌ Failed to trigger flash sale');
    }
  };

  const handleResetPrices = async () => {
    showToast('Resetting all prices to standard MRP...');
    try {
      const res = await fetch(`${API_BASE}/api/pos/reset-prices`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('↺ Reset all prices to standard MRP.');
        fetchData();
      }
    } catch {
      showToast('❌ Failed to reset prices');
    }
  };

  const handleForceGatewaySync = async (gatewayId: string, hwId: string) => {
    showToast(`Sending wire sync_request to Gateway ${hwId}...`);
    try {
      const res = await fetch(`${API_BASE}/api/gateways/${gatewayId}/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`📡 Dispatched sync_request down WebSocket to ${hwId}.`);
        fetchData();
      }
    } catch {
      showToast(`❌ Failed to send sync_request to ${hwId}`);
    }
  };

  const handleUpdateGatewayRateLimit = async (gatewayId: string, hwId: string, maxTagsPerSec: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/gateways/${gatewayId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxTagsPerSec }),
      });
      if (res.ok) {
        showToast(`⚙️ Updated ${hwId} rate limit to ${maxTagsPerSec} tags/sec.`);
        fetchData();
      }
    } catch {
      showToast('❌ Failed to update gateway rate limit');
    }
  };

  // Save changes in Tag Inspector
  const handleSaveTagInspector = async () => {
    if (!tagDetail) return;
    showToast(`Updating label ${tagDetail.hardwareId}...`);

    try {
      // 1. Update tag binding and size if changed
      const tagRes = await fetch(`${API_BASE}/api/tags/${tagDetail.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skuId: inspectorSkuId || null,
          size: inspectorSize,
        }),
      });

      // 2. If price was also edited for the bound SKU, update the SKU
      if (inspectorSkuId && tagDetail.sku) {
        const priceMinor = Math.round(parseFloat(inspectorPriceRupees) * 100);
        const mrpMinor = Math.round(parseFloat(inspectorMrpRupees) * 100);
        if (!isNaN(priceMinor) && priceMinor > 0) {
          await fetch(`${API_BASE}/api/skus/${inspectorSkuId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              priceMinor,
              mrpMinor: isNaN(mrpMinor) ? undefined : mrpMinor,
              promoBadge: inspectorPromo.trim() ? inspectorPromo.trim() : null,
            }),
          });
        }
      }

      if (tagRes.ok) {
        showToast(`✅ Successfully updated ${tagDetail.hardwareId}! Radio sync triggered.`);
        fetchData();
        // Refresh detail
        setInspectTagId(tagDetail.id);
      }
    } catch {
      showToast('❌ Failed to update tag details');
    }
  };

  // Chaos lab triggers
  const triggerHashSkipTest = async () => {
    showToast('Running Hard Problem 3: Battery-Aware Hash Skip...');
    try {
      const res = await fetch(`${API_BASE}/api/chaos/hash-skip-test`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`⚡ ${data.message}`);
        fetchData();
      } else {
        showToast(`❌ ${data.error}`);
      }
    } catch {
      showToast('❌ Failed to execute hash skip test');
    }
  };

  const triggerBurstCollapseTest = async () => {
    showToast('Running Hard Problem 2: Rapid Burst Collapse Test...');
    try {
      const res = await fetch(`${API_BASE}/api/chaos/burst-collapse-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skuCode: 'CAD-SILK-150' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🌪️ Dispatched 3 rapid updates! Intermediate targets collapsed into SUPERSEDED.`);
        fetchData();
      }
    } catch {
      showToast('❌ Failed to run burst test');
    }
  };

  const toggleLowBattery = async (low: boolean) => {
    const faultType = low ? 'LOW_BATTERY' : 'RESTORE';
    showToast(`${low ? '⚠️ Injecting low battery (12%)' : '💚 Restoring battery (95%)'} on tag-001...`);
    try {
      const res = await fetch(`${API_BASE}/api/chaos/inject-fault`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId: 'tag-001', faultType }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        fetchData();
      }
    } catch {
      showToast('❌ Failed to inject fault');
    }
  };

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '20px 24px', minHeight: '100vh' }}>
      {/* =========================================================================
          TOP HEADER & GLOBAL NAVIGATION
      ========================================================================== */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #1e293b',
          paddingBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              padding: '8px 14px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '20px',
              letterSpacing: '-0.5px',
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
            }}
          >
            QS
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>
                Quickshelf
              </h1>
              <span
                style={{
                  background: '#1e293b',
                  color: '#94a3b8',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                }}
              >
                ENTERPRISE CONSOLE v1.0
              </span>
            </div>
            <p style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: '13px' }}>
              Digital Shelf Label Control Center • Ceiling Access Point Manager • Commercial Catalog
            </p>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              background: apiConnected ? '#064e3b' : '#7f1d1d',
              color: apiConnected ? '#34d399' : '#f87171',
              border: `1px solid ${apiConnected ? '#059669' : '#dc2626'}`,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: apiConnected ? '#10b981' : '#ef4444',
              }}
            ></span>
            {apiConnected ? 'API Connected (:3000)' : 'API Disconnected'}
          </div>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              background: autoRefresh ? '#1e293b' : '#0f172a',
              color: autoRefresh ? '#60a5fa' : '#64748b',
              border: '1px solid #334155',
              cursor: 'pointer',
            }}
          >
            <Activity size={14} className={autoRefresh ? 'spin' : ''} />
            {autoRefresh ? 'Live Polling Active' : 'Polling Paused'}
          </button>

          <button
            onClick={fetchData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </header>

      {/* Action Notification Toast */}
      {actionMessage && (
        <div
          style={{
            background: '#1e3a8a',
            color: '#93c5fd',
            border: '1px solid #3b82f6',
            borderRadius: '8px',
            padding: '10px 18px',
            marginBottom: '18px',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 16px rgba(30, 58, 138, 0.4)',
          }}
        >
          <Zap size={16} color="#60a5fa" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* =========================================================================
          TOP FLEET SUMMARY KPI STRIP
      ========================================================================== */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '22px',
        }}
      >
        {/* Metric: Divergence State */}
        <div
          style={{
            background: fleet && fleet.divergedTags > 0 ? '#381a02' : '#0f172a',
            border: `1px solid ${fleet && fleet.divergedTags > 0 ? '#f59e0b' : '#1e293b'}`,
            borderRadius: '10px',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>
            <span>DIVERGED LABELS</span>
            <AlertCircle size={16} color={fleet && fleet.divergedTags > 0 ? '#fbbf24' : '#10b981'} />
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, marginTop: '6px', color: fleet && fleet.divergedTags > 0 ? '#fbbf24' : '#f8fafc' }}>
            {fleet ? fleet.divergedTags : '-'}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            {fleet && fleet.divergedTags > 0 ? 'Sync-Engine actively radio-dispatching' : 'All labels synchronized with cloud'}
          </div>
        </div>

        {/* Metric: Convergence Rate */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>
            <span>CONVERGENCE RATE</span>
            <ShieldCheck size={16} color="#34d399" />
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, marginTop: '6px', color: '#34d399' }}>
            {fleet ? `${fleet.convergencePct.toFixed(0)}%` : '-'}
          </div>
          <div style={{ background: '#1e293b', height: '5px', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
            <div
              style={{
                width: fleet ? `${fleet.convergencePct}%` : '0%',
                background: fleet && fleet.divergedTags > 0 ? '#f59e0b' : '#10b981',
                height: '100%',
                transition: 'width 0.3s ease',
              }}
            ></div>
          </div>
        </div>

        {/* Metric: Total Labels Active */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>
            <span>TOTAL LABELS</span>
            <TagIcon size={16} color="#60a5fa" />
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, marginTop: '6px', color: '#f8fafc' }}>
            {fleet ? fleet.totalTags : '-'}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            Across {fleet ? fleet.storeCount : '-'} stores • {fleet ? fleet.gatewayCount : '-'} ceiling access points
          </div>
        </div>

        {/* Metric: Collapsed / Superseded */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>
            <span>SUPERSEDED TARGETS</span>
            <Cpu size={16} color="#a855f7" />
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, marginTop: '6px', color: '#c084fc' }}>
            {chaos ? chaos.supersededTargets : '0'}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            Saved radio packet dispatches via version collapsing
          </div>
        </div>
      </section>

      {/* =========================================================================
          PRIMARY NAVIGATION TABS
      ========================================================================== */}
      <nav style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1e293b', marginBottom: '20px' }}>
        {[
          { key: 'fleet', label: 'Fleet & Digital Shelf', icon: TagIcon, badge: fleet && fleet.divergedTags > 0 ? `${fleet.divergedTags} diverged` : `${tags.length}` },
          { key: 'gateways', label: 'Stores & Access Points', icon: Radio, badge: `${gateways.length} APs` },
          { key: 'skus', label: 'SKU Catalog & Pricing', icon: Layers, badge: `${skus.length} SKUs` },
          { key: 'audit', label: 'Audit & Compliance Ledger', icon: FileText },
          { key: 'chaos', label: 'Diagnostics & Chaos Lab', icon: Zap },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                background: isActive ? '#1e293b' : 'transparent',
                color: isActive ? '#f8fafc' : '#94a3b8',
                fontWeight: isActive ? 700 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
              }}
            >
              <Icon size={16} color={isActive ? '#60a5fa' : '#64748b'} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  style={{
                    background: tab.key === 'fleet' && fleet && fleet.divergedTags > 0 ? '#b45309' : '#0f172a',
                    color: tab.key === 'fleet' && fleet && fleet.divergedTags > 0 ? '#fef3c7' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '10px',
                    border: '1px solid #334155',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* =========================================================================
          TAB 1: FLEET & DIGITAL SHELF
      ========================================================================== */}
      {activeTab === 'fleet' && (
        <main>
          {/* Filter Bar & Bulk Actions */}
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              padding: '14px 18px',
              marginBottom: '18px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 260px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#090d16',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  width: '100%',
                }}
              >
                <Search size={15} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search by Hardware ID, SKU Code, or Product Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#f8fafc',
                    fontSize: '13px',
                    width: '100%',
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Store Filter */}
              <select
                value={filterStore}
                onChange={(e) => setFilterStore(e.target.value)}
                style={{
                  background: '#090d16',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Stores</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Gateway Filter */}
              <select
                value={filterGateway}
                onChange={(e) => setFilterGateway(e.target.value)}
                style={{
                  background: '#090d16',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Gateways</option>
                {gateways.map((gw) => (
                  <option key={gw.id} value={gw.hardwareId}>
                    {gw.hardwareId} ({gw.tagCount} tags)
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                style={{
                  background: '#090d16',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="DIVERGED">Diverged (Syncing)</option>
                <option value="CONVERGED">Converged (In Sync)</option>
                <option value="LOW_BATTERY">Low Battery (&lt;20%)</option>
              </select>

              {/* Tag Size Filter */}
              <select
                value={filterSize}
                onChange={(e) => setFilterSize(e.target.value)}
                style={{
                  background: '#090d16',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Sizes</option>
                <option value="T154">1.54" (T154)</option>
                <option value="T213">2.13" (T213)</option>
                <option value="T290">2.90" (T290)</option>
                <option value="T420">4.20" (T420)</option>
                <option value="T750">7.50" (T750)</option>
                <option value="T1020">10.2" (T1020)</option>
              </select>

              {/* View Switcher: Grid vs Table */}
              <div
                style={{
                  display: 'flex',
                  background: '#090d16',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setViewMode('grid')}
                  style={{
                    background: viewMode === 'grid' ? '#3b82f6' : 'transparent',
                    color: viewMode === 'grid' ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                  }}
                  title="E-Ink Shelf View"
                >
                  <Grid size={14} /> E-Ink
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  style={{
                    background: viewMode === 'table' ? '#3b82f6' : 'transparent',
                    color: viewMode === 'table' ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                  }}
                  title="Dense Table View"
                >
                  <List size={14} /> Table
                </button>
              </div>

              {/* Register Tag Button */}
              <button
                onClick={() => setShowAddTagModal(true)}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={14} /> Register Tag
              </button>
            </div>
          </div>

          {/* Bulk Operations Strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              padding: '8px 12px',
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#94a3b8',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                checked={selectedTagIds.size > 0 && selectedTagIds.size === filteredTags.length}
                onChange={handleSelectAll}
                style={{ cursor: 'pointer' }}
              />
              <span>
                Showing <strong>{filteredTags.length}</strong> of {tags.length} digital labels
                {selectedTagIds.size > 0 && (
                  <span style={{ color: '#60a5fa', fontWeight: 600, marginLeft: '6px' }}>
                    ({selectedTagIds.size} selected)
                  </span>
                )}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Quick Fleet Actions:</span>
              <button
                onClick={() => handleTriggerFlashSale(15)}
                style={{
                  background: '#1e3a8a',
                  color: '#93c5fd',
                  border: '1px solid #3b82f6',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Flame size={13} color="#f59e0b" /> -15% Flash Sale
              </button>
              <button
                onClick={handleResetPrices}
                style={{
                  background: '#1e293b',
                  color: '#e2e8f0',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <RotateCcw size={13} /> Reset to MRP
              </button>
            </div>
          </div>

          {/* ==================== VIEW 1: E-INK SHELF VIEW ==================== */}
          {viewMode === 'grid' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                gap: '16px',
              }}
            >
              {filteredTags.map((tag) => {
                const sku = tag.sku;
                const isSelected = selectedTagIds.has(tag.id);

                return (
                  <div
                    key={tag.id}
                    onClick={() => setInspectTagId(tag.id)}
                    style={{
                      background: '#fdfbf7', // Authentic e-ink off-white
                      color: '#111827',
                      borderRadius: '12px',
                      padding: '14px',
                      border: tag.isDiverged ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                      boxShadow: tag.isDiverged
                        ? '0 0 16px rgba(245, 158, 11, 0.35)'
                        : '0 4px 12px rgba(0,0,0,0.25)',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '230px',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                  >
                    {/* Top E-Ink Status Bar */}
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px dashed #cbd5e1',
                          paddingBottom: '8px',
                          marginBottom: '10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#475569',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleTagSelect(tag.id);
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{tag.hardwareId}</span>
                          <span
                            style={{
                              background: '#e2e8f0',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              fontSize: '10px',
                            }}
                          >
                            {tag.size}
                          </span>
                        </div>

                        {/* Battery & RSSI */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                              color: tag.batteryPct < 20 ? '#dc2626' : '#16a34a',
                              fontWeight: 700,
                            }}
                          >
                            <Battery size={13} />
                            {tag.batteryPct}%
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#64748b' }}>
                            <Wifi size={13} />
                            {tag.rssi}dBm
                          </span>
                        </div>
                      </div>

                      {/* Promo Badge if present */}
                      {sku?.promoBadge ? (
                        <div
                          style={{
                            background: '#111827',
                            color: '#ffffff',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 800,
                            letterSpacing: '0.5px',
                            display: 'inline-block',
                            marginBottom: '6px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {sku.promoBadge}
                        </div>
                      ) : (
                        <div style={{ height: '22px' }}></div>
                      )}

                      {/* Product Name */}
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 800,
                          lineHeight: 1.25,
                          color: '#0f172a',
                          marginBottom: '8px',
                        }}
                      >
                        {sku ? sku.name : <span style={{ color: '#94a3b8' }}>Unpaired Tag (No SKU bound)</span>}
                      </div>

                      {/* Commercial Pricing */}
                      {sku ? (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span style={{ fontSize: '26px', fontWeight: 900, color: '#090d16', letterSpacing: '-0.5px' }}>
                            ₹{formatRupees(sku.priceMinor)}
                          </span>
                          {sku.mrpMinor > sku.priceMinor && (
                            <span style={{ fontSize: '13px', color: '#94a3b8', textDecoration: 'line-through' }}>
                              ₹{formatRupees(sku.mrpMinor)}
                            </span>
                          )}
                          {sku.mrpMinor > sku.priceMinor && (
                            <span
                              style={{
                                background: '#fef08a',
                                color: '#854d0e',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 800,
                              }}
                            >
                              SAVE {Math.round(((sku.mrpMinor - sku.priceMinor) / sku.mrpMinor) * 100)}%
                            </span>
                          )}
                        </div>
                      ) : (
                        <div style={{ color: '#64748b', fontSize: '12px', fontStyle: 'italic' }}>
                          Click to pair SKU in inspector
                        </div>
                      )}
                    </div>

                    {/* Bottom Status & Hardware Footer */}
                    <div style={{ marginTop: '12px' }}>
                      {/* E-Ink simulated barcode */}
                      <div
                        style={{
                          height: '14px',
                          background: 'repeating-linear-gradient(90deg, #1e293b 0px, #1e293b 2px, transparent 2px, transparent 4px, #1e293b 4px, #1e293b 7px, transparent 7px, transparent 8px)',
                          opacity: 0.6,
                          marginBottom: '6px',
                          borderRadius: '2px',
                        }}
                      ></div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        <span style={{ color: '#64748b' }}>
                          AP: <strong>{tag.gatewayHardwareId}</strong>
                        </span>

                        {tag.isDiverged ? (
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#fef3c7',
                              color: '#b45309',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontWeight: 800,
                            }}
                          >
                            <span
                              style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }}
                            ></span>
                            SYNCING (v{tag.reportedVersion} → v{tag.desiredVersion})
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#16a34a',
                              fontWeight: 700,
                            }}
                          >
                            <CheckCircle2 size={13} />
                            IN SYNC (v{tag.reportedVersion})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ==================== VIEW 2: DENSE DATA TABLE VIEW ==================== */
            <div
              style={{
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '10px',
                overflowX: 'auto',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '12px 14px', width: '32px' }}>
                      <input
                        type="checkbox"
                        checked={selectedTagIds.size > 0 && selectedTagIds.size === filteredTags.length}
                        onChange={handleSelectAll}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '12px 14px' }}>HARDWARE ID</th>
                    <th style={{ padding: '12px 14px' }}>PRODUCT SKU</th>
                    <th style={{ padding: '12px 14px' }}>STORE & AP</th>
                    <th style={{ padding: '12px 14px' }}>PRICE / MRP</th>
                    <th style={{ padding: '12px 14px' }}>BATTERY</th>
                    <th style={{ padding: '12px 14px' }}>SIGNAL</th>
                    <th style={{ padding: '12px 14px' }}>VERSION</th>
                    <th style={{ padding: '12px 14px' }}>STATUS</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTags.map((tag) => {
                    const isSelected = selectedTagIds.has(tag.id);
                    return (
                      <tr
                        key={tag.id}
                        onClick={() => setInspectTagId(tag.id)}
                        style={{
                          borderBottom: '1px solid #1e293b',
                          background: isSelected ? '#1e293b' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.1s ease',
                        }}
                      >
                        <td style={{ padding: '12px 14px' }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleTagSelect(tag.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, fontFamily: 'monospace' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#f8fafc' }}>{tag.hardwareId}</span>
                            <span
                              style={{
                                background: '#1e293b',
                                color: '#94a3b8',
                                fontSize: '10px',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                border: '1px solid #334155',
                              }}
                            >
                              {tag.size}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {tag.sku ? (
                            <div>
                              <div style={{ fontWeight: 600, color: '#f8fafc' }}>{tag.sku.name}</div>
                              <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                                {tag.sku.code}
                                {tag.sku.promoBadge && (
                                  <span style={{ color: '#f59e0b', marginLeft: '6px' }}>[{tag.sku.promoBadge}]</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#64748b', fontStyle: 'italic' }}>Unpaired</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>
                          <div>{tag.storeName}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>AP: {tag.gatewayHardwareId}</div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {tag.sku ? (
                            <div>
                              <span style={{ fontWeight: 800, color: '#10b981' }}>
                                ₹{formatRupees(tag.sku.priceMinor)}
                              </span>
                              {tag.sku.mrpMinor > tag.sku.priceMinor && (
                                <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px', textDecoration: 'line-through' }}>
                                  ₹{formatRupees(tag.sku.mrpMinor)}
                                </span>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 700,
                              color: tag.batteryPct < 20 ? '#ef4444' : tag.batteryPct < 50 ? '#f59e0b' : '#10b981',
                            }}
                          >
                            <Battery size={14} />
                            {tag.batteryPct}%
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#94a3b8', fontFamily: 'monospace' }}>
                          {tag.rssi} dBm
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '12px' }}>
                          <span style={{ color: '#94a3b8' }}>v{tag.reportedVersion}</span>
                          <span style={{ color: '#64748b', margin: '0 4px' }}>/</span>
                          <span style={{ color: tag.isDiverged ? '#f59e0b' : '#34d399', fontWeight: 700 }}>
                            v{tag.desiredVersion}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {tag.isDiverged ? (
                            <span
                              style={{
                                background: '#78350f',
                                color: '#fef3c7',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }}></span>
                              Diverged (+{tag.divergenceDelta})
                            </span>
                          ) : (
                            <span
                              style={{
                                background: '#064e3b',
                                color: '#6ee7b7',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <CheckCircle2 size={12} />
                              In Sync
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectTagId(tag.id);
                            }}
                            style={{
                              background: '#1e293b',
                              color: '#60a5fa',
                              border: '1px solid #334155',
                              borderRadius: '6px',
                              padding: '4px 10px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      )}

      {/* =========================================================================
          TAB 2: STORES & ACCESS POINTS (GATEWAYS)
      ========================================================================== */}
      {activeTab === 'gateways' && (
        <main>
          {/* Header & Add Store Trigger */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Ceiling Access Points & Stores</h2>
              <p style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: '13px' }}>
                Manage physical RF gateways, inspect transmission pacing, and force inventory sync requests.
              </p>
            </div>

            <button
              onClick={() => setShowAddStoreModal(true)}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={15} /> Provision Store
            </button>
          </div>

          {/* Store Summary Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {stores.map((s) => (
              <div
                key={s.id}
                style={{
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: '12px',
                  padding: '18px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>{s.name}</h3>
                    <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>
                      Location: <strong>{s.city}</strong> • ID: <span style={{ fontFamily: 'monospace' }}>{s.id}</span>
                    </div>
                  </div>
                  <span
                    style={{
                      background: '#1e293b',
                      color: '#60a5fa',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: '1px solid #334155',
                    }}
                  >
                    {s.gatewayCount} Access Points
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '10px',
                    marginTop: '16px',
                    padding: '12px',
                    background: '#090d16',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>{s.tagCount}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Total Labels</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: s.divergedTags > 0 ? '#f59e0b' : '#10b981' }}>
                      {s.divergedTags}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Diverging</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>
                      {s.convergencePct.toFixed(0)}%
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Convergence</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Access Points Detailed Table */}
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              padding: '18px',
            }}
          >
            <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
              Connected Ceiling Gateways
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '10px 14px' }}>AP HARDWARE ID</th>
                    <th style={{ padding: '10px 14px' }}>STORE</th>
                    <th style={{ padding: '10px 14px' }}>STATUS</th>
                    <th style={{ padding: '10px 14px' }}>FIRMWARE</th>
                    <th style={{ padding: '10px 14px' }}>CONNECTED TAGS</th>
                    <th style={{ padding: '10px 14px' }}>RATE LIMIT (TAGS/SEC)</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>OPERATIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {gateways.map((gw) => (
                    <tr key={gw.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, fontFamily: 'monospace', color: '#f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Radio size={15} color="#3b82f6" />
                          {gw.hardwareId}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>
                        {gw.store.name} ({gw.store.city})
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            background: gw.status === 'ONLINE' ? '#064e3b' : '#7f1d1d',
                            color: gw.status === 'ONLINE' ? '#6ee7b7' : '#fca5a5',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: gw.status === 'ONLINE' ? '#10b981' : '#ef4444',
                            }}
                          ></span>
                          {gw.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#94a3b8' }}>
                        {gw.firmware}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontWeight: 700, color: '#f8fafc' }}>{gw.tagCount}</span>
                        {gw.divergedCount > 0 && (
                          <span style={{ color: '#f59e0b', fontSize: '11px', marginLeft: '6px' }}>
                            ({gw.divergedCount} syncing)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="number"
                            min="5"
                            max="200"
                            defaultValue={gw.maxTagsPerSec}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val !== gw.maxTagsPerSec) {
                                handleUpdateGatewayRateLimit(gw.id, gw.hardwareId, val);
                              }
                            }}
                            style={{
                              width: '70px',
                              background: '#090d16',
                              border: '1px solid #334155',
                              color: '#f8fafc',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '12px',
                              fontWeight: 700,
                            }}
                          />
                          <span style={{ color: '#64748b', fontSize: '11px' }}>tags/s (Lua)</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleForceGatewaySync(gw.id, gw.hardwareId)}
                          style={{
                            background: '#1e293b',
                            color: '#60a5fa',
                            border: '1px solid #3b82f6',
                            borderRadius: '6px',
                            padding: '5px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <RefreshCw size={12} /> Force Sync Request
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* =========================================================================
          TAB 3: SKU CATALOG & COMMERCIAL PRICING
      ========================================================================== */}
      {activeTab === 'skus' && (
        <main>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Product Catalog & Commercials</h2>
              <p style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: '13px' }}>
                Every price change triggers an automatic atomic update across all paired digital shelf labels.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleTriggerFlashSale(20)}
                style={{
                  background: '#9a3412',
                  color: '#ffedd5',
                  border: '1px solid #ea580c',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Flame size={15} color="#fdba74" /> -20% Flash Sale
              </button>

              <button
                onClick={() => setShowAddSkuModal(true)}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={15} /> Add New SKU
              </button>
            </div>
          </div>

          {/* SKU Table */}
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              overflowX: 'auto',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '12px 14px' }}>SKU CODE</th>
                  <th style={{ padding: '12px 14px' }}>PRODUCT NAME</th>
                  <th style={{ padding: '12px 14px' }}>STORE</th>
                  <th style={{ padding: '12px 14px' }}>PRICE (₹)</th>
                  <th style={{ padding: '12px 14px' }}>MRP (₹)</th>
                  <th style={{ padding: '12px 14px' }}>DISCOUNT</th>
                  <th style={{ padding: '12px 14px' }}>PROMO BADGE</th>
                  <th style={{ padding: '12px 14px' }}>PAIRED TAGS</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {skus.map((sku) => {
                  const discountPct = sku.mrpMinor > sku.priceMinor
                    ? Math.round(((sku.mrpMinor - sku.priceMinor) / sku.mrpMinor) * 100)
                    : 0;

                  return (
                    <tr key={sku.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, fontFamily: 'monospace', color: '#60a5fa' }}>
                        {sku.code}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#f8fafc' }}>
                        {sku.name}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>
                        {sku.storeName || 'Quickshelf Koramangala'}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#10b981', fontSize: '15px' }}>
                        ₹{formatRupees(sku.priceMinor)}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#94a3b8' }}>
                        ₹{formatRupees(sku.mrpMinor)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {discountPct > 0 ? (
                          <span
                            style={{
                              background: '#854d0e',
                              color: '#fef08a',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 800,
                            }}
                          >
                            {discountPct}% OFF
                          </span>
                        ) : (
                          <span style={{ color: '#64748b' }}>Standard</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {sku.promoBadge ? (
                          <span
                            style={{
                              background: '#1e293b',
                              color: '#fbbf24',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              border: '1px solid #334155',
                            }}
                          >
                            {sku.promoBadge}
                          </span>
                        ) : (
                          <span style={{ color: '#64748b' }}>None</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#f8fafc' }}>
                        {sku.tagCount ?? 1} labels
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          onClick={() => setShowEditSkuModal(sku)}
                          style={{
                            background: '#1e293b',
                            color: '#60a5fa',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Edit3 size={13} /> Edit Price
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      )}

      {/* =========================================================================
          TAB 4: AUDIT & COMPLIANCE LEDGER
      ========================================================================== */}
      {activeTab === 'audit' && (
        <main>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Regulatory Price Change Ledger</h2>
            <p style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: '13px' }}>
              Immutable audit receipts of all POS and manual commercial updates for dispute resolution and compliance.
            </p>
          </div>

          <div
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              overflowX: 'auto',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '12px 14px' }}>TIMESTAMP</th>
                  <th style={{ padding: '12px 14px' }}>SKU CODE</th>
                  <th style={{ padding: '12px 14px' }}>PRODUCT</th>
                  <th style={{ padding: '12px 14px' }}>STORE</th>
                  <th style={{ padding: '12px 14px' }}>OLD PRICE</th>
                  <th style={{ padding: '12px 14px' }}>NEW PRICE</th>
                  <th style={{ padding: '12px 14px' }}>CHANGE (Δ)</th>
                  <th style={{ padding: '12px 14px' }}>SOURCE</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                      No price change events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => {
                    const isDiscount = log.deltaMinor < 0;
                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '12px 14px', color: '#94a3b8', fontFamily: 'monospace', fontSize: '12px' }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa' }}>
                          {log.skuCode}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#f8fafc' }}>
                          {log.skuName}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>
                          {log.storeName}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#94a3b8' }}>
                          ₹{formatRupees(log.oldPriceMinor)}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: '#f8fafc' }}>
                          ₹{formatRupees(log.newPriceMinor)}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              background: isDiscount ? '#064e3b' : '#7f1d1d',
                              color: isDiscount ? '#6ee7b7' : '#fca5a5',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 800,
                            }}
                          >
                            {isDiscount ? '-' : '+'}₹{formatRupees(Math.abs(log.deltaMinor))}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              background: '#1e293b',
                              color: '#94a3b8',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontFamily: 'monospace',
                            }}
                          >
                            {log.source.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </main>
      )}

      {/* =========================================================================
          TAB 5: DIAGNOSTICS & CHAOS LAB
      ========================================================================== */}
      {activeTab === 'chaos' && (
        <main>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>7 Hard Problems Benchmark & Fault Injector</h2>
            <p style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: '13px' }}>
              Simulate radio packet collision, rapid price bursts, battery skip, and low-battery rejection in real time.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {/* Chaos Card 1: Burst & Collapse */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ background: '#7c3aed', padding: '6px', borderRadius: '8px', color: '#fff' }}>
                  <Cpu size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Hard Problem 2: Burst & Collapse</h3>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.4, margin: '0 0 16px' }}>
                Fires 3 rapid POS price updates for CAD-SILK-150 in sub-second intervals. The reconciliation engine marks intermediate targets as <strong>SUPERSEDED</strong> to prevent redundant radio transmission.
              </p>
              <button
                onClick={triggerBurstCollapseTest}
                style={{
                  background: '#6d28d9',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Fire 3x Rapid Burst
              </button>
            </div>

            {/* Chaos Card 2: Hash Skip */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ background: '#0284c7', padding: '6px', borderRadius: '8px', color: '#fff' }}>
                  <Battery size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Hard Problem 3: Battery-Aware Hash Skip</h3>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.4, margin: '0 0 16px' }}>
                Bumps desired version in cloud database while keeping payload hash identical. The sync engine compares hashes, skips 2.4 GHz radio dispatch, and immediately advances reportedVersion to save battery.
              </p>
              <button
                onClick={triggerHashSkipTest}
                style={{
                  background: '#0369a1',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Simulate Redundant Bump (Hash Skip)
              </button>
            </div>

            {/* Chaos Card 3: Low Battery Protection */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ background: '#b91c1c', padding: '6px', borderRadius: '8px', color: '#fff' }}>
                  <AlertTriangle size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Hard Problem 7: Low Battery Safety NACK</h3>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.4, margin: '0 0 16px' }}>
                Injects 12% critical battery on tag-001. Hardware displays refuse render command with <code>LOW_BATTERY</code> NACK to prevent partial e-paper refresh freezes on loss of power.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => toggleLowBattery(true)}
                  style={{
                    background: '#991b1b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    flex: 1,
                  }}
                >
                  Inject Low Battery (12%)
                </button>
                <button
                  onClick={() => toggleLowBattery(false)}
                  style={{
                    background: '#166534',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    flex: 1,
                  }}
                >
                  Restore (95%)
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* =========================================================================
          SLIDE-OVER TAG INSPECTOR DRAWER
      ========================================================================== */}
      {inspectTagId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setInspectTagId(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              height: '100%',
              background: '#090d16',
              borderLeft: '1px solid #1e293b',
              boxShadow: '-8px 0 24px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: '18px 20px',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#0f172a',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, fontFamily: 'monospace', color: '#f8fafc' }}>
                    {tagDetail ? tagDetail.hardwareId : 'Inspecting Label...'}
                  </h2>
                  {tagDetail && (
                    <span
                      style={{
                        background: tagDetail.isDiverged ? '#78350f' : '#064e3b',
                        color: tagDetail.isDiverged ? '#fef3c7' : '#6ee7b7',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '10px',
                      }}
                    >
                      {tagDetail.isDiverged ? 'DIVERGED' : 'IN SYNC'}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  {tagDetail?.store.name} • AP: {tagDetail?.gateway.hardwareId}
                </div>
              </div>

              <button
                onClick={() => setInspectTagId(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '6px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Body */}
            {tagDetailLoading || !tagDetail ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <RefreshCw size={24} className="spin" />
                <p style={{ marginTop: '12px' }}>Loading hardware telemetry & state...</p>
              </div>
            ) : (
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 1. Realistic E-Ink Preview */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', display: 'block' }}>
                    HIGH-RESOLUTION E-INK DISPLAY PREVIEW
                  </label>
                  <div
                    style={{
                      background: '#fdfbf7',
                      color: '#0f172a',
                      borderRadius: '10px',
                      padding: '16px',
                      border: tagDetail.isDiverged ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #cbd5e1', paddingBottom: '6px', fontSize: '11px', fontWeight: 700 }}>
                      <span>{tagDetail.hardwareId}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span>🔋 {tagDetail.batteryPct}%</span>
                        <span>📶 {tagDetail.rssi} dBm</span>
                      </div>
                    </div>

                    {inspectorPromo ? (
                      <div style={{ background: '#0f172a', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, marginTop: '8px', display: 'inline-block' }}>
                        {inspectorPromo}
                      </div>
                    ) : (
                      <div style={{ height: '14px' }}></div>
                    )}

                    <div style={{ fontSize: '16px', fontWeight: 800, margin: '6px 0 4px' }}>
                      {tagDetail.sku ? tagDetail.sku.name : 'Unpaired Tag'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '28px', fontWeight: 900 }}>
                        ₹{inspectorPriceRupees || '0.00'}
                      </span>
                      {inspectorMrpRupees && parseFloat(inspectorMrpRupees) > parseFloat(inspectorPriceRupees || '0') && (
                        <span style={{ color: '#94a3b8', textDecoration: 'line-through', fontSize: '14px' }}>
                          ₹{inspectorMrpRupees}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Hardware Telemetry & Radio */}
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                    Hardware Telemetry & Radio Specs
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Battery Health:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <Battery size={16} color={tagDetail.batteryPct < 20 ? '#ef4444' : '#10b981'} />
                        <strong style={{ color: tagDetail.batteryPct < 20 ? '#ef4444' : '#10b981' }}>
                          {tagDetail.batteryPct}%
                        </strong>
                      </div>
                    </div>

                    <div>
                      <span style={{ color: '#64748b' }}>RSSI Signal:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <Wifi size={16} color="#60a5fa" />
                        <strong style={{ color: '#f8fafc' }}>{tagDetail.rssi} dBm</strong>
                      </div>
                    </div>

                    <div>
                      <span style={{ color: '#64748b' }}>Form Factor:</span>
                      <div style={{ marginTop: '4px' }}>
                        <select
                          value={inspectorSize}
                          onChange={(e) => setInspectorSize(e.target.value)}
                          style={{
                            background: '#090d16',
                            color: '#f8fafc',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '12px',
                            width: '100%',
                          }}
                        >
                          <option value="T154">1.54" (T154)</option>
                          <option value="T213">2.13" (T213)</option>
                          <option value="T290">2.90" (T290)</option>
                          <option value="T420">4.20" (T420)</option>
                          <option value="T750">7.50" (T750)</option>
                          <option value="T1020">10.2" (T1020)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <span style={{ color: '#64748b' }}>Ceiling AP:</span>
                      <div style={{ marginTop: '6px', fontWeight: 600, color: '#f8fafc', fontFamily: 'monospace' }}>
                        {tagDetail.gateway.hardwareId}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Cloud Desired vs Hardware Reported Diff */}
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                    State Diff: Cloud vs Hardware
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {/* Cloud State */}
                    <div style={{ background: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px', fontSize: '12px' }}>
                      <div style={{ color: '#60a5fa', fontWeight: 700, marginBottom: '4px' }}>CLOUD DESIRED</div>
                      <div>Version: <strong>v{tagDetail.desiredVersion}</strong></div>
                      <div style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8' }}>
                        Hash: <span style={{ fontFamily: 'monospace' }}>{tagDetail.desiredHash?.slice(0, 10) ?? 'none'}...</span>
                      </div>
                    </div>

                    {/* Hardware State */}
                    <div style={{ background: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px', fontSize: '12px' }}>
                      <div style={{ color: tagDetail.isDiverged ? '#f59e0b' : '#34d399', fontWeight: 700, marginBottom: '4px' }}>
                        HARDWARE REPORTED
                      </div>
                      <div>Version: <strong>v{tagDetail.reportedVersion}</strong></div>
                      <div style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8' }}>
                        Hash: <span style={{ fontFamily: 'monospace' }}>{tagDetail.reportedHash?.slice(0, 10) ?? 'none'}...</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. SKU Re-binding & Direct Price Editor */}
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                    Re-Pair Product & Commercial Overrides
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                    {/* SKU Selector */}
                    <div>
                      <label style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                        Assigned Commercial SKU:
                      </label>
                      <select
                        value={inspectorSkuId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setInspectorSkuId(id);
                          const found = skus.find((s) => s.id === id);
                          if (found) {
                            setInspectorPriceRupees((found.priceMinor / 100).toFixed(2));
                            setInspectorMrpRupees((found.mrpMinor / 100).toFixed(2));
                            setInspectorPromo(found.promoBadge ?? '');
                          }
                        }}
                        style={{
                          width: '100%',
                          background: '#090d16',
                          color: '#f8fafc',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '13px',
                        }}
                      >
                        <option value="">-- Unpair (No Product) --</option>
                        {skus.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.code} - {s.name} (₹{(s.priceMinor / 100).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Price and MRP */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                          Price (₹):
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={inspectorPriceRupees}
                          onChange={(e) => setInspectorPriceRupees(e.target.value)}
                          style={{
                            width: '100%',
                            background: '#090d16',
                            color: '#f8fafc',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '13px',
                            fontWeight: 700,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                          MRP (₹):
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={inspectorMrpRupees}
                          onChange={(e) => setInspectorMrpRupees(e.target.value)}
                          style={{
                            width: '100%',
                            background: '#090d16',
                            color: '#f8fafc',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '13px',
                          }}
                        />
                      </div>
                    </div>

                    {/* Promo Badge */}
                    <div>
                      <label style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                        Promo Badge Text:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Special Offer, 20% OFF"
                        value={inspectorPromo}
                        onChange={(e) => setInspectorPromo(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#090d16',
                          color: '#f8fafc',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={handleSaveTagInspector}
                      style={{
                        background: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginTop: '6px',
                      }}
                    >
                      Save & Push to Physical Label
                    </button>
                  </div>
                </div>

                {/* 5. Historical Command Targets */}
                {tagDetail.recentTargets && tagDetail.recentTargets.length > 0 && (
                  <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                      Recent Radio Command Log
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                      {tagDetail.recentTargets.map((tgt) => (
                        <div
                          key={tgt.id}
                          style={{
                            background: '#090d16',
                            border: '1px solid #1e293b',
                            borderRadius: '6px',
                            padding: '8px 10px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 700, color: '#f8fafc' }}>Target v{tgt.version}</span>
                            <div style={{ color: '#64748b', fontSize: '11px' }}>
                              {new Date(tgt.createdAt).toLocaleTimeString()}
                            </div>
                          </div>

                          <span
                            style={{
                              background: tgt.status === 'ACKED' ? '#064e3b' : tgt.status === 'SUPERSEDED' ? '#4c1d95' : '#7f1d1d',
                              color: tgt.status === 'ACKED' ? '#6ee7b7' : tgt.status === 'SUPERSEDED' ? '#c4b5fd' : '#fca5a5',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            {tgt.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD NEW SKU
      ========================================================================== */}
      {showAddSkuModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowAddSkuModal(false)}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Provision Commercial SKU</h3>
              <button
                onClick={() => setShowAddSkuModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const code = (form.elements.namedItem('skuCode') as HTMLInputElement).value;
                const name = (form.elements.namedItem('skuName') as HTMLInputElement).value;
                const storeId = (form.elements.namedItem('storeId') as HTMLSelectElement).value;
                const priceMinor = Math.round(parseFloat((form.elements.namedItem('priceRupees') as HTMLInputElement).value) * 100);
                const mrpMinor = Math.round(parseFloat((form.elements.namedItem('mrpRupees') as HTMLInputElement).value) * 100);
                const promo = (form.elements.namedItem('promo') as HTMLInputElement).value;

                try {
                  const res = await fetch(`${API_BASE}/api/skus`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      storeId,
                      code,
                      name,
                      priceMinor,
                      mrpMinor,
                      promoBadge: promo.trim() ? promo.trim() : null,
                    }),
                  });
                  if (res.ok) {
                    showToast(`✅ Created SKU ${code}!`);
                    setShowAddSkuModal(false);
                    fetchData();
                  }
                } catch {
                  showToast('❌ Failed to create SKU');
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}
            >
              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>Store:</label>
                <select
                  name="storeId"
                  required
                  style={{
                    width: '100%',
                    background: '#090d16',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 10px',
                  }}
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>SKU Code:</label>
                <input
                  name="skuCode"
                  type="text"
                  required
                  placeholder="e.g. CAD-SILK-200"
                  style={{
                    width: '100%',
                    background: '#090d16',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>Product Title:</label>
                <input
                  name="skuName"
                  type="text"
                  required
                  placeholder="e.g. Cadbury Dairy Milk Silk 200g"
                  style={{
                    width: '100%',
                    background: '#090d16',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 10px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>Price (₹):</label>
                  <input
                    name="priceRupees"
                    type="number"
                    step="0.01"
                    required
                    placeholder="199.00"
                    style={{
                      width: '100%',
                      background: '#090d16',
                      color: '#f8fafc',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      fontWeight: 700,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>MRP (₹):</label>
                  <input
                    name="mrpRupees"
                    type="number"
                    step="0.01"
                    required
                    placeholder="220.00"
                    style={{
                      width: '100%',
                      background: '#090d16',
                      color: '#f8fafc',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '8px 10px',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>Promo Badge:</label>
                <input
                  name="promo"
                  type="text"
                  placeholder="e.g. Save 10%, New Arrival"
                  style={{
                    width: '100%',
                    background: '#090d16',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 10px',
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                Provision Product SKU
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT EXISTING SKU
      ========================================================================== */}
      {showEditSkuModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowEditSkuModal(null)}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                Edit SKU: {showEditSkuModal.code}
              </h3>
              <button
                onClick={() => setShowEditSkuModal(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const name = (form.elements.namedItem('skuName') as HTMLInputElement).value;
                const priceMinor = Math.round(parseFloat((form.elements.namedItem('priceRupees') as HTMLInputElement).value) * 100);
                const mrpMinor = Math.round(parseFloat((form.elements.namedItem('mrpRupees') as HTMLInputElement).value) * 100);
                const promo = (form.elements.namedItem('promo') as HTMLInputElement).value;

                try {
                  const res = await fetch(`${API_BASE}/api/skus/${showEditSkuModal.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name,
                      priceMinor,
                      mrpMinor,
                      promoBadge: promo.trim() ? promo.trim() : null,
                    }),
                  });
                  if (res.ok) {
                    showToast(`✅ Updated ${showEditSkuModal.code}! Synchronizing labels...`);
                    setShowEditSkuModal(null);
                    fetchData();
                  }
                } catch {
                  showToast('❌ Failed to update SKU');
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}
            >
              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>Product Title:</label>
                <input
                  name="skuName"
                  type="text"
                  defaultValue={showEditSkuModal.name}
                  required
                  style={{
                    width: '100%',
                    background: '#090d16',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 10px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>Price (₹):</label>
                  <input
                    name="priceRupees"
                    type="number"
                    step="0.01"
                    defaultValue={(showEditSkuModal.priceMinor / 100).toFixed(2)}
                    required
                    style={{
                      width: '100%',
                      background: '#090d16',
                      color: '#f8fafc',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      fontWeight: 700,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>MRP (₹):</label>
                  <input
                    name="mrpRupees"
                    type="number"
                    step="0.01"
                    defaultValue={(showEditSkuModal.mrpMinor / 100).toFixed(2)}
                    required
                    style={{
                      width: '100%',
                      background: '#090d16',
                      color: '#f8fafc',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '8px 10px',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>Promo Badge:</label>
                <input
                  name="promo"
                  type="text"
                  defaultValue={showEditSkuModal.promoBadge ?? ''}
                  placeholder="e.g. Flash Deal 15% OFF"
                  style={{
                    width: '100%',
                    background: '#090d16',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 10px',
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                Save & Broadcast Price Update
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: REGISTER NEW TAG
      ========================================================================== */}
      {showAddTagModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowAddTagModal(false)}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Provision New ESL Label</h3>
              <button
                onClick={() => setShowAddTagModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const hardwareId = (form.elements.namedItem('hwId') as HTMLInputElement).value;
                const storeId = (form.elements.namedItem('storeId') as HTMLSelectElement).value;
                const gatewayId = (form.elements.namedItem('gatewayId') as HTMLSelectElement).value;
                const size = (form.elements.namedItem('size') as HTMLSelectElement).value;
                const skuId = (form.elements.namedItem('skuId') as HTMLSelectElement).value;

                try {
                  const res = await fetch(`${API_BASE}/api/tags`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      hardwareId,
                      storeId,
                      gatewayId,
                      size,
                      skuId: skuId || undefined,
                    }),
                  });
                  if (res.ok) {
                    showToast(`✅ Registered tag ${hardwareId}!`);
                    setShowAddTagModal(false);
                    fetchData();
                  }
                } catch {
                  showToast('❌ Failed to register tag');
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}
            >
              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>Hardware ID:</label>
                <input
                  name="hwId"
                  type="text"
                  required
                  placeholder="e.g. tag-006"
                  style={{
                    width: '100%',
                    background: '#090d16',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>Retail Store:</label>
                <select
                  name="storeId"
                  required
                  style={{
                    width: '100%',
                    background: '#090d16',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 10px',
                  }}
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>Ceiling Access Point:</label>
                <select
                  name="gatewayId"
                  required
                  style={{
                    width: '100%',
                    background: '#090d16',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 10px',
                  }}
                >
                  {gateways.map((gw) => (
                    <option key={gw.id} value={gw.id}>
                      {gw.hardwareId} ({gw.store.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>Display Size:</label>
                <select
                  name="size"
                  defaultValue="T290"
                  style={{
                    width: '100%',
                    background: '#090d16',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 10px',
                  }}
                >
                  <option value="T154">1.54" (T154)</option>
                  <option value="T213">2.13" (T213)</option>
                  <option value="T290">2.90" (T290)</option>
                  <option value="T420">4.20" (T420)</option>
                  <option value="T750">7.50" (T750)</option>
                  <option value="T1020">10.2" (T1020)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>Initial SKU Binding (Optional):</label>
                <select
                  name="skuId"
                  style={{
                    width: '100%',
                    background: '#090d16',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 10px',
                  }}
                >
                  <option value="">-- No initial SKU (Leave Unpaired) --</option>
                  {skus.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                Provision ESL Label
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD NEW STORE
      ========================================================================== */}
      {showAddStoreModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowAddStoreModal(false)}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '420px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Provision Retail Store</h3>
              <button
                onClick={() => setShowAddStoreModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const name = (form.elements.namedItem('storeName') as HTMLInputElement).value;
                const city = (form.elements.namedItem('storeCity') as HTMLInputElement).value;

                try {
                  const res = await fetch(`${API_BASE}/api/stores`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, city }),
                  });
                  if (res.ok) {
                    showToast(`✅ Created store ${name}!`);
                    setShowAddStoreModal(false);
                    fetchData();
                  }
                } catch {
                  showToast('❌ Failed to provision store');
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}
            >
              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>Store Name:</label>
                <input
                  name="storeName"
                  type="text"
                  required
                  placeholder="e.g. Quickshelf Supermarket - Indiranagar"
                  style={{
                    width: '100%',
                    background: '#090d16',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 10px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>City:</label>
                <input
                  name="storeCity"
                  type="text"
                  required
                  placeholder="e.g. Bengaluru"
                  style={{
                    width: '100%',
                    background: '#090d16',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 10px',
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                Provision Store
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
