import { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  Clock,
  ExternalLink,
  Play,
  Shield,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function AlertSystemPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [sending, setSending] = useState(false);
  const [simulationData, setSimulationData] = useState({
    webhookUrl: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
    error: 'Connection timeout after 5000ms',
    channel: '#webhook-alerts',
  });

  const BACKEND_URL = 'http://localhost:3001';

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/slack/alerts`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setError('Failed to load alerts. Please check your backend server.');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const simulateFailure = async () => {
    if (sending) return;

    if (!simulationData.webhookUrl.trim()) {
      alert('Please enter a webhook URL');
      return;
    }
    if (!simulationData.error.trim()) {
      alert('Please enter an error message');
      return;
    }

    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/slack/alerts/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level: 'error',
          message: simulationData.error,
          webhookUrl: simulationData.webhookUrl,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const result = await res.json();

      if (result.success) {
        alert('✅ Test alert created successfully!');
        await fetchAlerts();
        setShowSimulator(false);
        setSimulationData({
          webhookUrl: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
          error: 'Connection timeout after 5000ms',
          channel: '#webhook-alerts',
        });
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Failed to simulate failure:', err);
      setError(`Failed to send alert: ${err.message}`);
      alert(`❌ Failed to send alert: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const getTimeAgo = (timestamp) => {
    try {
      const now = new Date();
      const time = new Date(timestamp);
      const diff = now - time;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      if (minutes > 0) return `${minutes}m ago`;
      return 'Just now';
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Alert System</h1>
          <p className="text-gray-400">Monitor and manage webhook failure alerts</p>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{alerts.length}</div>
                  <div className="text-gray-400 text-sm">Total Alerts</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-400">
                    {alerts.filter(a => a.level === 'error').length}
                  </div>
                  <div className="text-gray-400 text-sm">Error Level</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400">
                    {alerts.filter(a => {
                      const hourAgo = new Date(Date.now() - 3600000);
                      return new Date(a.timestamp) > hourAgo;
                    }).length}
                  </div>
                  <div className="text-gray-400 text-sm">Last Hour</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowSimulator(true)}
              className="flex-1 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors flex items-center justify-center gap-2 p-4"
            >
              <Play className="w-4 h-4" />
              Test Alert
            </button>
            <button
              onClick={fetchAlerts}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2 p-4"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {showSimulator && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowSimulator(false)}
          >
            <div
              className="bg-gray-900 rounded-lg p-6 border border-gray-700 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4">Simulate Webhook Failure</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Webhook URL *
                  </label>
                  <input
                    type="url"
                    value={simulationData.webhookUrl}
                    onChange={(e) =>
                      setSimulationData((prev) => ({
                        ...prev,
                        webhookUrl: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                    placeholder="https://example.com/webhook"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Error Message *
                  </label>
                  <textarea
                    value={simulationData.error}
                    onChange={(e) =>
                      setSimulationData((prev) => ({
                        ...prev,
                        error: e.target.value,
                      }))
                    }
                    rows="3"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                    placeholder="Describe the error..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Slack Channel (optional)
                  </label>
                  <input
                    type="text"
                    value={simulationData.channel}
                    onChange={(e) =>
                      setSimulationData((prev) => ({
                        ...prev,
                        channel: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                    placeholder="#webhook-alerts"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={simulateFailure}
                  disabled={
                    sending ||
                    !simulationData.webhookUrl.trim() ||
                    !simulationData.error.trim()
                  }
                  className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 py-2 rounded-lg transition-colors"
                >
                  {sending ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    'Send Test Alert'
                  )}
                </button>
                <button
                  onClick={() => setShowSimulator(false)}
                  disabled={sending}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Failure Alerts</h2>
            {!loading && alerts.length > 0 && (
              <span className="text-sm text-gray-400">{alerts.length} total</span>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col justify-center items-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-3"></div>
              <p className="text-gray-400">Loading alerts...</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {alerts.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-400 mb-2">No alerts yet</h3>
                  <p className="text-gray-500 mb-4">Webhook failure alerts will appear here</p>
                  <button
                    onClick={() => setShowSimulator(true)}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg"
                  >
                    Send Test Alert
                  </button>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert._id} className="p-4 hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              alert.level === 'error'
                                ? 'bg-red-500/20'
                                : alert.level === 'warning'
                                ? 'bg-yellow-500/20'
                                : 'bg-blue-500/20'
                            }`}
                          >
                            <AlertTriangle
                              className={`w-4 h-4 ${
                                alert.level === 'error'
                                  ? 'text-red-400'
                                  : alert.level === 'warning'
                                  ? 'text-yellow-400'
                                  : 'text-blue-400'
                              }`}
                            />
                          </div>
                          <div>
                            <h3
                              className={`font-semibold ${
                                alert.level === 'error'
                                  ? 'text-red-400'
                                  : alert.level === 'warning'
                                  ? 'text-yellow-400'
                                  : 'text-blue-400'
                              }`}
                            >
                              {alert.level === 'error'
                                ? 'Webhook Delivery Failed'
                                : alert.level === 'warning'
                                ? 'Warning'
                                : 'Info'}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {getTimeAgo(alert.timestamp)} • {alert.webhookUrl}
                            </p>
                          </div>
                        </div>

                        <div className="ml-11">
                          <div className="bg-gray-800 rounded-lg p-3 mb-3">
                            <code className="text-sm text-gray-300 break-all">
                              {alert.message || alert.error || 'No error message'}
                            </code>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                alert.level === 'error'
                                  ? 'bg-red-500/20 text-red-400'
                                  : alert.level === 'warning'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-blue-500/20 text-blue-400'
                              }`}
                            >
                              {alert.level || 'info'}
                            </span>
                            <span>{new Date(alert.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {alert.webhookUrl && (
                        <button
                          className="text-gray-400 hover:text-white transition-colors p-2"
                          onClick={() =>
                            window.open(alert.webhookUrl, '_blank', 'noopener,noreferrer')
                          }
                          title="Open webhook URL"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
