'use client';

import React, { useState, useEffect } from 'react';

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
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-white icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Total Documents</p>
            <p className="text-xs text-gray-600">All uploaded files</p>
          </div>
        </div>
        <div className="text-right">
          {loading ? (
            <div className="loading-shimmer w-12 h-6 rounded"></div>
          ) : (
            <>
              <p className="text-lg font-bold text-gray-900">{formatNumber(analytics?.totalDocuments || 0)}</p>
              <p className="text-xs text-gray-500">Documents</p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-white icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Monetized</p>
            <p className="text-xs text-gray-600">Paid documents</p>
          </div>
        </div>
        <div className="text-right">
          {loading ? (
            <div className="loading-shimmer w-16 h-6 rounded"></div>
          ) : (
            <>
              <p className="text-lg font-bold text-gray-900">{formatNumber(analytics?.monetizedDocuments || 0)}</p>
              <p className="text-xs text-gray-500">Files</p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-white icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Monetization Rate</p>
            <p className="text-xs text-gray-600">Percentage monetized</p>
          </div>
        </div>
        <div className="text-right">
          {loading ? (
            <div className="loading-shimmer w-20 h-6 rounded"></div>
          ) : (
            <>
              <p className="text-lg font-bold text-gray-900">
                {Math.round(analytics?.monetizationRate || 0)}%
              </p>
              <p className="text-xs text-gray-500">Rate</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}