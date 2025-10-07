import { useState, useEffect } from 'react';
import { Search, Filter, Download, RefreshCw, Calendar } from 'lucide-react';

export default function WebhookLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
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
    try {
      setLoading(true);
      const res = await fetch(
        `${BACKEND_URL}/api/slack/webhook-logs?page=${pagination.currentPage}&limit=10`
      );
      const data = await res.json();
      setLogs(data.logs);
      setPagination({
        currentPage: data.currentPage,
        totalPages: data.totalPages,
        total: data.total
      });
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.slackUserId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.command?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    return status === 'success' ? 'text-green-400' : 'text-red-400';
  };

  const getStatusBg = (status) => {
    return status === 'success' ? 'bg-green-500/20' : 'bg-red-500/20';
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Webhook Logs</h1>
          <p className="text-gray-400">View and manage Slack webhook command logs</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by user ID or command..."
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
              <option value="error">Error</option>
            </select>
            
            <button
              onClick={fetchLogs}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            
            <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="text-2xl font-bold text-white">{pagination.total}</div>
            <div className="text-gray-400 text-sm">Total Logs</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="text-2xl font-bold text-green-400">
              {logs.filter(l => l.status === 'success').length}
            </div>
            <div className="text-gray-400 text-sm">Successful</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="text-2xl font-bold text-red-400">
              {logs.filter(l => l.status === 'error').length}
            </div>
            <div className="text-gray-400 text-sm">Failed</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="text-2xl font-bold text-blue-400">
              {logs.filter(l => l.command === '/webhooklogs').length}
            </div>
            <div className="text-gray-400 text-sm">/webhooklogs Commands</div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left p-4 text-gray-400 font-medium">User ID</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Command</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Timestamp</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log._id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                        <td className="p-4">
                          <div className="font-mono text-sm text-gray-300">
                            {log.slackUserId || 'N/A'}
                          </div>
                        </td>
                        <td className="p-4">
                          <code className="bg-gray-800 px-2 py-1 rounded text-sm">
                            {log.command}
                          </code>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-gray-300">
                            <Calendar className="w-4 h-4" />
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBg(log.status)} ${getStatusColor(log.status)}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-gray-400 max-w-xs truncate">
                            {JSON.stringify(log.response)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredLogs.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No logs found matching your criteria
                </div>
              )}
            </>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
              disabled={pagination.currentPage === 1}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            <span className="text-gray-400">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            
            <button
              onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
              disabled={pagination.currentPage === pagination.totalPages}
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