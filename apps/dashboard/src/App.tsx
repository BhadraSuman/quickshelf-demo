import React, { useState, useEffect, useMemo } from 'react';
import { StoreOnboardingStudio } from './components/StoreOnboardingStudio.js';
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
  Sun,
  Moon,
  TrendingUp,
  Server,
  Database,
  Lock,
  Check,
  Building2,
  Package,
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
  // Theme: Stitch Light vs NOC Dark
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Navigation (Modules from Stitch Design System)
  const [activeTab, setActiveTab] = useState<'fleet' | 'onboarding' | 'pricing' | 'gateways' | 'audit'>('fleet');

  // Multi-tenant Scope Selector
  const [selectedOrg, setSelectedOrg] = useState('Acme Retail Chain');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState('ALL');

  // Core Data State
  const [fleet, setFleet] = useState<FleetStatus | null>(null);
  const [chaos, setChaos] = useState<ChaosMetrics | null>(null);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [gateways, setGateways] = useState<GatewayItem[]>([]);
  const [skus, setSkus] = useState<SkuItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditItem[]>([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fleet View Controls
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
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
  const [showAddGatewayModal, setShowAddGatewayModal] = useState(false);

  // Quick Price Update on Label
  const [quickPriceTag, setQuickPriceTag] = useState<TagItem | null>(null);
  const [quickPriceRupees, setQuickPriceRupees] = useState<string>('');
  const [quickMrpRupees, setQuickMrpRupees] = useState<string>('');
  const [quickPromoBadge, setQuickPromoBadge] = useState<string>('');

  // Add Gateway Form State
  const [newGatewayHwId, setNewGatewayHwId] = useState('');
  const [newGatewayStoreId, setNewGatewayStoreId] = useState('store-blr-koramangala');
  const [newGatewayRate, setNewGatewayRate] = useState(50);

  // LED Locate Animation Tracking
  const [blinkingTagIds, setBlinkingTagIds] = useState<Set<string>>(new Set());

  // Inspector Edit Form State
  const [inspectorSkuId, setInspectorSkuId] = useState<string>('');
  const [inspectorSize, setInspectorSize] = useState<string>('T290');
  const [inspectorPriceRupees, setInspectorPriceRupees] = useState<string>('');
  const [inspectorMrpRupees, setInspectorMrpRupees] = useState<string>('');
  const [inspectorPromo, setInspectorPromo] = useState<string>('');

  // Auto-BOM Calculator State (SOW Section 5 Formula)
  const [bomArea, setBomArea] = useState<number>(14850);
  const [bomLabels, setBomLabels] = useState<number>(18000);
  const [bomCoverage, setBomCoverage] = useState<number>(2500);
  const [bomCapacity, setBomCapacity] = useState<number>(3000);

  // Incident Grouping State (SOW ALR-01)
  const [incidentDismissed, setIncidentDismissed] = useState(false);

  // Fetch Core Data
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
    const interval = setInterval(fetchData, 1500);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab]);

  // Load Detailed Tag for Inspector Drawer
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

  const showToast = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 4500);
  };

  const formatRupees = (minorUnits: number) => (minorUnits / 100).toFixed(2);

  // Auto-BOM Formula Calculation (SOW §5)
  // N_gateways = max( ceil(A / a), ceil(L / (0.7 * C)) )
  const calculatedBOM = useMemo(() => {
    const areaGws = Math.ceil(bomArea / bomCoverage);
    const capacityGws = Math.ceil(bomLabels / (0.7 * bomCapacity));
    const baseGws = Math.max(areaGws, capacityGws);
    const extraFailover = bomLabels > 1500 ? 1 : 0;
    const totalGws = baseGws + extraFailover;
    const spares = Math.ceil(bomLabels * 0.03); // 3% spares recommendation

    return {
      areaGws,
      capacityGws,
      baseGws,
      extraFailover,
      totalGws,
      spares,
      mix: {
        T154: Math.round(bomLabels * 0.15),
        T213: Math.round(bomLabels * 0.35),
        T290: Math.round(bomLabels * 0.30),
        T420: Math.round(bomLabels * 0.12),
        T750: Math.round(bomLabels * 0.05),
        T1020: Math.max(0, bomLabels - Math.round(bomLabels * 0.97)),
      },
    };
  }, [bomArea, bomLabels, bomCoverage, bomCapacity]);

  // Filtered tags computation
  const filteredTags = useMemo(() => {
    return tags.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchHw = t.hardwareId.toLowerCase().includes(q);
        const matchSku = t.sku?.code.toLowerCase().includes(q);
        const matchName = t.sku?.name.toLowerCase().includes(q);
        if (!matchHw && !matchSku && !matchName) return false;
      }
      if (selectedStoreFilter !== 'ALL' && t.storeName !== selectedStoreFilter) return false;
      if (filterGateway !== 'ALL' && t.gatewayHardwareId !== filterGateway) return false;
      if (filterStatus === 'DIVERGED' && !t.isDiverged) return false;
      if (filterStatus === 'CONVERGED' && t.isDiverged) return false;
      if (filterStatus === 'LOW_BATTERY' && t.batteryPct >= 20) return false;
      if (filterSize !== 'ALL' && t.size !== filterSize) return false;
      return true;
    });
  }, [tags, searchQuery, selectedStoreFilter, filterGateway, filterStatus, filterSize]);

  // Actions
  const handleTriggerFlashSale = async (discountPct: number) => {
    showToast(`⚡ Broadcasting ${discountPct}% Flash Sale across fleet...`);
    try {
      const res = await fetch(`${API_BASE}/api/pos/flash-sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountPct }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🚀 Dispatched ${discountPct}% flash discount. Sync-Engine radio pacing active.`);
        fetchData();
      }
    } catch {
      showToast('❌ Failed to trigger flash sale');
    }
  };

  const handleResetPrices = async () => {
    showToast('Resetting fleet prices to standard MRP...');
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
    showToast(`Dispatching wire sync_request to AP ${hwId}...`);
    try {
      const res = await fetch(`${API_BASE}/api/gateways/${gatewayId}/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`📡 Dispatched inventory audit sync_request to ${hwId}.`);
        fetchData();
      }
    } catch {
      showToast(`❌ Failed to sync ${hwId}`);
    }
  };

  const handleSaveTagInspector = async () => {
    if (!tagDetail) return;
    showToast(`Updating label ${tagDetail.hardwareId}...`);

    try {
      const tagRes = await fetch(`${API_BASE}/api/tags/${tagDetail.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skuId: inspectorSkuId || null,
          size: inspectorSize,
        }),
      });

      if (inspectorSkuId && tagDetail.sku) {
        const priceMinor = Math.round(parseFloat(inspectorPriceRupees) * 100);
        const mrpMinor = Math.round(parseFloat(inspectorMrpRupees) * 100);

        if (!isNaN(priceMinor) && priceMinor > 0) {
          // PRC-04 Guardrail Check
          if (priceMinor > mrpMinor) {
            showToast(`⚠️ Guardrail Violation (PRC-04): Selling price cannot exceed MRP.`);
            return;
          }

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
        showToast(`✅ Successfully updated ${tagDetail.hardwareId}! Radio divergence loop triggered.`);
        fetchData();
        setInspectTagId(tagDetail.id);
      }
    } catch {
      showToast('❌ Failed to update tag details');
    }
  };

  const handleLocateTag = async (tagHardwareId: string, gatewayHwId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      showToast(`📍 Blinking LED on Tag ${tagHardwareId} (10s pulse) via AP ${gatewayHwId}...`);
      setBlinkingTagIds((prev) => new Set(prev).add(tagHardwareId));
      await fetch(`${API_BASE}/api/tags/${tagHardwareId}/locate`, { method: 'POST' });
      setTimeout(() => {
        setBlinkingTagIds((prev) => {
          const next = new Set(prev);
          next.delete(tagHardwareId);
          return next;
        });
      }, 10000);
    } catch {
      showToast(`⚠️ Tag ${tagHardwareId} locate command queued.`);
    }
  };

  const handleOpenQuickPriceModal = (tag: TagItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setQuickPriceTag(tag);
    setQuickPriceRupees(tag.sku ? (tag.sku.priceMinor / 100).toFixed(2) : '');
    setQuickMrpRupees(tag.sku ? (tag.sku.mrpMinor / 100).toFixed(2) : '');
    setQuickPromoBadge(tag.sku?.promoBadge || '');
  };

  const handleSaveQuickPrice = async () => {
    if (!quickPriceTag) return;
    const price = parseFloat(quickPriceRupees);
    const mrp = parseFloat(quickMrpRupees);

    if (isNaN(price) || price < 0) {
      showToast('⚠️ Please enter a valid price.');
      return;
    }

    if (!isNaN(mrp) && price > mrp) {
      showToast(`❌ Guardrail Violation (PRC-04): Selling price (₹${price.toFixed(2)}) cannot exceed MRP (₹${mrp.toFixed(2)}).`);
      return;
    }

    const priceMinor = Math.round(price * 100);
    const mrpMinor = !isNaN(mrp) ? Math.round(mrp * 100) : undefined;

    try {
      const res = await fetch(`${API_BASE}/api/tags/${quickPriceTag.id}/quick-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceMinor,
          mrpMinor,
          promoBadge: quickPromoBadge.trim() ? quickPromoBadge.trim() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(`❌ ${data.error || 'Failed to update price'}`);
        return;
      }

      showToast(`⚡ Price for ${quickPriceTag.hardwareId} updated to ₹${price.toFixed(2)}! Dispatched to AP.`);
      setQuickPriceTag(null);
      fetchData();
    } catch {
      showToast('❌ Failed to update price.');
    }
  };

  const handleAddGateway = async () => {
    if (!newGatewayHwId.trim()) {
      showToast('⚠️ Please enter an Access Point Hardware ID (e.g. gw-blr-02).');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/gateways`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hardwareId: newGatewayHwId.trim(),
          storeId: newGatewayStoreId,
          maxTagsPerSec: newGatewayRate,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(`❌ ${data.error || 'Failed to add gateway'}`);
        return;
      }

      showToast(`✅ Access Point ${newGatewayHwId.trim()} provisioned & online!`);
      setShowAddGatewayModal(false);
      setNewGatewayHwId('');
      fetchData();
    } catch {
      showToast('❌ Failed to provision gateway.');
    }
  };

  const handleUpdateGatewayRate = async (gatewayId: string, maxTagsPerSec: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/gateways/${gatewayId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxTagsPerSec }),
      });
      if (res.ok) {
        showToast(`⚡ AP rate limit updated to ${maxTagsPerSec} tags/sec.`);
        setGateways((prev) =>
          prev.map((g) => (g.id === gatewayId ? { ...g, maxTagsPerSec } : g))
        );
      }
    } catch {
      showToast('❌ Failed to update AP rate limit.');
    }
  };

  // Theme-aware color palette
  const isDark = theme === 'dark';
  const c = {
    bg: isDark ? '#090d16' : '#faf8ff',
    surface: isDark ? '#0f172a' : '#ffffff',
    surfaceSubtle: isDark ? '#1e293b' : '#f1f5f9',
    border: isDark ? '#1e293b' : '#e2e8f0',
    borderStrong: isDark ? '#334155' : '#cbd5e1',
    text: isDark ? '#f8fafc' : '#131b2e',
    textMuted: isDark ? '#94a3b8' : '#434655',
    primary: '#004ac6',
    primaryHover: '#2563eb',
    accentViolet: '#6366f1',
    success: '#059669',
    warning: '#d97706',
    error: '#ba1a1a',
  };

  return (
    <div
      style={{
        backgroundColor: c.bg,
        color: c.text,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'row',
        transition: 'background-color 0.2s ease, color 0.2s ease',
      }}
    >
      {/* =========================================================================
          LEFT SIDEBAR: STITCH NAVIGATION BAR
      ========================================================================== */}
      <aside
        style={{
          width: '280px',
          backgroundColor: c.surface,
          borderRight: `1px solid ${c.border}`,
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Logo & Operations Hub Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                backgroundColor: c.primary,
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '18px',
                padding: '6px 12px',
                borderRadius: '8px',
                letterSpacing: '-0.5px',
                boxShadow: '0 2px 8px rgba(0, 74, 198, 0.35)',
              }}
            >
              QS
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.5px', color: c.text }}>
                Quickshelf
              </div>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  backgroundColor: isDark ? '#1e293b' : '#dbe1ff',
                  color: isDark ? '#93c5fd' : '#00174b',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  display: 'inline-block',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Operations Hub
              </div>
            </div>
          </div>

          {/* Fleet Health Quick Widget */}
          <div
            style={{
              backgroundColor: c.surfaceSubtle,
              border: `1px solid ${c.border}`,
              borderRadius: '10px',
              padding: '12px 14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: c.textMuted, fontWeight: 700 }}>
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fleet Health Status</span>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.success }}></span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: c.success, marginTop: '4px' }}>
              {fleet ? `${fleet.convergencePct.toFixed(1)}%` : '99.8%'}
            </div>
            <div style={{ fontSize: '11px', color: c.textMuted, marginTop: '2px', display: 'flex', gap: '6px' }}>
              <span>{fleet ? fleet.totalTags : '2,500'} Labels</span>
              <span>•</span>
              <span style={{ color: fleet && fleet.divergedTags > 0 ? c.warning : c.success, fontWeight: 700 }}>
                {fleet ? fleet.divergedTags : 0} Diverged
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              { id: 'fleet', label: 'Labels & Live Updates', icon: Activity, badge: fleet && fleet.divergedTags > 0 ? `${fleet.divergedTags} Out of Sync` : 'All Synced', badgeColor: fleet && fleet.divergedTags > 0 ? c.warning : c.success },
              { id: 'gateways', label: 'Access Points (APs)', icon: Radio, badge: `${gateways.length} Online`, badgeColor: c.primaryHover },
              { id: 'pricing', label: 'Dynamic Pricing & SKUs', icon: DollarSign, badge: 'Guardrails' },
              { id: 'audit', label: 'Audit & Diagnostics', icon: FileText, badge: '7 Problems' },
              { id: 'onboarding', label: 'Store Onboarding', icon: Building2, badge: 'Coming Soon', badgeColor: '#eab308' },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isActive ? (isDark ? '#1e293b' : '#2563eb') : 'transparent',
                    color: isActive ? '#ffffff' : c.textMuted,
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={16} color={isActive ? '#60a5fa' : c.textMuted} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      style={{
                        backgroundColor: isActive ? (isDark ? '#0f172a' : '#003ea8') : c.surfaceSubtle,
                        color: item.badgeColor ? item.badgeColor : (isActive ? '#ffffff' : c.textMuted),
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '10px',
                        border: `1px solid ${c.border}`,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom RF Channel Telemetry */}
        <div
          style={{
            backgroundColor: c.surfaceSubtle,
            border: `1px solid ${c.border}`,
            borderRadius: '10px',
            padding: '12px',
            fontSize: '11px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: c.textMuted, fontWeight: 600 }}>
            <span>Mesh RF Channels</span>
            <span style={{ color: c.accentViolet, fontWeight: 700 }}>CH 11, 26</span>
          </div>
          <div style={{ width: '100%', height: '5px', backgroundColor: isDark ? '#334155' : '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: '84%', height: '100%', backgroundColor: c.accentViolet }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: c.textMuted, fontSize: '10px', fontFamily: 'monospace' }}>
            <span>Gateway Hub v4.19</span>
            <span style={{ color: c.success, fontWeight: 700 }}>CONNECTED</span>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          MAIN WORKSPACE CONTENT AREA
      ========================================================================== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
        {/* Top Header Bar */}
        <header
          style={{
            backgroundColor: c.surface,
            borderBottom: `1px solid ${c.border}`,
            padding: '12px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          {/* Organization & Store Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: c.surfaceSubtle, padding: '6px 12px', borderRadius: '8px', border: `1px solid ${c.border}`, fontSize: '12px' }}>
              <span style={{ color: c.textMuted }}>Retailer:</span>
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: c.text, fontWeight: 700, cursor: 'pointer' }}
              >
                <option value="Acme Retail Chain">Acme Retail Chain (28 Stores)</option>
                <option value="More Supermarkets">More Supermarkets (14 Stores)</option>
                <option value="Apollo Pharmacy">Apollo Pharmacy (45 Stores)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: c.surfaceSubtle, padding: '6px 12px', borderRadius: '8px', border: `1px solid ${c.border}`, fontSize: '12px' }}>
              <Store size={14} color={c.primaryHover} />
              <select
                value={selectedStoreFilter}
                onChange={(e) => setSelectedStoreFilter(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: c.primaryHover, fontWeight: 700, cursor: 'pointer' }}
              >
                <option value="ALL">All Network Stores</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.city})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cloud Broker Badge & Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Azure Broker Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: c.surfaceSubtle,
                border: `1px solid ${c.border}`,
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: c.textMuted,
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: c.success }}></span>
              <span>Azure Central India (Pune) • 0.9s latency</span>
            </div>

            {/* Theme Toggle (Stitch Light vs NOC Dark) */}
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              style={{
                background: c.surfaceSubtle,
                border: `1px solid ${c.border}`,
                color: c.text,
                padding: '7px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={isDark ? 'Switch to Stitch Light Theme' : 'Switch to NOC Dark Theme'}
            >
              {isDark ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#6366f1" />}
            </button>

            {/* Live Refresh Button */}
            <button
              onClick={fetchData}
              style={{
                background: c.surfaceSubtle,
                border: `1px solid ${c.border}`,
                color: c.text,
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RefreshCw size={13} /> Refresh
            </button>

            {/* User Profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px' }}>
              <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: c.text }}>Sumit Sharma</div>
                <div style={{ fontSize: '10px', color: c.primaryHover, fontWeight: 600 }}>Quickshelf Super Admin</div>
              </div>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: c.primary,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '12px',
                }}
              >
                SS
              </div>
            </div>
          </div>
        </header>

        {/* Global Action Toast Notification */}
        {actionMessage && (
          <div
            style={{
              margin: '16px 28px 0',
              padding: '10px 18px',
              backgroundColor: '#1e3a8a',
              color: '#93c5fd',
              borderRadius: '8px',
              border: '1px solid #3b82f6',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 12px rgba(30, 58, 138, 0.4)',
            }}
          >
            <Zap size={16} color="#60a5fa" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Workspace Body */}
        <main style={{ padding: '24px 28px', flex: 1, display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* =========================================================================
              MODULE 1: FLEET HEALTH & INCIDENT COMMAND (SOW HLT-01, ALR-01)
          ========================================================================== */}
          {activeTab === 'fleet' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Top 5 KPI Summary Strip (from Stitch) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                {/* Active Stores */}
                <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: c.textMuted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <span>Active Stores</span>
                    <Store size={15} color={c.primaryHover} />
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '6px', color: c.text }}>
                    {stores.length || 28} <span style={{ fontSize: '13px', color: c.textMuted, fontWeight: 500 }}>/ 30 network</span>
                  </div>
                  <div style={{ fontSize: '11px', color: c.success, marginTop: '4px', fontWeight: 600 }}>
                    ● 2 Stores in Onboarding
                  </div>
                </div>

                {/* ESL Fleet Seen < 24h */}
                <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: c.textMuted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <span>ESL Fleet Seen &lt;24h</span>
                    <TagIcon size={15} color={c.success} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '6px' }}>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: c.text }}>
                      {fleet ? `${fleet.convergencePct.toFixed(1)}%` : '99.5%'}
                    </div>
                    {/* SVG Sparkline */}
                    <svg width="60" height="24" viewBox="0 0 60 24" style={{ overflow: 'visible' }}>
                      <path d="M0 20 L10 16 L20 22 L30 10 L40 12 L50 4 L60 6" fill="none" stroke={c.success} strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div style={{ fontSize: '11px', color: c.textMuted, marginTop: '4px' }}>
                    {fleet ? fleet.totalTags : '72,480'} online • 0 packet drops
                  </div>
                </div>

                {/* Sub-GHz Ceiling APs */}
                <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: c.textMuted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <span>Sub-GHz Gateways</span>
                    <Radio size={15} color={c.accentViolet} />
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '6px', color: c.text }}>
                    {gateways.length || 88} <span style={{ fontSize: '13px', color: c.textMuted, fontWeight: 500 }}>/ 90 APs</span>
                  </div>
                  <div style={{ fontSize: '11px', color: c.accentViolet, marginTop: '4px', fontWeight: 600 }}>
                    Avg Ping: 34ms • Token Bucket Active
                  </div>
                </div>

                {/* POS Price Integrity */}
                <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: c.textMuted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <span>POS Price Integrity</span>
                    <ShieldCheck size={15} color={c.success} />
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '6px', color: c.text }}>
                    99.94%
                  </div>
                  <div style={{ fontSize: '11px', color: c.textMuted, marginTop: '4px' }}>
                    Daily integrity check: 05:00 IST • 0 drift
                  </div>
                </div>

                {/* Active Incidents */}
                <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: c.textMuted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <span>Active Incidents</span>
                    <AlertCircle size={15} color={c.error} />
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '6px', color: c.error }}>
                    1 <span style={{ fontSize: '13px', color: c.textMuted, fontWeight: 500 }}>Critical Rollup</span>
                  </div>
                  <div style={{ fontSize: '11px', color: c.textMuted, marginTop: '4px' }}>
                    MTTR: 8m 40s • SLA 99.9% Met
                  </div>
                </div>
              </div>

              {/* SOW ALR-01: Incident Grouping Banner (Alert Fatigue Elimination) */}
              {!incidentDismissed && (
                <div
                  style={{
                    backgroundColor: isDark ? 'rgba(186, 26, 26, 0.12)' : '#fef2f2',
                    border: '1px solid #fca5a5',
                    borderLeft: '5px solid #dc2626',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ backgroundColor: '#dc2626', color: '#ffffff', padding: '6px', borderRadius: '8px' }}>
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ backgroundColor: '#dc2626', color: '#ffffff', fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                          P1 Critical Rollup
                        </span>
                        <span style={{ fontWeight: 800, fontSize: '14px', color: isDark ? '#fca5a5' : '#991b1b' }}>
                          Store #104 (Andheri West MegaMart)
                        </span>
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: '12px', color: isDark ? '#f87171' : '#7f1d1d' }}>
                        Probable root cause: <strong>Gateway GW-09 power interruption</strong>. 142 ESLs unreachable in Aisle 4B. Grouped to eliminate alert fatigue (SOW ALR-01).
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => {
                        showToast('Rebooting Gateway GW-09 remotely over MQTT...');
                        setIncidentDismissed(true);
                      }}
                      style={{
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Reboot Gateway GW-09
                    </button>
                    <button
                      onClick={() => setIncidentDismissed(true)}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #fca5a5',
                        color: isDark ? '#fca5a5' : '#991b1b',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              )}

              {/* Filter Toolbar & View Switcher */}
              <div
                style={{
                  backgroundColor: c.surface,
                  border: `1px solid ${c.border}`,
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                {/* Search Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 260px' }}>
                  <Search size={15} color={c.textMuted} />
                  <input
                    type="text"
                    placeholder="Search serial, MAC, SKU, product name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      backgroundColor: c.surfaceSubtle,
                      border: `1px solid ${c.border}`,
                      color: c.text,
                      fontSize: '12px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      width: '100%',
                    }}
                  />
                </div>

                {/* Filter Selectors */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <select
                    value={filterGateway}
                    onChange={(e) => setFilterGateway(e.target.value)}
                    style={{ backgroundColor: c.surfaceSubtle, color: c.text, border: `1px solid ${c.border}`, borderRadius: '6px', padding: '5px 8px', fontSize: '11px' }}
                  >
                    <option value="ALL">All Gateways</option>
                    {gateways.map((gw) => (
                      <option key={gw.id} value={gw.hardwareId}>{gw.hardwareId}</option>
                    ))}
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    style={{ backgroundColor: c.surfaceSubtle, color: c.text, border: `1px solid ${c.border}`, borderRadius: '6px', padding: '5px 8px', fontSize: '11px' }}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="DIVERGED">Syncing (Diverged)</option>
                    <option value="CONVERGED">In Sync (Converged)</option>
                    <option value="LOW_BATTERY">Low Battery (&lt;20%)</option>
                  </select>

                  <select
                    value={filterSize}
                    onChange={(e) => setFilterSize(e.target.value)}
                    style={{ backgroundColor: c.surfaceSubtle, color: c.text, border: `1px solid ${c.border}`, borderRadius: '6px', padding: '5px 8px', fontSize: '11px' }}
                  >
                    <option value="ALL">All Display Sizes</option>
                    <option value="T154">1.54" (T154)</option>
                    <option value="T213">2.13" (T213)</option>
                    <option value="T290">2.90" (T290)</option>
                    <option value="T420">4.20" (T420)</option>
                    <option value="T750">7.50" (T750)</option>
                    <option value="T1020">10.2" (T1020)</option>
                  </select>

                  {/* Grid vs Table View Mode */}
                  <div style={{ display: 'flex', backgroundColor: c.surfaceSubtle, borderRadius: '6px', border: `1px solid ${c.border}`, overflow: 'hidden' }}>
                    <button
                      onClick={() => setViewMode('grid')}
                      style={{
                        padding: '5px 8px',
                        border: 'none',
                        backgroundColor: viewMode === 'grid' ? c.primaryHover : 'transparent',
                        color: viewMode === 'grid' ? '#ffffff' : c.textMuted,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                      }}
                    >
                      <Grid size={13} /> E-Ink
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      style={{
                        padding: '5px 8px',
                        border: 'none',
                        backgroundColor: viewMode === 'table' ? c.primaryHover : 'transparent',
                        color: viewMode === 'table' ? '#ffffff' : c.textMuted,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                      }}
                    >
                      <List size={13} /> Grid
                    </button>
                  </div>

                  <button
                    onClick={() => setShowAddTagModal(true)}
                    style={{
                      backgroundColor: c.primary,
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={13} /> Provision Tag
                  </button>
                </div>
              </div>

              {/* View 1: Authentic 3-Color E-Ink Grid */}
              {viewMode === 'grid' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {filteredTags.map((tag) => {
                    const sku = tag.sku;
                    return (
                      <div
                        key={tag.id}
                        onClick={() => setInspectTagId(tag.id)}
                        className={`${tag.isDiverged ? 'anim-diverged-pulse' : ''} ${blinkingTagIds.has(tag.hardwareId) ? 'anim-blinking-tag' : ''}`}
                        style={{
                          backgroundColor: '#fdfbf7', // Authentic e-paper reflection
                          color: '#111827',
                          borderRadius: '10px',
                          padding: '14px',
                          border: tag.isDiverged ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '220px',
                          transition: 'transform 0.15s ease',
                        }}
                      >
                        <div>
                          {/* Hardware Header Strip */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '6px', fontSize: '11px', fontWeight: 800, color: '#475569', fontFamily: 'monospace' }}>
                            <span>{tag.hardwareId} • {tag.size}</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <span style={{ color: tag.batteryPct < 20 ? '#dc2626' : '#16a34a' }}>🔋 {tag.batteryPct}%</span>
                              <span style={{ color: '#6366f1' }}>📶 {tag.rssi}dBm</span>
                            </div>
                          </div>

                          {/* Promo Badge */}
                          {sku?.promoBadge ? (
                            <div style={{ backgroundColor: '#111827', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', display: 'inline-block', marginTop: '8px' }}>
                              {sku.promoBadge}
                            </div>
                          ) : (
                            <div style={{ height: '18px' }}></div>
                          )}

                          {/* Product Name */}
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '4px 0 6px', lineHeight: 1.25 }}>
                            {sku ? sku.name : <span style={{ color: '#94a3b8' }}>Unpaired ESL Label</span>}
                          </div>

                          {/* Price & MRP */}
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
                                <span style={{ backgroundColor: '#fef08a', color: '#854d0e', padding: '1px 5px', borderRadius: '3px', fontSize: '10px', fontWeight: 800 }}>
                                  {Math.round(((sku.mrpMinor - sku.priceMinor) / sku.mrpMinor) * 100)}% OFF
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#64748b' }}>Click to pair product</span>
                          )}
                        </div>

                        {/* Simulated E-Ink Barcode Strip */}
                        <div style={{ marginTop: '10px' }}>
                          <div
                            style={{
                              height: '12px',
                              background: 'repeating-linear-gradient(90deg, #1e293b 0px, #1e293b 2px, transparent 2px, transparent 4px, #1e293b 4px, #1e293b 7px, transparent 7px, transparent 8px)',
                              opacity: 0.5,
                              borderRadius: '2px',
                              marginBottom: '6px',
                            }}
                          ></div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: 600 }}>
                            <span style={{ color: '#64748b' }}>AP: {tag.gatewayHardwareId}</span>
                            {tag.isDiverged ? (
                              <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: '10px', fontWeight: 800 }}>
                                ⚡ Syncing v{tag.reportedVersion}→v{tag.desiredVersion}
                              </span>
                            ) : (
                              <span style={{ color: '#16a34a', fontWeight: 700 }}>
                                ✓ In Sync (v{tag.reportedVersion})
                              </span>
                            )}
                          </div>

                          {/* Quick Operational Actions Bar */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '6px',
                              marginTop: '8px',
                              borderTop: '1px dashed #cbd5e1',
                              paddingTop: '6px',
                            }}
                          >
                            <button
                              onClick={(e) => handleOpenQuickPriceModal(tag, e)}
                              style={{
                                flex: 1,
                                backgroundColor: '#0284c7',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '5px 6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                              }}
                            >
                              ⚡ Update Price
                            </button>
                            <button
                              onClick={(e) => handleLocateTag(tag.hardwareId, tag.gatewayHardwareId, e)}
                              style={{
                                flex: 1,
                                backgroundColor: blinkingTagIds.has(tag.hardwareId) ? '#f59e0b' : '#f1f5f9',
                                color: blinkingTagIds.has(tag.hardwareId) ? '#ffffff' : '#0f172a',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                padding: '5px 6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                              }}
                            >
                              {blinkingTagIds.has(tag.hardwareId) ? '✨ Blinking...' : '📍 Locate (10s)'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* View 2: High-Density Table View */
                <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '10px', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: c.surfaceSubtle, color: c.textMuted, borderBottom: `1px solid ${c.border}` }}>
                        <th style={{ padding: '10px 12px' }}>HARDWARE ID</th>
                        <th style={{ padding: '10px 12px' }}>PRODUCT SKU</th>
                        <th style={{ padding: '10px 12px' }}>STORE & AP</th>
                        <th style={{ padding: '10px 12px' }}>PRICE / MRP</th>
                        <th style={{ padding: '10px 12px' }}>BATTERY</th>
                        <th style={{ padding: '10px 12px' }}>SIGNAL (BLE)</th>
                        <th style={{ padding: '10px 12px' }}>VERSION</th>
                        <th style={{ padding: '10px 12px' }}>STATUS</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTags.map((tag) => (
                        <tr key={tag.id} style={{ borderBottom: `1px solid ${c.border}`, cursor: 'pointer' }} onClick={() => setInspectTagId(tag.id)}>
                          <td style={{ padding: '10px 12px', fontWeight: 700, fontFamily: 'monospace', color: c.text }}>
                            {tag.hardwareId} <span style={{ fontSize: '10px', color: c.textMuted }}>({tag.size})</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {tag.sku ? (
                              <div>
                                <span style={{ fontWeight: 600, color: c.text }}>{tag.sku.name}</span>
                                <div style={{ fontSize: '10px', color: c.textMuted, fontFamily: 'monospace' }}>{tag.sku.code}</div>
                              </div>
                            ) : (
                              <span style={{ color: c.textMuted, fontStyle: 'italic' }}>Unpaired</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', color: c.textMuted }}>
                            {tag.storeName} <span style={{ fontSize: '10px' }}>(AP: {tag.gatewayHardwareId})</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {tag.sku ? (
                              <span style={{ fontWeight: 800, color: c.success }}>
                                ₹{formatRupees(tag.sku.priceMinor)}
                              </span>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: tag.batteryPct < 20 ? c.error : c.success }}>
                            {tag.batteryPct}%
                          </td>
                          <td style={{ padding: '10px 12px', color: c.accentViolet, fontFamily: 'monospace' }}>
                            {tag.rssi} dBm
                          </td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>
                            v{tag.reportedVersion} / <span style={{ color: tag.isDiverged ? c.warning : c.success, fontWeight: 700 }}>v{tag.desiredVersion}</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {tag.isDiverged ? (
                              <span style={{ backgroundColor: 'rgba(217,119,6,0.15)', color: c.warning, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                                Syncing (+{tag.divergenceDelta})
                              </span>
                            ) : (
                              <span style={{ backgroundColor: 'rgba(5,150,105,0.15)', color: c.success, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                                In Sync
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={(e) => handleOpenQuickPriceModal(tag, e)}
                                style={{ backgroundColor: c.surfaceSubtle, color: c.primaryHover, border: `1px solid ${c.border}`, borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                              >
                                ⚡ Price
                              </button>
                              <button
                                onClick={(e) => handleLocateTag(tag.hardwareId, tag.gatewayHardwareId, e)}
                                style={{ backgroundColor: blinkingTagIds.has(tag.hardwareId) ? '#fef3c7' : c.surfaceSubtle, color: blinkingTagIds.has(tag.hardwareId) ? '#b45309' : c.text, border: `1px solid ${c.border}`, borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                              >
                                {blinkingTagIds.has(tag.hardwareId) ? '✨ Blinking' : '📍 Locate'}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setInspectTagId(tag.id); }}
                                style={{ backgroundColor: c.surfaceSubtle, color: c.textMuted, border: `1px solid ${c.border}`, borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Inspect
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              MODULE 2: STORE LIFECYCLE & ONBOARDING HUB (SOW §5, ONB-01, STR-03)
          ========================================================================== */}
          {activeTab === 'onboarding' && (
            <StoreOnboardingStudio theme={theme} apiBase={API_BASE} />
          )}

          {/* =========================================================================
              MODULE 3: PRICING & LIVE PUBLISH TRACKER (SOW §9, PRC-04, PRC-06)
          ========================================================================== */}
          {activeTab === 'pricing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: c.text }}>Dynamic Pricing & Live Publish Tracker</h2>
                  <p style={{ margin: '2px 0 0', color: c.textMuted, fontSize: '13px' }}>
                    Guardrail enforcement (selling price ≤ MRP), live broadcast tracker, and one-click rollback.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleTriggerFlashSale(15)}
                    style={{ backgroundColor: '#ea580c', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Flame size={14} /> Flash Sale (-15%)
                  </button>
                  <button
                    onClick={handleResetPrices}
                    style={{ backgroundColor: c.surfaceSubtle, color: c.text, border: `1px solid ${c.border}`, borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    ↺ Reset to MRP
                  </button>
                  <button
                    onClick={() => setShowAddSkuModal(true)}
                    style={{ backgroundColor: c.primary, color: '#ffffff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Add New SKU
                  </button>
                </div>
              </div>

              {/* SOW PRC-06: Live Publish Progress Tracker */}
              <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: c.text }}>Active Publish Batch: #PUB-2026-09</span>
                    <span style={{ fontSize: '11px', color: c.textMuted, marginLeft: '8px' }}>P95 Latency: 12.4s (Target: ≤30s P1)</span>
                  </div>
                  <button
                    onClick={handleResetPrices}
                    style={{ backgroundColor: isDark ? '#7f1d1d' : '#fef2f2', color: c.error, border: '1px solid #fca5a5', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    1-Click Rollback (PRC-07)
                  </button>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: c.surfaceSubtle, borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '99.8%', height: '100%', backgroundColor: c.success }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: c.textMuted, marginTop: '6px' }}>
                  <span>Targeted: 2,500</span>
                  <span>Dispatched: 2,500</span>
                  <span style={{ color: c.success, fontWeight: 700 }}>Acknowledged: 2,496 (99.8%)</span>
                  <span>Pending Radio: 4</span>
                </div>
              </div>

              {/* SKU Catalog Table */}
              <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '10px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: c.surfaceSubtle, color: c.textMuted, borderBottom: `1px solid ${c.border}` }}>
                      <th style={{ padding: '10px 12px' }}>SKU CODE</th>
                      <th style={{ padding: '10px 12px' }}>PRODUCT TITLE</th>
                      <th style={{ padding: '10px 12px' }}>PRICE (₹)</th>
                      <th style={{ padding: '10px 12px' }}>MRP (₹)</th>
                      <th style={{ padding: '10px 12px' }}>DISCOUNT</th>
                      <th style={{ padding: '10px 12px' }}>PROMO BADGE</th>
                      <th style={{ padding: '10px 12px' }}>LABELS</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skus.map((sku) => {
                      const discountPct = sku.mrpMinor > sku.priceMinor ? Math.round(((sku.mrpMinor - sku.priceMinor) / sku.mrpMinor) * 100) : 0;
                      return (
                        <tr key={sku.id} style={{ borderBottom: `1px solid ${c.border}` }}>
                          <td style={{ padding: '10px 12px', fontWeight: 700, fontFamily: 'monospace', color: c.primaryHover }}>{sku.code}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: c.text }}>{sku.name}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 800, color: c.success, fontSize: '14px' }}>₹{formatRupees(sku.priceMinor)}</td>
                          <td style={{ padding: '10px 12px', color: c.textMuted }}>₹{formatRupees(sku.mrpMinor)}</td>
                          <td style={{ padding: '10px 12px' }}>
                            {discountPct > 0 ? (
                              <span style={{ backgroundColor: 'rgba(217, 119, 6, 0.15)', color: c.warning, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                                {discountPct}% OFF
                              </span>
                            ) : (
                              <span style={{ color: c.textMuted }}>Standard</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {sku.promoBadge ? (
                              <span style={{ backgroundColor: c.surfaceSubtle, color: c.warning, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, border: `1px solid ${c.border}` }}>
                                {sku.promoBadge}
                              </span>
                            ) : (
                              <span style={{ color: c.textMuted }}>None</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: c.text }}>{sku.tagCount ?? 1}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <button
                              onClick={() => setShowEditSkuModal(sku)}
                              style={{ backgroundColor: c.surfaceSubtle, color: c.primaryHover, border: `1px solid ${c.border}`, borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Edit Price
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              MODULE 4: GATEWAYS & LABEL REGISTRY (SOW §6, GW-01, LBL-01)
          ========================================================================== */}
          {activeTab === 'gateways' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: c.text }}>Access Points (APs) & Radio Hardware</h2>
                  <p style={{ margin: '2px 0 0', color: c.textMuted, fontSize: '13px' }}>
                    Real-time gateway connectivity, transmission rate limit tuning, and WebSocket synchronization.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddGatewayModal(true)}
                  style={{
                    backgroundColor: c.primary,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Plus size={14} /> Provision New Access Point
                </button>
              </div>

              {/* Hardware State Machine Visualization (SOW §6) */}
              <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '16px' }}>
                <span style={{ fontSize: '11px', color: c.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Hardware Lifecycle States:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '8px', fontSize: '11px', fontWeight: 700 }}>
                  <span style={{ backgroundColor: c.surfaceSubtle, padding: '3px 8px', borderRadius: '4px' }}>1. In Stock</span>
                  <ArrowRight size={12} color={c.textMuted} />
                  <span style={{ backgroundColor: c.surfaceSubtle, padding: '3px 8px', borderRadius: '4px' }}>2. Allocated</span>
                  <ArrowRight size={12} color={c.textMuted} />
                  <span style={{ backgroundColor: c.surfaceSubtle, padding: '3px 8px', borderRadius: '4px' }}>3. Installed</span>
                  <ArrowRight size={12} color={c.textMuted} />
                  <span style={{ backgroundColor: 'rgba(5,150,105,0.2)', color: c.success, padding: '3px 8px', borderRadius: '4px' }}>4. Active (Bound)</span>
                  <ArrowRight size={12} color={c.textMuted} />
                  <span style={{ backgroundColor: 'rgba(217,119,6,0.2)', color: c.warning, padding: '3px 8px', borderRadius: '4px' }}>5. Faulty</span>
                  <ArrowRight size={12} color={c.textMuted} />
                  <span style={{ backgroundColor: 'rgba(186,26,26,0.2)', color: c.error, padding: '3px 8px', borderRadius: '4px' }}>6. In RMA</span>
                  <ArrowRight size={12} color={c.textMuted} />
                  <span style={{ backgroundColor: c.surfaceSubtle, color: c.textMuted, padding: '3px 8px', borderRadius: '4px' }}>7. Retired</span>
                </div>
              </div>

              {/* Gateways Table */}
              <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '10px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: c.surfaceSubtle, color: c.textMuted, borderBottom: `1px solid ${c.border}` }}>
                      <th style={{ padding: '10px 12px' }}>AP HARDWARE ID</th>
                      <th style={{ padding: '10px 12px' }}>STORE & RADIO CHANNEL</th>
                      <th style={{ padding: '10px 12px' }}>STATUS</th>
                      <th style={{ padding: '10px 12px' }}>FIRMWARE</th>
                      <th style={{ padding: '10px 12px' }}>CONNECTED LABELS</th>
                      <th style={{ padding: '10px 12px' }}>RATE LIMIT (TAGS/S)</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>OPERATIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gateways.map((gw) => (
                      <tr key={gw.id} style={{ borderBottom: `1px solid ${c.border}` }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, fontFamily: 'monospace', color: c.text }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Radio size={14} color={c.primaryHover} />
                            <span>{gw.hardwareId}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', color: c.textMuted }}>
                          <div>{gw.store.name}</div>
                          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: c.accentViolet }}>Sub-1 GHz Ch 4 (868.1 MHz)</span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ backgroundColor: gw.status === 'ONLINE' ? 'rgba(5,150,105,0.15)' : 'rgba(186,26,26,0.15)', color: gw.status === 'ONLINE' ? c.success : c.error, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                            ● {gw.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: c.textMuted }}>{gw.firmware}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: c.text }}>
                          <span>{gw.tagCount} tags</span>
                          {gw.divergedCount > 0 && (
                            <span style={{ fontSize: '10px', color: c.warning, marginLeft: '6px' }}>({gw.divergedCount} pending)</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="range"
                              min={10}
                              max={100}
                              step={5}
                              value={gw.maxTagsPerSec}
                              onChange={(e) => handleUpdateGatewayRate(gw.id, parseInt(e.target.value))}
                              style={{ width: '90px', cursor: 'pointer' }}
                            />
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: c.text, fontSize: '11px', minWidth: '60px' }}>
                              {gw.maxTagsPerSec} tags/s
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleForceGatewaySync(gw.id, gw.hardwareId)}
                            style={{ backgroundColor: c.surfaceSubtle, color: c.primaryHover, border: `1px solid ${c.border}`, borderRadius: '4px', padding: '5px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Force Sync Audit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              MODULE 5: AUDIT & DIAGNOSTICS (SOW §8, LOG-01, CERT-In)
          ========================================================================== */}
          {activeTab === 'audit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: c.text }}>Audit, Diagnostics & Security Compliance</h2>
                  <p style={{ margin: '2px 0 0', color: c.textMuted, fontSize: '13px' }}>
                    CERT-In 180-day compliance rolling ledger, NTP clock verification, and 7 Hard Problems chaos diagnostics.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: c.surfaceSubtle, padding: '4px 10px', borderRadius: '6px', border: `1px solid ${c.border}`, fontSize: '11px', fontFamily: 'monospace' }}>
                  <Lock size={12} color={c.success} />
                  <span>NTP Clocks: NIC/NPL Synced (UTC+0)</span>
                </div>
              </div>

              {/* Chaos Lab Benchmark Actions */}
              <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '16px' }}>
                <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700, color: c.text }}>
                  7 Hard Distributed Problems Diagnostic Triggers:
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                  <button
                    onClick={async () => {
                      showToast('Running Hard Problem 2: Rapid Burst Collapse Test...');
                      await fetch(`${API_BASE}/api/chaos/burst-collapse-test`, { method: 'POST' });
                      fetchData();
                    }}
                    style={{ backgroundColor: isDark ? '#4c1d95' : '#ede9fe', color: isDark ? '#ddd6fe' : '#5b21b6', border: `1px solid ${c.border}`, borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}
                  >
                    ⚡ Test Burst & Collapse (HP 2)
                  </button>

                  <button
                    onClick={async () => {
                      showToast('Running Hard Problem 3: Battery-Aware Hash Skip...');
                      await fetch(`${API_BASE}/api/chaos/hash-skip-test`, { method: 'POST' });
                      fetchData();
                    }}
                    style={{ backgroundColor: isDark ? '#0369a1' : '#e0f2fe', color: isDark ? '#bae6fd' : '#0369a1', border: `1px solid ${c.border}`, borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}
                  >
                    🔋 Test Battery Hash Skip (HP 3)
                  </button>

                  <button
                    onClick={async () => {
                      showToast('Injecting 12% low battery safety NACK...');
                      await fetch(`${API_BASE}/api/chaos/inject-fault`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tagId: 'tag-001', faultType: 'LOW_BATTERY' }) });
                      fetchData();
                    }}
                    style={{ backgroundColor: isDark ? '#7f1d1d' : '#fee2e2', color: isDark ? '#fca5a5' : '#991b1b', border: `1px solid ${c.border}`, borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}
                  >
                    ⚠️ Test Low Battery Guard (HP 7)
                  </button>
                </div>
              </div>

              {/* Price Change Audit Ledger Table */}
              <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '10px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: c.surfaceSubtle, color: c.textMuted, borderBottom: `1px solid ${c.border}` }}>
                      <th style={{ padding: '10px 12px' }}>TIMESTAMP (UTC)</th>
                      <th style={{ padding: '10px 12px' }}>SKU CODE</th>
                      <th style={{ padding: '10px 12px' }}>PRODUCT TITLE</th>
                      <th style={{ padding: '10px 12px' }}>OLD PRICE</th>
                      <th style={{ padding: '10px 12px' }}>NEW PRICE</th>
                      <th style={{ padding: '10px 12px' }}>DELTA</th>
                      <th style={{ padding: '10px 12px' }}>SOURCE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: c.textMuted }}>
                          No audit entries recorded yet.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => {
                        const isDisc = log.deltaMinor < 0;
                        return (
                          <tr key={log.id} style={{ borderBottom: `1px solid ${c.border}` }}>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: c.textMuted }}>{new Date(log.createdAt).toISOString()}</td>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700, color: c.primaryHover }}>{log.skuCode}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: c.text }}>{log.skuName}</td>
                            <td style={{ padding: '10px 12px', color: c.textMuted }}>₹{formatRupees(log.oldPriceMinor)}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 800, color: c.text }}>₹{formatRupees(log.newPriceMinor)}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ backgroundColor: isDisc ? 'rgba(5,150,105,0.15)' : 'rgba(186,26,26,0.15)', color: isDisc ? c.success : c.error, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                                {isDisc ? '-' : '+'}₹{formatRupees(Math.abs(log.deltaMinor))}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: c.textMuted }}>{log.source.toUpperCase()}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =========================================================================
          SLIDE-OVER TAG INSPECTOR DRAWER (FROM STITCH)
      ========================================================================== */}
      {inspectTagId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
              backgroundColor: c.surface,
              borderLeft: `1px solid ${c.border}`,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              overflowY: 'auto',
              boxShadow: '-8px 0 24px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${c.border}`, paddingBottom: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, fontFamily: 'monospace', color: c.text }}>
                  {tagDetail ? tagDetail.hardwareId : 'Inspecting Label...'}
                </h2>
                <span style={{ fontSize: '12px', color: c.textMuted }}>
                  {tagDetail?.store.name} • AP: {tagDetail?.gateway.hardwareId}
                </span>
              </div>
              <button onClick={() => setInspectTagId(null)} style={{ background: 'transparent', border: 'none', color: c.textMuted, cursor: 'pointer', fontSize: '20px', fontWeight: 800 }}>
                &times;
              </button>
            </div>

            {tagDetailLoading || !tagDetail ? (
              <div style={{ textAlign: 'center', padding: '40px', color: c.textMuted }}>Loading telemetry...</div>
            ) : (
              <>
                {/* 1. E-Paper Display Preview */}
                <div style={{ backgroundColor: '#fdfbf7', color: '#111827', borderRadius: '10px', padding: '16px', border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800, color: '#475569', borderBottom: '1px dashed #cbd5e1', paddingBottom: '6px' }}>
                    <span>{tagDetail.hardwareId} ({tagDetail.size})</span>
                    <span>🔋 {tagDetail.batteryPct}% • 📶 {tagDetail.rssi} dBm</span>
                  </div>
                  {inspectorPromo ? (
                    <div style={{ backgroundColor: '#111827', color: '#ffffff', padding: '2px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 800, display: 'inline-block', marginTop: '6px' }}>
                      {inspectorPromo}
                    </div>
                  ) : <div style={{ height: '14px' }}></div>}
                  <div style={{ fontSize: '16px', fontWeight: 800, margin: '4px 0' }}>
                    {tagDetail.sku ? tagDetail.sku.name : 'Unpaired Tag'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 900 }}>₹{inspectorPriceRupees || '0.00'}</span>
                    {inspectorMrpRupees && parseFloat(inspectorMrpRupees) > parseFloat(inspectorPriceRupees || '0') && (
                      <span style={{ color: '#94a3b8', textDecoration: 'line-through', fontSize: '14px' }}>₹{inspectorMrpRupees}</span>
                    )}
                  </div>
                </div>

                {/* 2. State Configuration Diff (Cloud vs Hardware) */}
                <div style={{ backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, borderRadius: '10px', padding: '14px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: c.textMuted, textTransform: 'uppercase' }}>State Configuration Diff (SOW LBL-06):</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px', fontSize: '12px', fontFamily: 'monospace' }}>
                    <div style={{ backgroundColor: isDark ? '#090d16' : '#ffffff', border: `1px solid ${c.border}`, padding: '8px 10px', borderRadius: '6px' }}>
                      <div style={{ color: c.primaryHover, fontWeight: 700 }}>CLOUD DESIRED</div>
                      <div>Version: <strong>v{tagDetail.desiredVersion}</strong></div>
                      <div style={{ fontSize: '10px', color: c.textMuted, marginTop: '2px' }}>Hash: {tagDetail.desiredHash?.slice(0, 8)}...</div>
                    </div>
                    <div style={{ backgroundColor: isDark ? '#090d16' : '#ffffff', border: `1px solid ${c.border}`, padding: '8px 10px', borderRadius: '6px' }}>
                      <div style={{ color: tagDetail.isDiverged ? c.warning : c.success, fontWeight: 700 }}>HARDWARE REPORTED</div>
                      <div>Version: <strong>v{tagDetail.reportedVersion}</strong></div>
                      <div style={{ fontSize: '10px', color: c.textMuted, marginTop: '2px' }}>Acked via {tagDetail.gateway.hardwareId}</div>
                    </div>
                  </div>
                </div>

                {/* 3. Hardware Telemetry */}
                <div style={{ backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, borderRadius: '10px', padding: '14px', fontSize: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: c.textMuted, textTransform: 'uppercase' }}>Hardware & Radio Telemetry:</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                    <div>
                      <span style={{ color: c.textMuted }}>Battery Health:</span>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: tagDetail.batteryPct < 20 ? c.error : c.success, marginTop: '2px' }}>
                        {tagDetail.batteryPct}% (CR2450 Cell)
                      </div>
                    </div>
                    <div>
                      <span style={{ color: c.textMuted }}>2.4 GHz BLE Signal:</span>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: c.accentViolet, marginTop: '2px' }}>
                        {tagDetail.rssi} dBm (4/4 Bars)
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. SKU Re-binding & Commercial Editor */}
                <div style={{ backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, borderRadius: '10px', padding: '14px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: c.textMuted, textTransform: 'uppercase' }}>Re-Bind SKU & Edit Prices:</span>
                  <div>
                    <label style={{ display: 'block', color: c.textMuted, marginBottom: '2px' }}>Assigned Product SKU:</label>
                    <select
                      value={inspectorSkuId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setInspectorSkuId(id);
                        const s = skus.find((item) => item.id === id);
                        if (s) {
                          setInspectorPriceRupees((s.priceMinor / 100).toFixed(2));
                          setInspectorMrpRupees((s.mrpMinor / 100).toFixed(2));
                          setInspectorPromo(s.promoBadge ?? '');
                        }
                      }}
                      style={{ width: '100%', backgroundColor: c.surface, border: `1px solid ${c.border}`, color: c.text, padding: '6px', borderRadius: '6px' }}
                    >
                      <option value="">-- Unpair (No Product) --</option>
                      {skus.map((s) => (
                        <option key={s.id} value={s.id}>{s.code} - {s.name} (₹{(s.priceMinor / 100).toFixed(2)})</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', color: c.textMuted, marginBottom: '2px' }}>Price (₹):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={inspectorPriceRupees}
                        onChange={(e) => setInspectorPriceRupees(e.target.value)}
                        style={{ width: '100%', backgroundColor: c.surface, border: `1px solid ${c.border}`, color: c.text, padding: '6px', borderRadius: '6px', fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: c.textMuted, marginBottom: '2px' }}>MRP (₹):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={inspectorMrpRupees}
                        onChange={(e) => setInspectorMrpRupees(e.target.value)}
                        style={{ width: '100%', backgroundColor: c.surface, border: `1px solid ${c.border}`, color: c.text, padding: '6px', borderRadius: '6px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', color: c.textMuted, marginBottom: '2px' }}>Promo Badge:</label>
                    <input
                      type="text"
                      placeholder="e.g. Save 10%, Special Offer"
                      value={inspectorPromo}
                      onChange={(e) => setInspectorPromo(e.target.value)}
                      style={{ width: '100%', backgroundColor: c.surface, border: `1px solid ${c.border}`, color: c.text, padding: '6px', borderRadius: '6px' }}
                    />
                  </div>

                  <button
                    onClick={handleSaveTagInspector}
                    style={{ backgroundColor: c.primary, color: '#ffffff', border: 'none', borderRadius: '6px', padding: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginTop: '4px' }}
                  >
                    Save & Push Update to Shelf Tag
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS: ADD SKU & PROVISION TAG
      ========================================================================== */}
      {showAddSkuModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowAddSkuModal(false)}>
          <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 800, color: c.text }}>Provision Commercial SKU</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const code = (form.elements.namedItem('skuCode') as HTMLInputElement).value;
                const name = (form.elements.namedItem('skuName') as HTMLInputElement).value;
                const priceMinor = Math.round(parseFloat((form.elements.namedItem('priceRupees') as HTMLInputElement).value) * 100);
                const mrpMinor = Math.round(parseFloat((form.elements.namedItem('mrpRupees') as HTMLInputElement).value) * 100);
                const promo = (form.elements.namedItem('promo') as HTMLInputElement).value;

                // PRC-04 Guardrail
                if (priceMinor > mrpMinor) {
                  showToast('⚠️ Guardrail Violation (PRC-04): Selling price cannot exceed MRP.');
                  return;
                }

                try {
                  const res = await fetch(`${API_BASE}/api/skus`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      storeId: stores[0]?.id || 'store-blr-koramangala',
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
                  } else {
                    const err = await res.json();
                    showToast(`❌ ${err.error || 'Failed to create SKU'}`);
                  }
                } catch {
                  showToast('❌ Failed to create SKU');
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}
            >
              <div>
                <label style={{ display: 'block', color: c.textMuted, marginBottom: '2px' }}>SKU Code:</label>
                <input name="skuCode" type="text" required placeholder="e.g. CAD-SILK-200" style={{ width: '100%', backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, color: c.text, padding: '6px', borderRadius: '6px', fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={{ display: 'block', color: c.textMuted, marginBottom: '2px' }}>Product Title:</label>
                <input name="skuName" type="text" required placeholder="e.g. Cadbury Dairy Milk Silk 200g" style={{ width: '100%', backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, color: c.text, padding: '6px', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', color: c.textMuted, marginBottom: '2px' }}>Price (₹):</label>
                  <input name="priceRupees" type="number" step="0.01" required placeholder="199.00" style={{ width: '100%', backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, color: c.text, padding: '6px', borderRadius: '6px', fontWeight: 700 }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: c.textMuted, marginBottom: '2px' }}>MRP (₹):</label>
                  <input name="mrpRupees" type="number" step="0.01" required placeholder="220.00" style={{ width: '100%', backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, color: c.text, padding: '6px', borderRadius: '6px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', color: c.textMuted, marginBottom: '2px' }}>Promo Badge:</label>
                <input name="promo" type="text" placeholder="e.g. 10% OFF" style={{ width: '100%', backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, color: c.text, padding: '6px', borderRadius: '6px' }} />
              </div>
              <button type="submit" style={{ backgroundColor: c.primary, color: '#ffffff', border: 'none', borderRadius: '6px', padding: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginTop: '6px' }}>
                Create SKU
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit SKU Modal */}
      {showEditSkuModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowEditSkuModal(null)}>
          <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 800, color: c.text }}>Edit SKU: {showEditSkuModal.code}</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const name = (form.elements.namedItem('skuName') as HTMLInputElement).value;
                const priceMinor = Math.round(parseFloat((form.elements.namedItem('priceRupees') as HTMLInputElement).value) * 100);
                const mrpMinor = Math.round(parseFloat((form.elements.namedItem('mrpRupees') as HTMLInputElement).value) * 100);
                const promo = (form.elements.namedItem('promo') as HTMLInputElement).value;

                // PRC-04 Guardrail
                if (priceMinor > mrpMinor) {
                  showToast('⚠️ Guardrail Violation (PRC-04): Selling price cannot exceed MRP.');
                  return;
                }

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
                  } else {
                    const err = await res.json();
                    showToast(`❌ ${err.error || 'Failed to update SKU'}`);
                  }
                } catch {
                  showToast('❌ Failed to update SKU');
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}
            >
              <div>
                <label style={{ display: 'block', color: c.textMuted, marginBottom: '2px' }}>Product Title:</label>
                <input name="skuName" type="text" defaultValue={showEditSkuModal.name} required style={{ width: '100%', backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, color: c.text, padding: '6px', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', color: c.textMuted, marginBottom: '2px' }}>Price (₹):</label>
                  <input name="priceRupees" type="number" step="0.01" defaultValue={(showEditSkuModal.priceMinor / 100).toFixed(2)} required style={{ width: '100%', backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, color: c.text, padding: '6px', borderRadius: '6px', fontWeight: 700 }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: c.textMuted, marginBottom: '2px' }}>MRP (₹):</label>
                  <input name="mrpRupees" type="number" step="0.01" defaultValue={(showEditSkuModal.mrpMinor / 100).toFixed(2)} required style={{ width: '100%', backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, color: c.text, padding: '6px', borderRadius: '6px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', color: c.textMuted, marginBottom: '2px' }}>Promo Badge:</label>
                <input name="promo" type="text" defaultValue={showEditSkuModal.promoBadge ?? ''} style={{ width: '100%', backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, color: c.text, padding: '6px', borderRadius: '6px' }} />
              </div>
              <button type="submit" style={{ backgroundColor: c.primary, color: '#ffffff', border: 'none', borderRadius: '6px', padding: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginTop: '6px' }}>
                Save & Broadcast Update
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Provision Tag Modal */}
      {showAddTagModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowAddTagModal(false)}>
          <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 800, color: c.text }}>Provision ESL Label</h3>
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
              style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}
            >
              <div>
                <label style={{ display: 'block', color: c.textMuted, marginBottom: '2px' }}>Hardware ID:</label>
                <input name="hwId" type="text" required placeholder="e.g. tag-006" style={{ width: '100%', backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, color: c.text, padding: '6px', borderRadius: '6px', fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={{ display: 'block', color: c.textMuted, marginBottom: '2px' }}>Retail Store:</label>
                <select name="storeId" required style={{ width: '100%', backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, color: c.text, padding: '6px', borderRadius: '6px' }}>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: c.textMuted, marginBottom: '2px' }}>Ceiling Access Point:</label>
                <select name="gatewayId" required style={{ width: '100%', backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, color: c.text, padding: '6px', borderRadius: '6px' }}>
                  {gateways.map((gw) => (
                    <option key={gw.id} value={gw.id}>{gw.hardwareId}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: c.textMuted, marginBottom: '2px' }}>Display Size:</label>
                <select name="size" defaultValue="T290" style={{ width: '100%', backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, color: c.text, padding: '6px', borderRadius: '6px' }}>
                  <option value="T154">1.54" (T154)</option>
                  <option value="T213">2.13" (T213)</option>
                  <option value="T290">2.90" (T290)</option>
                  <option value="T420">4.20" (T420)</option>
                  <option value="T750">7.50" (T750)</option>
                  <option value="T1020">10.2" (T1020)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: c.textMuted, marginBottom: '2px' }}>Initial SKU Binding (Optional):</label>
                <select name="skuId" style={{ width: '100%', backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, color: c.text, padding: '6px', borderRadius: '6px' }}>
                  <option value="">-- No initial SKU (Leave Unpaired) --</option>
                  {skus.map((s) => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" style={{ backgroundColor: c.primary, color: '#ffffff', border: 'none', borderRadius: '6px', padding: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginTop: '6px' }}>
                Provision Tag
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Quick Price Update Modal for a Label */}
      {quickPriceTag && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setQuickPriceTag(null)}
        >
          <div
            style={{
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: '12px',
              padding: '22px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: `1px solid ${c.border}`, paddingBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: c.text }}>
                  ⚡ Quick Price Update
                </h3>
                <span style={{ fontSize: '11px', color: c.textMuted, fontFamily: 'monospace' }}>
                  Label {quickPriceTag.hardwareId} • AP: {quickPriceTag.gatewayHardwareId}
                </span>
              </div>
              <button onClick={() => setQuickPriceTag(null)} style={{ background: 'transparent', border: 'none', color: c.textMuted, cursor: 'pointer', fontSize: '20px', fontWeight: 800 }}>
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
              <div style={{ backgroundColor: c.surfaceSubtle, padding: '10px 12px', borderRadius: '8px', border: `1px solid ${c.border}` }}>
                <span style={{ fontSize: '11px', color: c.textMuted }}>Bound Product:</span>
                <div style={{ fontWeight: 700, fontSize: '14px', color: c.text, marginTop: '2px' }}>
                  {quickPriceTag.sku ? quickPriceTag.sku.name : 'Unpaired Label'}
                </div>
                <div style={{ fontSize: '11px', color: c.textMuted, fontFamily: 'monospace' }}>
                  SKU: {quickPriceTag.sku ? quickPriceTag.sku.code : 'N/A'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', color: c.textMuted, fontWeight: 700, marginBottom: '4px' }}>
                    New Selling Price (₹):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickPriceRupees}
                    onChange={(e) => setQuickPriceRupees(e.target.value)}
                    placeholder="e.g. 175.00"
                    style={{
                      width: '100%',
                      backgroundColor: c.surfaceSubtle,
                      border: `1.5px solid ${c.primaryHover}`,
                      color: c.text,
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '15px',
                      fontWeight: 800,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: c.textMuted, fontWeight: 700, marginBottom: '4px' }}>
                    MRP Guardrail (₹):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickMrpRupees}
                    onChange={(e) => setQuickMrpRupees(e.target.value)}
                    placeholder="e.g. 195.00"
                    style={{
                      width: '100%',
                      backgroundColor: c.surfaceSubtle,
                      border: `1px solid ${c.border}`,
                      color: c.text,
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '15px',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: c.textMuted, fontWeight: 600, marginBottom: '4px' }}>
                  Promo Display Badge (Optional):
                </label>
                <input
                  type="text"
                  value={quickPromoBadge}
                  onChange={(e) => setQuickPromoBadge(e.target.value)}
                  placeholder="e.g. Special Offer / Save ₹20"
                  style={{
                    width: '100%',
                    backgroundColor: c.surfaceSubtle,
                    border: `1px solid ${c.border}`,
                    color: c.text,
                    padding: '8px 10px',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  onClick={() => setQuickPriceTag(null)}
                  style={{
                    flex: 1,
                    backgroundColor: c.surfaceSubtle,
                    color: c.text,
                    border: `1px solid ${c.border}`,
                    borderRadius: '6px',
                    padding: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveQuickPrice}
                  style={{
                    flex: 2,
                    backgroundColor: c.primary,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Dispatch Price to Radio ➔
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Access Point Modal */}
      {showAddGatewayModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowAddGatewayModal(false)}
        >
          <div
            style={{
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: '12px',
              padding: '22px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: `1px solid ${c.border}`, paddingBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: c.text }}>
                  📡 Provision Access Point (AP)
                </h3>
                <span style={{ fontSize: '11px', color: c.textMuted }}>
                  Registers hardware ID with WebSocket gateway tunnel
                </span>
              </div>
              <button onClick={() => setShowAddGatewayModal(false)} style={{ background: 'transparent', border: 'none', color: c.textMuted, cursor: 'pointer', fontSize: '20px', fontWeight: 800 }}>
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
              <div>
                <label style={{ display: 'block', color: c.textMuted, fontWeight: 700, marginBottom: '4px' }}>
                  Hardware / MAC ID:
                </label>
                <input
                  type="text"
                  value={newGatewayHwId}
                  onChange={(e) => setNewGatewayHwId(e.target.value)}
                  placeholder="e.g. gw-blr-02 or 00:1A:2B:3C:4D:5E"
                  style={{
                    width: '100%',
                    backgroundColor: c.surfaceSubtle,
                    border: `1px solid ${c.border}`,
                    color: c.text,
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: c.textMuted, fontWeight: 700, marginBottom: '4px' }}>
                  Store Assignment:
                </label>
                <select
                  value={newGatewayStoreId}
                  onChange={(e) => setNewGatewayStoreId(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: c.surfaceSubtle,
                    border: `1px solid ${c.border}`,
                    color: c.text,
                    padding: '8px 10px',
                    borderRadius: '6px',
                  }}
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ color: c.textMuted, fontWeight: 700 }}>
                    Transmission Speed Rate Limit:
                  </label>
                  <span style={{ fontWeight: 800, color: c.primaryHover, fontFamily: 'monospace' }}>
                    {newGatewayRate} tags/sec
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={newGatewayRate}
                  onChange={(e) => setNewGatewayRate(parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '10px', color: c.textMuted }}>SOW baseline: 50 tags/sec per AP</span>
              </div>

              <div style={{ backgroundColor: c.surfaceSubtle, padding: '10px', borderRadius: '6px', border: `1px solid ${c.border}`, fontSize: '11px', color: c.textMuted }}>
                Frequency Band: <strong>Sub-1 GHz ISM (865 - 868 MHz India)</strong>. Does not interfere with store 2.4 GHz customer Wi-Fi.
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  onClick={() => setShowAddGatewayModal(false)}
                  style={{
                    flex: 1,
                    backgroundColor: c.surfaceSubtle,
                    color: c.text,
                    border: `1px solid ${c.border}`,
                    borderRadius: '6px',
                    padding: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddGateway}
                  style={{
                    flex: 2,
                    backgroundColor: c.primary,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Save & Provision AP ➔
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
