import { useState } from 'react';
import { getAuthHeaders } from './config';
import { Play, Pause, CheckCircle, XCircle, Clock, GitBranch, Zap, TrendingUp, AlertCircle, Activity } from 'lucide-react';

export default function CICDAutomation() {
  const [username, setUsername] = useState('');
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [workflowRuns, setWorkflowRuns] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all'); 

  const fetchRepos = async () => {
    if (!username.trim()) {
      setError('Please enter a GitHub username');
      return;
    }

    setLoading(true);
    setError('');
    setSelectedRepo(null);
    setWorkflows([]);

    try {
      const res = await fetch(
        `https://api.github.com/users/${username}/repos?sort=updated&per_page=100`,
        {
          headers: getAuthHeaders()
        }
      );
      
      if (!res.ok) throw new Error('User not found');
      const data = await res.json();
      setRepos(data);
    } catch (err) {
      setError(err.message);
      setRepos([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflows = async (repo) => {
    setSelectedRepo(repo);
    setLoading(true);
    setError('');

    try {
      const workflowsRes = await fetch(
        `https://api.github.com/repos/${username}/${repo.name}/actions/workflows`
      );
      
      if (!workflowsRes.ok) {
        throw new Error('Could not fetch workflows');
      }

      const workflowsData = await workflowsRes.json();
      setWorkflows(workflowsData.workflows || []);

      // Fetch runs for each workflow
      const runsData = {};
      for (const workflow of workflowsData.workflows || []) {
        try {
          const runsRes = await fetch(
            `https://api.github.com/repos/${username}/${repo.name}/actions/workflows/${workflow.id}/runs?per_page=50`
          );
          if (runsRes.ok) {
            const runs = await runsRes.json();
            runsData[workflow.id] = runs.workflow_runs || [];
          }
        } catch (err) {
          console.error(`Error fetching runs for workflow ${workflow.id}:`, err);
        }
      }
      setWorkflowRuns(runsData);

    } catch (err) {
      setError(err.message);
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const allRuns = Object.values(workflowRuns).flat();
    const totalRuns = allRuns.length;
    const successfulRuns = allRuns.filter(run => run.conclusion === 'success').length;
    const avgSuccessRate = totalRuns > 0 ? ((successfulRuns / totalRuns) * 100).toFixed(1) : 0;
    const activeWorkflows = workflows.filter(w => w.state === 'active').length;

    return { totalRuns, avgSuccessRate, activeWorkflows };
  };

  const getWorkflowsByTab = () => {
    if (activeTab === 'active') {
      return workflows.filter(w => w.state === 'active');
    } else if (activeTab === 'inactive') {
      return workflows.filter(w => w.state !== 'active');
    }
    return workflows;
  };

  const getWorkflowStats = (workflowId) => {
    const runs = workflowRuns[workflowId] || [];
    const totalRuns = runs.length;
    const successCount = runs.filter(r => r.conclusion === 'success').length;
    const failureCount = runs.filter(r => r.conclusion === 'failure').length;
    const successRate = totalRuns > 0 ? ((successCount / totalRuns) * 100).toFixed(1) : 0;
    const lastRun = runs[0];

    return { totalRuns, successCount, failureCount, successRate, lastRun };
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failure':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-400 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-green-500/20 border-green-500/30';
      case 'failure':
        return 'bg-red-500/20 border-red-500/30';
      case 'in_progress':
        return 'bg-blue-500/20 border-blue-500/30';
      default:
        return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  const stats = workflows.length > 0 ? calculateStats() : null;
  const filteredWorkflows = getWorkflowsByTab();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3">
            <Zap className="w-10 h-10 text-yellow-400" />
            CI/CD Automation Dashboard
          </h1>
          <p className="text-gray-300">Automate build, test, and deploy workflows</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6 border border-white/20">
          <div className="flex gap-3">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchRepos()}
              placeholder="Enter GitHub username..."
              className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400 text-white"
            />
            <button
              onClick={fetchRepos}
              disabled={loading}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
            >
              {loading ? 'Loading...' : 'Fetch Repos'}
            </button>
          </div>
          {error && <p className="text-red-400 mt-3">{error}</p>}
        </div>

        {repos.length > 0 && !selectedRepo && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6 border border-white/20">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <GitBranch className="w-6 h-6" />
              Select Repository ({repos.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {repos.map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => fetchWorkflows(repo)}
                  className="bg-white/5 hover:bg-white/10 p-4 rounded-lg border border-white/10 cursor-pointer transition-all hover:scale-105"
                >
                  <h3 className="font-bold text-lg mb-2 truncate">{repo.name}</h3>
                  {repo.description && (
                    <p className="text-sm text-gray-300 mb-3 line-clamp-2">{repo.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Activity className="w-4 h-4" />
                    <span>View Workflows</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedRepo && (
          <div className="space-y-6">
            <button
              onClick={() => {
                setSelectedRepo(null);
                setWorkflows([]);
                setWorkflowRuns({});
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              ← Back to Repositories
            </button>

            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <h2 className="text-3xl font-bold mb-2">{selectedRepo.name}</h2>
              <p className="text-gray-300">CI/CD Workflows Overview</p>

              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-blue-500/20 p-4 rounded-lg border border-blue-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Play className="w-5 h-5 text-blue-400" />
                      <span className="text-sm text-gray-300">Active Workflows</span>
                    </div>
                    <p className="text-3xl font-bold">{stats.activeWorkflows}</p>
                  </div>

                  <div className="bg-purple-500/20 p-4 rounded-lg border border-purple-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-5 h-5 text-purple-400" />
                      <span className="text-sm text-gray-300">Total Runs</span>
                    </div>
                    <p className="text-3xl font-bold">{stats.totalRuns}</p>
                  </div>

                  <div className="bg-green-500/20 p-4 rounded-lg border border-green-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                      <span className="text-sm text-gray-300">Avg Success Rate</span>
                    </div>
                    <p className="text-3xl font-bold">{stats.avgSuccessRate}%</p>
                  </div>
                </div>
              )}
            </div>

            {workflows.length === 0 && !loading ? (
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-12 border border-white/20 text-center">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No Workflows Found</h3>
                <p className="text-gray-400">This repository doesn't have any GitHub Actions workflows set up yet.</p>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold">Workflows</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        activeTab === 'all'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      All ({workflows.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('active')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        activeTab === 'active'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      Active ({workflows.filter(w => w.state === 'active').length})
                    </button>
                    <button
                      onClick={() => setActiveTab('inactive')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        activeTab === 'inactive'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      Inactive ({workflows.filter(w => w.state !== 'active').length})
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredWorkflows.map((workflow) => {
                    const workflowStats = getWorkflowStats(workflow.id);
                    return (
                      <div
                        key={workflow.id}
                        className="bg-white/5 rounded-lg border border-white/10 p-5"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-xl font-bold">{workflow.name}</h4>
                              {workflow.state === 'active' ? (
                                <span className="flex items-center gap-1 text-xs bg-green-500/30 px-2 py-1 rounded">
                                  <Play className="w-3 h-3" /> Active
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs bg-gray-500/30 px-2 py-1 rounded">
                                  <Pause className="w-3 h-3" /> Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">{workflow.path}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Total Runs</p>
                            <p className="text-2xl font-bold">{workflowStats.totalRuns}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Success</p>
                            <p className="text-2xl font-bold text-green-400">{workflowStats.successCount}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Failures</p>
                            <p className="text-2xl font-bold text-red-400">{workflowStats.failureCount}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Success Rate</p>
                            <p className="text-2xl font-bold">{workflowStats.successRate}%</p>
                          </div>
                        </div>

                        {workflowStats.lastRun && (
                          <div className={`p-3 rounded-lg border ${getStatusColor(workflowStats.lastRun.conclusion)}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getStatusIcon(workflowStats.lastRun.conclusion)}
                                <div>
                                  <p className="font-semibold text-sm">Last Run</p>
                                  <p className="text-xs text-gray-400">
                                    {formatDate(workflowStats.lastRun.created_at)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-400">Branch</p>
                                <p className="text-sm font-semibold">{workflowStats.lastRun.head_branch}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {workflowRuns[workflow.id] && workflowRuns[workflow.id].length > 1 && (
                          <div className="mt-4">
                            <p className="text-sm text-gray-400 mb-2">Recent Runs</p>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {workflowRuns[workflow.id].slice(1, 6).map((run) => (
                                <div
                                  key={run.id}
                                  className={`p-2 rounded border ${getStatusColor(run.conclusion)} flex items-center justify-between`}
                                >
                                  <div className="flex items-center gap-2">
                                    {getStatusIcon(run.conclusion)}
                                    <span className="text-xs font-semibold">
                                      {run.conclusion || run.status}
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-400">
                                    {formatDate(run.created_at)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {filteredWorkflows.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No workflows found in this category</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}