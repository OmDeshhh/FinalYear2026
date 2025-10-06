import { useState, useEffect } from 'react';
import { Link, Copy, CheckCircle, RefreshCw, Trash2, Activity } from 'lucide-react';

export default function Webhook() {
    const [webhooks, setWebhooks] = useState([]);
  const [selectedWebhook, setSelectedWebhook] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);

  const BACKEND_URL = 'http://localhost:3001';

  useEffect(() => {
    checkServerStatus();
  }, []);

  const checkServerStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`);
      const data = await res.json();
      setServerStatus(data);
    } catch (err) {
      setServerStatus({ status: 'offline' });
    }
  };

  const createWebhook = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/webhooks/create`, {
        method: 'POST'
      });
      const data = await res.json();
      setWebhooks([...webhooks, data]);
      setSelectedWebhook(data);
    } catch (err) {
      alert('Failed to create webhook. Make sure backend server is running!');
    } finally {
      setLoading(false);
    }
  };

  const fetchWebhookRequests = async (webhookId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/webhooks/${webhookId}`);
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    }
  };

  const selectWebhook = (webhook) => {
    setSelectedWebhook(webhook);
    fetchWebhookRequests(webhook.webhookId);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deleteWebhook = (webhookId) => {
    setWebhooks(webhooks.filter(w => w.webhookId !== webhookId));
    if (selectedWebhook?.webhookId === webhookId) {
      setSelectedWebhook(null);
      setRequests([]);
    }
  };

  const refreshRequests = () => {
    if (selectedWebhook) {
      fetchWebhookRequests(selectedWebhook.webhookId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3">
            <Activity className="w-10 h-10 text-green-400" />
            Webhook Manager
          </h1>
          <p className="text-gray-300">Create and monitor webhook endpoints</p>
        </div>

        {serverStatus && (
          <div className={`mb-6 p-4 rounded-lg border ${
            serverStatus.status === 'ok' 
              ? 'bg-green-500/20 border-green-500/30' 
              : 'bg-red-500/20 border-red-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  Server Status: {serverStatus.status === 'ok' ? '🟢 Online' : '🔴 Offline'}
                </p>
                {serverStatus.publicUrl && serverStatus.publicUrl !== 'Not exposed' && (
                  <p className="text-sm text-gray-300 mt-1">
                    Public URL: {serverStatus.publicUrl}
                  </p>
                )}
              </div>
              <button
                onClick={checkServerStatus}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Your Webhooks</h2>
            <button
              onClick={createWebhook}
              disabled={loading}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Link className="w-5 h-5" />
              {loading ? 'Creating...' : 'Create New Webhook'}
            </button>
          </div>

          {webhooks.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No webhooks created yet. Click "Create New Webhook" to start.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.webhookId}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedWebhook?.webhookId === webhook.webhookId
                      ? 'bg-green-500/20 border-green-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                  onClick={() => selectWebhook(webhook)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-400">Webhook ID</p>
                      <p className="font-mono text-lg">{webhook.webhookId}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteWebhook(webhook.webhookId);
                      }}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5 text-red-400" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="text"
                      value={webhook.webhookUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm font-mono"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(webhook.webhookUrl);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-gray-400 mt-2">
                    Created: {new Date(webhook.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedWebhook && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold">Incoming Requests</h3>
              <button
                onClick={refreshRequests}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {requests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No requests received yet. Send a request to your webhook URL to see it here.</p>
                <div className="mt-4 p-4 bg-black/30 rounded-lg text-left">
                  <p className="text-sm text-gray-400 mb-2">Test with curl:</p>
                  <code className="text-xs font-mono text-green-400">
                    curl -X POST {selectedWebhook.webhookUrl} -H "Content-Type: application/json" -d '{`{`}"test": "data"{`}`}'
                  </code>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {requests.map((req, idx) => (
                  <div
                    key={idx}
                    className="bg-white/5 rounded-lg border border-white/10 p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-3 py-1 rounded font-semibold text-sm ${
                        req.method === 'GET' ? 'bg-blue-500/30' :
                        req.method === 'POST' ? 'bg-green-500/30' :
                        req.method === 'PUT' ? 'bg-yellow-500/30' :
                        req.method === 'DELETE' ? 'bg-red-500/30' :
                        'bg-gray-500/30'
                      }`}>
                        {req.method}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(req.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Headers:</p>
                        <pre className="text-xs bg-black/30 p-2 rounded overflow-x-auto">
                          {JSON.stringify(req.headers, null, 2)}
                        </pre>
                      </div>

                      {Object.keys(req.body || {}).length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Body:</p>
                          <pre className="text-xs bg-black/30 p-2 rounded overflow-x-auto">
                            {JSON.stringify(req.body, null, 2)}
                          </pre>
                        </div>
                      )}

                      {Object.keys(req.query || {}).length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Query Parameters:</p>
                          <pre className="text-xs bg-black/30 p-2 rounded overflow-x-auto">
                            {JSON.stringify(req.query, null, 2)}
                          </pre>
                        </div>
                      )}

                      <p className="text-xs text-gray-400">IP: {req.ip}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}