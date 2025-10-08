import { useState, useEffect } from 'react';
import {
  MessageCircle,
  Plus,
  Users,
  Clock,
  Hash,
  Eye,
  AlertCircle
} from 'lucide-react';

export default function MessageThreadingPage() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [showAddMessage, setShowAddMessage] = useState(null);
  const [threadData, setThreadData] = useState({
    channel: '#webhook-events',
    initialMessage: 'Webhook delivery initiated for order #12345',
    eventType: 'webhook_init'
  });
  const [messageData, setMessageData] = useState({
    message: '',
    eventType: 'update'
  });

  const BACKEND_URL = 'http://localhost:3001';

  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${BACKEND_URL}/api/slack/threads`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setThreads(data.threads || []);
    } catch (err) {
      console.error('Failed to fetch threads:', err);
      setError('Failed to load threads. Please check your backend or network.');
    } finally {
      setLoading(false);
    }
  };

  const createThread = async () => {
    if (!threadData.initialMessage.trim()) {
      alert('Please enter an initial message');
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/slack/create-thread`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(threadData)
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const result = await res.json();

      if (result.success) {
        alert('Thread created successfully!');
        fetchThreads();
        setShowCreateThread(false);
        setThreadData({
          channel: '#webhook-events',
          initialMessage: '',
          eventType: 'webhook_init'
        });
      } else {
        throw new Error(result.error || 'Failed to create thread');
      }
    } catch (err) {
      console.error('Failed to create thread:', err);
      alert(`Failed to create thread: ${err.message}`);
    }
  };

  const addMessageToThread = async (threadId) => {
    if (!messageData.message.trim()) {
      alert('Please enter a message');
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/slack/add-to-thread`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, ...messageData })
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const result = await res.json();

      if (result.success) {
        alert('Message added to thread!');
        fetchThreads();
        setShowAddMessage(null);
        setMessageData({ message: '', eventType: 'update' });
      } else {
        throw new Error(result.error || 'Failed to add message');
      }
    } catch (err) {
      console.error('Failed to add message:', err);
      alert(`Failed to add message: ${err.message}`);
    }
  };

  const getEventTypeColor = (eventType) => {
    const colors = {
      webhook_init: 'bg-blue-500/20 text-blue-400',
      update: 'bg-yellow-500/20 text-yellow-400',
      success: 'bg-green-500/20 text-green-400',
      error: 'bg-red-500/20 text-red-400',
      retry: 'bg-orange-500/20 text-orange-400'
    };
    return colors[eventType] || 'bg-gray-500/20 text-gray-400';
  };

  const getEventTypeLabel = (eventType) => {
    const labels = {
      webhook_init: 'Init',
      update: 'Update',
      success: 'Success',
      error: 'Error',
      retry: 'Retry'
    };
    return labels[eventType] || eventType;
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Message Threading</h1>
          <p className="text-gray-400">
            Manage threaded conversations for related webhook events
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400">{error}</p>
              <button
                onClick={fetchThreads}
                className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Stats and Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{threads.length}</div>
                  <div className="text-gray-400 text-sm">Active Threads</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {threads.reduce((acc, thread) => acc + (thread.events?.length || 0), 0)}
                  </div>
                  <div className="text-gray-400 text-sm">Total Messages</div>
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
                    {threads.filter(t => t.events?.some(e => e.eventType === 'success')).length}
                  </div>
                  <div className="text-gray-400 text-sm">Completed</div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowCreateThread(true)}
            className="bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center justify-center gap-2 p-4"
          >
            <Plus className="w-4 h-4" />
            New Thread
          </button>
        </div>

        {/* Create Thread Modal */}
        {showCreateThread && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Create New Thread</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Channel</label>
                  <input
                    type="text"
                    value={threadData.channel}
                    onChange={(e) =>
                      setThreadData(prev => ({ ...prev, channel: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Event Type</label>
                  <select
                    value={threadData.eventType}
                    onChange={(e) =>
                      setThreadData(prev => ({ ...prev, eventType: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                  >
                    <option value="webhook_init">Webhook Initiated</option>
                    <option value="update">Update</option>
                    <option value="success">Success</option>
                    <option value="error">Error</option>
                    <option value="retry">Retry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Initial Message *</label>
                  <textarea
                    value={threadData.initialMessage}
                    onChange={(e) =>
                      setThreadData(prev => ({ ...prev, initialMessage: e.target.value }))
                    }
                    rows="3"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={createThread}
                  disabled={!threadData.initialMessage.trim()}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 py-2 rounded-lg"
                >
                  Create Thread
                </button>
                <button
                  onClick={() => setShowCreateThread(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Message Modal */}
        {showAddMessage && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Add Message to Thread</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Event Type</label>
                  <select
                    value={messageData.eventType}
                    onChange={(e) =>
                      setMessageData(prev => ({ ...prev, eventType: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                  >
                    <option value="update">Update</option>
                    <option value="success">Success</option>
                    <option value="error">Error</option>
                    <option value="retry">Retry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Message *</label>
                  <textarea
                    value={messageData.message}
                    onChange={(e) =>
                      setMessageData(prev => ({ ...prev, message: e.target.value }))
                    }
                    rows="3"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => addMessageToThread(showAddMessage)}
                  disabled={!messageData.message.trim()}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 py-2 rounded-lg"
                >
                  Add Message
                </button>
                <button
                  onClick={() => setShowAddMessage(null)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Thread List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            threads.map((thread) => (
              <div
                key={thread._id}
                className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden"
              >
                <div className="p-4 border-b border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {thread.events?.[0]?.message || 'Thread Conversation'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Hash className="w-4 h-4" />
                          {thread.channel}
                          <span>•</span>
                          <span>{thread.events?.length || 0} messages</span>
                          <span>•</span>
                          <span>
                            Started {new Date(thread.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAddMessage(thread._id)}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
                      >
                        Add Message
                      </button>
                      <button className="p-2 text-gray-400 hover:text-white">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {thread.events?.map((event, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div
                        className={`px-2 py-1 rounded text-xs font-medium ${getEventTypeColor(
                          event.eventType
                        )}`}
                      >
                        {getEventTypeLabel(event.eventType)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-300">{event.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          {threads.length === 0 && !loading && (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">No threads yet</h3>
              <p className="text-gray-500 mb-4">Create your first threaded conversation</p>
              <button
                onClick={() => setShowCreateThread(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
              >
                Create Thread
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
