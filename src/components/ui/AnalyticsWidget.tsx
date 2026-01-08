'use client';

import React, { useState, useEffect } from 'react';
import { FileText, DollarSign, TrendingUp } from 'lucide-react';

interface AnalyticsData {
  totalDocuments: number;
  monetizedDocuments: number;
  totalFileSize: number;
  monetizationRate: number;
}

interface AnalyticsWidgetProps {
  className?: string;
}

export default function AnalyticsWidget({ className = '' }: AnalyticsWidgetProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/analytics/summary?days=30');
        const result = await response.json();

        if (result.success && result.data) {
          setAnalytics(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between p-4 card">
        <div className="flex items-center">
          <FileText className="w-5 h-5 text-[var(--brand-teal)] mr-3" />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Total Documents</p>
            <p className="text-xs text-[var(--text-muted)]">All uploaded files</p>
          </div>
        </div>
        <div className="text-right">
          {loading ? (
            <div className="w-12 h-6 rounded bg-[var(--surface-elevated)] animate-pulse"></div>
          ) : (
            <>
              <p className="text-lg font-bold text-[var(--text-primary)]">{formatNumber(analytics?.totalDocuments || 0)}</p>
              <p className="text-xs text-[var(--text-muted)]">Documents</p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between p-4 card">
        <div className="flex items-center">
          <DollarSign className="w-5 h-5 text-[var(--success)] mr-3" />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Monetized</p>
            <p className="text-xs text-[var(--text-muted)]">Paid documents</p>
          </div>
        </div>
        <div className="text-right">
          {loading ? (
            <div className="w-16 h-6 rounded bg-[var(--surface-elevated)] animate-pulse"></div>
          ) : (
            <>
              <p className="text-lg font-bold text-[var(--text-primary)]">{formatNumber(analytics?.monetizedDocuments || 0)}</p>
              <p className="text-xs text-[var(--text-muted)]">Files</p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between p-4 card">
        <div className="flex items-center">
          <TrendingUp className="w-5 h-5 text-[var(--warning)] mr-3" />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Monetization Rate</p>
            <p className="text-xs text-[var(--text-muted)]">Percentage monetized</p>
          </div>
        </div>
        <div className="text-right">
          {loading ? (
            <div className="w-20 h-6 rounded bg-[var(--surface-elevated)] animate-pulse"></div>
          ) : (
            <>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {Math.round(analytics?.monetizationRate || 0)}%
              </p>
              <p className="text-xs text-[var(--text-muted)]">Rate</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
