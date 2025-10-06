import { useState } from 'react';
import { Monitor, Zap, Shield, Activity, MessageSquare } from 'lucide-react';
import GitHubMonitoring from './github/GitHubMonitoring';
import CICDAutomation from './github/CICDAutomation';
import SecurityScanning from './github/SecurityScanning';
import Webhook from './Webhook/Webhook';
import SlackIntegration from './slack/SlackIntegration';

function App() {
  const [currentPage, setCurrentPage] = useState('monitoring');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Navigation Bar */}
      <nav className="bg-black/30 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">GitHub Dashboard</h1>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentPage('monitoring')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${
                  currentPage === 'monitoring'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <Monitor className="w-5 h-5" />
                Repository Monitor
              </button>
              
              <button
                onClick={() => setCurrentPage('cicd')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${
                  currentPage === 'cicd'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <Zap className="w-5 h-5" />
                CI/CD Automation
              </button>

              <button
                onClick={() => setCurrentPage('security')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${
                  currentPage === 'security'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-500/50'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <Shield className="w-5 h-5" />
                Security Scanning
              </button>

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
        {currentPage === 'monitoring' && <GitHubMonitoring />}
        {currentPage === 'cicd' && <CICDAutomation />}
        {currentPage === 'security' && <SecurityScanning />}
        {currentPage === 'webhook' && <Webhook />}
        {currentPage === 'slack' && <SlackIntegration />}
      </div>
    </div>
  );
}

export default App;