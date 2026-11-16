import React from 'react';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  borderRadius = '6px',
  style,
  className = '',
}) => {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width,
        height,
        borderRadius,
        display: 'inline-block',
        ...style,
      }}
    />
  );
};

export const KpiCardSkeleton: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width="90px" height="12px" />
        <Skeleton width="18px" height="18px" borderRadius="50%" />
      </div>
      <Skeleton width="120px" height="28px" borderRadius="8px" />
      <Skeleton width="150px" height="11px" />
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ rows = 5, columns = 5 }) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        padding: '16px',
      }}
    >
      {/* Header Skeleton */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width="70%" height="13px" />
        ))}
      </div>

      {/* Row Skeletons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: '16px',
              alignItems: 'center',
            }}
          >
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                width={c === 0 ? '85%' : c === columns - 1 ? '50%' : '65%'}
                height="15px"
                borderRadius="4px"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const HomeOverviewSkeleton: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top 4 KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>

      {/* Main 2-Column Split: Activity Chart & Convergence Donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: '18px' }}>
        {/* Left Chart Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Skeleton width="180px" height="16px" />
              <Skeleton width="240px" height="11px" />
            </div>
            <Skeleton width="70px" height="20px" borderRadius="12px" />
          </div>
          {/* Chart Graphic Skeleton */}
          <Skeleton width="100%" height="190px" borderRadius="10px" />
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
            <Skeleton width="80px" height="12px" />
            <Skeleton width="110px" height="12px" />
            <Skeleton width="90px" height="12px" />
          </div>
        </div>

        {/* Right Donut Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            alignItems: 'center',
          }}
        >
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
            <Skeleton width="140px" height="15px" />
            <Skeleton width="50px" height="15px" borderRadius="10px" />
          </div>
          {/* Donut Circle Skeleton */}
          <Skeleton width="130px" height="130px" borderRadius="50%" />
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Skeleton width="100%" height="14px" />
            <Skeleton width="100%" height="14px" />
          </div>
        </div>
      </div>

      {/* Base Stations & Fleet Hardware Grid */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton width="200px" height="16px" />
          <Skeleton width="90px" height="14px" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          <Skeleton width="100%" height="95px" borderRadius="10px" />
          <Skeleton width="100%" height="95px" borderRadius="10px" />
        </div>
      </div>
    </div>
  );
};

export const HighlightFleetSkeleton: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner Skeleton */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Skeleton width="220px" height="20px" />
          <Skeleton width="340px" height="13px" />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Skeleton width="110px" height="32px" borderRadius="6px" />
          <Skeleton width="90px" height="32px" borderRadius="6px" />
        </div>
      </div>

      {/* Grid of E-Paper Display Tag Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '16px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton width="100px" height="14px" />
              <Skeleton width="45px" height="18px" borderRadius="10px" />
            </div>
            {/* E-Paper Screen Simulation Skeleton */}
            <Skeleton width="100%" height="110px" borderRadius="8px" />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Skeleton width="70px" height="12px" />
              <Skeleton width="80px" height="12px" />
            </div>
            <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
              <Skeleton width="100%" height="28px" borderRadius="6px" />
              <Skeleton width="100%" height="28px" borderRadius="6px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
