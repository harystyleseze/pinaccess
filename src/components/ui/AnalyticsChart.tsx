'use client';

import { useState } from 'react';

interface ChartData {
  date: string;
  requests: number;
  bandwidth: number;
}

interface AnalyticsChartProps {
  data: ChartData[];
  type: 'requests' | 'bandwidth';
  title: string;
  loading?: boolean;
}

interface TooltipData {
  visible: boolean;
  x: number;
  y: number;
  date: string;
  value: number;
}

export default function AnalyticsChart({ data, type, title, loading }: AnalyticsChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData>({
    visible: false,
    x: 0,
    y: 0,
    date: '',
    value: 0
  });

  const showTooltip = (event: React.MouseEvent, item: ChartData) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const value = type === 'requests' ? item.requests : item.bandwidth;
    
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      date: item.date,
      value: value
    });
  };

  const hideTooltip = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  const formatValue = (value: number): string => {
    if (type === 'bandwidth') {
      // Format bytes
      if (value === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(value) / Math.log(k));
      return parseFloat((value / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    } else {
      // Format requests
      return new Intl.NumberFormat('en-US').format(value);
    }
  };

  if (loading) {
    // Use deterministic heights to avoid hydration mismatch
    const loadingHeights = [60, 120, 80, 150, 90, 110, 140, 70, 100, 130, 85, 95, 160, 75, 125, 105, 135, 65, 115, 145, 80, 100, 120, 90, 110, 140, 70, 155, 85, 125];
    
    return (
      <div className="card">
        <div className="px-8 py-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="p-8">
          <div className="flex items-end space-x-2 h-64">
            {Array.from({ length: 30 }).map((_, i) => (
              <div 
                key={i} 
                className="loading-shimmer flex-1 rounded-t"
                style={{ height: `${loadingHeights[i]}px` }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="card">
        <div className="px-8 py-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="p-8">
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4 icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
            </svg>
            <p className="text-gray-600">No {type} data available</p>
          </div>
        </div>
      </div>
    );
  }

  const values = data.map(d => type === 'requests' ? d.requests : d.bandwidth);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = maxValue - minValue;

  return (
    <>
      {/* Global tooltip */}
      {tooltip.visible && (
        <div
          className="fixed px-4 py-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl border border-gray-700 whitespace-nowrap pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999
          }}
        >
          <div className="font-semibold text-gray-100 mb-1">
            {new Date(tooltip.date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
          <div className="text-white font-medium">
            {type === 'requests' ? 'Uploads: ' : 'Monetized: '}{formatValue(tooltip.value)}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
      
      <div className="card">
        <div className="px-8 py-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            <div className="text-sm text-gray-600">
              Total: {formatValue(values.reduce((sum, val) => sum + val, 0))}
            </div>
          </div>
        </div>
        <div className="p-8">
          <div className="flex items-end space-x-1 h-64 overflow-x-auto">
            {data.map((item) => {
              const value = type === 'requests' ? item.requests : item.bandwidth;
              const height = range > 0 ? ((value - minValue) / range) * 200 + 20 : 20;
              
              return (
                <div 
                  key={item.date} 
                  className="flex flex-col items-center min-w-8 cursor-pointer"
                  onMouseEnter={(e) => showTooltip(e, item)}
                  onMouseLeave={hideTooltip}
                >
                  <div 
                    className={`${
                      type === 'requests' 
                        ? 'bg-gradient-to-t from-blue-500 to-purple-600' 
                        : 'bg-gradient-to-t from-green-500 to-emerald-600'
                    } rounded-t w-6 transition-all duration-300 hover:opacity-80`}
                    style={{ height: `${height}px` }}
                  ></div>
                  <p className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                    {new Date(item.date).getDate()}
                  </p>
                </div>
              );
            })}
          </div>
        
          {/* Legend */}
          <div className="mt-6 flex items-center justify-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded ${
                type === 'requests' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
                  : 'bg-gradient-to-r from-green-500 to-emerald-600'
              }`}></div>
              <span className="text-sm text-gray-600 capitalize">{type}</span>
            </div>
            {maxValue > 0 && (
              <>
                <div className="text-sm text-gray-500">
                  Peak: {formatValue(maxValue)}
                </div>
                <div className="text-sm text-gray-500">
                  Avg: {formatValue(Math.round(values.reduce((sum, val) => sum + val, 0) / values.length))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}