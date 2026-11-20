import React, { useState, useEffect, useMemo, useRef } from 'react';
import quickshelfLogo from './assets/quickshelf-logo.webp';
import quickshelfIcon from './assets/quickshelf-icon.png';
import { DocumentationView } from './components/DocumentationView.js';
import { OverviewHomeView } from './components/OverviewHomeView.js';
import {
  Skeleton,
  KpiCardSkeleton,
  TableSkeleton,
  HomeOverviewSkeleton,
  HighlightFleetSkeleton,
} from './components/Skeleton.js';
import {
  HighlightFleetView,
  type HighlightStatus,
  type HighlightDevice,
  type HighlightTemplate,
  type HighlightProduct,
} from './components/HighlightFleetView.js';
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
  Info,
  Link2,
  Unlink,
  ShieldAlert,
  TrendingUp,
  Server,
  Database,
  Lock,
  Check,
  Package,
  BookOpen,
  HelpCircle,
  FileSpreadsheet,
  Upload,
  Download,
  Percent,
  Edit2,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Mail,
  MapPin,
  Building2,
  Bell,
  CheckCheck,
  LogOut,
  Palette,
} from 'lucide-react';
import {
  NotificationToastContainer,
  NotificationHistoryDrawer,
  type AppNotification,
} from './components/NotificationToast';
import { LoginScreen } from './components/LoginScreen';
import { CustomSelect } from './components/CustomSelect';
import { TemplateStudioView } from './components/TemplateStudioView';

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE ||
  (typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'https://ca-quickshelf-prod-api.kindwater-bf8f7b75.centralindia.azurecontainerapps.io'
    : 'http://localhost:3000');

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

type TabType = 'overview' | 'highlight' | 'pricing' | 'templates' | 'gateways' | 'audit' | 'docs' | 'fleet';

function getTabFromHash(): TabType {
  if (typeof window === 'undefined') return 'overview';
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase().trim();
  if (hash === 'fleet' || hash === 'highlight') return 'highlight';
  if (hash === 'pricing') return 'pricing';
  if (hash === 'templates' || hash === 'studio') return 'templates';
  if (hash === 'gateways' || hash === 'aps' || hash === 'base-stations') return 'gateways';
  if (hash === 'audit' || hash === 'logs') return 'audit';
  if (hash === 'docs' || hash === 'sops' || hash === 'guide') return 'docs';
  return 'overview';
}

