import { useState } from 'react';
import { X, Copy, CheckCircle, Zap, ExternalLink, TestTube } from 'lucide-react';

export default function SlackConfigModal({ config, onSave, onClose }) {
  const [formData, setFormData] = useState(config);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastTestTime, setLastTestTime] = useState(0);

  const BACKEND_URL = 'http://localhost:3001';
  const sampleWebhookUrl = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX';
  const TEST_COOLDOWN = 3000;

  const isWebhookUrlValid = (url) => {
    if (!url || typeof url !== 'string') return false;
    if (!url.startsWith('https://hooks.slack.com/services/')) return false;
    const pathParts = url.replace('https://hooks.slack.com/services/', '').split('/');
    if (pathParts.length < 3) return false;
    return pathParts.every(part => part.length > 0);
  };

  const handleInputChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!isWebhookUrlValid(formData.webhookUrl)) {
      alert('❌ Please enter a valid Slack webhook URL.');
      return;
    }

    setSaving(true);
    try {
      const success = await onSave(formData);
      if (success !== false) {
        alert('✅ Configuration saved successfully!');
      }
    } catch (err) {
      console.error('Failed to save:', err);
      alert('❌ Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const testWebhook = async () => {
    if (!isWebhookUrlValid(formData.webhookUrl)) {
      alert('Please enter a valid webhook URL first.');
      return;
    }

    const now = Date.now();
    if (now - lastTestTime < TEST_COOLDOWN) {
      alert('Please wait a moment before testing again.');
      return;
    }

    setTesting(true);
    setLastTestTime(now);

    try {
      const res = await fetch(`${BACKEND_URL}/api/slack/test-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: formData.webhookUrl }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        alert('✅ Webhook test successful! Check your Slack channel.');
      } else {
        alert('❌ Webhook test failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to test webhook:', err);
      alert('❌ Error testing webhook: ' + err.message);
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    });
  };

  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl border border-gray-800 max-h-[90vh] overflow-y-auto shadow-lg"
        onClick={handleModalClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slack-config-modal"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="slack-config-modal" className="text-2xl font-bold">
            Configure Slack Webhook
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close modal"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Slack Incoming Webhook URL *
            </label>
            <input
              type="url"
              value={formData.webhookUrl}
              onChange={handleInputChange('webhookUrl')}
              placeholder={sampleWebhookUrl}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              autoComplete="off"
            />
            <div className="flex items-start gap-2 mt-2">
              {formData.webhookUrl && (
                <span className={`text-xs ${isWebhookUrlValid(formData.webhookUrl) ? 'text-green-400' : 'text-red-400'}`}>
                  {isWebhookUrlValid(formData.webhookUrl) ? '✓ Valid format' : '✗ Invalid webhook URL'}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Bot Username (optional)
              </label>
              <input
                type="text"
                value={formData.username || ''}
                onChange={handleInputChange('username')}
                placeholder="Webhook Bot"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                maxLength={80}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Icon Emoji (optional)
              </label>
              <input
                type="text"
                value={formData.iconEmoji || ''}
                onChange={handleInputChange('iconEmoji')}
                placeholder=":robot_face:"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                maxLength={50}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Default Channel (optional)
            </label>
            <input
              type="text"
              value={formData.channel || ''}
              onChange={handleInputChange('channel')}
              placeholder="#general or @username"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              maxLength={80}
            />
            <p className="text-xs text-gray-500 mt-1">
              Override the default channel (if configured in webhook)
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={testWebhook}
              disabled={!isWebhookUrlValid(formData.webhookUrl) || testing}
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

          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mt-4">
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

          <div className="flex gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !isWebhookUrlValid(formData.webhookUrl)}
              className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors font-semibold"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}