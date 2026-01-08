'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/layout/Navigation';
import AnalyticsChart from '@/components/ui/AnalyticsChart';
import { FileText, DollarSign, HardDrive, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react';

interface DocumentAnalytics {
  totalDocuments: number;
  monetizedDocuments: number;
  totalFileSize: number;
  recentUploads: number;
  documentsByType: { [key: string]: number };
  uploadTrend: Array<{
    date: string;
    uploads: number;
    monetized: number;
  }>;
  monetizationRate: number;
  topFiles: Array<{
    name: string;
    size: number;
    isMonetized: boolean;
    createdAt: string;
    mimeType: string;
  }>;
  period: string;
}

interface AnalyticsResponse {
  success: boolean;
  data?: DocumentAnalytics;
  error?: string;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<DocumentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<number>(30);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/analytics/summary?days=${timeRange}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: AnalyticsResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch analytics');
      }

      if (result.data) {
        setAnalytics(result.data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getFileTypeLabel = (mimeType: string): string => {
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('image')) return 'Image';
    if (mimeType.includes('video')) return 'Video';
    if (mimeType.includes('audio')) return 'Audio';
    if (mimeType.includes('text')) return 'Text';
    return 'File';
  };

  // Transform upload trend data for charts
  const chartData = analytics?.uploadTrend.map(item => ({
    date: item.date,
    requests: item.uploads,
    bandwidth: item.monetized * 1000000
  })) || [];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Navigation />

      {/* Header */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="content-max-width section-padding">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-8 gap-6">
            <div className="animate-fade-in">
              <h1 className="text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-2">Analytics Dashboard</h1>
              <p className="text-lg text-[var(--text-secondary)]">
                Track your document uploads and monetization performance
              </p>
            </div>

            {/* Time Range Selector */}
            <div className="flex gap-2">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setTimeRange(days)}
                  className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 ${
                    timeRange === days
                      ? 'bg-gradient-to-r from-[var(--brand-teal)] to-[var(--brand-cyan)] text-white'
                      : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface)]'
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="content-max-width section-padding py-8">
        {/* Error State */}
        {error && (
          <div className="mb-8 p-6 status-error rounded-2xl border animate-slide-up">
            <div className="flex items-center">
              <AlertCircle className="w-6 h-6 mr-3" />
              <p className="font-semibold">{error}</p>
            </div>
            <button
              onClick={fetchAnalytics}
              className="mt-4 btn-primary"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {/* Overview Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="card p-6 animate-slide-up">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-[var(--brand-teal)] flex-shrink-0" />
              <div className="ml-4">
                <p className="text-sm font-medium text-[var(--text-muted)] mb-1">Total Documents</p>
                <p className="text-3xl font-bold text-[var(--text-primary)]">
                  {loading ? (
                    <span className="inline-block w-12 h-8 rounded bg-[var(--surface-elevated)] animate-pulse"></span>
                  ) : (
                    formatNumber(analytics?.totalDocuments || 0)
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-[var(--success)] flex-shrink-0" />
              <div className="ml-4">
                <p className="text-sm font-medium text-[var(--text-muted)] mb-1">Monetized</p>
                <p className="text-3xl font-bold text-[var(--text-primary)]">
                  {loading ? (
                    <span className="inline-block w-12 h-8 rounded bg-[var(--surface-elevated)] animate-pulse"></span>
                  ) : (
                    formatNumber(analytics?.monetizedDocuments || 0)
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center">
              <HardDrive className="w-8 h-8 text-[var(--info)] flex-shrink-0" />
              <div className="ml-4">
                <p className="text-sm font-medium text-[var(--text-muted)] mb-1">Total Storage</p>
                <p className="text-3xl font-bold text-gradient">
                  {loading ? (
                    <span className="inline-block w-16 h-8 rounded bg-[var(--surface-elevated)] animate-pulse"></span>
                  ) : (
                    formatBytes(analytics?.totalFileSize || 0)
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-[var(--warning)] flex-shrink-0" />
              <div className="ml-4">
                <p className="text-sm font-medium text-[var(--text-muted)] mb-1">Monetization Rate</p>
                <p className="text-3xl font-bold text-[var(--text-primary)]">
                  {loading ? (
                    <span className="inline-block w-12 h-8 rounded bg-[var(--surface-elevated)] animate-pulse"></span>
                  ) : (
                    `${Math.round(analytics?.monetizationRate || 0)}%`
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <AnalyticsChart
            data={chartData}
            type="requests"
            title="Document Uploads Over Time"
            loading={loading}
          />
          <AnalyticsChart
            data={chartData}
            type="bandwidth"
            title="Monetization Activity"
            loading={loading}
          />
        </div>

        {/* Data Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Top Files */}
          <div className="card">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Largest Files</h3>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-lg bg-[var(--surface-elevated)] animate-pulse"></div>
                      <div className="flex-1">
                        <div className="w-32 h-4 rounded bg-[var(--surface-elevated)] animate-pulse mb-2"></div>
                        <div className="w-20 h-3 rounded bg-[var(--surface-elevated)] animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : analytics?.topFiles.length ? (
                <div className="space-y-4">
                  {analytics.topFiles.slice(0, 10).map((file) => (
                    <div key={file.name} className="flex items-center justify-between p-4 bg-[var(--surface-elevated)] rounded-xl">
                      <div className="flex items-center space-x-4">
                        <FileText className="w-5 h-5 text-[var(--brand-teal)] flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-[var(--text-primary)] truncate max-w-48">
                            {file.name}
                          </p>
                          <p className="text-sm text-[var(--text-secondary)]">
                            {formatBytes(file.size)} • {file.isMonetized ? 'Monetized' : 'Free'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                  <p className="text-[var(--text-secondary)]">No files uploaded yet</p>
                </div>
              )}
            </div>
          </div>

          {/* File Types */}
          <div className="card">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">File Types</h3>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="w-8 h-8 rounded bg-[var(--surface-elevated)] animate-pulse"></div>
                      <div className="flex-1">
                        <div className="w-24 h-4 rounded bg-[var(--surface-elevated)] animate-pulse mb-2"></div>
                        <div className="w-16 h-3 rounded bg-[var(--surface-elevated)] animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : analytics?.documentsByType && Object.keys(analytics.documentsByType).length ? (
                <div className="space-y-4">
                  {Object.entries(analytics.documentsByType)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10)
                    .map(([type, count]) => {
                      const maxCount = Math.max(...Object.values(analytics.documentsByType));
                      const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

                      return (
                        <div key={type} className="flex items-center justify-between p-4 bg-[var(--surface-elevated)] rounded-xl">
                          <div className="flex items-center space-x-4">
                            <span className="text-sm font-medium text-[var(--text-secondary)] w-12">{getFileTypeLabel(type)}</span>
                            <div>
                              <p className="font-semibold text-[var(--text-primary)] capitalize">
                                {type}
                              </p>
                              <p className="text-sm text-[var(--text-secondary)]">
                                {formatNumber(count)} files
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="w-20 bg-[var(--surface)] rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-[var(--brand-teal)] to-[var(--brand-cyan)] h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                  <p className="text-[var(--text-secondary)]">No file type data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
