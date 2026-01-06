'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/layout/Navigation';
import AnalyticsChart from '@/components/ui/AnalyticsChart';

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

  const getFileTypeIcon = (mimeType: string): string => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('audio')) return '🎵';
    if (mimeType.includes('text')) return '📝';
    return '📁';
  };

  // Transform upload trend data for charts
  const chartData = analytics?.uploadTrend.map(item => ({
    date: item.date,
    requests: item.uploads, // Use uploads as "requests"
    bandwidth: item.monetized * 1000000 // Use monetized count scaled up as "bandwidth"
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navigation />
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="content-max-width section-padding">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-8 gap-6">
            <div className="animate-fade-in">
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
              <p className="text-lg text-gray-600">
                Track your document uploads and monetization performance
              </p>
            </div>
            
            {/* Time Range Selector */}
            <div className="flex gap-2">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setTimeRange(days)}
                  className={`btn-pill px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    timeRange === days
                      ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
              <svg className="w-6 h-6 text-red-500 mr-3 icon-clean" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800 font-semibold">{error}</p>
            </div>
            <button
              onClick={fetchAnalytics}
              className="mt-4 btn-error px-6 py-2"
            >
              🔄 Retry
            </button>
          </div>
        )}

        {/* Overview Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div className="card-gradient p-8 animate-slide-up">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-6">
                <p className="text-sm font-semibold text-gray-600 mb-1">Total Documents</p>
                <p className="text-3xl font-bold text-gray-900">
                  {loading ? <span className="loading-shimmer w-16 h-8 rounded"></span> : formatNumber(analytics?.totalDocuments || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="card-gradient p-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-6">
                <p className="text-sm font-semibold text-gray-600 mb-1">Monetized</p>
                <p className="text-3xl font-bold text-gray-900">
                  {loading ? <span className="loading-shimmer w-16 h-8 rounded"></span> : formatNumber(analytics?.monetizedDocuments || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="card-gradient p-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <div className="ml-6">
                <p className="text-sm font-semibold text-gray-600 mb-1">Total Storage</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {loading ? <span className="loading-shimmer w-16 h-8 rounded"></span> : formatBytes(analytics?.totalFileSize || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="card-gradient p-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-6">
                <p className="text-sm font-semibold text-gray-600 mb-1">Monetization Rate</p>
                <p className="text-3xl font-bold text-gray-900">
                  {loading ? <span className="loading-shimmer w-16 h-8 rounded"></span> : `${Math.round(analytics?.monetizationRate || 0)}%`}
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
            <div className="px-8 py-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Largest Files</h3>
            </div>
            <div className="p-8">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="loading-shimmer w-12 h-12 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="loading-shimmer w-32 h-4 rounded mb-2"></div>
                        <div className="loading-shimmer w-20 h-3 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : analytics?.topFiles.length ? (
                <div className="space-y-4">
                  {analytics.topFiles.slice(0, 10).map((file, index) => (
                    <div key={file.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-lg">
                          {getFileTypeIcon(file.mimeType)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 truncate max-w-48">
                            {file.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatBytes(file.size)} • {file.isMonetized ? '💰 Monetized' : '📄 Free'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4 icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600">No files uploaded yet</p>
                </div>
              )}
            </div>
          </div>

          {/* File Types */}
          <div className="card">
            <div className="px-8 py-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">File Types</h3>
            </div>
            <div className="p-8">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="loading-shimmer w-8 h-8 rounded"></div>
                      <div className="flex-1">
                        <div className="loading-shimmer w-24 h-4 rounded mb-2"></div>
                        <div className="loading-shimmer w-16 h-3 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : analytics?.documentsByType && Object.keys(analytics.documentsByType).length ? (
                <div className="space-y-4">
                  {Object.entries(analytics.documentsByType)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10)
                    .map(([type, count], index) => {
                      const maxCount = Math.max(...Object.values(analytics.documentsByType));
                      const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                      
                      return (
                        <div key={type} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center space-x-4">
                            <span className="text-2xl">{getFileTypeIcon(type)}</span>
                            <div>
                              <p className="font-semibold text-gray-900 capitalize">
                                {type}
                              </p>
                              <p className="text-sm text-gray-600">
                                {formatNumber(count)} files
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
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
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4 icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600">No file type data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}