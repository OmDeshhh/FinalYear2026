import { useState, useEffect } from 'react';
import { MessageSquare, Bell, MessageCircle, ArrowRight, Settings, AlertCircle } from 'lucide-react';
import SlackConfigModal from './SlackConfigModal';

export default function SlackIntegration({ onPageChange }) {
  const [services, setServices] = useState({
    webhookLogs: { total: 0, success: 0, failed: 0, active: false },
    alertSystem: { total: 0, success: 0, failed: 0, active: false },
    messageThreading: { total: 0, success: 0, failed: 0, active: false }
  });

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Store config in component state instead of localStorage
  const [slackConfig, setSlackConfig] = useState({
    webhookUrl: '',
    channel: '',
    username: 'Webhook Bot',
    iconEmoji: ':robot_face:'
  });

  const BACKEND_URL = 'http://localhost:3001';

  useEffect(() => {
    fetchServiceStats();
    loadSlackConfig();
  }, []);

  const fetchServiceStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${BACKEND_URL}/api/slack/services/stats`);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      setServices(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError('Failed to load service statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadSlackConfig = async () => {
    try {
      // Load config from backend instead of localStorage
      const res = await fetch(`${BACKEND_URL}/api/slack/config`);
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setSlackConfig(data.config);
        }
      }
    } catch (err) {
      console.error('Failed to load config:', err);
      // Config will remain in default state
    }
  };

  const saveSlackConfig = async (config) => {
    try {
      // Save config to backend instead of localStorage
      const res = await fetch(`${BACKEND_URL}/api/slack/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!res.ok) {
        throw new Error('Failed to save configuration');
      }

      setSlackConfig(config);
      setShowConfigModal(false);
      fetchServiceStats();
      return true;
    } catch (err) {
      console.error('Failed to save config:', err);
      alert('Failed to save configuration. Please try again.');
      return false;
    }
  };

  const testSlackConnection = async () => {
    if (!slackConfig.webhookUrl) {
      alert('Please configure Slack webhook URL first');
      setShowConfigModal(true);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/slack/test-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: slackConfig.webhookUrl })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      
      if (data.success) {
        alert('✅ Slack connection test successful! Check your Slack channel.');
      } else {
        alert('❌ Slack connection test failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to test Slack connection:', err);
      alert('❌ Error testing Slack connection');
    }
  };

  const isSlackConfigured = () => {
    return !!(slackConfig && slackConfig.webhookUrl);
  };

  const handleWebhookLogsClick = () => {
    if (typeof onPageChange === 'function') {
      onPageChange('WebhookLogsPage');
    }
  };

  const handleAlertsClick = () => {
    if (typeof onPageChange === 'function') {
      onPageChange('AlertSystemPage');
    }
  };

  const handleThreadsClick = () => {
    if (typeof onPageChange === 'function') {
      onPageChange('MessageThreadingPage', { 
        slackConfigured: isSlackConfigured() 
      });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h1 className="text-5xl font-bold">Slack Services</h1>
          </div>
          <p className="text-xl text-gray-400">Manage your Slack integrations and webhooks</p>
          
          {/* Configuration Section */}
          <div className="mt-6">
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2 mx-auto"
            >
              <Settings className="w-5 h-5" />
              Configure Slack Webhook
            </button>
            
            {isSlackConfigured() && (
              <div className="mt-4 flex justify-center gap-3">
                <span className="text-green-400 text-sm">✅ Slack webhook configured</span>
                <button
                  onClick={testSlackConnection}
                  className="text-blue-400 hover:text-blue-300 text-sm underline"
                >
                  Test Connection
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400">{error}</p>
              <button
                onClick={fetchServiceStats}
                className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          /* Service Cards */
          <div className="space-y-8">
            {/* Webhook Logs Card */}
            <div 
              className="bg-gray-900 rounded-2xl p-8 border border-gray-800 hover:border-blue-500 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 cursor-pointer group"
              onClick={handleWebhookLogsClick}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-6 flex-1">
                  <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-8 h-8 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold mb-3">Webhook Logs</h2>
                    <p className="text-gray-400 text-lg mb-6">View and manage your Slack webhook logs</p>
                    <div className="flex gap-8 text-lg">
                      <span className="text-gray-400">
                        <span className="font-semibold text-white text-2xl">{services.webhookLogs.total}</span> Total
                      </span>
                      <span className="text-gray-400">
                        <span className="font-semibold text-green-400 text-2xl">{services.webhookLogs.success}</span> Success
                      </span>
                      <span className="text-gray-400">
                        <span className="font-semibold text-red-400 text-2xl">{services.webhookLogs.failed}</span> Failed
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-sm px-4 py-2 rounded-full ${
                    services.webhookLogs.active 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-gray-600/20 text-gray-400'
                  }`}>
                    {services.webhookLogs.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Alert System Card */}
            <div 
              className="bg-gray-900 rounded-2xl p-8 border border-gray-800 hover:border-orange-500 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/20 cursor-pointer group"
              onClick={handleAlertsClick}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-6 flex-1">
                  <div className="w-16 h-16 bg-orange-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Bell className="w-8 h-8 text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold mb-3">Alert System</h2>
                    <p className="text-gray-400 text-lg mb-6">Configure failure alerts and notifications</p>
                    <div className="flex gap-8 text-lg">
                      <span className="text-gray-400">
                        <span className="font-semibold text-white text-2xl">{services.alertSystem.total}</span> Total
                      </span>
                      <span className="text-gray-400">
                        <span className="font-semibold text-green-400 text-2xl">{services.alertSystem.success}</span> Success
                      </span>
                      <span className="text-gray-400">
                        <span className="font-semibold text-red-400 text-2xl">{services.alertSystem.failed}</span> Failed
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-sm px-4 py-2 rounded-full ${
                    services.alertSystem.active 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-gray-600/20 text-gray-400'
                  }`}>
                    {services.alertSystem.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Message Threading Card */}
            <div 
              className="bg-gray-900 rounded-2xl p-8 border border-gray-800 hover:border-purple-500 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 cursor-pointer group"
              onClick={handleThreadsClick}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-6 flex-1">
                  <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <MessageCircle className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold mb-3">Message Threading</h2>
                    <p className="text-gray-400 text-lg mb-6">Manage threaded conversations for events</p>
                    <div className="flex gap-8 text-lg">
                      <span className="text-gray-400">
                        <span className="font-semibold text-white text-2xl">{services.messageThreading.total}</span> Total
                      </span>
                      <span className="text-gray-400">
                        <span className="font-semibold text-green-400 text-2xl">{services.messageThreading.success}</span> Success
                      </span>
                      <span className="text-gray-400">
                        <span className="font-semibold text-red-400 text-2xl">{services.messageThreading.failed}</span> Failed
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-sm px-4 py-2 rounded-full ${
                    services.messageThreading.active 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-gray-600/20 text-gray-400'
                  }`}>
                    {services.messageThreading.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center group-hover:bg-purple-500 transition-colors">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Modal */}
        {showConfigModal && (
          <SlackConfigModal 
            config={slackConfig}
            onSave={saveSlackConfig}
            onClose={() => setShowConfigModal(false)}
          />
        )}
      </div>
    </div>
  );
}