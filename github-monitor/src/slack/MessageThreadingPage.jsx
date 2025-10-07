import { useState, useEffect } from 'react';
import { MessageCircle, Plus, Users, Clock, Hash, Eye, Shield } from 'lucide-react';

export default function MessageThreadingPage({ slackConfigured }) {
  // Show configuration required message if Slack is not configured
  if (!slackConfigured) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Message Threading</h1>
            <p className="text-gray-400">Manage threaded conversations for related webhook events</p>
          </div>

          {/* Configuration Required Message */}
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-8 text-center">
            <div className="max-w-md mx-auto">
              <Shield className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-yellow-400">Slack Configuration Required</h2>
              <p className="text-gray-400 mb-6">
                Please configure your Slack bot token in the main services page to use message threading.
                You need to set up Slack integration before you can create threaded conversations.
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

  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const res = await fetch(`${BACKEND_URL}/api/slack/threads`);
      const data = await res.json();
      setThreads(data.threads);
    } catch (err) {
      console.error('Failed to fetch threads:', err);
    } finally {
      setLoading(false);
    }
  };

  const createThread = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/slack/create-thread`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(threadData),
      });
      
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
      }
    } catch (err) {
      console.error('Failed to create thread:', err);
      alert('Failed to create thread');
    }
  };

  const addMessageToThread = async (threadId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/slack/add-to-thread`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadId,
          ...messageData
        }),
      });
      
      const result = await res.json();
      if (result.success) {
        alert('Message added to thread!');
        fetchThreads();
        setShowAddMessage(null);
        setMessageData({
          message: '',
          eventType: 'update'
        });
      }
    } catch (err) {
      console.error('Failed to add message:', err);
      alert('Failed to add message');
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

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Message Threading</h1>
          <p className="text-gray-400">Manage threaded conversations for related webhook events</p>
        </div>

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
                    {threads.reduce((acc, thread) => acc + thread.events.length, 0)}
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
                    {threads.filter(t => t.events.some(e => e.eventType === 'success')).length}
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
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Channel
                  </label>
                  <input
                    type="text"
                    value={threadData.channel}
                    onChange={(e) => setThreadData(prev => ({
                      ...prev,
                      channel: e.target.value
                    }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Event Type
                  </label>
                  <select
                    value={threadData.eventType}
                    onChange={(e) => setThreadData(prev => ({
                      ...prev,
                      eventType: e.target.value
                    }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
                  >
                    <option value="webhook_init">Webhook Initiated</option>
                    <option value="update">Update</option>
                    <option value="success">Success</option>
                    <option value="error">Error</option>
                    <option value="retry">Retry</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Initial Message
                  </label>
                  <textarea
                    value={threadData.initialMessage}
                    onChange={(e) => setThreadData(prev => ({
                      ...prev,
                      initialMessage: e.target.value
                    }))}
                    rows="3"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
                    placeholder="Describe the initial event..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={createThread}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded-lg transition-colors"
                >
                  Create Thread
                </button>
                <button
                  onClick={() => setShowCreateThread(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg transition-colors"
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
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Event Type
                  </label>
                  <select
                    value={messageData.eventType}
                    onChange={(e) => setMessageData(prev => ({
                      ...prev,
                      eventType: e.target.value
                    }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
                  >
                    <option value="update">Update</option>
                    <option value="success">Success</option>
                    <option value="error">Error</option>
                    <option value="retry">Retry</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Message
                  </label>
                  <textarea
                    value={messageData.message}
                    onChange={(e) => setMessageData(prev => ({
                      ...prev,
                      message: e.target.value
                    }))}
                    rows="3"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
                    placeholder="Enter your message..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => addMessageToThread(showAddMessage)}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded-lg transition-colors"
                >
                  Add Message
                </button>
                <button
                  onClick={() => setShowAddMessage(null)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Threads List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            threads.map((thread) => (
              <div key={thread._id} className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {thread.events[0]?.message || 'Thread Conversation'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Hash className="w-4 h-4" />
                          {thread.channel}
                          <span>•</span>
                          <span>{thread.events.length} messages</span>
                          <span>•</span>
                          <span>Started {new Date(thread.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAddMessage(thread._id)}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
                      >
                        Add Message
                      </button>
                      <button className="p-2 text-gray-400 hover:text-white transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 space-y-3">
                  {thread.events.map((event, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${getEventTypeColor(event.eventType)}`}>
                        {event.eventType}
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
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
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