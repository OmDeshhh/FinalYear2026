import { useState } from 'react';
import { Activity, MessageSquare } from 'lucide-react';
import Webhook from './Webhook/Webhook';
import SlackIntegration from './slack/SlackIntegration';

// Add placeholders for the subpages if they exist
import WebhookLogsPage from './slack/WebhookLogsPage';
import AlertSystemPage from './slack/AlertSystemPage';
import MessageThreadingPage from './slack/MessageThreadingPage';

function App() {
  const [currentPage, setCurrentPage] = useState('webhook');

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Navigation Bar */}
      <nav className="bg-black/30 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-8 h-8 text-green-400" />
              <h1 className="text-2xl font-bold text-white">Slack</h1>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentPage('webhook')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${
                  currentPage === 'webhook'
                    ? 'bg-green-600 text-white shadow-lg shadow-green-500/50'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <Activity className="w-5 h-5" />
                Webhooks
              </button>

              <button
                onClick={() => setCurrentPage('slack')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${
                  currentPage === 'slack'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                Slack
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <div>
        {currentPage === 'webhook' && <Webhook />}
        {currentPage === 'slack' && <SlackIntegration onPageChange={handlePageChange} />}
        {currentPage === 'WebhookLogsPage' && <WebhookLogsPage />}
        {currentPage === 'AlertSystemPage' && <AlertSystemPage />}
        {currentPage === 'MessageThreadingPage' && <MessageThreadingPage />}
      </div>
    </div>
  );
}

export default App;
