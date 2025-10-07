import { useState } from 'react';
import { X, Link, TestTube, Copy, CheckCircle, Zap, ExternalLink } from 'lucide-react';

export default function SlackConfigModal({ config, onSave, onClose }) {
  const [formData, setFormData] = useState(config);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  const BACKEND_URL = 'http://localhost:3001';

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const testWebhook = async () => {
    if (!formData.webhookUrl.trim()) {
      alert('Please enter a webhook URL first');
      return;
    }

    setTesting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/slack/test-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: formData.webhookUrl })
      });
      const data = await res.json();
      
      if (data.success) {
        alert('✅ Webhook test successful! Check your Slack channel.');
      } else {
        alert('❌ Webhook test failed: ' + data.error);
      }
    } catch (err) {
      console.error('Failed to test webhook:', err);
      alert('❌ Error testing webhook');
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sampleWebhookUrl = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl border border-gray-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold">Configure Slack Webhook</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Webhook URL */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Slack Incoming Webhook URL *
            </label>
            <input
              type="text"
              value={formData.webhookUrl}
              onChange={(e) => setFormData({...formData, webhookUrl: e.target.value})}
              placeholder={sampleWebhookUrl}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white font-mono text-sm"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Format: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
            </p>
          </div>

          {/* Optional Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Bot Username (optional)
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                placeholder="Webhook Bot"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Icon Emoji (optional)
              </label>
              <input
                type="text"
                value={formData.iconEmoji}
                onChange={(e) => setFormData({...formData, iconEmoji: e.target.value})}
                placeholder=":robot_face:"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Default Channel (optional)
            </label>
            <input
              type="text"
              value={formData.channel}
              onChange={(e) => setFormData({...formData, channel: e.target.value})}
              placeholder="#general or @username"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={testWebhook}
              disabled={!formData.webhookUrl.trim() || testing}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {testing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4" />
                  Test Webhook
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={() => copyToClipboard(sampleWebhookUrl)}
              className="px-6 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Format'}
            </button>
          </div>

          {/* How to Get Webhook URL */}
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <h3 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              How to get your Slack Webhook URL:
            </h3>
            <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
              <li>Go to your Slack workspace</li>
              <li>Click your workspace name → Settings & administration → Manage apps</li>
              <li>Search for "Incoming Webhooks" and click Add</li>
              <li>Click "Add to Slack" on the Incoming Webhooks app</li>
              <li>Choose a channel and click "Add Incoming Webhooks Integration"</li>
              <li>Copy the Webhook URL and paste it above</li>
            </ol>
            <div className="mt-3">
              <a 
                href="https://api.slack.com/messaging/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Learn more about Slack webhooks
              </a>
            </div>
          </div>

          {/* Save/Cancel Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors font-semibold"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}