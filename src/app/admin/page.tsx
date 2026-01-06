'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '@/components/layout/Navigation';
import DocumentList from '@/components/ui/DocumentList';
import AnalyticsWidget from '@/components/ui/AnalyticsWidget';
import { Document, DocumentListResponse } from '@/lib/types';

interface DashboardStats {
  totalDocuments: number;
  monetizedDocuments: number;
  totalRevenue: number;
  recentUploads: number;
}

export default function CreatorDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    monetizedDocuments: 0,
    totalRevenue: 0,
    recentUploads: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'uploaded' | 'monetized' | 'error'>('all');

  // Fetch dashboard statistics
  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all documents to calculate stats
      const response = await fetch('/api/documents?pageSize=100');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: DocumentListResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch documents');
      }

      if (result.data) {
        const documents = result.data.documents;
        
        // Calculate statistics
        const totalDocuments = documents.length;
        const monetizedDocuments = documents.filter(doc => doc.isMonetized).length;
        const totalRevenue = documents
          .filter(doc => doc.isMonetized && doc.price)
          .reduce((sum, doc) => sum + (doc.price?.usd || 0), 0);
        
        // Recent uploads (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentUploads = documents.filter(doc => 
          new Date(doc.createdAt) > sevenDaysAgo
        ).length;

        setStats({
          totalDocuments,
          monetizedDocuments,
          totalRevenue,
          recentUploads
        });
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleCopyUrl = (url: string) => {
    setCopyMessage(`Gateway URL copied to clipboard!`);
    setTimeout(() => setCopyMessage(null), 3000);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getFilterForDocumentList = () => {
    if (filterStatus === 'all') return undefined;
    return { status: filterStatus as 'uploaded' | 'monetized' | 'error' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navigation />
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="content-max-width section-padding">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-8 gap-6">
            <div className="animate-fade-in">
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2">Creator Dashboard</h1>
              <p className="text-lg text-gray-600">
                Manage your documents and track monetization performance
              </p>
            </div>
            <Link
              href="/admin/upload"
              className="btn-primary text-lg px-8 py-4 animate-pulse-gentle"
            >
              🚀 Upload New Document
            </Link>
          </div>
        </div>
      </div>

      <div className="content-max-width section-padding py-8">
        {/* Copy Success Message */}
        {copyMessage && (
          <div className="mb-8 p-6 status-success rounded-2xl border animate-slide-up">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-green-500 mr-3 icon-clean" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-green-800 font-semibold">{copyMessage}</p>
            </div>
          </div>
        )}

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
              onClick={fetchStats}
              className="mt-4 btn-error px-6 py-2"
            >
              🔄 Retry
            </button>
          </div>
        )}

        {/* Statistics Cards */}
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
                  {loading ? <span className="loading-shimmer w-12 h-8 rounded"></span> : stats.totalDocuments}
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
                  {loading ? <span className="loading-shimmer w-12 h-8 rounded"></span> : stats.monetizedDocuments}
                </p>
              </div>
            </div>
          </div>

          <div className="card-gradient p-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-6">
                <p className="text-sm font-semibold text-gray-600 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {loading ? <span className="loading-shimmer w-16 h-8 rounded"></span> : formatCurrency(stats.totalRevenue)}
                </p>
              </div>
            </div>
          </div>

          <div className="card-gradient p-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="ml-6">
                <p className="text-sm font-semibold text-gray-600 mb-1">Recent Uploads</p>
                <p className="text-3xl font-bold text-gray-900">
                  {loading ? <span className="loading-shimmer w-12 h-8 rounded"></span> : stats.recentUploads}
                </p>
                <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="card">
          <div className="px-8 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">Your Documents</h2>
              
              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`btn-pill px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    filterStatus === 'all'
                      ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📄 All
                </button>
                <button
                  onClick={() => setFilterStatus('uploaded')}
                  className={`btn-pill px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    filterStatus === 'uploaded'
                      ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📤 Uploaded
                </button>
                <button
                  onClick={() => setFilterStatus('monetized')}
                  className={`btn-pill px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    filterStatus === 'monetized'
                      ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  💰 Monetized
                </button>
                <button
                  onClick={() => setFilterStatus('error')}
                  className={`btn-pill px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    filterStatus === 'error'
                      ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ⚠️ Errors
                </button>
              </div>
            </div>
          </div>

          <div className="p-8">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <span className="ml-4 text-gray-600 text-lg">Loading documents...</span>
              </div>
            ) : (
              <DocumentList
                filters={getFilterForDocumentList()}
                onCopyUrl={handleCopyUrl}
              />
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions Card */}
          <div className="card p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-4">
              <Link
                href="/admin/upload"
                className="flex items-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:shadow-md"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-600 icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Upload Document</p>
                  <p className="text-sm text-gray-600">Add a new document to monetize</p>
                </div>
              </Link>

              <button
                onClick={fetchStats}
                className="flex items-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:shadow-md"
              >
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-green-600 icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Refresh Data</p>
                  <p className="text-sm text-gray-600">Update dashboard statistics</p>
                </div>
              </button>

              <Link
                href="/admin/analytics"
                className="flex items-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:shadow-md"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-purple-600 icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Analytics</p>
                  <p className="text-sm text-gray-600">View performance metrics</p>
                </div>
              </Link>

              <Link
                href="/admin/payment-instructions"
                className="flex items-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:shadow-md"
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-indigo-600 icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Payment Instructions</p>
                  <p className="text-sm text-gray-600">Manage monetization settings</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Analytics Preview Card */}
          <div className="card p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Analytics Overview</h3>
              <Link
                href="/admin/analytics"
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
              >
                View Details →
              </Link>
            </div>
            <AnalyticsWidget />
          </div>
        </div>
      </div>
    </div>
  );
}