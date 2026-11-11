import React, { useState } from 'react';
import {
  Radio,
  Cpu,
  RefreshCw,
  Battery,
  Wifi,
  Tag as TagIcon,
  Zap,
  CheckCircle2,
  AlertCircle,
  Search,
  Layers,
  DollarSign,
  Copy,
  Check,
  Info,
  Link2,
  Unlink,
  Plus,
  FileSpreadsheet,
  Upload,
  Download,
  Edit2,
  Package,
  ZapOff,
  ChevronDown,
  Sliders,
} from 'lucide-react';

export interface HighlightStatus {
  success: boolean;
  connected: boolean;
  orgCode: string;
  endpoint: string;
  deviceCount: number;
  apCount: number;
  templateCount: number;
  error?: string;
}

export interface HighlightDevice {
  deviceNumber: string;
  deviceName?: string;
  stationId?: string;
  stationName?: string;
  powerLevel?: number;
  signal?: number;
  skuCode?: string;
  skuName?: string;
  templateId?: string;
  templateName?: string;
  bindingTime?: string;
  status?: string;
  shelfDeviceStatus?: string;
  productCount?: number | null;
  size?: string;
}

export interface HighlightProduct {
  uniqueId: string;
  prodName: string;
  price: string | number;
  priceUnit?: string;
  commodityUnit?: string;
  copyWriting?: string;
  custFeature1?: string;
  custFeature2?: string;
  custFeature3?: string;
}

export interface HighlightTemplate {
  templateId: string;
  templateName: string;
  width?: number;
  height?: number;
  colorType?: number;
  description?: string;
}

export interface HighlightFleetViewProps {
  theme?: 'dark' | 'light';
  highlightStatus: HighlightStatus | null;
  highlightDevices: HighlightDevice[];
  highlightTemplates: HighlightTemplate[];
  highlightProducts?: HighlightProduct[];
  syncingHighlight: boolean;
  onSyncHighlight: () => Promise<void>;
  onLocateDevice: (deviceNumber: string) => Promise<void>;
  onFlashDevice?: (deviceNumber: string, color?: number, duration?: number) => Promise<void>;
  onStopFlashDevice?: (deviceNumber?: string) => Promise<void>;
  onOpenOtaModal: (device: HighlightDevice) => void;
  onOpenPairModal: (device?: HighlightDevice, prefillProduct?: HighlightProduct) => void;
  onUnbindDevice: (device: HighlightDevice) => void;
  onOpenCsvModal: () => void;
  onRenameDevice?: (deviceNumber: string, newName: string) => Promise<void>;
  blinkingTagIds: Set<string>;
}

