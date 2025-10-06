import { useState, useEffect } from 'react';
import { getAuthHeaders } from './config';
import { GitBranch, GitCommit, Star, Eye, GitFork, Calendar, Activity, Users, Code, TrendingUp, GitPullRequest, AlertCircle, CheckCircle, Filter } from 'lucide-react';

export default function GitHubMonitor() {
  const [username, setUsername] = useState('');
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [repoDetails, setRepoDetails] = useState(null);
  const [commits, setCommits] = useState([]);
  const [branches, setBranches] = useState([]);
  const [contributors, setContributors] = useState([]);
  const [pullRequests, setPullRequests] = useState([]);
  const [issues, setIssues] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [filters, setFilters] = useState({
    eventType: 'all',
    repository: 'all',
    dateRange: 'all',
    status: 'all'
  });
  const [filteredActivity, setFilteredActivity] = useState([]);

  const fetchRepos = async () => {
    if (!username.trim()) {
      setError('Please enter a GitHub username');
      return;
    }

    setLoading(true);
    setError('');
    setSelectedRepo(null);
    setRepoDetails(null);
    setCommits([]);

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
      
      fetchAllRecentActivity(data);
    } catch (err) {
      setError(err.message);
      setRepos([]);
    } finally {
      setLoading(false);
    }
  };


  const fetchAllRecentActivity = async (repositories) => {
    try {
      const allActivity = [];
      
      for (const repo of repositories.slice(0, 10)) {
        const eventsRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}/events?per_page=20`);
        if (eventsRes.ok) {
          const events = await eventsRes.json();
          events.forEach(event => {
            allActivity.push({
              ...event,
              repoName: repo.name
            });
          });
        }
      }
      
      allActivity.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecentActivity(allActivity.slice(0, 50));
      setFilteredActivity(allActivity.slice(0, 50));
    } catch (err) {
      console.error('Error fetching activity:', err);
    }
  };

  const fetchRepoDetails = async (repo) => {
    setSelectedRepo(repo);
    setLoading(true);
    setError('');

    try {
      // Fetch detailed repo info
      const repoRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}`);
      const repoData = await repoRes.json();
      setRepoDetails(repoData);

      // Fetch commits
      const commitsRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}/commits?per_page=100`);
      const commitsData = await commitsRes.json();
      setCommits(Array.isArray(commitsData) ? commitsData : []);

      // Fetch branches
      const branchesRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}/branches`);
      const branchesData = await branchesRes.json();
      setBranches(Array.isArray(branchesData) ? branchesData : []);

      // Fetch contributors
      const contributorsRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}/contributors?per_page=100`);
      const contributorsData = await contributorsRes.json();
      setContributors(Array.isArray(contributorsData) ? contributorsData : []);

      // Fetch pull requests
      const prsRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}/pulls?state=all&per_page=100`);
      const prsData = await prsRes.json();
      setPullRequests(Array.isArray(prsData) ? prsData : []);

      // Fetch issues
      const issuesRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}/issues?state=all&per_page=100`);
      const issuesData = await issuesRes.json();
      setIssues(Array.isArray(issuesData) ? issuesData.filter(issue => !issue.pull_request) : []);

    } catch (err) {
      setError('Error fetching repository details');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...recentActivity];

    if (filters.eventType !== 'all') {
      filtered = filtered.filter(activity => activity.type === filters.eventType);
    }

    if (filters.repository !== 'all') {
      filtered = filtered.filter(activity => activity.repoName === filters.repository);
    }

    if (filters.dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch(filters.dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(activity => new Date(activity.created_at) >= filterDate);
    }

    if (filters.status !== 'all' && selectedRepo) {
      
    }

    setFilteredActivity(filtered);
  };

  const resetFilters = () => {
    setFilters({
      eventType: 'all',
      repository: 'all',
      dateRange: 'all',
      status: 'all'
    });
    setFilteredActivity(recentActivity);
  };

  const calculateSuccessRate = () => {
    if (pullRequests.length === 0) return 0;
    const merged = pullRequests.filter(pr => pr.merged_at).length;
    return ((merged / pullRequests.length) * 100).toFixed(1);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSize = (kb) => {
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const getEventIcon = (type) => {
    switch(type) {
      case 'PushEvent': return <GitCommit className="w-4 h-4" />;
      case 'PullRequestEvent': return <GitPullRequest className="w-4 h-4" />;
      case 'IssuesEvent': return <AlertCircle className="w-4 h-4" />;
      case 'CreateEvent': return <Star className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getEventColor = (type) => {
    switch(type) {
      case 'PushEvent': return 'bg-blue-500/20 border-blue-500/30';
      case 'PullRequestEvent': return 'bg-green-500/20 border-green-500/30';
      case 'IssuesEvent': return 'bg-orange-500/20 border-orange-500/30';
      case 'CreateEvent': return 'bg-purple-500/20 border-purple-500/30';
      default: return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  const uniqueRepos = [...new Set(recentActivity.map(a => a.repoName))];
  const eventTypes = [...new Set(recentActivity.map(a => a.type))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3">
            <GitBranch className="w-10 h-10" />
            GitHub Repository Monitor
          </h1>
          <p className="text-gray-300">Track repositories and detailed analytics</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6 border border-white/20">
          <div className="flex gap-3">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchRepos()}
              placeholder="Enter GitHub username..."
              className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 text-white"
            />
            <button
              onClick={fetchRepos}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
            >
              {loading ? 'Loading...' : 'Fetch Repos'}
            </button>
          </div>
          {error && <p className="text-red-400 mt-3">{error}</p>}
        </div>

        {recentActivity.length > 0 && !selectedRepo && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6 border border-white/20">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Filter className="w-6 h-6" />
              Filters
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Event Type</label>
                <select
                  value={filters.eventType}
                  onChange={(e) => setFilters({...filters, eventType: e.target.value})}
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                >
                  <option value="all">All Events</option>
                  {eventTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-300 mb-2">Repository</label>
                <select
                  value={filters.repository}
                  onChange={(e) => setFilters({...filters, repository: e.target.value})}
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                >
                  <option value="all">All Repositories</option>
                  {uniqueRepos.map(repo => (
                    <option key={repo} value={repo}>{repo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Date Range</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="merged">Merged</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={applyFilters}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
              >
                Apply Filters
              </button>
              <button
                onClick={resetFilters}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {filteredActivity.length > 0 && !selectedRepo && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6 border border-white/20">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Activity className="w-6 h-6" />
              Recent Activity ({filteredActivity.length})
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredActivity.slice(0, 30).map((activity, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${getEventColor(activity.type)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getEventIcon(activity.type)}</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm">{activity.type}</p>
                          <p className="text-xs text-gray-300">{activity.repoName}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            by {activity.actor?.login || 'Unknown'}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatDateTime(activity.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {repos.length > 0 && !selectedRepo && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6 border border-white/20">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Activity className="w-6 h-6" />
              Repositories ({repos.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {repos.map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => fetchRepoDetails(repo)}
                  className="bg-white/5 hover:bg-white/10 p-4 rounded-lg border border-white/10 cursor-pointer transition-all hover:scale-105"
                >
                  <h3 className="font-bold text-lg mb-2 truncate">{repo.name}</h3>
                  {repo.description && (
                    <p className="text-sm text-gray-300 mb-3 line-clamp-2">{repo.description}</p>
                  )}
                  <div className="flex gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4" /> {repo.stargazers_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="w-4 h-4" /> {repo.forks_count}
                    </span>
                  </div>
                  {repo.language && (
                    <div className="mt-2">
                      <span className="text-xs bg-blue-500/30 px-2 py-1 rounded">{repo.language}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedRepo && repoDetails && (
          <div className="space-y-6">
            <button
              onClick={() => {
                setSelectedRepo(null);
                setRepoDetails(null);
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              ← Back to Repositories
            </button>

            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <h2 className="text-3xl font-bold mb-2">{repoDetails.name}</h2>
              {repoDetails.description && (
                <p className="text-gray-300 mb-4">{repoDetails.description}</p>
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-blue-500/20 p-4 rounded-lg border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <span className="text-sm text-gray-300">Stars</span>
                  </div>
                  <p className="text-2xl font-bold">{repoDetails.stargazers_count}</p>
                </div>
                
                <div className="bg-green-500/20 p-4 rounded-lg border border-green-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <GitFork className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-gray-300">Forks</span>
                  </div>
                  <p className="text-2xl font-bold">{repoDetails.forks_count}</p>
                </div>

                <div className="bg-purple-500/20 p-4 rounded-lg border border-purple-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-5 h-5 text-purple-400" />
                    <span className="text-sm text-gray-300">Watchers</span>
                  </div>
                  <p className="text-2xl font-bold">{repoDetails.watchers_count}</p>
                </div>

                <div className="bg-orange-500/20 p-4 rounded-lg border border-orange-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-orange-400" />
                    <span className="text-sm text-gray-300">Open Issues</span>
                  </div>
                  <p className="text-2xl font-bold">{repoDetails.open_issues_count}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-cyan-500/20 p-4 rounded-lg border border-cyan-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <GitPullRequest className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm text-gray-300">Pull Requests</span>
                  </div>
                  <p className="text-2xl font-bold">{pullRequests.length}</p>
                </div>

                <div className="bg-red-500/20 p-4 rounded-lg border border-red-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-sm text-gray-300">Total Issues</span>
                  </div>
                  <p className="text-2xl font-bold">{issues.length}</p>
                </div>

                <div className="bg-green-500/20 p-4 rounded-lg border border-green-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-gray-300">PR Success Rate</span>
                  </div>
                  <p className="text-2xl font-bold">{calculateSuccessRate()}%</p>
                </div>

                <div className="bg-indigo-500/20 p-4 rounded-lg border border-indigo-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <GitCommit className="w-5 h-5 text-indigo-400" />
                    <span className="text-sm text-gray-300">Total Commits</span>
                  </div>
                  <p className="text-2xl font-bold">{commits.length}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <GitCommit className="w-5 h-5" />
                  Recent Commits ({commits.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {commits.slice(0, 20).map((commit) => (
                    <div
                      key={commit.sha}
                      className="bg-white/5 p-3 rounded-lg border border-white/10"
                    >
                      <p className="font-semibold text-sm mb-1 line-clamp-1">
                        {commit.commit.message}
                      </p>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{commit.commit.author.name}</span>
                        <span>{formatDate(commit.commit.author.date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  Branches ({branches.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {branches.map((branch) => (
                    <div
                      key={branch.name}
                      className="bg-white/5 p-3 rounded-lg border border-white/10 flex items-center justify-between"
                    >
                      <span className="font-semibold">{branch.name}</span>
                      {branch.protected && (
                        <span className="text-xs bg-red-500/30 px-2 py-1 rounded">Protected</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Contributors ({contributors.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {contributors.map((contributor) => (
                  <div
                    key={contributor.id}
                    className="bg-white/5 p-3 rounded-lg border border-white/10 text-center"
                  >
                    <img
                      src={contributor.avatar_url}
                      alt={contributor.login}
                      className="w-16 h-16 rounded-full mx-auto mb-2"
                    />
                    <p className="font-semibold text-sm truncate">{contributor.login}</p>
                    <p className="text-xs text-gray-400">{contributor.contributions} commits</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Code className="w-5 h-5" />
                Repository Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Language:</span>
                    <span className="font-semibold">{repoDetails.language || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Size:</span>
                    <span className="font-semibold">{formatSize(repoDetails.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Default Branch:</span>
                    <span className="font-semibold">{repoDetails.default_branch}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Visibility:</span>
                    <span className="font-semibold">{repoDetails.private ? 'Private' : 'Public'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Created:</span>
                    <span className="font-semibold">{formatDate(repoDetails.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Updated:</span>
                    <span className="font-semibold">{formatDate(repoDetails.updated_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Pushed:</span>
                    <span className="font-semibold">{formatDate(repoDetails.pushed_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">License:</span>
                    <span className="font-semibold">{repoDetails.license?.name || 'None'}</span>
                  </div>
                </div>
              </div>
              
              {repoDetails.homepage && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <a
                    href={repoDetails.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    🔗 Homepage: {repoDetails.homepage}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}