export default function App() {
  // Navigation & Hash-based URL Routing (Defaulting to Executive Home Overview)
  const [activeTab, setActiveTab] = useState<TabType>(getTabFromHash);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Sync state with browser URL Hash and back/forward buttons
  useEffect(() => {
    const handleHashChange = () => {
      setActiveTab(getTabFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (tab: TabType) => {
    setActiveTab(tab);
    const targetHash = tab === 'overview' ? '#/' : `#/${tab === 'highlight' ? 'fleet' : tab}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  };

  // User Profile & System Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'hardware' | 'guardrails'>('profile');
  const [userName, setUserName] = useState(() => localStorage.getItem('qs_user_name') || '');
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('qs_user_email') || '');
  const [userRole, setUserRole] = useState(() => localStorage.getItem('qs_user_role') || 'SUPER_ADMIN');
  const [userStore, setUserStore] = useState(() => localStorage.getItem('qs_user_store') || '');
  const [rfRegion, setRfRegion] = useState(() => localStorage.getItem('qs_rf_region') || '865 - 868 MHz (India WPC Sub-GHz)');
  const [guardrailStrict, setGuardrailStrict] = useState(true);
  const [lowBatteryAlertPct, setLowBatteryAlertPct] = useState('20');

  // Authentication & Zero-Trust Security State
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('qs_auth_token'));
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('qs_auth_token');
    setAuthToken(null);
    showToast('You have been securely signed out of QuickShelf.', 'info', 'Signed Out');
  };

  const apiFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers || {});
    const currentToken = authToken || localStorage.getItem('qs_auth_token');
    if (currentToken) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }
    const res = await fetch(input, { ...init, headers });
    if (res.status === 401 && currentToken) {
      localStorage.removeItem('qs_auth_token');
      setAuthToken(null);
      showToast('Your authentication session has expired or is unauthorized. Please sign in again.', 'error', 'Session Expired');
    }
    return res;
  };

  // Highlight IoT Cloud Fleet State
  const [highlightStatus, setHighlightStatus] = useState<HighlightStatus | null>(null);
  const [highlightDevices, setHighlightDevices] = useState<HighlightDevice[]>([]);
  const [highlightTemplates, setHighlightTemplates] = useState<HighlightTemplate[]>([]);
  const [highlightProducts, setHighlightProducts] = useState<HighlightProduct[]>([]);
  const [syncingHighlight, setSyncingHighlight] = useState(false);
  const [showHighlightOtaModal, setShowHighlightOtaModal] = useState<HighlightDevice | null>(null);
  const [otaSkuCode, setOtaSkuCode] = useState('');
  const [otaSkuName, setOtaSkuName] = useState('');
  const [otaPrice, setOtaPrice] = useState('');
  const [otaMrp, setOtaMrp] = useState('');
  const [otaPromo, setOtaPromo] = useState('');
  const [otaTemplateId, setOtaTemplateId] = useState('');
  const [isPushingOta, setIsPushingOta] = useState(false);

  // Highlight Physical Tag Pairing & Unbinding Studio State
  const [showPairModal, setShowPairModal] = useState<HighlightDevice | boolean | null>(null);
  const [pairDeviceNumber, setPairDeviceNumber] = useState('');
  const [pairSkuCode, setPairSkuCode] = useState('');
  const [pairProdName, setPairProdName] = useState('');
  const [pairHindiName, setPairHindiName] = useState('');
  const [pairPrice, setPairPrice] = useState('240.00');
  const [pairMrp, setPairMrp] = useState('280.00');
  const [pairPromo, setPairPromo] = useState('FRESH ARRIVAL');
  const [pairTemplateId, setPairTemplateId] = useState('1256');
  const [isPairing, setIsPairing] = useState(false);

  // Unbind Confirmation State
  const [showUnbindModal, setShowUnbindModal] = useState<HighlightDevice | null>(null);
  const [isUnbinding, setIsUnbinding] = useState(false);

  // Highlight Batch Operations & CSV / Excel Import State
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvModalTab, setCsvModalTab] = useState<'import' | 'export' | 'batchPrice'>('import');
  const [csvInputText, setCsvInputText] = useState(
    `*Barcode,Device name,Organization(CU006INDIA0344:483)\n8003152970,Kalakand Display 7.5,CU006INDIA0344:483`
  );
  const [selectedBatchFile, setSelectedBatchFile] = useState<File | null>(null);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [csvProcessResult, setCsvProcessResult] = useState<any>(null);

  const [batchSaleDiscount, setBatchSaleDiscount] = useState(15);
  const [batchSalePromoTag, setBatchSalePromoTag] = useState('FESTIVE FLASH SALE');
  const [isApplyingBatchSale, setIsApplyingBatchSale] = useState(false);
  const [batchSaleResult, setBatchSaleResult] = useState<any>(null);

  // Multi-tenant Store Filter
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
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Enterprise Notification System
  const [activeToasts, setActiveToasts] = useState<AppNotification[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<AppNotification[]>([]);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

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
  const [newGatewayStoreId, setNewGatewayStoreId] = useState('');
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

  // Route-based lazy loading state
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());
  const isFetchingRef = useRef(false);

  // 1. Fetch user profile once on mount
  const fetchUserProfile = async () => {
    try {
      const meRes = await apiFetch(`${API_BASE}/api/auth/me`);
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.user) {
          const displayName = meData.user.name || meData.user.email;
          setUserName(displayName);
          setUserEmail(meData.user.email);
          setUserRole(meData.user.role);
          localStorage.setItem('qs_user_name', displayName);
          localStorage.setItem('qs_user_email', meData.user.email);
          localStorage.setItem('qs_user_role', meData.user.role);
        }
      }
    } catch {}
  };

  // 2. Overview: Lightweight, fast home landing data (<500ms)
  const loadOverview = async () => {
    const [statusRes, gatewaysRes, hlStatusRes, hlDevRes, auditRes] = await Promise.all([
      apiFetch(`${API_BASE}/api/fleet/status`),
      apiFetch(`${API_BASE}/api/gateways`),
      apiFetch(`${API_BASE}/api/highlight/status`),
      apiFetch(`${API_BASE}/api/highlight/devices`),
      apiFetch(`${API_BASE}/api/audit`),
    ]);

    if (statusRes.ok) {
      setFleet(await statusRes.json());
      setApiConnected(true);
    } else {
      setApiConnected(false);
    }
    if (gatewaysRes.ok) setGateways(await gatewaysRes.json());
    if (hlStatusRes.ok) setHighlightStatus(await hlStatusRes.json());
    if (hlDevRes.ok) {
      const d = await hlDevRes.json();
      if (d.success && d.devices) setHighlightDevices(d.devices);
    }
    if (auditRes.ok) setAuditLogs(await auditRes.json());
  };

  // 3. Products & Pricing: Load SKUs and commodities only when needed
  const loadPricing = async () => {
    const [skusRes, productsRes, templatesRes] = await Promise.all([
      apiFetch(`${API_BASE}/api/skus`),
      apiFetch(`${API_BASE}/api/highlight/products`),
      apiFetch(`${API_BASE}/api/highlight/templates`),
    ]);
    if (skusRes.ok) setSkus(await skusRes.json());
    if (productsRes.ok) {
      const p = await productsRes.json();
      if (p.success && p.products) setHighlightProducts(p.products);
    }
    if (templatesRes.ok) {
      const t = await templatesRes.json();
      if (t.success && t.templates) setHighlightTemplates(t.templates);
    }
  };

  // 4. Hardware Fleet: Full device list, templates, and connection
  const loadHighlightFleet = async () => {
    const [statusRes, devicesRes, templatesRes, productsRes] = await Promise.all([
      apiFetch(`${API_BASE}/api/highlight/status`),
      apiFetch(`${API_BASE}/api/highlight/devices`),
      apiFetch(`${API_BASE}/api/highlight/templates`),
      apiFetch(`${API_BASE}/api/highlight/products`),
    ]);
    if (statusRes.ok) setHighlightStatus(await statusRes.json());
    if (devicesRes.ok) {
      const d = await devicesRes.json();
      if (d.success && d.devices) setHighlightDevices(d.devices);
    }
    if (templatesRes.ok) {
      const t = await templatesRes.json();
      if (t.success && t.templates) setHighlightTemplates(t.templates);
    }
    if (productsRes.ok) {
      const p = await productsRes.json();
      if (p.success && p.products) setHighlightProducts(p.products);
    }
  };

  const fetchHighlightData = loadHighlightFleet;

  // 5. Gateways / Base Stations
  const loadGateways = async () => {
    const [gatewaysRes, statusRes] = await Promise.all([
      apiFetch(`${API_BASE}/api/gateways`),
      apiFetch(`${API_BASE}/api/highlight/status`),
    ]);
    if (gatewaysRes.ok) setGateways(await gatewaysRes.json());
    if (statusRes.ok) setHighlightStatus(await statusRes.json());
  };

  // 6. Audit Logs
  const loadAudit = async () => {
    const res = await apiFetch(`${API_BASE}/api/audit`);
    if (res.ok) setAuditLogs(await res.json());
  };

  // Route-Based Lazy Loader
  const loadTabData = async (tab: TabType, force = false) => {
    if (!authToken || isFetchingRef.current) return;
    if (!force && loadedTabs.has(tab)) return;

    isFetchingRef.current = true;
    setLoading(true);
    try {
      switch (tab) {
        case 'overview':
          await Promise.all([loadOverview(), fetchUserProfile()]);
          break;
        case 'pricing':
          await loadPricing();
          break;
        case 'templates':
          break;
        case 'highlight':
          await loadHighlightFleet();
          break;
        case 'gateways':
          await loadGateways();
          break;
        case 'audit':
          await loadAudit();
          break;
        case 'docs':
          if (highlightDevices.length === 0) {
            const devRes = await apiFetch(`${API_BASE}/api/highlight/devices`);
            if (devRes.ok) {
              const d = await devRes.json();
              if (d.success && d.devices) setHighlightDevices(d.devices);
            }
          }
          break;
      }
      setLoadedTabs((prev) => new Set(prev).add(tab));
      setApiConnected(true);
    } catch {
      setApiConnected(false);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setLastRefreshed(new Date());
    }
  };

  const fetchData = async () => {
    await loadTabData(activeTab, true);
  };

  const handleManualRefresh = async () => {
    if (isManualRefreshing || isFetchingRef.current) return;
    setIsManualRefreshing(true);
    try {
      await loadTabData(activeTab, true);
      showToast('Live data refreshed successfully.');
    } catch {
      showToast('Failed to refresh data.');
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const fetchAuditLogs = loadAudit;

  // Trigger lazy loading only when landing or navigating to a route
  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab, authToken]);

  // Load Detailed Tag for Inspector Drawer
  useEffect(() => {
    if (!inspectTagId) {
      setTagDetail(null);
      return;
    }
    let isMounted = true;
    setTagDetailLoading(true);

    apiFetch(`${API_BASE}/api/tags/${inspectTagId}`)
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

  const dismissToast = (id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showToast = (
    msg: string,
    type: 'info' | 'success' | 'error' | 'warning' = 'info',
    title?: string,
    details?: string
  ) => {
    let inferredType = type;
    let inferredTitle = title;

    if (!title) {
      const lower = msg.toLowerCase();
      if (lower.includes('failed') || lower.includes('error') || lower.includes('violation') || lower.includes('wrong')) {
        inferredType = 'error';
        inferredTitle = 'Action Failed';
      } else if (
        lower.includes('success') ||
        lower.includes('active') ||
        lower.includes('created') ||
        lower.includes('updated') ||
        lower.includes('paired') ||
        lower.includes('reset') ||
        lower.includes('synced') ||
        lower.includes('renamed') ||
        lower.includes('unlinked')
      ) {
        inferredType = 'success';
        inferredTitle = 'Action Completed';
      } else if (lower.includes('guardrail') || lower.includes('warning') || lower.includes('alert')) {
        inferredType = 'warning';
        inferredTitle = 'Guardrail Warning';
      } else {
        inferredType = 'info';
        inferredTitle = 'System Activity';
      }
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = inferredType === 'error' ? 8500 : 5000;
    const notif: AppNotification = {
      id,
      type: inferredType,
      title: inferredTitle || 'System Activity',
      message: msg,
      details,
      timestamp: new Date(),
      duration,
    };

    setActiveToasts((prev) => [notif, ...prev.slice(0, 3)]); // Keep max 4 visible toasts
    setNotificationHistory((prev) => [notif, ...prev.slice(0, 49)]); // Keep 50 in history
    setUnreadNotifications((prev) => prev + 1);

    setTimeout(() => {
      dismissToast(id);
    }, duration);
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
    showToast(`Broadcasting ${discountPct}% Flash Sale across fleet...`);
    try {
      const res = await apiFetch(`${API_BASE}/api/pos/flash-sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountPct }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Dispatched ${discountPct}% flash discount. Sync-Engine radio pacing active.`);
        fetchData();
      }
    } catch {
      showToast('Failed to trigger flash sale');
    }
  };

  const handleResetPrices = async () => {
    showToast('Resetting fleet prices to standard MRP...');
    try {
      const res = await apiFetch(`${API_BASE}/api/pos/reset-prices`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Reset all prices to standard MRP.');
        fetchData();
      }
    } catch {
      showToast('Failed to reset prices');
    }
  };

  const handleForceGatewaySync = async (gatewayId: string, hwId: string) => {
    showToast(`Dispatching wire sync_request to AP ${hwId}...`);
    try {
      const res = await apiFetch(`${API_BASE}/api/gateways/${gatewayId}/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`Dispatched inventory audit sync_request to ${hwId}.`);
        fetchData();
      }
    } catch {
      showToast(`Failed to sync ${hwId}`);
    }
  };

  const handleSaveTagInspector = async () => {
    if (!tagDetail) return;
    showToast(`Updating label ${tagDetail.hardwareId}...`);

    try {
      const tagRes = await apiFetch(`${API_BASE}/api/tags/${tagDetail.id}`, {
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
            showToast('Guardrail Violation (PRC-04): Selling price cannot exceed MRP.');
            return;
          }

          await apiFetch(`${API_BASE}/api/skus/${inspectorSkuId}`, {
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
        showToast(`Successfully updated ${tagDetail.hardwareId}. Radio divergence loop triggered.`);
        fetchData();
        setInspectTagId(tagDetail.id);
      }
    } catch {
      showToast('Failed to update tag details');
    }
  };

  const handleLocateTag = async (tagHardwareId: string, gatewayHwId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (blinkingTagIds.has(tagHardwareId)) {
      await handleStopFlashHighlightDevice(tagHardwareId);
      return;
    }
    try {
      showToast(`Blinking LED on Tag ${tagHardwareId} (10s pulse) via AP ${gatewayHwId}...`);
      setBlinkingTagIds((prev) => new Set(prev).add(tagHardwareId));
      await apiFetch(`${API_BASE}/api/tags/${tagHardwareId}/locate`, { method: 'POST' });
      setTimeout(() => {
        setBlinkingTagIds((prev) => {
          const next = new Set(prev);
          next.delete(tagHardwareId);
          return next;
        });
      }, 10000);
    } catch {
      showToast(`Tag ${tagHardwareId} locate command queued.`);
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
      showToast('Please enter a valid price.');
      return;
    }

    if (!isNaN(mrp) && price > mrp) {
      showToast(`Guardrail Violation (PRC-04): Selling price (₹${price.toFixed(2)}) cannot exceed MRP (₹${mrp.toFixed(2)}).`);
      return;
    }

    const priceMinor = Math.round(price * 100);
    const mrpMinor = !isNaN(mrp) ? Math.round(mrp * 100) : undefined;

    try {
      const res = await apiFetch(`${API_BASE}/api/tags/${quickPriceTag.id}/quick-price`, {
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
        showToast(data.error || 'Failed to update price');
        return;
      }

      showToast(`Price for ${quickPriceTag.hardwareId} updated to ₹${price.toFixed(2)}. Dispatched to AP.`);
      setQuickPriceTag(null);
      fetchData();
    } catch {
      showToast('Failed to update price.');
    }
  };

  const handleAddGateway = async () => {
    if (!newGatewayHwId.trim()) {
      showToast('Please enter an Access Point Hardware ID (e.g. gw-blr-02).');
      return;
    }

    try {
      const res = await apiFetch(`${API_BASE}/api/gateways`, {
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
        showToast(data.error || 'Failed to add gateway');
        return;
      }

      showToast(`Access Point ${newGatewayHwId.trim()} provisioned & online.`);
      setShowAddGatewayModal(false);
      setNewGatewayHwId('');
      fetchData();
    } catch {
      showToast('Failed to provision gateway.');
    }
  };

  const handleUpdateGatewayRate = async (gatewayId: string, maxTagsPerSec: number) => {
    try {
      const res = await apiFetch(`${API_BASE}/api/gateways/${gatewayId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxTagsPerSec }),
      });
      if (res.ok) {
        showToast(`AP rate limit updated to ${maxTagsPerSec} tags/sec.`);
        setGateways((prev) =>
          prev.map((g) => (g.id === gatewayId ? { ...g, maxTagsPerSec } : g))
        );
      }
    } catch {
      showToast('Failed to update AP rate limit.');
    }
  };

  // Highlight IoT Fleet Handlers
  const handleSyncHighlight = async () => {
    setSyncingHighlight(true);
    showToast('Synchronizing AP base stations & physical tags from Highlight Cloud...', 'info', 'Sync Started');
    try {
      const res = await apiFetch(`${API_BASE}/api/highlight/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(
          `Synchronized ${data.synced?.tagCount ?? 0} physical tags, ${data.synced?.apCount ?? 1} AP station, ${data.synced?.templateCount ?? 0} templates.`,
          'success',
          'Highlight Cloud Synchronized',
          `Base Station: E43819636067 (Online) • Org: CU006INDIA0344 • Timestamp: ${new Date().toLocaleTimeString()}`
        );
        await Promise.all([fetchData(), fetchHighlightData()]);
      } else {
        showToast(
          `Highlight Cloud sync failed: ${data.error || 'Unknown error'}`,
          'error',
          'Cloud Sync Failed',
          data.error
        );
      }
    } catch (err: any) {
      showToast(`Highlight Cloud network error: ${err.message}`, 'error', 'Cloud Network Error', err.message);
    } finally {
      setSyncingHighlight(false);
    }
  };

  const handleLocateHighlightDevice = async (deviceNumber: string) => {
    try {
      showToast(`Querying live telemetry for physical ESL ${deviceNumber}...`, 'info', 'Querying Telemetry');
      const res = await apiFetch(`${API_BASE}/api/highlight/locate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceNumber }),
      });
      const data = await res.json();
      if (data.success && data.device) {
        const d = data.device;
        const bat = (d.powerLevel ?? 5) * 20;
        showToast(
          `ESL ${deviceNumber} RF telemetry confirmed online.`,
          'success',
          'Device Telemetry Live',
          `Battery: ${bat}% (${d.powerLevel ?? 5}/5) • RF Signal: ${d.signal ?? -65} dBm • AP: ${d.stationId || 'E43819636067'} • Template: ${d.templateName || 'Standard'}`
        );
      } else {
        showToast(
          `Telemetry query failed for ESL ${deviceNumber}.`,
          'error',
          'Ping Failed',
          data.error || 'Gateway busy or device unreachable'
        );
      }
    } catch (err: any) {
      showToast(`Failed to query device: ${err.message}`, 'error', 'Device Query Error', err.message);
    }
  };

  const handleFlashHighlightDevice = async (deviceNumber: string, color: number = 2, duration: number = 30) => {
    try {
      const colorNames: Record<number, string> = {
        1: 'Red',
        2: 'Green',
        3: 'Blue',
        4: 'Yellow',
        5: 'Orange',
        6: 'Cyan',
        7: 'Purple',
        8: 'White',
      };
      const colorName = colorNames[color] || 'Green';
      showToast(
        `Dispatched over-the-air LED flash command to ESL ${deviceNumber}...`,
        'info',
        'Triggering LED Flash',
        `Color: ${colorName} (${color}) • Duration: ${duration}s • Base Station: E43819636067`
      );
      setBlinkingTagIds((prev) => new Set(prev).add(deviceNumber));

      const res = await apiFetch(`${API_BASE}/api/highlight/flash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceNumber,
          lightColor: color,
          lightTime: duration,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          `Physical ${colorName} LED is now blinking on ESL ${deviceNumber} for ${duration} seconds.`,
          'success',
          'Physical LED Active (Pick-to-Light)',
          `Gateway: E43819636067 • Tag: ${deviceNumber} • Status: 200 OK • Auto-off in ${duration}s`
        );
        setTimeout(() => {
          setBlinkingTagIds((prev) => {
            const next = new Set(prev);
            next.delete(deviceNumber);
            return next;
          });
        }, duration * 1000);
      } else {
        showToast(
          `Could not activate LED flash on ESL ${deviceNumber}.`,
          'error',
          'LED Flash Failed',
          `Server Error: ${data.error || 'Sub-GHz RF timeout or Base Station busy'}`
        );
        setBlinkingTagIds((prev) => {
          const next = new Set(prev);
          next.delete(deviceNumber);
          return next;
        });
      }
    } catch (err: any) {
      showToast(
        `Failed to communicate with RF Gateway for ESL ${deviceNumber}.`,
        'error',
        'LED Flash Network Error',
        err.message
      );
      setBlinkingTagIds((prev) => {
        const next = new Set(prev);
        next.delete(deviceNumber);
        return next;
      });
    }
  };

  const handleStopFlashHighlightDevice = async (deviceNumber?: string) => {
    try {
      showToast(
        deviceNumber ? `Sending stop command for ESL ${deviceNumber}...` : 'Stopping all active flashing ESL LEDs...',
        'info',
        'Stopping LED Flash'
      );
      const res = await apiFetch(`${API_BASE}/api/highlight/flash-stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceNumber ? { deviceNumber } : {}),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          deviceNumber
            ? `LED flashing stopped on physical ESL ${deviceNumber}.`
            : 'All active flashing ESL tags stopped across the store.',
          'success',
          'LED Flash Stopped',
          `Acknowledged by Base Station E43819636067`
        );
        setBlinkingTagIds((prev) => {
          if (!deviceNumber) return new Set();
          const next = new Set(prev);
          next.delete(deviceNumber);
          return next;
        });
      } else {
        showToast(
          `Failed to stop LED flash: ${data.error || 'Gateway busy'}`,
          'error',
          'Stop Flash Failed',
          data.error
        );
      }
    } catch (err: any) {
      showToast(`Network error stopping LED: ${err.message}`, 'error', 'Stop Flash Error', err.message);
    }
  };

  const handleOpenHighlightOtaModal = (dev: HighlightDevice) => {
    setShowHighlightOtaModal(dev);
    setOtaSkuCode(dev.skuCode || `SKU-${dev.deviceNumber.slice(-4)}`);
    setOtaSkuName(dev.skuName || 'Bada wala kalakand 500g');
    setOtaPrice('175.00');
    setOtaMrp('220.00');
    setOtaPromo('SPECIAL OFFER');
    setOtaTemplateId(dev.templateId || (dev as any).templateList?.[0]?.toString() || '1256');
  };

  const handleExecuteHighlightOtaPush = async () => {
    if (!showHighlightOtaModal) return;
    const p = parseFloat(otaPrice);
    const m = parseFloat(otaMrp);

    if (isNaN(p) || p <= 0) {
      showToast('Please enter a valid positive price.');
      return;
    }
    if (!isNaN(m) && p > m) {
      showToast(`Guardrail Violation (PRC-04): Selling price (₹${p.toFixed(2)}) cannot exceed MRP (₹${m.toFixed(2)}).`);
      return;
    }

    setIsPushingOta(true);
    showToast(
      `Broadcasting OTA price ₹${p.toFixed(2)} to physical ESL ${showHighlightOtaModal.deviceNumber}...`,
      'info',
      'OTA Price Push Dispatched',
      `SKU: ${otaSkuCode} • Template: ${otaTemplateId || 1213} • Base Station: E43819636067`
    );
    try {
      const res = await apiFetch(`${API_BASE}/api/highlight/push-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceNumber: showHighlightOtaModal.deviceNumber,
          skuCode: otaSkuCode,
          skuName: otaSkuName,
          price: p,
          mrp: !isNaN(m) ? m : undefined,
          promoBadge: otaPromo.trim() ? otaPromo.trim() : undefined,
          templateId: otaTemplateId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          `Physical ESL ${showHighlightOtaModal.deviceNumber} updated with price ₹${p.toFixed(2)}.`,
          'success',
          'Price Updated Over-the-Air',
          `Sync Latency: ${data.syncLatencyMs}ms • Product: "${otaSkuName}" • Bound Template: ${data.templateId || 1213}`
        );
        setShowHighlightOtaModal(null);
        await Promise.all([fetchHighlightData(), fetchData()]);
      } else {
        showToast(
          `Could not update price on physical ESL ${showHighlightOtaModal.deviceNumber}.`,
          'error',
          'OTA Update Failed',
          `Highlight API Error: ${data.error || 'Server rejected command'}`
        );
      }
    } catch (err: any) {
      showToast(
        `Failed to reach Highlight Cloud API: ${err.message}`,
        'error',
        'OTA Push Network Error',
        err.message
      );
    } finally {
      setIsPushingOta(false);
    }
  };

  const handleOpenPairModal = (device?: HighlightDevice, prefillProduct?: HighlightProduct) => {
    const targetDev = device || highlightDevices.find((d) => !d.skuCode) || highlightDevices[0];
    const devNum = targetDev ? targetDev.deviceNumber : highlightDevices[0]?.deviceNumber || '';
    setPairDeviceNumber(devNum);

    if (prefillProduct) {
      setPairSkuCode(prefillProduct.uniqueId);
      setPairProdName(prefillProduct.prodName);
      setPairHindiName(prefillProduct.custFeature1 || '');
      setPairPrice(typeof prefillProduct.price === 'number' ? prefillProduct.price.toFixed(2) : String(prefillProduct.price));
      const mrpMatch = prefillProduct.custFeature2?.match(/\d+(\.\d+)?/);
      setPairMrp(mrpMatch ? mrpMatch[0] : typeof prefillProduct.price === 'number' ? prefillProduct.price.toFixed(2) : String(prefillProduct.price));
      setPairPromo(prefillProduct.custFeature3?.replace(/^PROMO:\s*/i, '') || prefillProduct.copyWriting || '');
      setPairTemplateId(targetDev?.templateId || '1256');
    } else
    if (devNum === '8003152970') {
      setPairSkuCode('SKU-KLK-750');
      setPairProdName('Bada Wala Kalakand 500g');
      setPairHindiName('बड़ा वाला कलाकंद');
      setPairPrice('240.00');
      setPairMrp('280.00');
      setPairPromo('WEEKEND SPECIAL');
      setPairTemplateId('1256');
    } else if (devNum === '8003144211') {
      setPairSkuCode('SKU-DAL-1KG');
      setPairProdName('Tata Sampann Toor Dal 1kg');
      setPairHindiName('तूर दाल प्रीमियम');
      setPairPrice('185.00');
      setPairMrp('210.00');
      setPairPromo('BEST PRICE');
      setPairTemplateId('1217');
    } else {
      setPairSkuCode(targetDev?.skuCode || `SKU-ITEM-${devNum.slice(-4)}`);
      setPairProdName(targetDev?.skuName || 'Fortune Sunflower Oil 1L');
      setPairHindiName('फॉर्च्यून सूरजमुखी तेल');
      setPairPrice('145.00');
      setPairMrp('170.00');
      setPairPromo('FLAT 15% OFF');
      setPairTemplateId(targetDev?.templateId || '1213');
    }
    setShowPairModal(targetDev || true);
  };

  const handleExecutePairTag = async () => {
    if (!pairDeviceNumber || !pairSkuCode.trim()) {
      showToast('Please select a device and enter a valid SKU.', 'warning', 'Incomplete Form');
      return;
    }
    const p = parseFloat(pairPrice);
    const m = parseFloat(pairMrp);
    if (isNaN(p) || p <= 0) {
      showToast('Please enter a valid positive price.', 'warning', 'Invalid Price');
      return;
    }
    if (!isNaN(m) && p > m) {
      showToast(
        `Selling price (₹${p.toFixed(2)}) cannot exceed MRP (₹${m.toFixed(2)}).`,
        'warning',
        'Guardrail Violation (PRC-04)',
        'Legal compliance: Retail selling price must not exceed Maximum Retail Price.'
      );
      return;
    }

    setIsPairing(true);
    showToast(
      `Pairing physical tag ${pairDeviceNumber} with SKU ${pairSkuCode}...`,
      'info',
      'Pairing In Progress',
      `Product: "${pairProdName}" • Template ID: ${pairTemplateId || 1213}`
    );
    try {
      const res = await apiFetch(`${API_BASE}/api/highlight/bind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceNumber: pairDeviceNumber,
          skuCode: pairSkuCode.trim(),
          prodName: pairProdName.trim(),
          hindiName: pairHindiName.trim(),
          price: p,
          mrp: !isNaN(m) ? m : undefined,
          promoBadge: pairPromo.trim() ? pairPromo.trim() : undefined,
          templateId: Number(pairTemplateId) || 1213,
          stationId: 'E43819636067',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          `Physical ESL ${pairDeviceNumber} successfully paired with SKU ${pairSkuCode}.`,
          'success',
          'Device Paired Successfully',
          `Product: "${pairProdName}" • Bound Template: ${pairTemplateId || 1213} • Base Station: E43819636067`
        );
        setShowPairModal(null);
        await Promise.all([fetchHighlightData(), fetchData()]);
      } else {
        showToast(
          `Failed to pair ESL ${pairDeviceNumber}.`,
          'error',
          'Pairing Failed',
          data.error || 'Server error'
        );
      }
    } catch (err: any) {
      showToast(`Pairing network error: ${err.message}`, 'error', 'Pairing Network Error', err.message);
    } finally {
      setIsPairing(false);
    }
  };

  const handleOpenUnbindModal = (dev: HighlightDevice) => {
    setShowUnbindModal(dev);
  };

  const handleExecuteUnbind = async () => {
    if (!showUnbindModal) return;
    const devNum = showUnbindModal.deviceNumber;
    setIsUnbinding(true);
    showToast(`Unbinding physical ESL tag ${devNum}...`, 'info', 'Unbinding Started');
    try {
      const res = await apiFetch(`${API_BASE}/api/highlight/unbind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceNumber: devNum,
          stationId: showUnbindModal.stationId || 'E43819636067',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          `Physical tag ${devNum} unbound successfully.`,
          'success',
          'Device Unbound',
          `Screen cleared and tag returned to Standby Pool.`
        );
        setShowUnbindModal(null);
        await Promise.all([fetchHighlightData(), fetchData()]);
      } else {
        showToast(`Could not unbind ESL ${devNum}.`, 'error', 'Unbind Failed', data.error || 'Server error');
      }
    } catch (err: any) {
      showToast(`Unbind network error: ${err.message}`, 'error', 'Unbind Network Error', err.message);
    } finally {
      setIsUnbinding(false);
    }
  };

  const handleSaveUserProfile = () => {
    localStorage.setItem('qs_user_name', userName);
    localStorage.setItem('qs_user_email', userEmail);
    localStorage.setItem('qs_user_role', userRole);
    localStorage.setItem('qs_user_store', userStore);
    localStorage.setItem('qs_rf_region', rfRegion);
    showToast('User preferences & operator profile updated.', 'success', 'Profile Saved');
    setShowSettingsModal(false);
  };

  const handleOpenCsvModal = () => {
    setShowCsvModal(true);
    setCsvProcessResult(null);
    setBatchSaleResult(null);
  };

  const handleRenameDevice = async (deviceNumber: string, newName: string) => {
    try {
      const res = await apiFetch(`${API_BASE}/api/highlight/devices/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceNumber, deviceName: newName }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          `Physical ESL ${deviceNumber} nickname updated to "${newName}".`,
          'success',
          'Device Renamed',
          `Synced with Highlight IoT registry`
        );
        await fetchHighlightData();
      } else {
        showToast(`Failed to rename device ${deviceNumber}.`, 'error', 'Rename Error', data.error);
      }
    } catch (err: any) {
      showToast(`Rename network error: ${err.message}`, 'error', 'Rename Error', err.message);
    }
  };

  const handleProcessCsv = async () => {
    setIsProcessingCsv(true);
    setCsvProcessResult(null);
    try {
      let body: any = {};
      if (selectedBatchFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedBatchFile);
        });
        const fileBase64 = await base64Promise;
        body = { fileBase64, fileName: selectedBatchFile.name };
      } else {
        if (!csvInputText.trim()) {
          showToast('Please provide CSV content or select a file.');
          setIsProcessingCsv(false);
          return;
        }
        body = { csvContent: csvInputText.trim() };
      }

      const res = await apiFetch(`${API_BASE}/api/highlight/import-devices-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setCsvProcessResult(data);
      if (data.success) {
        showToast(`Batch processed ${data.total} devices successfully.`);
        await fetchHighlightData();
      } else {
        showToast(`Batch process error: ${data.error}`);
      }
    } catch (err: any) {
      showToast(`Batch upload error: ${err.message}`);
      setCsvProcessResult({ success: false, error: err.message });
    } finally {
      setIsProcessingCsv(false);
    }
  };

  const handleApplyBatchSale = async () => {
    setIsApplyingBatchSale(true);
    setBatchSaleResult(null);
    try {
      const discountPct = Number(batchSaleDiscount) || 10;
      const factor = (100 - discountPct) / 100;

      const productsToUpdate = highlightDevices
        .filter((d) => d.skuCode)
        .map((d) => {
          const currentPrice = 240;
          const newPrice = Math.round(currentPrice * factor);
          return {
            uniqueId: d.skuCode,
            prodName: d.skuName || 'Promotional Item',
            price: newPrice,
            priceUnit: '₹',
            commodityUnit: '1 unit',
            promoBadge: batchSalePromoTag || `${discountPct}% OFF FLASH SALE`,
            hindiName: 'विशेष छूट',
            mrp: 280,
          };
        });

      if (productsToUpdate.length === 0) {
        productsToUpdate.push({
          uniqueId: 'SKU-KLK-750',
          prodName: 'Bada Wala Kalakand (Special 500g)',
          price: Math.round(280 * factor),
          priceUnit: '₹',
          commodityUnit: '1 unit',
          promoBadge: batchSalePromoTag || `${discountPct}% OFF FLASH SALE`,
          hindiName: 'बड़ा वाला कलाकंद स्पेशल',
          mrp: 280,
        });
      }

      const res = await apiFetch(`${API_BASE}/api/highlight/batch-update-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: productsToUpdate }),
      });
      const data = await res.json();
      setBatchSaleResult(data);
      if (data.success) {
        showToast(`Batch updated ${productsToUpdate.length} commodities in Highlight Catalog.`);
        await fetchHighlightData();
      } else {
        showToast(`Batch update failed: ${data.error}`);
      }
    } catch (err: any) {
      showToast(`Batch update error: ${err.message}`);
      setBatchSaleResult({ success: false, error: err.message });
    } finally {
      setIsApplyingBatchSale(false);
    }
  };

  // Enterprise SaaS Light Palette
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

  // Zero-Trust Authentication Gate: Require Login before rendering operations portal
  if (!authToken) {
    return (
      <>
        <LoginScreen
          apiBase={API_BASE}
          onLoginSuccess={(token, user) => {
            setAuthToken(token);
            setUserName(user.name);
            setUserEmail(user.email);
            setUserRole(user.role);
            showToast(`Signed in as ${user.name} (${user.email})`, 'success', 'Welcome Back');
          }}
        />
        <NotificationToastContainer toasts={activeToasts} onDismiss={dismissToast} />
      </>
    );
  }

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
          LEFT SIDEBAR: COLLAPSIBLE STITCH NAVIGATION & SETTINGS
      ========================================================================== */}
      <aside
        style={{
          width: sidebarCollapsed ? '72px' : '260px',
          transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1), padding 0.2s ease',
          backgroundColor: c.surface,
          borderRight: `1px solid ${c.border}`,
          padding: sidebarCollapsed ? '16px 8px' : '18px 14px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          boxSizing: 'border-box',
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          {/* Brand Logo & Collapse Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', gap: '8px' }}>
            {sidebarCollapsed ? (
              <img
                src={quickshelfIcon}
                alt="QuickShelf Icon"
                onClick={() => handleNavigate('overview')}
                style={{ width: '32px', height: '32px', objectFit: 'contain', cursor: 'pointer' }}
                title="Go to Home Overview"
              />
            ) : (
              <div
                onClick={() => handleNavigate('overview')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, cursor: 'pointer' }}
                title="Go to Home Overview"
              >
                <img
                  src={quickshelfLogo}
                  alt="QuickShelf Logo"
                  style={{ height: '28px', maxWidth: '140px', objectFit: 'contain' }}
                />
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 800,
                    backgroundColor: '#dbe1ff',
                    color: '#00174b',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  SAAS HUB
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: c.textMuted,
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>

          {/* Navigation Links (All 6 Core Operational Routes in Deployment Lifecycle Order) */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {[
              { id: 'overview', label: 'Home Overview', icon: Layers, badge: 'Hub', badgeColor: '#2563eb' },
              { id: 'pricing', label: 'Products & Catalog', icon: DollarSign, badge: 'PRC-04', badgeColor: '#2563eb' },
              { id: 'templates', label: 'Template Studio', icon: Palette, badge: '4-Color', badgeColor: '#eab308' },
              { id: 'gateways', label: 'Base Stations (APs)', icon: Radio, badge: `${gateways.length || 1} AP`, badgeColor: '#8b5cf6' },
              { id: 'highlight', label: 'ESL Labels (Tags)', icon: TagIcon, badge: highlightStatus?.connected ? `${highlightDevices.length} Tags` : 'Online', badgeColor: '#059669' },
              { id: 'audit', label: 'Audit Trail', icon: FileText, badge: 'Live', badgeColor: '#64748b' },
              { id: 'docs', label: 'Operations & SOPs', icon: BookOpen, badge: 'Guide', badgeColor: '#0ea5e9' },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id as any)}
                  title={sidebarCollapsed ? item.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: sidebarCollapsed ? 'center' : 'space-between',
                    padding: sidebarCollapsed ? '9px 0' : '9px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isActive ? '#2563eb' : 'transparent',
                    color: isActive ? '#ffffff' : c.textMuted,
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                    minWidth: 0,
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, overflow: 'hidden' }}>
                    <Icon size={16} style={{ flexShrink: 0 }} color={isActive ? '#ffffff' : c.textMuted} />
                    {!sidebarCollapsed && (
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>
                        {item.label}
                      </span>
                    )}
                  </div>
                  {!sidebarCollapsed && item.badge && (
                    <span
                      style={{
                        flexShrink: 0,
                        backgroundColor: isActive ? '#1d4ed8' : c.surfaceSubtle,
                        color: item.badgeColor ? (isActive ? '#ffffff' : item.badgeColor) : (isActive ? '#ffffff' : c.textMuted),
                        fontSize: '9.5px',
                        fontWeight: 700,
                        padding: '1.5px 5.5px',
                        borderRadius: '5px',
                        border: `1px solid ${isActive ? 'transparent' : c.border}`,
                        whiteSpace: 'nowrap',
                        marginLeft: '4px',
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

        {/* Bottom User Profile & Settings Bar */}
        <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
          {sidebarCollapsed ? (
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              title={`${userName} (${userRole}) - Click to edit settings`}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: c.primary,
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '12px',
                margin: '0 auto',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              {userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'OP'}
            </button>
          ) : (
            <div
              onClick={() => setShowSettingsModal(true)}
              style={{
                backgroundColor: c.surfaceSubtle,
                border: `1px solid ${c.border}`,
                borderRadius: '10px',
                padding: '9px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Click to view and edit user profile & system settings"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: c.primary,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '11px',
                    flexShrink: 0,
                  }}
                >
                  {userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'OP'}
                </div>
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {userName}
                  </div>
                  <div style={{ fontSize: '10px', color: c.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {userRole}
                  </div>
                </div>
              </div>
              <div
                style={{
                  padding: '4px',
                  borderRadius: '5px',
                  color: c.textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Settings size={14} />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* =========================================================================
          MAIN WORKSPACE CONTENT AREA
      ========================================================================== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
        {/* Compact Professional Header Bar */}
        <header
          style={{
            backgroundColor: c.surface,
            borderBottom: `1px solid ${c.border}`,
            padding: '8px 24px',
            minHeight: '52px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            boxSizing: 'border-box',
          }}
        >
          {/* Left: Active Section & Real Cloud Hardware Org */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: c.text }}>
              {activeTab === 'overview' ? 'Home Overview' :
               activeTab === 'templates' ? 'Template Studio (4-Color E-Paper)' :
               activeTab === 'highlight' ? 'ESL Labels (Tags)' :
               activeTab === 'pricing' ? 'Products & Pricing' :
               activeTab === 'gateways' ? 'Base Stations (APs)' :
               activeTab === 'audit' ? 'Audit Trail' :
               activeTab === 'docs' ? 'Operations & SOPs' : 'Operations'}
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: c.textMuted,
                backgroundColor: c.surfaceSubtle,
                padding: '4px 8px',
                borderRadius: '6px',
                border: `1px solid ${c.border}`,
                fontFamily: 'monospace',
              }}
            >
              <span>ORG: {highlightStatus?.orgCode || 'CU006INDIA0344'}</span>
              <span style={{ color: c.border }}>•</span>
              <span>STATION: 483</span>
            </div>
          </div>

          {/* Right: Cloud Status, Refresh, Notifications, Profile & Sign Out */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Live Data Fetching Indicator */}
            {(loading || isManualRefreshing) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: c.primary,
                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                  border: '1px solid rgba(37, 99, 235, 0.25)',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: c.primary,
                    display: 'inline-block',
                  }}
                  className="anim-blinking-tag"
                />
                <span>Loading live data...</span>
              </div>
            )}

            {/* Real Hardware Cloud Status Dot */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: highlightStatus?.connected ? c.success : c.error,
                backgroundColor: highlightStatus?.connected ? c.successBg : c.errorBg,
                border: `1px solid ${highlightStatus?.connected ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)'}`,
                padding: '4px 10px',
                borderRadius: '12px',
                whiteSpace: 'nowrap',
              }}
              title={highlightStatus?.connected ? 'Highlight Cloud Hardware Gateway Connected' : (highlightStatus?.error || 'Highlight Cloud Offline')}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: highlightStatus?.connected ? c.success : c.error,
                }}
              />
              <span>{highlightStatus?.connected ? 'Cloud Online' : 'Cloud Offline'}</span>
            </div>

            {/* Quick Refresh Icon (Manual On-Demand) */}
            <button
              onClick={handleManualRefresh}
              disabled={isManualRefreshing}
              title="Manual refresh live data on demand"
              style={{
                background: 'transparent',
                border: `1px solid ${c.border}`,
                color: isManualRefreshing ? c.primary : c.textMuted,
                padding: '6px',
                borderRadius: '6px',
                cursor: isManualRefreshing ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = c.text; e.currentTarget.style.borderColor = c.borderStrong; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = isManualRefreshing ? c.primary : c.textMuted; e.currentTarget.style.borderColor = c.border; }}
            >
              <RefreshCw size={13} style={{ transform: isManualRefreshing ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s ease' }} />
            </button>

            {/* Notifications Bell */}
            <button
              onClick={() => {
                setShowNotificationCenter((prev) => !prev);
                setUnreadNotifications(0);
              }}
              style={{
                position: 'relative',
                background: showNotificationCenter ? c.primaryBg : 'transparent',
                border: `1px solid ${showNotificationCenter ? c.primary : c.border}`,
                color: showNotificationCenter ? c.primary : c.textMuted,
                padding: '6px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              title={`Notifications (${notificationHistory.length})`}
            >
              <Bell size={13} />
              {unreadNotifications > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-3px',
                    right: '-3px',
                    backgroundColor: c.error,
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '0 4px',
                    fontSize: '8.5px',
                    fontWeight: 800,
                    minWidth: '14px',
                    textAlign: 'center',
                  }}
                >
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>

            {/* User Profile & Sign Out */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: `1px solid ${c.border}`, paddingLeft: '10px', marginLeft: '4px' }}>
              <div
                onClick={() => setShowSettingsModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}
                title="Account Settings"
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: c.primary,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '10.5px',
                  }}
                >
                  {(userName ? userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'AD')}
                </div>
                <div style={{ lineHeight: 1.15, maxWidth: '110px', overflow: 'hidden' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {userName || userEmail || 'Administrator'}
                  </div>
                  <div style={{ fontSize: '9.5px', color: c.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {userRole || 'SUPER_ADMIN'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                title="Sign Out"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${c.border}`,
                  color: c.textMuted,
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = c.error; e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = c.textMuted; e.currentTarget.style.borderColor = c.border; e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <LogOut size={12} />
                <span>Exit</span>
              </button>
            </div>
          </div>
        </header>

        {/* Floating Toast Notification Stack */}
        <NotificationToastContainer toasts={activeToasts} onDismiss={dismissToast} />

        {/* Activity & Notification History Slide-over Drawer */}
        <NotificationHistoryDrawer
          isOpen={showNotificationCenter}
          onClose={() => setShowNotificationCenter(false)}
          notifications={notificationHistory}
          onClearAll={() => setNotificationHistory([])}
        />

        {/* Workspace Body */}
        <main style={{ padding: '24px 28px', flex: 1, display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Top Loading Progress Bar */}
          {(loading || isManualRefreshing) && <div className="top-loading-bar" />}

          {/* =========================================================================
              MODULE 0: EXECUTIVE HOME OVERVIEW (Visual Graphs & High-Level KPIs)
          ========================================================================== */}
          {activeTab === 'overview' && (
            loading ? (
              <HomeOverviewSkeleton />
            ) : (
              <OverviewHomeView
                fleetStatus={fleet}
                highlightStatus={highlightStatus}
                highlightDevices={highlightDevices}
                skus={skus}
                gateways={gateways}
                auditLogs={auditLogs}
                onNavigate={handleNavigate}
                onSyncFleet={handleSyncHighlight}
                isSyncing={syncingHighlight}
              />
            )
          )}

          {/* =========================================================================
              MODULE 1: FLEET HEALTH & INCIDENT COMMAND (SOW HLT-01, ALR-01)
          ========================================================================== */}
          {activeTab === 'fleet' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Top 5 KPI Summary Strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                {/* Active Stores */}
                <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: c.textMuted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <span>Store Locations</span>
                    <Store size={15} color={c.primaryHover} />
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '6px', color: c.text }}>
                    {stores.length} <span style={{ fontSize: '12px', color: c.textMuted, fontWeight: 500 }}>locations</span>
                  </div>
                  <div style={{ fontSize: '11px', color: c.textMuted, marginTop: '4px' }}>
                    {stores.length === 0 ? 'No physical store configured' : 'Configured retail planograms'}
                  </div>
                </div>

                {/* ESL Fleet Seen < 24h */}
                <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: c.textMuted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <span>Fleet Convergence</span>
                    <TagIcon size={15} color={c.success} />
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '6px', color: c.text }}>
                    {fleet ? `${fleet.convergencePct.toFixed(1)}%` : '100.0%'}
                  </div>
                  <div style={{ fontSize: '11px', color: fleet && fleet.divergedTags > 0 ? c.warning : c.success, marginTop: '4px', fontWeight: 600 }}>
                    {fleet && fleet.divergedTags > 0
                      ? `${fleet.divergedTags} labels updating over radio`
                      : `${fleet ? fleet.totalTags : tags.length} labels in sync`}
                  </div>
                </div>

                {/* Sub-GHz Ceiling APs */}
                <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: c.textMuted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <span>Sub-GHz Base Stations</span>
                    <Radio size={15} color={c.accentViolet} />
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '6px', color: c.text }}>
                    {gateways.length > 0 ? gateways.length : (highlightStatus?.apCount ?? 1)} <span style={{ fontSize: '12px', color: c.textMuted, fontWeight: 500 }}>APs online</span>
                  </div>
                  <div style={{ fontSize: '11px', color: c.textMuted, marginTop: '4px' }}>
                    865 - 868 MHz license-free ISM
                  </div>
                </div>

                {/* POS Price Integrity */}
                <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: c.textMuted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <span>Price Integrity (PRC-04)</span>
                    <ShieldCheck size={15} color={c.success} />
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '6px', color: c.success }}>
                    100.0%
                  </div>
                  <div style={{ fontSize: '11px', color: c.textMuted, marginTop: '4px' }}>
                    Selling price &le; MRP guardrails active
                  </div>
                </div>

                {/* Network Health */}
                <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: c.textMuted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <span>Network Health</span>
                    <CheckCircle2 size={15} color={c.success} />
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '8px', color: c.text }}>
                    {fleet && fleet.divergedTags > 0 ? 'Updating Radio' : 'All Nominal'}
                  </div>
                  <div style={{ fontSize: '11px', color: c.success, marginTop: '4px', fontWeight: 600 }}>
                    0 packet drops • MTTR &lt; 10s
                  </div>
                </div>
              </div>

              {/* Operational Status & Guidance Banner */}
              <div
                style={{
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ backgroundColor: c.success, color: '#ffffff', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, fontSize: '14px', color: '#065f46', whiteSpace: 'nowrap' }}>
                        Fleet Link Operational
                      </span>
                      <span style={{ backgroundColor: '#d1fae5', color: '#047857', fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                        HEALTHY
                      </span>
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#065f46' }}>
                      All Sub-GHz AP base stations are connected. Physical electronic shelf labels are listening on RF channel 11.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setActiveTab('highlight')}
                    style={{
                      backgroundColor: '#ffffff',
                      color: c.text,
                      border: `1px solid ${c.border}`,
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    View Highlight IoT Fleet
                  </button>
                  <button
                    onClick={() => setActiveTab('docs')}
                    style={{
                      backgroundColor: 'transparent',
                      color: c.primaryHover,
                      border: 'none',
                      padding: '6px 10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <BookOpen size={13} /> Operations Guide
                  </button>
                </div>
              </div>

              {/* Self-Explanatory Assistant Phrase */}
              <div
                style={{
                  backgroundColor: c.surfaceSubtle,
                  border: `1px solid ${c.border}`,
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: c.textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Info size={16} color={c.primary} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Tip:</strong> Search products below by SKU or product name. Click <strong>Quick Price</strong> on any tag to push an over-the-air price update to the shelf, or click <strong>Locate</strong> to flash the tag's LED beacon.
                </span>
              </div>

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
                  <CustomSelect
                    value={filterGateway}
                    onChange={(val) => setFilterGateway(val)}
                    size="sm"
                    options={[
                      { value: 'ALL', label: 'All Gateways' },
                      ...gateways.map((gw) => ({ value: gw.hardwareId, label: gw.hardwareId })),
                    ]}
                  />

                  <CustomSelect
                    value={filterStatus}
                    onChange={(val) => setFilterStatus(val as any)}
                    size="sm"
                    options={[
                      { value: 'ALL', label: 'All Statuses' },
                      { value: 'DIVERGED', label: 'Syncing (Diverged)', badge: 'Diverged', badgeColor: '#f59e0b' },
                      { value: 'CONVERGED', label: 'In Sync (Converged)', badge: 'In Sync', badgeColor: '#10b981' },
                      { value: 'LOW_BATTERY', label: 'Low Battery (<20%)', badge: 'Battery', badgeColor: '#ef4444' },
                    ]}
                  />

                  <CustomSelect
                    value={filterSize}
                    onChange={(val) => setFilterSize(val)}
                    size="sm"
                    options={[
                      { value: 'ALL', label: 'All Display Sizes' },
                      { value: 'T154', label: '1.54" (T154)' },
                      { value: 'T213', label: '2.13" (T213)' },
                      { value: 'T290', label: '2.90" (T290)' },
                      { value: 'T420', label: '4.20" (T420)' },
                      { value: 'T750', label: '7.50" (T750)' },
                      { value: 'T1020', label: '10.2" (T1020)' },
                    ]}
                  />

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
                            <span style={{ whiteSpace: 'nowrap' }}>{tag.hardwareId} • {tag.size}</span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', whiteSpace: 'nowrap' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: tag.batteryPct < 20 ? '#dc2626' : '#16a34a' }}>
                                <Battery size={12} /> {tag.batteryPct}%
                              </span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#6366f1' }}>
                                <Wifi size={12} /> {tag.rssi}dBm
                              </span>
                            </div>
                          </div>

                          {/* Promo Badge */}
                          {sku?.promoBadge ? (
                            <div style={{ backgroundColor: '#111827', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', display: 'inline-block', marginTop: '8px', whiteSpace: 'nowrap' }}>
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
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '26px', fontWeight: 900, color: '#090d16', letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>
                                ₹{formatRupees(sku.priceMinor)}
                              </span>
                              {sku.mrpMinor > sku.priceMinor && (
                                <span style={{ fontSize: '13px', color: '#94a3b8', textDecoration: 'line-through', whiteSpace: 'nowrap' }}>
                                  ₹{formatRupees(sku.mrpMinor)}
                                </span>
                              )}
                              {sku.mrpMinor > sku.priceMinor && (
                                <span style={{ backgroundColor: '#fef08a', color: '#854d0e', padding: '1px 5px', borderRadius: '3px', fontSize: '10px', fontWeight: 800, whiteSpace: 'nowrap' }}>
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
                            <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>AP: {tag.gatewayHardwareId}</span>
                            {tag.isDiverged ? (
                              <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: '10px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                                Syncing v{tag.reportedVersion} -&gt; v{tag.desiredVersion}
                              </span>
                            ) : (
                              <span style={{ color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                                <Check size={11} strokeWidth={3} /> In Sync (v{tag.reportedVersion})
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
                                backgroundColor: '#2563eb',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <DollarSign size={12} /> Update Price
                            </button>
                            <button
                              onClick={(e) => handleLocateTag(tag.hardwareId, tag.gatewayHardwareId, e)}
                              style={{
                                flex: 1,
                                backgroundColor: blinkingTagIds.has(tag.hardwareId) ? '#fef3c7' : '#f1f5f9',
                                color: blinkingTagIds.has(tag.hardwareId) ? '#b45309' : '#0f172a',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                padding: '6px 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Zap size={12} fill={blinkingTagIds.has(tag.hardwareId) ? '#16a34a' : 'none'} color={blinkingTagIds.has(tag.hardwareId) ? '#16a34a' : '#64748b'} /> {blinkingTagIds.has(tag.hardwareId) ? 'Stop LED' : 'Flash LED'}
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
                        <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>HARDWARE ID</th>
                        <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>PRODUCT SKU</th>
                        <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>STORE & AP</th>
                        <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>PRICE / MRP</th>
                        <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>BATTERY</th>
                        <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>SIGNAL (BLE)</th>
                        <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>VERSION</th>
                        <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>STATUS</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTags.map((tag) => (
                        <tr key={tag.id} style={{ borderBottom: `1px solid ${c.border}`, cursor: 'pointer' }} onClick={() => setInspectTagId(tag.id)}>
                          <td style={{ padding: '10px 12px', fontWeight: 700, fontFamily: 'monospace', color: c.text, whiteSpace: 'nowrap' }}>
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
                          <td style={{ padding: '10px 12px', color: c.textMuted, whiteSpace: 'nowrap' }}>
                            {tag.storeName} <span style={{ fontSize: '10px' }}>(AP: {tag.gatewayHardwareId})</span>
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            {tag.sku ? (
                              <span style={{ fontWeight: 800, color: c.success }}>
                                ₹{formatRupees(tag.sku.priceMinor)}
                              </span>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: tag.batteryPct < 20 ? c.error : c.success, whiteSpace: 'nowrap' }}>
                            {tag.batteryPct}%
                          </td>
                          <td style={{ padding: '10px 12px', color: c.accentViolet, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                            {tag.rssi} dBm
                          </td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                            v{tag.reportedVersion} / <span style={{ color: tag.isDiverged ? c.warning : c.success, fontWeight: 700 }}>v{tag.desiredVersion}</span>
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
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
                          <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={(e) => handleOpenQuickPriceModal(tag, e)}
                                style={{ backgroundColor: c.surfaceSubtle, color: c.primaryHover, border: `1px solid ${c.border}`, borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                              >
                                Price
                              </button>
                              <button
                                onClick={(e) => handleLocateTag(tag.hardwareId, tag.gatewayHardwareId, e)}
                                style={{
                                  backgroundColor: blinkingTagIds.has(tag.hardwareId) ? '#dcfce7' : c.surfaceSubtle,
                                  color: blinkingTagIds.has(tag.hardwareId) ? '#15803d' : c.text,
                                  border: `1px solid ${blinkingTagIds.has(tag.hardwareId) ? '#86efac' : c.border}`,
                                  borderRadius: '4px',
                                  padding: '3px 8px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <Zap size={11} fill={blinkingTagIds.has(tag.hardwareId) ? '#16a34a' : 'none'} color={blinkingTagIds.has(tag.hardwareId) ? '#16a34a' : '#64748b'} />
                                <span>{blinkingTagIds.has(tag.hardwareId) ? 'Stop' : 'Flash'}</span>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setInspectTagId(tag.id); }}
                                style={{ backgroundColor: c.surfaceSubtle, color: c.textMuted, border: `1px solid ${c.border}`, borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
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
              MODULE: HIGHLIGHT IOT CLOUD HARDWARE FLEET
          ========================================================================== */}
          {activeTab === 'highlight' && (
            loading ? (
              <HighlightFleetSkeleton />
            ) : (
              <HighlightFleetView
                highlightStatus={highlightStatus}
                highlightDevices={highlightDevices}
                highlightTemplates={highlightTemplates}
                highlightProducts={highlightProducts}
                syncingHighlight={syncingHighlight}
                onSyncHighlight={handleSyncHighlight}
                onLocateDevice={handleLocateHighlightDevice}
                onFlashDevice={handleFlashHighlightDevice}
                onStopFlashDevice={handleStopFlashHighlightDevice}
                onOpenOtaModal={handleOpenHighlightOtaModal}
                onOpenPairModal={handleOpenPairModal}
                onUnbindDevice={handleOpenUnbindModal}
                onOpenCsvModal={handleOpenCsvModal}
                onRenameDevice={handleRenameDevice}
                blinkingTagIds={blinkingTagIds}
              />
            )
          )}

          {/* =========================================================================
              MODULE 3: PRICING & LIVE PUBLISH TRACKER (SOW §9, PRC-04, PRC-06)
          ========================================================================== */}
          {activeTab === 'pricing' && (
            loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Skeleton width="280px" height="22px" />
                    <Skeleton width="380px" height="13px" />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Skeleton width="130px" height="32px" borderRadius="6px" />
                    <Skeleton width="110px" height="32px" borderRadius="6px" />
                    <Skeleton width="120px" height="32px" borderRadius="6px" />
                  </div>
                </div>
                <TableSkeleton rows={8} columns={8} />
              </div>
            ) : (
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
                    style={{ backgroundColor: c.surfaceSubtle, color: c.text, border: `1px solid ${c.border}`, borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                  >
                    <RotateCcw size={13} /> Reset to MRP
                  </button>
                  <button
                    onClick={() => setShowAddSkuModal(true)}
                    style={{ backgroundColor: c.primary, color: '#ffffff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
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
                    style={{ backgroundColor: '#fef2f2', color: c.error, border: '1px solid #fca5a5', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
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

              {/* Highlight Cloud Catalog & SKU Pricing */}
              <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Package size={16} color={c.primary} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: c.text }}>
                      Highlight Cloud Catalog ({highlightProducts.length > 0 ? highlightProducts.length : skus.length} Live Items)
                    </span>
                    <span style={{ fontSize: '11px', color: c.textMuted, backgroundColor: c.surfaceSubtle, padding: '2px 8px', borderRadius: '4px', border: `1px solid ${c.border}` }}>
                      Org: CU006INDIA0344:483
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={fetchHighlightData}
                      disabled={syncingHighlight}
                      style={{
                        backgroundColor: c.surfaceSubtle,
                        color: c.text,
                        border: `1px solid ${c.border}`,
                        borderRadius: '6px',
                        padding: '5px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <RefreshCw size={12} style={{ animation: syncingHighlight ? 'spin 1s linear infinite' : 'none' }} />
                      <span>Refresh Catalog</span>
                    </button>
                    <button
                      onClick={handleOpenCsvModal}
                      style={{
                        backgroundColor: c.surfaceSubtle,
                        color: c.text,
                        border: `1px solid ${c.border}`,
                        borderRadius: '6px',
                        padding: '5px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <FileSpreadsheet size={12} color={c.primary} />
                      <span>Batch CSV / Excel</span>
                    </button>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: c.surfaceSubtle, color: c.textMuted, borderBottom: `1px solid ${c.border}` }}>
                        <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>SKU CODE</th>
                        <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>COMMODITY TITLE</th>
                        <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>SELLING PRICE (₹)</th>
                        <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>MRP (₹)</th>
                        <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>DISCOUNT</th>
                        <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>PROMOTIONAL CAMPAIGN</th>
                        <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>PAIRED HARDWARE TAG</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {highlightProducts.length > 0 ? (
                        highlightProducts.map((p) => {
                          const priceNum = typeof p.price === 'number' ? p.price : parseFloat(String(p.price)) || 0;
                          const mrpMatch = p.custFeature2?.match(/\d+(\.\d+)?/);
                          const mrpNum = mrpMatch ? parseFloat(mrpMatch[0]) : priceNum;
                          const discountPct = mrpNum > priceNum ? Math.round(((mrpNum - priceNum) / mrpNum) * 100) : 0;
                          const promoBadge = p.custFeature3?.replace(/^PROMO:\s*/i, '') || p.copyWriting;
                          const pairedDev = highlightDevices.find((d) => d.skuCode === p.uniqueId);

                          return (
                            <tr
                              key={p.uniqueId}
                              style={{ borderBottom: `1px solid ${c.border}`, transition: 'background-color 0.15s ease' }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = c.surfaceSubtle)}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <td style={{ padding: '10px 14px', fontWeight: 700, fontFamily: 'monospace', color: c.primaryHover, whiteSpace: 'nowrap' }}>
                                {p.uniqueId}
                              </td>
                              <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                <div style={{ fontWeight: 600, color: c.text }}>{p.prodName}</div>
                                {p.custFeature1 && (
                                  <div style={{ fontSize: '11px', color: c.textMuted }}>{p.custFeature1}</div>
                                )}
                              </td>
                              <td style={{ padding: '10px 14px', fontWeight: 800, color: c.success, fontSize: '14px', whiteSpace: 'nowrap' }}>
                                ₹{priceNum.toFixed(2)}
                              </td>
                              <td style={{ padding: '10px 14px', color: c.textMuted, whiteSpace: 'nowrap' }}>
                                ₹{mrpNum.toFixed(2)}
                              </td>
                              <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                {discountPct > 0 ? (
                                  <span style={{ backgroundColor: 'rgba(217, 119, 6, 0.15)', color: c.warning, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                                    {discountPct}% OFF
                                  </span>
                                ) : (
                                  <span style={{ color: c.textMuted }}>Standard</span>
                                )}
                              </td>
                              <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                {promoBadge ? (
                                  <span style={{ backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                                    {promoBadge}
                                  </span>
                                ) : (
                                  <span style={{ color: c.textMuted }}>None</span>
                                )}
                              </td>
                              <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                {pairedDev ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: c.text, fontWeight: 600, fontFamily: 'monospace' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: c.success }}></span>
                                    <span>{pairedDev.deviceNumber}</span>
                                  </span>
                                ) : (
                                  <span style={{ color: c.textMuted, fontSize: '11px' }}>Unassigned</span>
                                )}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                {pairedDev ? (
                                  <button
                                    onClick={() => handleOpenHighlightOtaModal(pairedDev)}
                                    style={{ backgroundColor: c.primary, color: '#ffffff', border: 'none', borderRadius: '4px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                  >
                                    <Zap size={11} />
                                    <span>Push OTA</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setActiveTab('highlight');
                                      handleOpenPairModal(undefined, p);
                                    }}
                                    style={{ backgroundColor: c.surfaceSubtle, color: c.primaryHover, border: `1px solid ${c.border}`, borderRadius: '4px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <Link2 size={11} />
                                    <span>Pair Tag</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        skus.map((sku) => {
                          const discountPct = sku.mrpMinor > sku.priceMinor ? Math.round(((sku.mrpMinor - sku.priceMinor) / sku.mrpMinor) * 100) : 0;
                          return (
                            <tr key={sku.id} style={{ borderBottom: `1px solid ${c.border}` }}>
                              <td style={{ padding: '10px 14px', fontWeight: 700, fontFamily: 'monospace', color: c.primaryHover }}>{sku.code}</td>
                              <td style={{ padding: '10px 14px', fontWeight: 600, color: c.text }}>{sku.name}</td>
                              <td style={{ padding: '10px 14px', fontWeight: 800, color: c.success, fontSize: '14px' }}>₹{formatRupees(sku.priceMinor)}</td>
                              <td style={{ padding: '10px 14px', color: c.textMuted }}>₹{formatRupees(sku.mrpMinor)}</td>
                              <td style={{ padding: '10px 14px' }}>
                                {discountPct > 0 ? (
                                  <span style={{ backgroundColor: 'rgba(217, 119, 6, 0.15)', color: c.warning, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                                    {discountPct}% OFF
                                  </span>
                                ) : (
                                  <span style={{ color: c.textMuted }}>Standard</span>
                                )}
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                {sku.promoBadge ? (
                                  <span style={{ backgroundColor: c.surfaceSubtle, color: c.warning, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, border: `1px solid ${c.border}` }}>
                                    {sku.promoBadge}
                                  </span>
                                ) : (
                                  <span style={{ color: c.textMuted }}>None</span>
                                )}
                              </td>
                              <td style={{ padding: '10px 14px', fontWeight: 700, color: c.text }}>{sku.tagCount ?? 1}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                <button
                                  onClick={() => setShowEditSkuModal(sku)}
                                  style={{ backgroundColor: c.surfaceSubtle, color: c.primaryHover, border: `1px solid ${c.border}`, borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                  Edit Price
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            )
          )}

          {/* =========================================================================
              MODULE 4: GATEWAYS & LABEL REGISTRY (SOW §6, GW-01, LBL-01)
          ========================================================================== */}
          {activeTab === 'gateways' && (
            loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Skeleton width="280px" height="22px" />
                    <Skeleton width="340px" height="13px" />
                  </div>
                  <Skeleton width="210px" height="34px" borderRadius="6px" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                  <KpiCardSkeleton />
                  <KpiCardSkeleton />
                </div>
                <TableSkeleton rows={5} columns={6} />
              </div>
            ) : (
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
            )
          )}

          {/* =========================================================================
              MODULE 5: AUDIT & DIAGNOSTICS (SOW §8, LOG-01, CERT-In)
          ========================================================================== */}
          {activeTab === 'audit' && (
            loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Skeleton width="280px" height="22px" />
                    <Skeleton width="380px" height="13px" />
                  </div>
                  <Skeleton width="200px" height="30px" borderRadius="6px" />
                </div>
                <TableSkeleton rows={8} columns={7} />
              </div>
            ) : (
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
                      await apiFetch(`${API_BASE}/api/chaos/burst-collapse-test`, { method: 'POST' });
                      fetchData();
                    }}
                    style={{ backgroundColor: '#ede9fe', color: '#5b21b6', border: `1px solid ${c.border}`, borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                  >
                    <Zap size={14} color="#7c3aed" />
                    <span>Test Burst &amp; Collapse (HP 2)</span>
                  </button>

                  <button
                    onClick={async () => {
                      showToast('Running Hard Problem 3: Battery-Aware Hash Skip...');
                      await apiFetch(`${API_BASE}/api/chaos/hash-skip-test`, { method: 'POST' });
                      fetchData();
                    }}
                    style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: `1px solid ${c.border}`, borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                  >
                    <Battery size={14} color="#0284c7" />
                    <span>Test Battery Hash Skip (HP 3)</span>
                  </button>

                  <button
                    onClick={async () => {
                      showToast('Injecting 12% low battery safety NACK...');
                      await apiFetch(`${API_BASE}/api/chaos/inject-fault`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tagId: 'tag-001', faultType: 'LOW_BATTERY' }) });
                      fetchData();
                    }}
                    style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: `1px solid ${c.border}`, borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                  >
                    <ShieldAlert size={14} color="#dc2626" />
                    <span>Test Low Battery Guard (HP 7)</span>
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
            )
          )}

          {/* =========================================================================
              MODULE: 4-COLOR ESL TEMPLATE STUDIO
          ========================================================================== */}
          {activeTab === 'templates' && (
            <TemplateStudioView />
          )}

          {/* =========================================================================
              MODULE 6: OPERATIONS GUIDE & CUSTOMER DOCUMENTATION
          ========================================================================== */}
          {activeTab === 'docs' && (
            <DocumentationView highlightDevices={highlightDevices} />
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
                    <span style={{ whiteSpace: 'nowrap' }}>{tagDetail.hardwareId} ({tagDetail.size})</span>
                    <span style={{ whiteSpace: 'nowrap' }}>Battery: {tagDetail.batteryPct}% • Signal: {tagDetail.rssi} dBm</span>
                  </div>
                  {inspectorPromo ? (
                    <div style={{ backgroundColor: '#111827', color: '#ffffff', padding: '2px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 800, display: 'inline-block', marginTop: '6px', whiteSpace: 'nowrap' }}>
                      {inspectorPromo}
                    </div>
                  ) : <div style={{ height: '14px' }}></div>}
                  <div style={{ fontSize: '16px', fontWeight: 800, margin: '4px 0' }}>
                    {tagDetail.sku ? tagDetail.sku.name : 'Unpaired Tag'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '28px', fontWeight: 900, whiteSpace: 'nowrap' }}>₹{inspectorPriceRupees || '0.00'}</span>
                    {inspectorMrpRupees && parseFloat(inspectorMrpRupees) > parseFloat(inspectorPriceRupees || '0') && (
                      <span style={{ color: '#94a3b8', textDecoration: 'line-through', fontSize: '14px', whiteSpace: 'nowrap' }}>₹{inspectorMrpRupees}</span>
                    )}
                  </div>
                </div>

                {/* 2. State Configuration Diff (Cloud vs Hardware) */}
                <div style={{ backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, borderRadius: '10px', padding: '14px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: c.textMuted, textTransform: 'uppercase' }}>State Configuration Diff (SOW LBL-06):</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px', fontSize: '12px', fontFamily: 'monospace' }}>
                    <div style={{ backgroundColor: '#ffffff', border: `1px solid ${c.border}`, padding: '8px 10px', borderRadius: '6px' }}>
                      <div style={{ color: c.primaryHover, fontWeight: 700 }}>CLOUD DESIRED</div>
                      <div>Version: <strong>v{tagDetail.desiredVersion}</strong></div>
                      <div style={{ fontSize: '10px', color: c.textMuted, marginTop: '2px' }}>Hash: {tagDetail.desiredHash?.slice(0, 8)}...</div>
                    </div>
                    <div style={{ backgroundColor: '#ffffff', border: `1px solid ${c.border}`, padding: '8px 10px', borderRadius: '6px' }}>
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
                  showToast('Guardrail Violation (PRC-04): Selling price cannot exceed MRP.');
                  return;
                }

                try {
                  const res = await apiFetch(`${API_BASE}/api/skus`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      storeId: stores[0]?.id || '',
                      code,
                      name,
                      priceMinor,
                      mrpMinor,
                      promoBadge: promo.trim() ? promo.trim() : null,
                    }),
                  });
                  if (res.ok) {
                    showToast(`Created SKU ${code}.`);
                    setShowAddSkuModal(false);
                    fetchData();
                  } else {
                    const err = await res.json();
                    showToast(err.error || 'Failed to create SKU');
                  }
                } catch {
                  showToast('Failed to create SKU');
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}
            >
              <div>
                <label style={{ display: 'block', color: c.textMuted, marginBottom: '2px' }}>SKU Code:</label>
                <input name="skuCode" type="text" required placeholder="e.g. SKU-10042" style={{ width: '100%', backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, color: c.text, padding: '6px', borderRadius: '6px', fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={{ display: 'block', color: c.textMuted, marginBottom: '2px' }}>Product Title:</label>
                <input name="skuName" type="text" required placeholder="e.g. Organic Rolled Oats 500g" style={{ width: '100%', backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, color: c.text, padding: '6px', borderRadius: '6px' }} />
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
              <button type="submit" style={{ backgroundColor: c.primary, color: '#ffffff', border: 'none', borderRadius: '6px', padding: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginTop: '6px', whiteSpace: 'nowrap' }}>
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
                  showToast('Guardrail Violation (PRC-04): Selling price cannot exceed MRP.');
                  return;
                }

                try {
                  const res = await apiFetch(`${API_BASE}/api/skus/${showEditSkuModal.id}`, {
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
                    showToast(`Updated ${showEditSkuModal.code}. Synchronizing labels...`);
                    setShowEditSkuModal(null);
                    fetchData();
                  } else {
                    const err = await res.json();
                    showToast(err.error || 'Failed to update SKU');
                  }
                } catch {
                  showToast('Failed to update SKU');
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
              <button type="submit" style={{ backgroundColor: c.primary, color: '#ffffff', border: 'none', borderRadius: '6px', padding: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginTop: '6px', whiteSpace: 'nowrap' }}>
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
                  const res = await apiFetch(`${API_BASE}/api/tags`, {
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
                    showToast(`Registered tag ${hardwareId}.`);
                    setShowAddTagModal(false);
                    fetchData();
                  }
                } catch {
                  showToast('Failed to register tag');
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
                  Quick Price Update
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
                    whiteSpace: 'nowrap',
                  }}
                >
                  Dispatch Price to Radio
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
                  Provision Access Point (AP)
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
                    whiteSpace: 'nowrap',
                  }}
                >
                  Save & Provision AP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Highlight Cloud Physical ESL OTA Price Push Modal */}
      {showHighlightOtaModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowHighlightOtaModal(null)}
        >
          <div
            style={{
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: '12px',
              padding: '22px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: `1px solid ${c.border}`, paddingBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: c.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={18} color="#eab308" /> Physical ESL OTA Price Push
                </h3>
                <span style={{ fontSize: '11px', color: c.textMuted, fontFamily: 'monospace' }}>
                  Tag: {showHighlightOtaModal.deviceNumber} • AP: {showHighlightOtaModal.stationId || 'E43819636067'}
                </span>
              </div>
              <button
                onClick={() => setShowHighlightOtaModal(null)}
                style={{ background: 'transparent', border: 'none', color: c.textMuted, cursor: 'pointer', fontSize: '20px', fontWeight: 800 }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
              <div>
                <label style={{ display: 'block', color: c.textMuted, fontWeight: 700, marginBottom: '4px' }}>
                  SKU Code:
                </label>
                <input
                  type="text"
                  value={otaSkuCode}
                  onChange={(e) => setOtaSkuCode(e.target.value)}
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
                  Product Title:
                </label>
                <input
                  type="text"
                  value={otaSkuName}
                  onChange={(e) => setOtaSkuName(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: c.surfaceSubtle,
                    border: `1px solid ${c.border}`,
                    color: c.text,
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', color: c.textMuted, fontWeight: 700, marginBottom: '4px' }}>
                    Selling Price (₹):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={otaPrice}
                    onChange={(e) => setOtaPrice(e.target.value)}
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
                    value={otaMrp}
                    onChange={(e) => setOtaMrp(e.target.value)}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', color: c.textMuted, fontWeight: 700, marginBottom: '4px' }}>
                    Promo Badge:
                  </label>
                  <input
                    type="text"
                    value={otaPromo}
                    onChange={(e) => setOtaPromo(e.target.value)}
                    placeholder="e.g. SPECIAL OFFER"
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
                <div>
                  <label style={{ display: 'block', color: c.textMuted, fontWeight: 700, marginBottom: '4px' }}>
                    Cloud Template:
                  </label>
                  <select
                    value={otaTemplateId}
                    onChange={(e) => setOtaTemplateId(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: c.surfaceSubtle,
                      border: `1px solid ${c.border}`,
                      color: c.text,
                      padding: '8px 10px',
                      borderRadius: '6px',
                    }}
                  >
                    {highlightTemplates.map((t) => (
                      <option key={t.templateId} value={t.templateId}>
                        {t.templateName || `Template #${t.templateId}`}
                      </option>
                    ))}
                    {highlightTemplates.length === 0 && (
                      <>
                        <option value="1213">1213 (2.9" 3-Color)</option>
                        <option value="1212">1212 (5.8" 3-Color)</option>
                        <option value="1214">1214 (1.8" 3-Color)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div style={{ backgroundColor: 'rgba(5, 150, 105, 0.1)', border: '1px solid rgba(5, 150, 105, 0.25)', borderRadius: '6px', padding: '10px', fontSize: '11px', color: c.success }}>
                OTA transmission updates Highlight cloud catalog and dispatches an immediate <code>bindingPos</code> command over Sub-GHz radio to AP <strong>{showHighlightOtaModal.stationId || 'E43819636067'}</strong>.
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  onClick={() => setShowHighlightOtaModal(null)}
                  disabled={isPushingOta}
                  style={{
                    flex: 1,
                    backgroundColor: c.surfaceSubtle,
                    color: c.text,
                    border: `1px solid ${c.border}`,
                    borderRadius: '6px',
                    padding: '10px',
                    fontWeight: 600,
                    cursor: isPushingOta ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteHighlightOtaPush}
                  disabled={isPushingOta}
                  style={{
                    flex: 2,
                    backgroundColor: isPushingOta ? c.surfaceSubtle : c.primary,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: isPushingOta ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  {isPushingOta ? (
                    <>
                      <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      <span style={{ whiteSpace: 'nowrap' }}>Broadcasting to AP...</span>
                    </>
                  ) : (
                    <span style={{ whiteSpace: 'nowrap' }}>Transmit OTA to Tag</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STUDIO MODAL: PAIR PHYSICAL HARDWARE TAG WITH PRODUCT SKU
      ========================================================================== */}
      {showPairModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowPairModal(null)}
        >
          <div
            style={{
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '840px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: `1px solid ${c.border}`, paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: c.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link2 size={18} color={c.primary} />
                  <span>Hardware Tag Pairing Studio</span>
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: c.textMuted }}>
                  Bind a real Highlight ESL label with a product SKU and dispatch an over-the-air display update via AP <strong>E43819636067</strong>.
                </p>
              </div>
              <button
                onClick={() => setShowPairModal(null)}
                style={{ background: 'transparent', border: 'none', color: c.textMuted, cursor: 'pointer', fontSize: '22px', fontWeight: 700 }}
              >
                &times;
              </button>
            </div>

            {/* Quick Catalog Presets */}
            <div style={{ marginBottom: '16px', backgroundColor: c.surfaceSubtle, padding: '10px 14px', borderRadius: '8px', border: `1px solid ${c.border}` }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Highlight Cloud Catalog (${highlightProducts.length} Live Items):</span>
                <span style={{ color: c.primary, fontWeight: 500, fontSize: '10px' }}>1-Click Auto-Fill</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {highlightProducts.length > 0 ? (
                  highlightProducts.map((p) => {
                    const mrpMatch = p.custFeature2?.match(/\d+(\.\d+)?/);
                    const mrpVal = mrpMatch ? mrpMatch[0] : (typeof p.price === 'number' ? p.price.toFixed(2) : String(p.price));
                    const isSelected = pairSkuCode === p.uniqueId;
                    return (
                      <button
                        key={p.uniqueId}
                        type="button"
                        onClick={() => {
                          setPairSkuCode(p.uniqueId);
                          setPairProdName(p.prodName);
                          setPairHindiName(p.custFeature1 || '');
                          setPairPrice(typeof p.price === 'number' ? p.price.toFixed(2) : String(p.price));
                          setPairMrp(mrpVal);
                          setPairPromo(p.custFeature3?.replace(/^PROMO:\s*/i, '') || p.copyWriting || '');
                          setPairTemplateId('1256');
                        }}
                        style={{
                          backgroundColor: isSelected ? c.primaryBg : c.surface,
                          border: `1px solid ${isSelected ? c.primary : c.border}`,
                          borderRadius: '6px',
                          padding: '5px 10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: c.text,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span style={{ fontFamily: 'monospace', color: c.primary, fontSize: '11px' }}>{p.uniqueId}</span>
                        <span>{p.prodName}</span>
                        <span style={{ color: c.success, fontWeight: 700 }}>₹{typeof p.price === 'number' ? p.price.toFixed(2) : p.price}</span>
                      </button>
                    );
                  })
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setPairSkuCode('SKU-KLK-750');
                        setPairProdName('Bada Wala Kalakand (Special 500g)');
                        setPairHindiName('बड़ा वाला कलाकंद स्पेशल');
                        setPairPrice('245.00');
                        setPairMrp('280.00');
                        setPairPromo('SAVE ₹35');
                        setPairTemplateId('1256');
                      }}
                      style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '4px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, color: c.text, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Bada Wala Kalakand (₹245)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPairSkuCode('123456');
                        setPairProdName('Kalakand');
                        setPairHindiName('per piece');
                        setPairPrice('16.00');
                        setPairMrp('20.00');
                        setPairPromo('FRESH');
                        setPairTemplateId('1256');
                      }}
                      style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '4px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, color: c.text, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Kalakand (₹16)
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Two-Column Grid: Form Controls vs Live E-Paper Preview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
              {/* Left Column: Form Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                <div>
                  <label style={{ display: 'block', color: c.textMuted, fontWeight: 600, marginBottom: '4px' }}>
                    Select Physical Highlight ESL Device:
                  </label>
                  <select
                    value={pairDeviceNumber}
                    onChange={(e) => {
                      const selected = e.target.value;
                      setPairDeviceNumber(selected);
                      if (selected === '8003152970') setPairTemplateId('1256');
                      else if (selected === '8003144211') setPairTemplateId('1217');
                    }}
                    style={{
                      width: '100%',
                      backgroundColor: c.surfaceSubtle,
                      border: `1px solid ${c.border}`,
                      color: c.text,
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                    }}
                  >
                    {highlightDevices.map((d) => (
                      <option key={d.deviceNumber} value={d.deviceNumber}>
                        {d.deviceNumber} • Signal: {d.signal ? `${d.signal} dBm` : '-70 dBm'} • Battery: {((d.powerLevel ?? 5) * 20)}% {d.deviceNumber === '8003152970' ? '(7.5" HS750-M)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', color: c.textMuted, fontWeight: 600, marginBottom: '4px' }}>
                      SKU Code:
                    </label>
                    <input
                      type="text"
                      value={pairSkuCode}
                      onChange={(e) => setPairSkuCode(e.target.value)}
                      placeholder="e.g. SKU-DAL-1KG"
                      style={{
                        width: '100%',
                        backgroundColor: c.surfaceSubtle,
                        border: `1px solid ${c.border}`,
                        color: c.text,
                        padding: '8px 10px',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: c.textMuted, fontWeight: 600, marginBottom: '4px' }}>
                      Promotional Tagline:
                    </label>
                    <input
                      type="text"
                      value={pairPromo}
                      onChange={(e) => setPairPromo(e.target.value)}
                      placeholder="e.g. SPECIAL OFFER"
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
                </div>

                <div>
                  <label style={{ display: 'block', color: c.textMuted, fontWeight: 600, marginBottom: '4px' }}>
                    Product Title (English):
                  </label>
                  <input
                    type="text"
                    value={pairProdName}
                    onChange={(e) => setPairProdName(e.target.value)}
                    placeholder="e.g. Bada Wala Kalakand 500g"
                    style={{
                      width: '100%',
                      backgroundColor: c.surfaceSubtle,
                      border: `1px solid ${c.border}`,
                      color: c.text,
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: c.textMuted, fontWeight: 600, marginBottom: '4px' }}>
                    Regional / Hindi Name (custFeature1):
                  </label>
                  <input
                    type="text"
                    value={pairHindiName}
                    onChange={(e) => setPairHindiName(e.target.value)}
                    placeholder="e.g. बड़ा वाला कलाकंद"
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', color: c.textMuted, fontWeight: 600, marginBottom: '4px' }}>
                      Selling Price (₹):
                    </label>
                    <input
                      type="number"
                      step="0.50"
                      value={pairPrice}
                      onChange={(e) => setPairPrice(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: c.surfaceSubtle,
                        border: `1px solid ${c.border}`,
                        color: c.text,
                        padding: '8px 10px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: c.textMuted, fontWeight: 600, marginBottom: '4px' }}>
                      MRP (₹):
                    </label>
                    <input
                      type="number"
                      step="0.50"
                      value={pairMrp}
                      onChange={(e) => setPairMrp(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: c.surfaceSubtle,
                        border: `1px solid ${c.border}`,
                        color: c.text,
                        padding: '8px 10px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', color: c.textMuted, fontWeight: 600, marginBottom: '4px' }}>
                    E-Paper Display Template:
                  </label>
                  <select
                    value={pairTemplateId}
                    onChange={(e) => setPairTemplateId(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: c.surfaceSubtle,
                      border: `1px solid ${c.border}`,
                      color: c.text,
                      padding: '8px 10px',
                      borderRadius: '6px',
                    }}
                  >
                    {highlightTemplates.map((t) => (
                      <option key={t.templateId} value={t.templateId}>
                        {t.templateName || `Template #${t.templateId}`} {t.templateId === '1256' ? '(Recommended for 7.5")' : ''}
                      </option>
                    ))}
                    {highlightTemplates.length === 0 && (
                      <>
                        <option value="1256">1256 - Bada wala kalakand (7.5" HS750-M)</option>
                        <option value="1213">1213 - 2.9" BWRY Standard</option>
                        <option value="1217">1217 - 4.2" BWRY Medium</option>
                        <option value="1212">1212 - 5.8" BWRY Large</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Right Column: Live E-Paper Screen Simulation Preview */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Live E-Paper Screen Preview</span>
                  <span style={{ fontSize: '10px', backgroundColor: c.surfaceSubtle, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${c.border}`, color: c.textSecondary }}>
                    Template #{pairTemplateId}
                  </span>
                </div>

                {/* Hardware Bezel */}
                <div
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: '14px',
                    padding: '14px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    border: '2px solid #334155',
                  }}
                >
                  {/* E-Ink Matte Display Canvas */}
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      padding: '14px',
                      minHeight: '260px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: '1px solid #cbd5e1',
                    }}
                  >
                    {/* Top Header: Promo Badge + Product Name */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'nowrap', gap: '8px' }}>
                        {pairPromo ? (
                          <span
                            style={{
                              backgroundColor: '#dc2626',
                              color: '#ffffff',
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '3px',
                              whiteSpace: 'nowrap',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            {pairPromo}
                          </span>
                        ) : <span />}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <img src={quickshelfIcon} alt="QuickShelf" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                          <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
                            QuickShelf ESL
                          </span>
                        </div>
                      </div>

                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                        {pairProdName || 'Product Title'}
                      </div>
                      {pairHindiName && (
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginTop: '2px' }}>
                          {pairHindiName}
                        </div>
                      )}
                    </div>

                    {/* Middle: Large Price Block */}
                    <div style={{ margin: '14px 0', borderTop: '1px dashed #cbd5e1', borderBottom: '1px dashed #cbd5e1', padding: '10px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>₹</span>
                        <span style={{ fontSize: '38px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                          {parseFloat(pairPrice || '0').toFixed(0)}
                        </span>
                        <span style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                          .{(parseFloat(pairPrice || '0') % 1).toFixed(2).substring(2)}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>
                          / 1 unit
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '11px' }}>
                        <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontWeight: 600 }}>
                          MRP: ₹{parseFloat(pairMrp || '0').toFixed(0)}
                        </span>
                        {parseFloat(pairMrp || '0') > parseFloat(pairPrice || '0') && (
                          <span style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '1px 6px', borderRadius: '3px', fontWeight: 700 }}>
                            SAVE ₹{(parseFloat(pairMrp || '0') - parseFloat(pairPrice || '0')).toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom: Simulated Barcode & Sub-GHz AP Info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        {/* Barcode lines */}
                        <div style={{ display: 'flex', gap: '2px', height: '18px', alignItems: 'flex-end', marginBottom: '2px' }}>
                          <span style={{ width: '2px', height: '18px', backgroundColor: '#0f172a' }} />
                          <span style={{ width: '1px', height: '18px', backgroundColor: '#0f172a' }} />
                          <span style={{ width: '3px', height: '18px', backgroundColor: '#0f172a' }} />
                          <span style={{ width: '1px', height: '18px', backgroundColor: '#0f172a' }} />
                          <span style={{ width: '2px', height: '18px', backgroundColor: '#0f172a' }} />
                          <span style={{ width: '4px', height: '18px', backgroundColor: '#0f172a' }} />
                          <span style={{ width: '1px', height: '18px', backgroundColor: '#0f172a' }} />
                          <span style={{ width: '2px', height: '18px', backgroundColor: '#0f172a' }} />
                          <span style={{ width: '1px', height: '18px', backgroundColor: '#0f172a' }} />
                          <span style={{ width: '3px', height: '18px', backgroundColor: '#0f172a' }} />
                        </div>
                        <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#64748b', fontWeight: 600 }}>
                          {pairSkuCode || 'SKU-000000'}
                        </span>
                      </div>

                      <div style={{ fontSize: '9px', color: '#64748b', textAlign: 'right', fontFamily: 'monospace' }}>
                        <div>Tag: {pairDeviceNumber}</div>
                        <div>AP: E43819636067</div>
                      </div>
                    </div>
                  </div>
                </div>

                <p style={{ margin: '8px 0 0', fontSize: '11px', color: c.textMuted, lineHeight: 1.4 }}>
                  Clicking <strong>Pair & Transmit OTA</strong> creates/updates the SKU in Highlight's cloud catalog and broadcasts the radio command to the physical AP.
                </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: `1px solid ${c.border}`, paddingTop: '14px' }}>
              <button
                type="button"
                onClick={() => setShowPairModal(null)}
                disabled={isPairing}
                style={{
                  backgroundColor: c.surfaceSubtle,
                  color: c.text,
                  border: `1px solid ${c.border}`,
                  borderRadius: '6px',
                  padding: '9px 16px',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: isPairing ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePairTag}
                disabled={isPairing}
                style={{
                  backgroundColor: isPairing ? c.surfaceSubtle : c.primary,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '9px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isPairing ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                {isPairing ? (
                  <>
                    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Broadcasting OTA Pairing...</span>
                  </>
                ) : (
                  <>
                    <Link2 size={14} />
                    <span>Pair & Transmit OTA Update</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CONFIRMATION MODAL: UNBIND PHYSICAL ESL TAG
      ========================================================================== */}
      {showUnbindModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowUnbindModal(null)}
        >
          <div
            style={{
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: '12px',
              padding: '22px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ backgroundColor: '#fef2f2', padding: '8px', borderRadius: '8px' }}>
                <Unlink size={20} color="#dc2626" />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: c.text }}>
                Unbind Physical ESL Tag
              </h3>
            </div>

            <p style={{ margin: '0 0 14px', fontSize: '13px', color: c.textSecondary, lineHeight: 1.5 }}>
              Are you sure you want to unbind tag <strong style={{ fontFamily: 'monospace', color: c.text }}>{showUnbindModal.deviceNumber}</strong>?
            </p>

            <div style={{ backgroundColor: c.surfaceSubtle, padding: '10px 12px', borderRadius: '6px', border: `1px solid ${c.border}`, fontSize: '12px', marginBottom: '16px' }}>
              <div><strong>Current Product:</strong> {showUnbindModal.skuName || showUnbindModal.skuCode || 'Bound Item'}</div>
              <div style={{ marginTop: '3px' }}><strong>AP Base Station:</strong> {showUnbindModal.stationId || 'E43819636067'}</div>
              <div style={{ marginTop: '3px', color: c.textMuted }}>
                The physical e-paper display will be cleared and the tag returned to the standby inventory pool.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowUnbindModal(null)}
                disabled={isUnbinding}
                style={{
                  backgroundColor: c.surfaceSubtle,
                  color: c.text,
                  border: `1px solid ${c.border}`,
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isUnbinding ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteUnbind}
                disabled={isUnbinding}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isUnbinding ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                {isUnbinding ? (
                  <>
                    <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Unbinding...</span>
                  </>
                ) : (
                  <>
                    <Unlink size={13} />
                    <span>Confirm Unbind</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: USER INFORMATION & SYSTEM SETTINGS
      ========================================================================== */}
      {showSettingsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            style={{
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ backgroundColor: c.primaryBg, padding: '8px', borderRadius: '8px' }}>
                  <Settings size={20} color={c.primary} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: c.text, whiteSpace: 'nowrap' }}>
                    Operator Profile & System Settings
                  </h3>
                  <div style={{ fontSize: '12px', color: c.textMuted, marginTop: '2px', whiteSpace: 'nowrap' }}>
                    QuickShelf ESL Platform • Org: <strong style={{ fontFamily: 'monospace', color: c.text }}>CU006INDIA0344:483</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: c.textMuted,
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Nav Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${c.border}`, paddingBottom: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setSettingsTab('profile')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  backgroundColor: settingsTab === 'profile' ? c.primary : c.surfaceSubtle,
                  color: settingsTab === 'profile' ? '#ffffff' : c.textSecondary,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <User size={13} />
                <span>User Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setSettingsTab('hardware')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  backgroundColor: settingsTab === 'hardware' ? c.primary : c.surfaceSubtle,
                  color: settingsTab === 'hardware' ? '#ffffff' : c.textSecondary,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Cpu size={13} />
                <span>Cloud & Sub-GHz IoT</span>
              </button>

              <button
                type="button"
                onClick={() => setSettingsTab('guardrails')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  backgroundColor: settingsTab === 'guardrails' ? c.primary : c.surfaceSubtle,
                  color: settingsTab === 'guardrails' ? '#ffffff' : c.textSecondary,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ShieldCheck size={13} />
                <span>Compliance & Guardrails</span>
              </button>
            </div>

            {/* TAB 1: USER PROFILE */}
            {settingsTab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: c.text, marginBottom: '6px' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g. Suman Saurav"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${c.border}`,
                      fontSize: '13px',
                      outline: 'none',
                      backgroundColor: c.surface,
                      color: c.text,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: c.text, marginBottom: '6px' }}>
                    Work Email
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="e.g. operations@quickshelf.io"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${c.border}`,
                      fontSize: '13px',
                      outline: 'none',
                      backgroundColor: c.surface,
                      color: c.text,
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: c.text, marginBottom: '6px' }}>
                      Operational Role
                    </label>
                    <input
                      type="text"
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value)}
                      placeholder="e.g. Store Operations Lead"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${c.border}`,
                        fontSize: '13px',
                        outline: 'none',
                        backgroundColor: c.surface,
                        color: c.text,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: c.text, marginBottom: '6px' }}>
                      Assigned Retail Store
                    </label>
                    <input
                      type="text"
                      value={userStore}
                      onChange={(e) => setUserStore(e.target.value)}
                      placeholder="e.g. Store 001 - Phoenix Mall"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${c.border}`,
                        fontSize: '13px',
                        outline: 'none',
                        backgroundColor: c.surface,
                        color: c.text,
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsModal(false);
                      setShowLogoutConfirm(true);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      borderRadius: '6px',
                      padding: '8px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginRight: 'auto',
                    }}
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
                    style={{
                      backgroundColor: c.surfaceSubtle,
                      color: c.text,
                      border: `1px solid ${c.border}`,
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveUserProfile}
                    style={{
                      backgroundColor: c.primary,
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 18px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: HARDWARE & CLOUD CONFIG */}
            {settingsTab === 'hardware' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, borderRadius: '6px', padding: '12px', fontSize: '12px', color: c.textSecondary }}>
                  <div style={{ fontWeight: 600, color: c.text, marginBottom: '4px' }}>Highlight ESL Cloud Production Gateway</div>
                  <div>Live Sub-GHz RF Base Station transceiver connected and authenticated via MD5 signed RPC protocol.</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                  <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '6px', padding: '10px' }}>
                    <div style={{ color: c.textMuted, fontSize: '11px', fontWeight: 600 }}>ORGANIZATION ID</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, marginTop: '2px' }}>CU006INDIA0344:483</div>
                  </div>
                  <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '6px', padding: '10px' }}>
                    <div style={{ color: c.textMuted, fontSize: '11px', fontWeight: 600 }}>AP BASE STATION MAC</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, marginTop: '2px' }}>E43819636067</div>
                  </div>
                  <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '6px', padding: '10px' }}>
                    <div style={{ color: c.textMuted, fontSize: '11px', fontWeight: 600 }}>HIGHLIGHT CLOUD ENDPOINT</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '11px', marginTop: '2px' }}>electronicshelflabel.cn:8082</div>
                  </div>
                  <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '6px', padding: '10px' }}>
                    <div style={{ color: c.textMuted, fontSize: '11px', fontWeight: 600 }}>AUTHENTICATION APPKEY</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, marginTop: '2px' }}>21186651 (Active)</div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: c.text, marginBottom: '6px' }}>
                    Sub-GHz Wireless RF Region
                  </label>
                  <input
                    type="text"
                    value={rfRegion}
                    onChange={(e) => setRfRegion(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${c.border}`,
                      fontSize: '13px',
                      outline: 'none',
                      backgroundColor: c.surface,
                      color: c.text,
                    }}
                  />
                  <span style={{ fontSize: '11px', color: c.textMuted, marginTop: '4px', display: 'block' }}>
                    Complies with India Wireless Planning & Coordination (WPC) license-exempt band.
                  </span>
                </div>
              </div>
            )}

            {/* TAB 3: COMPLIANCE & GUARDRAILS */}
            {settingsTab === 'guardrails' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '12px', fontSize: '12px', color: '#1e40af' }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>Legal Metrology Act (PRC-04) Price Integrity</div>
                  <div>Automated rule enforcement preventing retailers from displaying selling prices greater than Maximum Retail Price (MRP).</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: `1px solid ${c.border}`, borderRadius: '6px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: c.text }}>Enforce PRC-04 Guardrail (Selling Price ≤ MRP)</div>
                    <div style={{ fontSize: '11px', color: c.textMuted }}>Rejects API and manual POS inputs that violate statutory maximum price limits.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={guardrailStrict}
                    onChange={(e) => setGuardrailStrict(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: `1px solid ${c.border}`, borderRadius: '6px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: c.text }}>Low Battery Hardware Alert Level</div>
                    <div style={{ fontSize: '11px', color: c.textMuted }}>Flags e-paper tag on dashboard when button-cell battery drops below threshold.</div>
                  </div>
                  <select
                    value={lowBatteryAlertPct}
                    onChange={(e) => setLowBatteryAlertPct(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${c.border}`, fontSize: '12px', backgroundColor: c.surface }}
                  >
                    <option value="15">15%</option>
                    <option value="20">20% (Default)</option>
                    <option value="25">25%</option>
                    <option value="30">30%</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: BATCH CSV / EXCEL IMPORT & CAMPAIGN SUITE (HIGHLIGHT CLOUD APIS)
      ========================================================================== */}
      {showCsvModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowCsvModal(false)}
        >
          <div
            style={{
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '720px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ backgroundColor: c.primaryBg, padding: '8px', borderRadius: '8px' }}>
                  <FileSpreadsheet size={22} color={c.primary} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: c.text, whiteSpace: 'nowrap' }}>
                    Highlight Batch Fleet & Campaign Studio
                  </h3>
                  <div style={{ fontSize: '12px', color: c.textMuted, marginTop: '2px', whiteSpace: 'nowrap' }}>
                    Official Highlight ESL Cloud V5.0.17 Batch Suite • Org: <strong style={{ fontFamily: 'monospace', color: c.text }}>CU006INDIA0344:483</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: c.textMuted,
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Nav Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${c.border}`, paddingBottom: '10px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setCsvModalTab('import')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  backgroundColor: csvModalTab === 'import' ? c.primary : c.surfaceSubtle,
                  color: csvModalTab === 'import' ? '#ffffff' : c.textSecondary,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Upload size={13} />
                <span>Import Devices (CSV / Excel)</span>
              </button>

              <button
                type="button"
                onClick={() => setCsvModalTab('export')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  backgroundColor: csvModalTab === 'export' ? c.primary : c.surfaceSubtle,
                  color: csvModalTab === 'export' ? '#ffffff' : c.textSecondary,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Download size={13} />
                <span>Export Fleet Devices</span>
              </button>

              <button
                type="button"
                onClick={() => setCsvModalTab('batchPrice')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  backgroundColor: csvModalTab === 'batchPrice' ? c.primary : c.surfaceSubtle,
                  color: csvModalTab === 'batchPrice' ? '#ffffff' : c.textSecondary,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Percent size={13} />
                <span>Batch Price & Campaign Update (API 4.7)</span>
              </button>
            </div>

            {/* TAB 1: BATCH DEVICE IMPORT */}
            {csvModalTab === 'import' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, borderRadius: '6px', padding: '12px', fontSize: '12px', color: c.textSecondary }}>
                  <div style={{ fontWeight: 600, color: c.text, marginBottom: '4px' }}>
                    Highlight Official Batch Import Template Format:
                  </div>
                  <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '11px', color: c.textSecondary, backgroundColor: c.surface, padding: '8px', borderRadius: '4px', border: `1px solid ${c.border}`, overflowX: 'auto' }}>
{`Line 1: "Note\n<1>Field name in red color is mandatory\n<2>Revise device ID is prohibited\n<3>Revise or delete organization ID is prohibited",,
Line 2: Device information,,
Line 3: *Barcode,Device name,Organization(CU006INDIA0344:483)
Line 4: 8003152970,Kalakand Display 7.5,CU006INDIA0344:483`}
                  </pre>
                  <div style={{ marginTop: '6px', fontSize: '11px', color: c.textMuted }}>
                    💡 Supports both <strong>.xlsx (Excel)</strong> and <strong>.csv</strong> files. Device names are automatically synced via Highlight's <code style={{ color: c.primary }}>updateDevice</code> / <code style={{ color: c.primary }}>createDevice</code> APIs.
                  </div>
                </div>

                {/* File Upload Box */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: c.text, marginBottom: '6px' }}>
                    Upload Batch Sheet (.xlsx or .csv)
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedBatchFile(e.target.files[0]);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: `1px dashed ${c.borderStrong}`,
                      backgroundColor: c.surfaceSubtle,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  />
                  {selectedBatchFile && (
                    <div style={{ fontSize: '11px', color: c.primary, marginTop: '4px', fontWeight: 500 }}>
                      ✓ Selected file: {selectedBatchFile.name} ({(selectedBatchFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>

                {/* Direct CSV Text Area Fallback */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: c.text }}>
                      Or Paste CSV Text Directly
                    </label>
                    {selectedBatchFile && (
                      <button
                        type="button"
                        onClick={() => setSelectedBatchFile(null)}
                        style={{ background: 'transparent', border: 'none', color: '#dc2626', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                      >
                        Clear file and use text
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    disabled={!!selectedBatchFile}
                    value={csvInputText}
                    onChange={(e) => setCsvInputText(e.target.value)}
                    placeholder="*Barcode,Device name,Organization(CU006INDIA0344:483)&#10;8003152970,Kalakand Display 7.5,CU006INDIA0344:483"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: `1px solid ${c.border}`,
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      backgroundColor: selectedBatchFile ? c.surfaceSubtle : c.surface,
                      color: c.text,
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Import Action Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleProcessCsv}
                    disabled={isProcessingCsv}
                    style={{
                      backgroundColor: isProcessingCsv ? c.surfaceSubtle : c.primary,
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '9px 18px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: isProcessingCsv ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isProcessingCsv ? (
                      <>
                        <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Processing Batch Sheet...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        <span>Execute Batch Import & Device Sync</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Results Display */}
                {csvProcessResult && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '12px',
                      borderRadius: '6px',
                      backgroundColor: csvProcessResult.success ? '#ecfdf5' : '#fef2f2',
                      border: `1px solid ${csvProcessResult.success ? '#a7f3d0' : '#fecaca'}`,
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: csvProcessResult.success ? '#065f46' : '#991b1b', marginBottom: '4px' }}>
                      {csvProcessResult.success ? '✓ Batch Processing Completed' : '⚠ Batch Processing Failed'}
                    </div>
                    <div>{csvProcessResult.message || csvProcessResult.error}</div>
                    {csvProcessResult.results && (
                      <div style={{ marginTop: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                        {csvProcessResult.results.map((r: any, idx: number) => (
                          <div key={idx} style={{ fontSize: '11px', fontFamily: 'monospace', color: c.textSecondary }}>
                            [{r.status.toUpperCase()}] Tag {r.barcode}: {r.name || '(unnamed)'} {r.error ? `- ${r.error}` : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: EXPORT FLEET DEVICES */}
            {csvModalTab === 'export' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: c.textSecondary, lineHeight: 1.5 }}>
                  Download the current live inventory of physical ESL tags in the exact Highlight 3-line format. This file can be edited and re-imported into Highlight ESL Manager or QuickShelf at any time.
                </p>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <a
                    href={`${API_BASE}/api/highlight/export-devices-csv?token=${encodeURIComponent(authToken || '')}`}
                    download="Highlight_Device_List_CU006INDIA0344.csv"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: c.primary,
                      color: '#ffffff',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      padding: '10px 18px',
                      fontSize: '13px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                  >
                    <Download size={14} />
                    <span>Download Official CSV (.csv)</span>
                  </a>

                  <a
                    href={`${API_BASE}/api/highlight/export-devices-xlsx?token=${encodeURIComponent(authToken || '')}`}
                    download="Device_information_format_CU006INDIA0344.xlsx"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#059669',
                      color: '#ffffff',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      padding: '10px 18px',
                      fontSize: '13px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                  >
                    <FileSpreadsheet size={14} />
                    <span>Download Official Excel (.xlsx)</span>
                  </a>
                </div>

                <div style={{ backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, borderRadius: '6px', padding: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: c.text, marginBottom: '6px' }}>
                    Live Fleet Preview ({highlightDevices.length} Tags):
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ color: c.textMuted, borderBottom: `1px solid ${c.border}` }}>
                        <th style={{ padding: '4px 8px' }}>*Barcode</th>
                        <th style={{ padding: '4px 8px' }}>Device Name</th>
                        <th style={{ padding: '4px 8px' }}>Organization</th>
                      </tr>
                    </thead>
                    <tbody>
                      {highlightDevices.map((d) => (
                        <tr key={d.deviceNumber} style={{ borderBottom: `1px solid ${c.border}` }}>
                          <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontWeight: 600 }}>{d.deviceNumber}</td>
                          <td style={{ padding: '4px 8px' }}>{d.deviceName || d.skuName || d.deviceNumber}</td>
                          <td style={{ padding: '4px 8px', color: c.textMuted }}>CU006INDIA0344:483</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: BATCH PRICE & PROMO CAMPAIGN */}
            {csvModalTab === 'batchPrice' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, borderRadius: '6px', padding: '12px', fontSize: '12px', color: c.textSecondary }}>
                  <div style={{ fontWeight: 600, color: c.text, marginBottom: '4px' }}>
                    Automated Multi-Item Batch Price Updates (Highlight API 4.7 <code style={{ color: c.primary }}>batchUpdateProduct</code>)
                  </div>
                  <div>
                    Apply a synchronized campaign discount or promo badge across all products and physical ESL displays in one atomic call. The Highlight base station will broadcast new price graphics over-the-air.
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: c.text, marginBottom: '6px' }}>
                      Campaign Discount (% Off)
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[10, 15, 20, 25].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setBatchSaleDiscount(pct)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            border: `1px solid ${batchSaleDiscount === pct ? c.primary : c.border}`,
                            backgroundColor: batchSaleDiscount === pct ? c.primaryBg : c.surface,
                            color: batchSaleDiscount === pct ? c.primary : c.text,
                            cursor: 'pointer',
                          }}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: c.text, marginBottom: '6px' }}>
                      Promotional E-Paper Badge
                    </label>
                    <input
                      type="text"
                      value={batchSalePromoTag}
                      onChange={(e) => setBatchSalePromoTag(e.target.value)}
                      placeholder="e.g. DIWALI SPECIAL, CLEARANCE"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: `1px solid ${c.border}`,
                        fontSize: '12px',
                        outline: 'none',
                        backgroundColor: c.surface,
                        color: c.text,
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={handleApplyBatchSale}
                    disabled={isApplyingBatchSale}
                    style={{
                      backgroundColor: isApplyingBatchSale ? c.surfaceSubtle : c.primary,
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '9px 20px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: isApplyingBatchSale ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                  >
                    {isApplyingBatchSale ? (
                      <>
                        <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Broadcasting Batch Update to Fleet...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={14} />
                        <span>Broadcast {batchSaleDiscount}% Campaign via batchUpdateProduct</span>
                      </>
                    )}
                  </button>
                </div>

                {batchSaleResult && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '12px',
                      borderRadius: '6px',
                      backgroundColor: batchSaleResult.success ? '#ecfdf5' : '#fef2f2',
                      border: `1px solid ${batchSaleResult.success ? '#a7f3d0' : '#fecaca'}`,
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: batchSaleResult.success ? '#065f46' : '#991b1b' }}>
                      {batchSaleResult.success ? '✓ Batch Campaign Dispatched' : '⚠ Dispatch Failed'}
                    </div>
                    <div>{batchSaleResult.message || batchSaleResult.error}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONFIRM SIGN OUT POPUP
      ========================================================================== */}
      {showLogoutConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'dropdownFadeIn 0.2s ease-out',
          }}
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '430px',
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Icon & Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                  flexShrink: 0,
                }}
              >
                <LogOut size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: c.text }}>
                  Sign Out of QuickShelf
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: c.textMuted }}>
                  Confirm ending your active session
                </p>
              </div>
            </div>

            {/* Active User Identity Info Card */}
            <div
              style={{
                backgroundColor: c.surfaceSubtle,
                border: `1px solid ${c.border}`,
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: c.primary,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '13px',
                  flexShrink: 0,
                }}
              >
                {(userName ? userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'AD')}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userName || userEmail || 'Administrator'}
                </div>
                <div style={{ fontSize: '11.5px', color: c.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userEmail || 'Active Session'} • {userRole || 'SUPER_ADMIN'}
                </div>
              </div>
            </div>

            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: c.textMuted, lineHeight: 1.5 }}>
              Are you sure you want to sign out? Your credentials will be cleared from this device and you will need to log in again to manage e-paper labels and real-time pricing.
            </p>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${c.border}`,
                  backgroundColor: c.surfaceSubtle,
                  color: c.text,
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = c.surface; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = c.surfaceSubtle; }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#b91c1c'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; }}
              >
                <LogOut size={14} />
                <span>Yes, Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
