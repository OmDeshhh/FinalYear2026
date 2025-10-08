import { useState, useEffect } from 'react';
import {
  MessageCircle,
  Plus,
  Users,
  Clock,
  Hash,
  Eye,
  AlertCircle,
  Trash2,
  Send
} from 'lucide-react';

export default function MessageThreadingPage() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [showAddMessage, setShowAddMessage] = useState(null);
  const [threadData, setThreadData] = useState({
    text: ''
  });
  const [messageData, setMessageData] = useState({
    text: ''
  });
  const [isSending, setIsSending] = useState(false);

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
    if (!threadData.text.trim()) {
      alert('Please enter a message');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/slack/create-thread`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: threadData.text })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }
      
      const result = await res.json();

      if (result.success) {
        alert(`Thread created successfully in Slack! Thread ID: ${result.slackTs}`);
        fetchThreads();
        setShowCreateThread(false);
        setThreadData({ text: '' });
      } else {
        throw new Error(result.error || 'Failed to create thread');
      }
    } catch (err) {
      console.error('Failed to create thread:', err);
      alert(`Failed to create thread: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const addMessageToThread = async (threadId) => {
    if (!messageData.text.trim()) {
      alert('Please enter a message');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/slack/add-to-thread`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          text: messageData.text
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }
      
      const result = await res.json();

      if (result.success) {
        alert(`Reply posted to Slack thread! Reply ID: ${result.slackTs}`);
        fetchThreads();
        setShowAddMessage(null);
        setMessageData({ text: '' });
      } else {
        throw new Error(result.error || 'Failed to add message');
      }
    } catch (err) {
      console.error('Failed to add message:', err);
      alert(`Failed to add message: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const deleteThread = async (threadId) => {
    if (!confirm('Are you sure you want to delete this thread from the database? (Slack messages will remain)')) {
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/slack/threads/${threadId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      alert('Thread deleted successfully!');
      fetchThreads();
    } catch (err) {
      console.error('Failed to delete thread:', err);
      alert(`Failed to delete thread: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Message Threading</h1>
          <p className="text-gray-400">
            Create and manage threaded conversations in Slack
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
                    {threads.reduce((acc, thread) => acc + (thread.replies?.length || 0), 0)}
                  </div>
                  <div className="text-gray-400 text-sm">Total Replies</div>
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
                    {threads.filter(t => t.replies?.length > 0).length}
                  </div>
                  <div className="text-gray-400 text-sm">With Replies</div>
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
              <h3 className="text-xl font-bold mb-4">Create New Thread in Slack</h3>
              <p className="text-sm text-gray-400 mb-4">
                This will post a new message to your Slack channel and create a thread.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Message *</label>
                  <textarea
                    value={threadData.text}
                    placeholder="Enter your message..."
                    onChange={(e) =>
                      setThreadData({ text: e.target.value })
                    }
                    rows="4"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
                    disabled={isSending}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={createThread}
                  disabled={!threadData.text.trim() || isSending}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Post to Slack
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowCreateThread(false)}
                  disabled={isSending}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 py-2 rounded-lg transition-colors"
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
              <h3 className="text-xl font-bold mb-4">Reply to Thread in Slack</h3>
              <p className="text-sm text-gray-400 mb-4">
                This will post a reply to the existing Slack thread.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Reply Message *</label>
                  <textarea
                    value={messageData.text}
                    placeholder="Enter your reply..."
                    onChange={(e) =>
                      setMessageData({ text: e.target.value })
                    }
                    rows="4"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
                    disabled={isSending}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => addMessageToThread(showAddMessage)}
                  disabled={!messageData.text.trim() || isSending}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Post Reply
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowAddMessage(null)}
                  disabled={isSending}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 py-2 rounded-lg transition-colors"
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
                className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden hover:border-gray-700 transition-colors"
              >
                <div className="p-4 border-b border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {thread.text}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
                          <Hash className="w-4 h-4" />
                          <span className="font-mono text-xs truncate">Thread: {thread.id}</span>
                          <span>•</span>
                          <span>{thread.replies?.length || 0} replies</span>
                          <span>•</span>
                          <span>{thread.createdAt}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setShowAddMessage(thread.id)}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
                      >
                        Reply
                      </button>
                      <button 
                        onClick={() => deleteThread(thread.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete thread from database"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {thread.replies && thread.replies.length > 0 && (
                  <div className="p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">
                      Replies ({thread.replies.length}):
                    </h4>
                    {thread.replies.map((reply, index) => (
                      <div key={reply.id || index} className="flex items-start gap-3 bg-gray-800/50 p-3 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-300">{reply.text}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-500">
                              {reply.createdAt}
                            </p>
                            <span className="text-gray-600">•</span>
                            <p className="text-xs text-gray-600 font-mono truncate">
                              {reply.id}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(!thread.replies || thread.replies.length === 0) && (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No replies yet. Click "Reply" to add one.
                  </div>
                )}
              </div>
            ))
          )}

          {threads.length === 0 && !loading && (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">No threads yet</h3>
              <p className="text-gray-500 mb-4">Create your first threaded conversation in Slack</p>
              <button
                onClick={() => setShowCreateThread(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Thread
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}