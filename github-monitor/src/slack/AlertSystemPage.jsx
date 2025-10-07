import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Clock, ExternalLink, Play, Plus, Shield } from 'lucide-react';

export default function AlertSystemPage({ slackConfigured }) {
  // Show configuration required message if Slack is not configured
  if (!slackConfigured) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Alert System</h1>
            <p className="text-gray-400">Monitor and manage webhook failure alerts</p>
          </div>

          {/* Configuration Required Message */}
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-8 text-center">
            <div className="max-w-md mx-auto">
              <Shield className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-yellow-400">Slack Configuration Required</h2>
              <p className="text-gray-400 mb-6">
                Please configure your Slack bot token in the main services page to use the alert system.
                You need to set up Slack integration before you can send failure alerts.
              </p>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
              >
                Go Back to Services
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulationData, setSimulationData] = useState({
    webhookUrl: 'https://example.com/webhook',
    error: 'Connection timeout after 5000ms',
    channel: '#webhook-alerts'
  });

  const BACKEND_URL = 'http://localhost:3001';

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/slack/alerts`);
      const data = await res.json();
      setAlerts(data.alerts);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const simulateFailure = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/slack/simulate-failure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(simulationData),
      });
      
      const result = await res.json();
      if (result.success) {
        alert('Failure alert sent to Slack successfully!');
        fetchAlerts(); // Refresh the list
        setShowSimulator(false);
      }
    } catch (err) {
      console.error('Failed to simulate failure:', err);
      alert('Failed to send alert');
    }
  };

  const getTimeAgo = (timestamp) => {
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
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Alert System</h1>
          <p className="text-gray-400">Monitor and manage webhook failure alerts</p>
        </div>

        {/* Stats and Actions */}
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
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {alerts.filter(a => a.status === 'sent').length}
                  </div>
                  <div className="text-gray-400 text-sm">Sent Successfully</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-400">
                    {alerts.filter(a => a.retryCount > 0).length}
                  </div>
                  <div className="text-gray-400 text-sm">With Retries</div>
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
            <button className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2 p-4">
              <Plus className="w-4 h-4" />
              New Rule
            </button>
          </div>
        </div>

        {/* Alert Simulator Modal */}
        {showSimulator && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Simulate Webhook Failure</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Webhook URL
                  </label>
                  <input
                    type="text"
                    value={simulationData.webhookUrl}
                    onChange={(e) => setSimulationData(prev => ({
                      ...prev,
                      webhookUrl: e.target.value
                    }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Error Message
                  </label>
                  <textarea
                    value={simulationData.error}
                    onChange={(e) => setSimulationData(prev => ({
                      ...prev,
                      error: e.target.value
                    }))}
                    rows="3"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Slack Channel
                  </label>
                  <input
                    type="text"
                    value={simulationData.channel}
                    onChange={(e) => setSimulationData(prev => ({
                      ...prev,
                      channel: e.target.value
                    }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={simulateFailure}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 py-2 rounded-lg transition-colors"
                >
                  Send Alert
                </button>
                <button
                  onClick={() => setShowSimulator(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Alerts List */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold">Recent Failure Alerts</h2>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {alerts.map((alert) => (
                <div key={alert._id} className="p-4 hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-red-400">Webhook Delivery Failed</h3>
                          <p className="text-sm text-gray-400">
                            {getTimeAgo(alert.timestamp)} • {alert.webhookUrl}
                          </p>
                        </div>
                      </div>
                      
                      <div className="ml-11">
                        <div className="bg-gray-800 rounded-lg p-3 mb-3">
                          <code className="text-sm text-gray-300 break-all">
                            {alert.error}
                          </code>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span>Channel: {alert.slackChannel}</span>
                          <span>Status: 
                            <span className={`ml-1 ${alert.status === 'sent' ? 'text-green-400' : 'text-red-400'}`}>
                              {alert.status}
                            </span>
                          </span>
                          {alert.retryCount > 0 && (
                            <span>Retries: {alert.retryCount}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <button className="text-gray-400 hover:text-white transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {alerts.length === 0 && (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-400 mb-2">No alerts yet</h3>
                  <p className="text-gray-500 mb-4">Webhook failure alerts will appear here</p>
                  <button
                    onClick={() => setShowSimulator(true)}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
                  >
                    Send Test Alert
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}