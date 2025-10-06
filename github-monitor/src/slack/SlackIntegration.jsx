import { useState } from 'react';
import { MessageSquare, Bell, MessageCircle, Send, CheckCircle, XCircle, Settings } from 'lucide-react';

export default function SlackIntegration() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [activeService, setActiveService] = useState('logs');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);

  // Service specific states
  const [logMessage, setLogMessage] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertLevel, setAlertLevel] = useState('info');
  const [threadMessage, setThreadMessage] = useState('');
  const [threadTs, setThreadTs] = useState('');

  const connectSlack = () => {
    if (!webhookUrl.trim()) {
      alert('Please enter Slack webhook URL');
      return;
    }
    if (!webhookUrl.includes('hooks.slack.com')) {
      alert('Please enter a valid Slack webhook URL');
      return;
    }
    setIsConnected(true);
    setResponse({ success: true, message: 'Connected to Slack successfully!' });
  };

  const disconnect = () => {
    setIsConnected(false);
    setWebhookUrl('');
    setResponse(null);
  };

  const sendWebhookLog = async () => {
    if (!logMessage.trim()) {
      alert('Please enter a log message');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        text: `📝 *Webhook Log*\n${logMessage}`,
        timestamp: new Date().toISOString()
      };

      // Use backend proxy to avoid CORS
      const res = await fetch('http://localhost:3001/api/slack/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhookUrl: webhookUrl,
          payload: payload
        })
      });

      const data = await res.json();

      if (data.success) {
        setResponse({ success: true, message: 'Log sent to Slack! ✅' });
        setLogMessage('');
      } else {
        setResponse({ success: false, message: `Failed to send: ${data.message}` });
      }
    } catch (err) {
      setResponse({ success: false, message: `Error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const sendAlert = async () => {
    if (!alertMessage.trim()) {
      alert('Please enter an alert message');
      return;
    }

    setLoading(true);
    try {
      const emoji = {
        info: 'ℹ️',
        warning: '⚠️',
        error: '🚨',
        success: '✅'
      };

      const color = {
        info: '#36a64f',
        warning: '#ff9800',
        error: '#f44336',
        success: '#4caf50'
      };

      const payload = {
        attachments: [{
          color: color[alertLevel],
          text: `${emoji[alertLevel]} *${alertLevel.toUpperCase()} ALERT*\n${alertMessage}`,
          footer: 'Alert System',
          ts: Math.floor(Date.now() / 1000)
        }]
      };

      // Use backend proxy to avoid CORS
      const res = await fetch('http://localhost:3001/api/slack/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: webhookUrl,
          payload: payload
        })
      });

      const data = await res.json();

      if (data.success) {
        setResponse({ success: true, message: 'Alert sent to Slack! ✅' });
        setAlertMessage('');
      } else {
        setResponse({ success: false, message: `Failed to send: ${data.message}` });
      }
    } catch (err) {
      setResponse({ success: false, message: `Error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const sendThreadMessage = async () => {
    if (!threadMessage.trim()) {
      alert('Please enter a message');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        text: threadTs 
          ? `💬 ${threadMessage}`
          : `🧵 *Thread Started*\n${threadMessage}`
      };

      // Use backend proxy
      const res = await fetch('http://localhost:3001/api/slack/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: webhookUrl,
          payload: payload
        })
      });

      const data = await res.json();

      if (data.success) {
        setResponse({ 
          success: true, 
          message: threadTs ? 'Reply sent! ✅' : 'Thread started! ✅' 
        });
        
        if (!threadTs) {
          setThreadTs(Date.now().toString());
        }
        setThreadMessage('');
      } else {
        setResponse({ success: false, message: `Failed to send: ${data.message}` });
      }
    } catch (err) {
      setResponse({ success: false, message: `Error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3">
            <MessageSquare className="w-10 h-10 text-purple-400" />
            Slack Integration
          </h1>
          <p className="text-gray-300">Connect and send messages to Slack channels</p>
        </div>

        {!isConnected ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Connect to Slack
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Slack Webhook URL
                </label>
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400 text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Get your webhook URL from Slack's Incoming Webhooks
                </p>
              </div>

              <button
                onClick={connectSlack}
                className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
              >
                Connect to Slack
              </button>
            </div>

            <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <h3 className="font-bold mb-2">🚀 Quick Setup:</h3>
              <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                <li>Go to <span className="text-purple-300 font-mono">https://api.slack.com/apps</span></li>
                <li>Click "Create New App" → "From scratch"</li>
                <li>Name your app and select workspace</li>
                <li>Go to "Incoming Webhooks" → Turn it ON</li>
                <li>Click "Add New Webhook to Workspace"</li>
                <li>Select a channel and click "Allow"</li>
                <li>Copy the webhook URL and paste above ☝️</li>
              </ol>
              <div className="mt-3 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded text-xs">
                <strong>Note:</strong> You only need the webhook URL - no bot token required!
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="font-semibold">Connected to Slack</span>
              </div>
              <button
                onClick={disconnect}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm"
              >
                Disconnect
              </button>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <div className="flex gap-2 mb-6 flex-wrap">
                <button
                  onClick={() => setActiveService('logs')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                    activeService === 'logs'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                  Webhook Logs
                </button>

                <button
                  onClick={() => setActiveService('alerts')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                    activeService === 'alerts'
                      ? 'bg-orange-600 text-white'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                  Alert System
                </button>

                <button
                  onClick={() => setActiveService('threading')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                    activeService === 'threading'
                      ? 'bg-green-600 text-white'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <MessageCircle className="w-5 h-5" />
                  Message Threading
                </button>
              </div>

              {activeService === 'logs' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold">Send Webhook Logs</h3>
                  <p className="text-sm text-gray-400">Send structured log messages to your Slack channel</p>
                  
                  <textarea
                    value={logMessage}
                    onChange={(e) => setLogMessage(e.target.value)}
                    placeholder="Enter your log message..."
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 text-white"
                  />

                  <button
                    onClick={sendWebhookLog}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    {loading ? 'Sending...' : 'Send Log'}
                  </button>
                </div>
              )}

              {activeService === 'alerts' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold">Send Alerts</h3>
                  <p className="text-sm text-gray-400">Send priority alerts with different severity levels</p>

                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Alert Level</label>
                    <select
                      value={alertLevel}
                      onChange={(e) => setAlertLevel(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-white"
                    >
                      <option value="info">ℹ️ Info</option>
                      <option value="warning">⚠️ Warning</option>
                      <option value="error">🚨 Error</option>
                      <option value="success">✅ Success</option>
                    </select>
                  </div>
                  
                  <textarea
                    value={alertMessage}
                    onChange={(e) => setAlertMessage(e.target.value)}
                    placeholder="Enter your alert message..."
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-400 text-white"
                  />

                  <button
                    onClick={sendAlert}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Bell className="w-5 h-5" />
                    {loading ? 'Sending...' : 'Send Alert'}
                  </button>
                </div>
              )}

              {activeService === 'threading' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold">Message Threading</h3>
                  <p className="text-sm text-gray-400">Send messages to your Slack channel</p>

                  {threadTs && (
                    <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                      <p className="text-sm">Thread Active - ID: {threadTs}</p>
                    </div>
                  )}
                  
                  <textarea
                    value={threadMessage}
                    onChange={(e) => setThreadMessage(e.target.value)}
                    placeholder={threadTs ? "Reply to thread..." : "Start a new thread..."}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400 text-white"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={sendThreadMessage}
                      disabled={loading}
                      className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-5 h-5" />
                      {loading ? 'Sending...' : threadTs ? 'Reply to Thread' : 'Start Thread'}
                    </button>

                    {threadTs && (
                      <button
                        onClick={() => setThreadTs('')}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
                      >
                        End Thread
                      </button>
                    )}
                  </div>
                </div>
              )}

              {response && (
                <div className={`mt-4 p-4 rounded-lg border ${
                  response.success 
                    ? 'bg-green-500/20 border-green-500/30' 
                    : 'bg-red-500/20 border-red-500/30'
                }`}>
                  <div className="flex items-center gap-2">
                    {response.success ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                    <span>{response.message}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}