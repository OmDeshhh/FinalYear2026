import { useState, useEffect } from 'react';
import { Search, Download, RefreshCw, Calendar, AlertCircle, FileText } from 'lucide-react';

export default function WebhookLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0
  });

  const BACKEND_URL = 'http://localhost:3001';

  useEffect(() => {
    fetchLogs();
  }, [pagination.currentPage]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/slack/webhook-logs?page=${pagination.currentPage}&limit=10`
      );
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      // Handle both array response and object with logs property
      const logsData = Array.isArray(data) ? data : (data.logs || []);
      
      setLogs(logsData);
      setPagination({
        currentPage: data.currentPage || 1,
        totalPages: data.totalPages || 1,
        total: data.total || logsData.length
      });
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError('Unable to load logs. Please check your backend server.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = () => {
    try {
      const dataStr = JSON.stringify(filteredLogs, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `webhook-logs-${new Date().toISOString()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export logs');
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.webhookId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.error?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusStyle = (status) => {
    const base = 'px-3 py-1 rounded-full text-xs font-medium';
    const colors = {
      success: 'bg-green-500/20 text-green-400 border border-green-500/30',
      failed: 'bg-red-500/20 text-red-400 border border-red-500/30',
      error: 'bg-red-500/20 text-red-400 border border-red-500/30'
    };
    return `${base} ${colors[status] || 'bg-gray-500/20 text-gray-400'}`;
  };

  const getMethodColor = (method) => {
    const colors = {
      GET: 'text-blue-400',
      POST: 'text-green-400',
      PUT: 'text-yellow-400',
      PATCH: 'text-orange-400',
      DELETE: 'text-red-400'
    };
    return colors[method] || 'text-gray-400';
  };

  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Webhook Logs</h1>
          <p className="text-gray-400">View and manage Slack webhook activity logs</p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by webhook ID, method, or error..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>

            <button
              onClick={fetchLogs}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={exportLogs}
              disabled={filteredLogs.length === 0}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
              title="Export filtered logs as JSON"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard 
            title="Total Logs" 
            value={pagination.total} 
            icon={<FileText className="w-5 h-5" />}
          />
          <StatCard
            title="Successful"
            value={logs.filter((l) => l.status === 'success').length}
            color="text-green-400"
            icon={<div className="w-2 h-2 rounded-full bg-green-400"></div>}
          />
          <StatCard
            title="Failed"
            value={logs.filter((l) => l.status === 'failed' || l.status === 'error').length}
            color="text-red-400"
            icon={<div className="w-2 h-2 rounded-full bg-red-400"></div>}
          />
          <StatCard
            title="Filtered Results"
            value={filteredLogs.length}
            color="text-blue-400"
            icon={<Search className="w-5 h-5" />}
          />
        </div>

        {/* Table */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          {loading ? (
            <div className="flex flex-col justify-center items-center p-12">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mb-3" />
              <p className="text-gray-400">Loading webhook logs...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800 text-left bg-gray-800/50">
                      <th className="p-4 text-gray-400 font-semibold">Webhook ID</th>
                      <th className="p-4 text-gray-400 font-semibold">Method</th>
                      <th className="p-4 text-gray-400 font-semibold">Timestamp</th>
                      <th className="p-4 text-gray-400 font-semibold">Status</th>
                      <th className="p-4 text-gray-400 font-semibold">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length > 0 ? (
                      filteredLogs.map((log) => (
                        <tr 
                          key={log._id} 
                          className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="p-4 font-mono text-sm text-gray-300">
                            {log.webhookId || 'N/A'}
                          </td>
                          <td className="p-4">
                            <code className={`font-semibold ${getMethodColor(log.method)}`}>
                              {log.method || 'N/A'}
                            </code>
                          </td>
                          <td className="p-4 text-sm text-gray-300">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              {formatTimestamp(log.timestamp)}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={getStatusStyle(log.status)}>
                              {log.status || 'unknown'}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-gray-400">
                            {log.error ? (
                              <span className="text-red-400" title={log.error}>
                                {log.error.length > 50 
                                  ? log.error.substring(0, 50) + '...' 
                                  : log.error}
                              </span>
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-gray-400">
                          {searchTerm || statusFilter !== 'all' 
                            ? 'No logs found matching your filters.' 
                            : 'No webhook logs available yet.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && !loading && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, currentPage: prev.currentPage - 1 }))
              }
              disabled={pagination.currentPage === 1}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <span className="text-gray-400">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>

            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, currentPage: prev.currentPage + 1 }))
              }
              disabled={pagination.currentPage >= pagination.totalPages}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Reusable StatCard component
function StatCard({ title, value, color = 'text-white', icon }) {
  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className={`text-3xl font-bold ${color}`}>{value}</div>
        {icon && <div className={color}>{icon}</div>}
      </div>
      <div className="text-gray-400 text-sm">{title}</div>
    </div>
  );
}