export function HighlightFleetView({
  highlightStatus,
  highlightDevices,
  highlightTemplates,
  highlightProducts = [],
  syncingHighlight,
  onSyncHighlight,
  onLocateDevice,
  onFlashDevice,
  onStopFlashDevice,
  onOpenOtaModal,
  onOpenPairModal,
  onUnbindDevice,
  onOpenCsvModal,
  onRenameDevice,
  blinkingTagIds,
}: HighlightFleetViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingDevice, setEditingDevice] = useState<HighlightDevice | null>(null);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [flashConfigDevice, setFlashConfigDevice] = useState<HighlightDevice | null>(null);
  const [flashColor, setFlashColor] = useState<number>(2); // 2: Green (Pick-to-Light)
  const [flashDuration, setFlashDuration] = useState<number>(30); // 30 seconds

  const handleSaveRename = async () => {
    if (!editingDevice || !newDeviceName.trim() || !onRenameDevice) return;
    setIsSavingName(true);
    try {
      await onRenameDevice(editingDevice.deviceNumber, newDeviceName.trim());
      setEditingDevice(null);
    } finally {
      setIsSavingName(false);
    }
  };

  // Enterprise SaaS Light Palette
  const c = {
    bg: '#f8fafc',
    surface: '#ffffff',
    surfaceSubtle: '#f1f5f9',
    surfaceHover: '#f8fafc',
    border: '#e2e8f0',
    borderStrong: '#cbd5e1',
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    primarySubtle: '#eff6ff',
    success: '#059669',
    successSubtle: '#ecfdf5',
    warning: '#d97706',
    warningSubtle: '#fffbeb',
    error: '#dc2626',
    errorSubtle: '#fef2f2',
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredDevices = highlightDevices.filter((dev) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      dev.deviceNumber.toLowerCase().includes(q) ||
      (dev.stationId && dev.stationId.toLowerCase().includes(q)) ||
      (dev.skuCode && dev.skuCode.toLowerCase().includes(q)) ||
      (dev.skuName && dev.skuName.toLowerCase().includes(q))
    );
  });

  const getBatteryPct = (level?: number) => {
    if (level === undefined || level === null) return 100;
    return Math.min(100, Math.max(10, level * 20));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'nowrap' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: c.text, whiteSpace: 'nowrap' }}>
              Highlight IoT Hardware Fleet
            </h2>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                backgroundColor: highlightStatus?.connected ? c.successSubtle : c.warningSubtle,
                color: highlightStatus?.connected ? c.success : c.warning,
                border: `1px solid ${highlightStatus?.connected ? '#a7f3d0' : '#fde68a'}`,
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: highlightStatus?.connected ? c.success : c.warning,
                  flexShrink: 0,
                }}
              />
              {highlightStatus?.connected ? 'Cloud Connected' : 'Connecting to Gateway...'}
            </span>
          </div>
          <p style={{ margin: '3px 0 0', color: c.textMuted, fontSize: '13px' }}>
            Live enterprise e-paper tags and Sub-GHz base stations managed via official Highlight ESL V5 Cloud API.
          </p>
        </div>

        <button
          onClick={onSyncHighlight}
          disabled={syncingHighlight}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: c.primary,
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: syncingHighlight ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            opacity: syncingHighlight ? 0.7 : 1,
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <RefreshCw
            size={14}
            style={{
              animation: syncingHighlight ? 'spin 1s linear infinite' : 'none',
            }}
          />
          <span>{syncingHighlight ? 'Syncing Fleet...' : 'Sync Fleet from Highlight'}</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
        <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: c.textMuted, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <span style={{ whiteSpace: 'nowrap' }}>Organization Code</span>
            <Cpu size={15} color={c.textMuted} />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '8px', color: c.text, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {highlightStatus?.orgCode || 'CU006INDIA0344'}
          </div>
          <div style={{ fontSize: '12px', color: c.textMuted, marginTop: '4px', whiteSpace: 'nowrap' }}>
            AppKey: 21186651 (MD5 Signed)
          </div>
        </div>

        <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: c.textMuted, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <span style={{ whiteSpace: 'nowrap' }}>Active AP Stations</span>
            <Radio size={15} color={c.textMuted} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px', color: c.text }}>
            {highlightStatus?.apCount ?? 1} <span style={{ fontSize: '13px', color: c.textMuted, fontWeight: 500 }}>online</span>
          </div>
          <div style={{ fontSize: '12px', color: c.textMuted, marginTop: '4px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
            Base Station ID: E43819636067
          </div>
        </div>

        <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: c.textMuted, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <span style={{ whiteSpace: 'nowrap' }}>Physical ESL Labels</span>
            <TagIcon size={15} color={c.textMuted} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px', color: c.text }}>
            {highlightStatus?.deviceCount ?? highlightDevices.length} <span style={{ fontSize: '13px', color: c.textMuted, fontWeight: 500 }}>labels</span>
          </div>
          <div style={{ fontSize: '12px', color: c.success, marginTop: '4px', fontWeight: 600, whiteSpace: 'nowrap' }}>
            100% 3-Color BWR Active
          </div>
        </div>

        <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: c.textMuted, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <span style={{ whiteSpace: 'nowrap' }}>Cloud Templates</span>
            <Layers size={15} color={c.textMuted} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px', color: c.text }}>
            {highlightStatus?.templateCount ?? highlightTemplates.length} <span style={{ fontSize: '13px', color: c.textMuted, fontWeight: 500 }}>templates</span>
          </div>
          <div style={{ fontSize: '12px', color: c.textMuted, marginTop: '4px', whiteSpace: 'nowrap' }}>
            1.8&quot;, 2.9&quot;, 5.8&quot; layouts loaded
          </div>
        </div>

        <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: c.textMuted, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <span style={{ whiteSpace: 'nowrap' }}>Cloud Products</span>
            <Package size={15} color={c.textMuted} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px', color: c.text }}>
            {highlightProducts.length} <span style={{ fontSize: '13px', color: c.textMuted, fontWeight: 500 }}>SKUs</span>
          </div>
          <div style={{ fontSize: '12px', color: c.success, marginTop: '4px', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Highlight DB Synced
          </div>
        </div>
      </div>

      {/* Base Station Hardware Card */}
      <div
        style={{
          backgroundColor: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: '8px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '280px' }}>
          <div
            style={{
              backgroundColor: c.surfaceSubtle,
              color: c.primary,
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Radio size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '14px', color: c.text }}>
                Ceiling Base Station (AP-E43819636067)
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: c.successSubtle,
                  color: c.success,
                  border: '1px solid #a7f3d0',
                  whiteSpace: 'nowrap',
                }}
              >
                ONLINE
              </span>
            </div>
            <div style={{ fontSize: '12px', color: c.textMuted, marginTop: '2px' }}>
              Sub-GHz Transceiver (865 - 868 MHz India) • Pacing: 50 tags/sec • Protocol V5.0.17
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right', fontSize: '12px', color: c.textMuted }}>
          <div>Connected Labels: <strong style={{ color: c.text }}>{highlightDevices.length}</strong></div>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', marginTop: '2px' }}>
            RPC: http://www.electronicshelflabel.cn:8082
          </div>
        </div>
      </div>

      {/* Helper Assistance Note */}
      <div
        style={{
          backgroundColor: c.surfaceSubtle,
          border: `1px solid ${c.border}`,
          borderRadius: '6px',
          padding: '10px 14px',
          fontSize: '12px',
          color: c.textSecondary,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Info size={15} color={c.primary} style={{ flexShrink: 0 }} />
        <span>
          <strong>Hardware Operations Guide:</strong> Device Number matches the physical barcode on the tag. Battery shows button-cell capacity (5/5 = 100%, 5-year life). Click <strong>Locate</strong> to blink the tag&apos;s LED for shelf-finding, or <strong>Update Price</strong> to push an instantaneous OTA update over Sub-GHz radio.
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: '8px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 280px' }}>
          <Search size={15} color={c.textMuted} />
          <input
            type="text"
            placeholder="Search by device barcode, AP station, or product SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: c.text,
              fontSize: '13px',
              width: '100%',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ fontSize: '12px', color: c.textMuted, fontWeight: 500, whiteSpace: 'nowrap' }}>
          Showing {filteredDevices.length} of {highlightDevices.length} physical labels
        </div>
      </div>

      {/* Physical Hardware Table */}
      <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TagIcon size={15} color={c.primary} />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: c.text, whiteSpace: 'nowrap' }}>
              Physical ESL Hardware Inventory
            </h3>
            <span style={{ fontSize: '12px', color: c.textMuted, whiteSpace: 'nowrap', marginLeft: '6px' }}>
              ({highlightDevices.length} Real Highlight Tags)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {blinkingTagIds.size > 0 && onStopFlashDevice && (
              <button
                onClick={() => onStopFlashDevice()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  border: '1px solid #fca5a5',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                title="Stop all currently flashing ESL tags across store"
              >
                <ZapOff size={14} />
                <span>Stop All Flashing ({blinkingTagIds.size})</span>
              </button>
            )}

            <button
              onClick={onOpenCsvModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: c.surface,
                color: c.text,
                border: `1px solid ${c.border}`,
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              }}
            >
              <FileSpreadsheet size={14} color={c.primary} />
              <span>Batch CSV / Excel</span>
            </button>

            <button
              onClick={() => onOpenPairModal()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: c.primary,
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              }}
            >
              <Plus size={14} />
              <span>Pair Physical Tag</span>
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: c.surfaceSubtle, color: c.textMuted, borderBottom: `1px solid ${c.border}` }}>
                <th style={{ padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>DEVICE NUMBER</th>
                <th style={{ padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>AP STATION</th>
                <th style={{ padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>BATTERY</th>
                <th style={{ padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>SIGNAL</th>
                <th style={{ padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>BOUND PRODUCT / SKU</th>
                <th style={{ padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>LAYOUT TEMPLATE</th>
                <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: c.textMuted }}>
                    {highlightDevices.length === 0 ? (
                      <div>
                        <p style={{ margin: '0 0 10px', fontWeight: 500 }}>No physical devices loaded yet.</p>
                        <button
                          onClick={onSyncHighlight}
                          style={{
                            backgroundColor: c.primary,
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          Sync Now from Highlight Cloud
                        </button>
                      </div>
                    ) : (
                      'No matching devices found.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredDevices.map((dev) => {
                  const isBlinking = blinkingTagIds.has(dev.deviceNumber);
                  const batteryPct = getBatteryPct(dev.powerLevel);

                  return (
                    <tr
                      key={dev.deviceNumber}
                      style={{
                        borderBottom: `1px solid ${c.border}`,
                        backgroundColor: isBlinking ? c.successSubtle : 'transparent',
                      }}
                    >
                      {/* Device Number */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: c.text }}>
                              {dev.deviceNumber}
                            </span>
                            <button
                              onClick={() => handleCopy(dev.deviceNumber)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: copiedId === dev.deviceNumber ? c.success : c.textMuted,
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                              title="Copy Device Barcode"
                            >
                              {copiedId === dev.deviceNumber ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                            {onRenameDevice && (
                              <button
                                onClick={() => {
                                  setEditingDevice(dev);
                                  setNewDeviceName(dev.deviceName || dev.deviceNumber);
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: c.textMuted,
                                  cursor: 'pointer',
                                  padding: '2px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                                title="Rename Device Nickname (updateDevice API)"
                              >
                                <Edit2 size={12} />
                              </button>
                            )}
                            {/* Click to Flash LED on Device Number */}
                            <button
                              onClick={() => {
                                if (isBlinking) {
                                  if (onStopFlashDevice) onStopFlashDevice(dev.deviceNumber);
                                } else {
                                  if (onFlashDevice) {
                                    onFlashDevice(dev.deviceNumber, 2, 30);
                                  } else {
                                    onLocateDevice(dev.deviceNumber);
                                  }
                                }
                              }}
                              style={{
                                background: isBlinking ? '#dcfce7' : '#f8fafc',
                                border: isBlinking ? '1px solid #86efac' : '1px solid #e2e8f0',
                                color: isBlinking ? '#15803d' : '#64748b',
                                cursor: 'pointer',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                boxShadow: isBlinking ? '0 0 8px rgba(34, 197, 94, 0.4)' : 'none',
                              }}
                              title={
                                isBlinking
                                  ? 'Physical LED is flashing! Click to STOP.'
                                  : 'Click to FLASH physical green LED (Pick-to-Light 30s)'
                              }
                            >
                              <Zap size={11} fill={isBlinking ? '#16a34a' : 'none'} color={isBlinking ? '#16a34a' : '#64748b'} />
                              <span>{isBlinking ? 'Blinking (Stop)' : 'Flash'}</span>
                            </button>
                          </div>
                          {dev.deviceName && dev.deviceName !== dev.deviceNumber && (
                            <div style={{ fontSize: '11px', color: c.textSecondary, marginTop: '2px', fontWeight: 500 }}>
                              🏷️ {dev.deviceName}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* AP Station */}
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: c.textSecondary, whiteSpace: 'nowrap' }}>
                        {dev.stationId || 'E43819636067'}
                      </td>

                      {/* Battery */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                          <Battery
                            size={14}
                            color={batteryPct > 30 ? c.success : c.warning}
                          />
                          <span style={{ fontWeight: 600, color: c.text }}>{batteryPct}%</span>
                          <span style={{ fontSize: '11px', color: c.textMuted }}>({dev.powerLevel ?? 5}/5)</span>
                        </div>
                      </td>

                      {/* Signal */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                          <Wifi size={14} color={c.textMuted} />
                          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: c.text }}>
                            {dev.signal ? `${dev.signal} dBm` : '-65 dBm'}
                          </span>
                        </div>
                      </td>

                      {/* SKU / Name */}
                      <td style={{ padding: '12px 14px', maxWidth: '240px' }}>
                        {dev.skuCode || (dev.productCount !== null && dev.productCount !== undefined && dev.productCount > 0) ? (
                          <div>
                            <div style={{ fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {dev.skuName || dev.skuCode || 'Bound Product'}
                            </div>
                            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: c.textMuted }}>
                              {dev.skuCode || `Items: ${dev.productCount}`}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: c.textMuted, fontStyle: 'italic', fontSize: '12px' }}>Unbound / Standby</span>
                        )}
                      </td>

                      {/* Template */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            backgroundColor: c.surfaceSubtle,
                            border: `1px solid ${c.border}`,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            color: c.textSecondary,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {dev.templateName || dev.templateId || '1213 (2.9")'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', justifyContent: 'flex-end', gap: '6px', whiteSpace: 'nowrap' }}>
                          {/* Flash LED / Stop Flash Button with Color Picker Option */}
                          <div style={{ display: 'inline-flex', borderRadius: '4px', overflow: 'hidden' }}>
                            <button
                              onClick={() => {
                                if (isBlinking) {
                                  if (onStopFlashDevice) onStopFlashDevice(dev.deviceNumber);
                                } else {
                                  if (onFlashDevice) {
                                    onFlashDevice(dev.deviceNumber, 2, 30);
                                  } else {
                                    onLocateDevice(dev.deviceNumber);
                                  }
                                }
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                backgroundColor: isBlinking ? '#16a34a' : '#f0fdf4',
                                color: isBlinking ? '#ffffff' : '#15803d',
                                border: isBlinking ? '1px solid #15803d' : '1px solid #bbf7d0',
                                borderRight: 'none',
                                borderRadius: '4px 0 0 4px',
                                padding: '5px 9px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                boxShadow: isBlinking ? '0 0 8px rgba(22, 163, 74, 0.45)' : 'none',
                              }}
                              title={
                                isBlinking
                                  ? 'Physical LED is currently flashing! Click to stop.'
                                  : 'Click to flash Green LED (Pick-to-Light) on physical ESL for 30s'
                              }
                            >
                              <Zap size={12} fill={isBlinking ? '#ffffff' : '#16a34a'} color={isBlinking ? '#ffffff' : '#16a34a'} />
                              <span>{isBlinking ? 'Stop LED' : 'Flash LED'}</span>
                            </button>
                            <button
                              onClick={() => setFlashConfigDevice(dev)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: isBlinking ? '#15803d' : '#f0fdf4',
                                color: isBlinking ? '#ffffff' : '#15803d',
                                border: isBlinking ? '1px solid #15803d' : '1px solid #bbf7d0',
                                borderRadius: '0 4px 4px 0',
                                padding: '5px 6px',
                                cursor: 'pointer',
                              }}
                              title="Pick-to-Light Options (Change Color / Duration)"
                            >
                              <ChevronDown size={11} />
                            </button>
                          </div>

                          <button
                            onClick={() => onLocateDevice(dev.deviceNumber)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: c.surface,
                              color: c.text,
                              border: `1px solid ${c.border}`,
                              borderRadius: '4px',
                              padding: '5px 9px',
                              fontSize: '12px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                            title="Query live Sub-GHz RF telemetry, battery & signal from base station"
                          >
                            <Radio size={12} color={c.primary} />
                            <span>Ping Status</span>
                          </button>

                          {dev.skuCode || (dev.productCount !== null && dev.productCount !== undefined && dev.productCount > 0) ? (
                            <>
                              <button
                                onClick={() => onOpenOtaModal(dev)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  backgroundColor: c.primary,
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '5px 10px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                }}
                                title="Push price update to physical e-paper screen"
                              >
                                <DollarSign size={12} />
                                <span>Update Price</span>
                              </button>

                              <button
                                onClick={() => onUnbindDevice(dev)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  backgroundColor: c.errorSubtle,
                                  color: c.error,
                                  border: '1px solid #fecaca',
                                  borderRadius: '4px',
                                  padding: '5px 9px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                }}
                                title="Unbind SKU from this physical tag"
                              >
                                <Unlink size={12} />
                                <span>Unbind</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => onOpenPairModal(dev)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: c.primary,
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '5px 10px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}
                              title="Pair this physical tag with a product SKU"
                            >
                              <Link2 size={12} />
                              <span>Pair SKU</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Highlight Cloud Products Catalog */}
      <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={16} color={c.primary} />
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: c.text, whiteSpace: 'nowrap' }}>
                Highlight Cloud Products Catalog
              </h3>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: c.primarySubtle,
                  color: c.primary,
                  border: `1px solid ${c.primaryHover}20`,
                  whiteSpace: 'nowrap',
                }}
              >
                {highlightProducts.length} Items Live
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: c.textMuted }}>
              Commodities stored in Highlight Cloud organization <code style={{ color: c.primary, fontFamily: 'monospace' }}>CU006INDIA0344:483</code>. Ready to bind with physical e-paper displays.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onSyncHighlight}
              disabled={syncingHighlight}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: c.surfaceSubtle,
                color: c.text,
                border: `1px solid ${c.border}`,
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: syncingHighlight ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <RefreshCw size={12} style={{ animation: syncingHighlight ? 'spin 1s linear infinite' : 'none' }} />
              <span>Refresh Catalog</span>
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: c.surfaceSubtle, borderBottom: `1px solid ${c.border}`, color: c.textMuted, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>Product SKU / ID</th>
                <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>Product Name</th>
                <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>Hindi / Extra Detail</th>
                <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>Live Selling Price</th>
                <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>MRP Reference</th>
                <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>Promo / Campaign</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {highlightProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: c.textMuted }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Package size={24} color={c.textMuted} />
                      <span>No products found in Highlight Cloud database.</span>
                      <button
                        onClick={onSyncHighlight}
                        style={{
                          backgroundColor: c.primary,
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          marginTop: '4px',
                        }}
                      >
                        Sync Products from Highlight Cloud
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                highlightProducts.map((p) => {
                  const mrpText = p.custFeature2 || '—';
                  const promoText = p.custFeature3 || p.copyWriting;
                  return (
                    <tr
                      key={p.uniqueId}
                      style={{
                        borderBottom: `1px solid ${c.border}`,
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = c.surfaceSubtle)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: c.primary }}>
                            {p.uniqueId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(p.uniqueId)}
                            title="Copy SKU code"
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: '2px',
                              cursor: 'pointer',
                              color: copiedId === p.uniqueId ? c.success : c.textMuted,
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            {copiedId === p.uniqueId ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      <td style={{ padding: '10px 14px', fontWeight: 600, color: c.text, whiteSpace: 'nowrap' }}>
                        {p.prodName}
                      </td>

                      <td style={{ padding: '10px 14px', color: c.textSecondary, whiteSpace: 'nowrap' }}>
                        {p.custFeature1 ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: c.primary }}></span>
                            <span>{p.custFeature1}</span>
                          </span>
                        ) : (
                          <span style={{ color: c.textMuted }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: c.success }}>
                          ₹{typeof p.price === 'number' ? p.price.toFixed(2) : p.price}
                        </span>
                        {p.priceUnit && p.priceUnit !== '₹' && (
                          <span style={{ fontSize: '11px', color: c.textMuted, marginLeft: '4px' }}>{p.priceUnit}</span>
                        )}
                      </td>

                      <td style={{ padding: '10px 14px', color: c.textMuted, whiteSpace: 'nowrap' }}>
                        {mrpText}
                      </td>

                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        {promoText ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              backgroundColor: '#fff7ed',
                              color: '#c2410c',
                              border: '1px solid #ffedd5',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            {promoText}
                          </span>
                        ) : (
                          <span style={{ color: c.textMuted }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => onOpenPairModal(undefined, p)}
                          title="Bind this product to physical ESL tag"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: c.primary,
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                          }}
                        >
                          <Link2 size={12} />
                          <span>Pair to Tag</span>
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
      <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: c.text, whiteSpace: 'nowrap' }}>
              E-Paper Cloud Templates
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: c.textMuted }}>
              Standard multi-color layouts configured on the Highlight ESL Cloud server.
            </p>
          </div>
          <span style={{ fontSize: '12px', color: c.textMuted, whiteSpace: 'nowrap' }}>
            {highlightTemplates.length} layouts active
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
          {highlightTemplates.map((tmpl) => (
            <div
              key={tmpl.templateId}
              style={{
                backgroundColor: c.surfaceSubtle,
                border: `1px solid ${c.border}`,
                borderRadius: '6px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span
                    style={{
                      display: 'inline-flex',
                      backgroundColor: c.surface,
                      border: `1px solid ${c.border}`,
                      color: c.textSecondary,
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ID: {tmpl.templateId}
                  </span>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: c.text, marginTop: '4px' }}>
                    {tmpl.templateName || `Template #${tmpl.templateId}`}
                  </div>
                </div>

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    backgroundColor: '#fff1f2',
                    color: '#e11d48',
                    border: '1px solid #fecdd3',
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  3-Color BWR
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: c.textMuted }}>
                <span>Resolution:</span>
                <span style={{ fontFamily: 'monospace', color: c.text, fontWeight: 500 }}>
                  {tmpl.width && tmpl.height ? `${tmpl.width} × ${tmpl.height} px` : 'Auto Resolution'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rename Device Nickname Modal */}
      {editingDevice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setEditingDevice(null)}
        >
          <div
            style={{
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ backgroundColor: c.primarySubtle, padding: '8px', borderRadius: '8px' }}>
                <Edit2 size={18} color={c.primary} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: c.text }}>
                  Rename Physical ESL Tag
                </h3>
                <span style={{ fontSize: '12px', color: c.textMuted, fontFamily: 'monospace' }}>
                  Barcode: {editingDevice.deviceNumber}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: c.text, marginBottom: '6px' }}>
                Hardware Nickname / Location Label
              </label>
              <input
                type="text"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                placeholder="e.g. Kalakand Shelf Endcap 7.5"
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
                Calls Highlight Cloud API <code style={{ color: c.primary }}>updateDevice</code> to rename the tag on the server.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setEditingDevice(null)}
                disabled={isSavingName}
                style={{
                  backgroundColor: c.surfaceSubtle,
                  color: c.text,
                  border: `1px solid ${c.border}`,
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isSavingName ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRename}
                disabled={isSavingName || !newDeviceName.trim()}
                style={{
                  backgroundColor: c.primary,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isSavingName ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isSavingName ? (
                  <>
                    <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Nickname</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pick-to-Light / Flash LED Configuration Modal */}
      {flashConfigDevice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => setFlashConfigDevice(null)}
        >
          <div
            style={{
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ backgroundColor: '#dcfce7', padding: '8px', borderRadius: '8px' }}>
                <Zap size={20} color="#16a34a" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: c.text }}>
                  Flash Physical LED (Pick-to-Light)
                </h3>
                <span style={{ fontSize: '12px', color: c.textMuted, fontFamily: 'monospace' }}>
                  Tag: {flashConfigDevice.deviceNumber}{' '}
                  {flashConfigDevice.skuName ? `• ${flashConfigDevice.skuName}` : ''}
                </span>
              </div>
            </div>

            {/* Color Selection */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: c.text, marginBottom: '8px' }}
              >
                Select LED Color
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  {
                    id: 2,
                    label: 'Green',
                    desc: 'Pick-to-Light',
                    bg: '#dcfce7',
                    border: '#86efac',
                    text: '#15803d',
                    dot: '#16a34a',
                  },
                  {
                    id: 1,
                    label: 'Red',
                    desc: 'Stock Alert',
                    bg: '#fee2e2',
                    border: '#fca5a5',
                    text: '#b91c1c',
                    dot: '#dc2626',
                  },
                  {
                    id: 3,
                    label: 'Blue',
                    desc: 'Express Order',
                    bg: '#dbeafe',
                    border: '#93c5fd',
                    text: '#1d4ed8',
                    dot: '#2563eb',
                  },
                  {
                    id: 4,
                    label: 'Yellow',
                    desc: 'Restock Task',
                    bg: '#fef9c3',
                    border: '#fde047',
                    text: '#a16207',
                    dot: '#ca8a04',
                  },
                  {
                    id: 7,
                    label: 'Purple',
                    desc: 'Special VIP',
                    bg: '#f3e8ff',
                    border: '#d8b4fe',
                    text: '#7e22ce',
                    dot: '#9333ea',
                  },
                  {
                    id: 8,
                    label: 'White',
                    desc: 'Audit / Beacon',
                    bg: '#f1f5f9',
                    border: '#cbd5e1',
                    text: '#334155',
                    dot: '#64748b',
                  },
                ].map((col) => {
                  const isSelected = flashColor === col.id;
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setFlashColor(col.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '2px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: isSelected ? `2px solid ${col.dot}` : `1px solid ${col.border}`,
                        backgroundColor: isSelected ? col.bg : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: col.dot,
                          }}
                        />
                        <span style={{ fontSize: '12px', fontWeight: 700, color: col.text }}>{col.label}</span>
                      </div>
                      <span style={{ fontSize: '10px', color: c.textMuted }}>{col.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: c.text, marginBottom: '8px' }}
              >
                Flash Duration
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[15, 30, 60, 120, 300].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setFlashDuration(sec)}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      borderRadius: '6px',
                      border: flashDuration === sec ? `2px solid ${c.primary}` : `1px solid ${c.border}`,
                      backgroundColor: flashDuration === sec ? c.primarySubtle : c.surfaceSubtle,
                      color: flashDuration === sec ? c.primary : c.text,
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {sec >= 60 ? `${sec / 60}m` : `${sec}s`}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              {blinkingTagIds.has(flashConfigDevice.deviceNumber) && onStopFlashDevice && (
                <button
                  type="button"
                  onClick={async () => {
                    await onStopFlashDevice(flashConfigDevice.deviceNumber);
                    setFlashConfigDevice(null);
                  }}
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fca5a5',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Stop Flashing
                </button>
              )}
              <button
                type="button"
                onClick={() => setFlashConfigDevice(null)}
                style={{
                  backgroundColor: c.surfaceSubtle,
                  color: c.text,
                  border: `1px solid ${c.border}`,
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onFlashDevice) {
                    await onFlashDevice(flashConfigDevice.deviceNumber, flashColor, flashDuration);
                  }
                  setFlashConfigDevice(null);
                }}
                style={{
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Zap size={13} fill="#ffffff" />
                <span>Start Flash Sequence</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
