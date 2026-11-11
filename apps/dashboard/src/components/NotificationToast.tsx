import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  details?: string;
  timestamp: Date;
  duration?: number;
}

interface NotificationToastContainerProps {
  toasts: AppNotification[];
  onDismiss: (id: string) => void;
}

export function NotificationToastContainer({ toasts, onDismiss }: NotificationToastContainerProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (toasts.length === 0) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '24px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '430px',
        width: 'calc(100vw - 48px)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';

        // Enterprise Palette Colors
        const bg = isError ? '#fef2f2' : isSuccess ? '#f0fdf4' : isWarning ? '#fffbeb' : '#f0f9ff';
        const border = isError ? '#fca5a5' : isSuccess ? '#86efac' : isWarning ? '#fde047' : '#7dd3fc';
        const titleColor = isError ? '#991b1b' : isSuccess ? '#166534' : isWarning ? '#854d0e' : '#075985';
        const msgColor = isError ? '#7f1d1d' : isSuccess ? '#14532d' : isWarning ? '#713f12' : '#0c4a6e';

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              backgroundColor: bg,
              border: `1px solid ${border}`,
              borderRadius: '10px',
              padding: '12px 14px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              animation: 'fadeInSlide 0.25s ease-out forwards',
              transition: 'all 0.2s ease',
            }}
          >
            {/* Header: Icon, Title, Time, Close */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isSuccess && <CheckCircle2 size={16} color="#16a34a" />}
                {isError && <AlertCircle size={16} color="#dc2626" />}
                {isWarning && <AlertTriangle size={16} color="#d97706" />}
                {!isSuccess && !isError && !isWarning && <Info size={16} color="#0284c7" />}
                <span style={{ fontSize: '13px', fontWeight: 700, color: titleColor }}>
                  {toast.title}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                  {toast.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <button
                  onClick={() => onDismiss(toast.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                  }}
                  title="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Message Body */}
            <div style={{ fontSize: '12px', color: msgColor, lineHeight: 1.4, fontWeight: 500 }}>
              {toast.message}
            </div>

            {/* Technical Details Badge */}
            {toast.details && (
              <div
                style={{
                  marginTop: '4px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(0, 0, 0, 0.05)',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#334155',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '6px',
                  wordBreak: 'break-all',
                }}
              >
                <div style={{ flex: 1, whiteSpace: 'pre-wrap', lineHeight: 1.35 }}>
                  {toast.details}
                </div>
                <button
                  onClick={() => handleCopy(toast.id, toast.details || '')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: copiedId === toast.id ? '#16a34a' : '#64748b',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                  title="Copy details"
                >
                  {copiedId === toast.id ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface NotificationHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onClearAll: () => void;
}

export function NotificationHistoryDrawer({
  isOpen,
  onClose,
  notifications,
  onClearAll,
}: NotificationHistoryDrawerProps) {
  const [filterType, setFilterType] = useState<'all' | 'error' | 'success'>('all');
  const [copiedLog, setCopiedLog] = useState(false);

  if (!isOpen) return null;

  const filtered = notifications.filter((n) => {
    if (filterType === 'all') return true;
    return n.type === filterType;
  });

  const handleCopyDiagnostics = () => {
    const text = notifications
      .map(
        (n) =>
          `[${n.timestamp.toISOString()}] [${n.type.toUpperCase()}] ${n.title}: ${n.message}${
            n.details ? `\nDetails: ${n.details}` : ''
          }`
      )
      .join('\n---\n');
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 100000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              Activity & Notifications Log
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {notifications.length} events logged this session
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '6px',
              padding: '6px',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Toolbar: Filters & Actions */}
        <div
          style={{
            padding: '10px 20px',
            borderBottom: '1px solid #f1f5f9',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['all', 'error', 'success'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: filterType === t ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: filterType === t ? '#eff6ff' : '#ffffff',
                  color: filterType === t ? '#1d4ed8' : '#64748b',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={handleCopyDiagnostics}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                cursor: 'pointer',
              }}
              title="Copy entire event log with technical diagnostics"
            >
              {copiedLog ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
              <span>{copiedLog ? 'Copied' : 'Copy Log'}</span>
            </button>
            <button
              onClick={onClearAll}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                border: '1px solid #fecaca',
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                cursor: 'pointer',
              }}
              title="Clear all events"
            >
              <Trash2 size={12} />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Scrollable Event List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              No {filterType !== 'all' ? filterType : ''} activity events recorded yet.
            </div>
          ) : (
            filtered.map((item) => {
              const isError = item.type === 'error';
              const isSuccess = item.type === 'success';
              const isWarning = item.type === 'warning';

              const borderCol = isError ? '#fca5a5' : isSuccess ? '#86efac' : isWarning ? '#fde047' : '#7dd3fc';
              const bgCol = isError ? '#fff5f5' : isSuccess ? '#f8fdf9' : isWarning ? '#fefce8' : '#f0f9ff';

              return (
                <div
                  key={item.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${borderCol}`,
                    backgroundColor: bgCol,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isSuccess && <CheckCircle2 size={14} color="#16a34a" />}
                      {isError && <AlertCircle size={14} color="#dc2626" />}
                      {isWarning && <AlertTriangle size={14} color="#d97706" />}
                      {!isSuccess && !isError && !isWarning && <Info size={14} color="#0284c7" />}
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                        {item.title}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                      {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.35 }}>
                    {item.message}
                  </div>

                  {item.details && (
                    <div
                      style={{
                        marginTop: '4px',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(0,0,0,0.04)',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#475569',
                        wordBreak: 'break-all',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {item.details}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
