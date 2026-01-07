'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, DollarSign, TrendingUp, Plus, RefreshCw, BarChart3, CreditCard, Upload, AlertCircle, Check } from 'lucide-react';
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
    <div className="min-h-screen bg-[var(--background)]">
      <Navigation />

      {/* Header */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="content-max-width section-padding">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-8 gap-6">
            <div className="animate-fade-in">
              <h1 className="text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-2">Creator Dashboard</h1>
              <p className="text-lg text-[var(--text-secondary)]">
                Manage your documents and track monetization performance
              </p>
            </div>
            <Link
              href="/admin/upload"
              className="btn-primary btn-lg"
            >
              <Upload className="w-5 h-5" />
              Upload New Document
            </Link>
          </div>
        </div>
      </div>

      <div className="content-max-width section-padding py-8">
        {/* Copy Success Message */}
        {copyMessage && (
          <div className="mb-8 p-6 status-success rounded-2xl border animate-slide-up">
            <div className="flex items-center">
              <Check className="w-6 h-6 mr-3" />
              <p className="font-semibold">{copyMessage}</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-8 p-6 status-error rounded-2xl border animate-slide-up">
            <div className="flex items-center">
              <AlertCircle className="w-6 h-6 mr-3" />
              <p className="font-semibold">{error}</p>
            </div>
            <button
              onClick={fetchStats}
              className="mt-4 btn-primary"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {/* Statistics Cards */}
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
                    stats.totalDocuments
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
                    stats.monetizedDocuments
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-[var(--info)] flex-shrink-0" />
              <div className="ml-4">
                <p className="text-sm font-medium text-[var(--text-muted)] mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-gradient">
                  {loading ? (
                    <span className="inline-block w-16 h-8 rounded bg-[var(--surface-elevated)] animate-pulse"></span>
                  ) : (
                    formatCurrency(stats.totalRevenue)
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center">
              <Plus className="w-8 h-8 text-[var(--warning)] flex-shrink-0" />
              <div className="ml-4">
                <p className="text-sm font-medium text-[var(--text-muted)] mb-1">Recent Uploads</p>
                <p className="text-3xl font-bold text-[var(--text-primary)]">
                  {loading ? (
                    <span className="inline-block w-12 h-8 rounded bg-[var(--surface-elevated)] animate-pulse"></span>
                  ) : (
                    stats.recentUploads
                  )}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Last 7 days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="card">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Your Documents</h2>

              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                {['all', 'uploaded', 'monetized', 'error'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status as any)}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                      filterStatus === status
                        ? 'bg-gradient-to-r from-[var(--brand-teal)] to-[var(--brand-cyan)] text-white'
                        : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface)]'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-10 h-10 border-2 border-[var(--brand-teal)] border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-4 text-[var(--text-secondary)] text-lg">Loading documents...</span>
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
          <div className="card p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-4">
              <Link
                href="/admin/upload"
                className="flex items-center p-4 border border-[var(--border)] rounded-xl hover:bg-[var(--surface-elevated)] transition-all duration-200"
              >
                <Upload className="w-6 h-6 text-[var(--brand-teal)] mr-4 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[var(--text-primary)] mb-1">Upload Document</p>
                  <p className="text-sm text-[var(--text-secondary)]">Add a new document to monetize</p>
                </div>
              </Link>

              <button
                onClick={fetchStats}
                className="flex items-center p-4 border border-[var(--border)] rounded-xl hover:bg-[var(--surface-elevated)] transition-all duration-200 w-full text-left"
              >
                <RefreshCw className="w-6 h-6 text-[var(--success)] mr-4 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[var(--text-primary)] mb-1">Refresh Data</p>
                  <p className="text-sm text-[var(--text-secondary)]">Update dashboard statistics</p>
                </div>
              </button>

              <Link
                href="/admin/analytics"
                className="flex items-center p-4 border border-[var(--border)] rounded-xl hover:bg-[var(--surface-elevated)] transition-all duration-200"
              >
                <BarChart3 className="w-6 h-6 text-[var(--info)] mr-4 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[var(--text-primary)] mb-1">Analytics</p>
                  <p className="text-sm text-[var(--text-secondary)]">View performance metrics</p>
                </div>
              </Link>

              <Link
                href="/admin/payment-instructions"
                className="flex items-center p-4 border border-[var(--border)] rounded-xl hover:bg-[var(--surface-elevated)] transition-all duration-200"
              >
                <CreditCard className="w-6 h-6 text-[var(--warning)] mr-4 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[var(--text-primary)] mb-1">Payment Instructions</p>
                  <p className="text-sm text-[var(--text-secondary)]">Manage monetization settings</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Analytics Preview Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">Analytics Overview</h3>
              <Link
                href="/admin/analytics"
                className="text-sm text-[var(--brand-teal)] hover:text-[var(--brand-cyan)] font-semibold"
              >
                View Details
              </Link>
            </div>
            <AnalyticsWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
