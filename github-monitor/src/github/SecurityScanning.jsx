import { useState } from 'react';
import { getAuthHeaders } from './config';
import { Shield, AlertTriangle, CheckCircle, XCircle, Lock, Unlock, Eye, FileCode, Package, Bug, TrendingUp, Activity, GitBranch } from 'lucide-react';

export default function SecurityScanning() {
  const [username, setUsername] = useState('');
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [dependabotAlerts, setDependabotAlerts] = useState([]);
  const [codeScanning, setCodeScanning] = useState([]);
  const [secretScanning, setSecretScanning] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); 
  const fetchRepos = async () => {
    if (!username.trim()) {
      setError('Please enter a GitHub username');
      return;
    }

    setLoading(true);
    setError('');
    setSelectedRepo(null);
    setVulnerabilities([]);

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

  const fetchSecurityData = async (repo) => {
    setSelectedRepo(repo);
    setLoading(true);
    setError('');

    try {
      try {
        const depRes = await fetch(
          `https://api.github.com/repos/${username}/${repo.name}/dependabot/alerts`,
          {
            headers: {
              'Accept': 'application/vnd.github+json'
            }
          }
        );
        if (depRes.ok) {
          const depData = await depRes.json();
          setDependabotAlerts(Array.isArray(depData) ? depData : []);
        } else {
          setDependabotAlerts([]);
        }
      } catch (err) {
        setDependabotAlerts([]);
      }

      try {
        const codeRes = await fetch(
          `https://api.github.com/repos/${username}/${repo.name}/code-scanning/alerts`,
          {
            headers: {
              'Accept': 'application/vnd.github+json'
            }
          }
        );
        if (codeRes.ok) {
          const codeData = await codeRes.json();
          setCodeScanning(Array.isArray(codeData) ? codeData : []);
        } else {
          setCodeScanning([]);
        }
      } catch (err) {
        setCodeScanning([]);
      }

      try {
        const secretRes = await fetch(
          `https://api.github.com/repos/${username}/${repo.name}/secret-scanning/alerts`,
          {
            headers: {
              'Accept': 'application/vnd.github+json'
            }
          }
        );
        if (secretRes.ok) {
          const secretData = await secretRes.json();
          setSecretScanning(Array.isArray(secretData) ? secretData : []);
        } else {
          setSecretScanning([]);
        }
      } catch (err) {
        setSecretScanning([]);
      }

      const allVulns = [
        ...dependabotAlerts.map(a => ({ ...a, type: 'dependency' })),
        ...codeScanning.map(a => ({ ...a, type: 'code' })),
        ...secretScanning.map(a => ({ ...a, type: 'secret' }))
      ];
      setVulnerabilities(allVulns);

    } catch (err) {
      setError('Error fetching security data. Some features may require authentication or be unavailable for this repository.');
    } finally {
      setLoading(false);
    }
  };

  const calculateSecurityScore = () => {
    const critical = vulnerabilities.filter(v => 
      v.security_advisory?.severity === 'critical' || v.rule?.severity === 'error'
    ).length;
    const high = vulnerabilities.filter(v => 
      v.security_advisory?.severity === 'high' || v.rule?.severity === 'warning'
    ).length;
    const medium = vulnerabilities.filter(v => 
      v.security_advisory?.severity === 'medium' || v.rule?.severity === 'note'
    ).length;
    const low = vulnerabilities.filter(v => 
      v.security_advisory?.severity === 'low'
    ).length;

    const totalIssues = critical + high + medium + low;
    const weightedScore = (critical * 10 + high * 5 + medium * 2 + low * 1);
    const maxPossibleScore = totalIssues * 10;
    
    const score = maxPossibleScore > 0 ? Math.max(0, 100 - (weightedScore / maxPossibleScore * 100)) : 100;
    
    return {
      score: score.toFixed(0),
      critical,
      high,
      medium,
      low,
      total: totalIssues
    };
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'error':
        return 'bg-red-500/20 border-red-500/50 text-red-400';
      case 'high':
      case 'warning':
        return 'bg-orange-500/20 border-orange-500/50 text-orange-400';
      case 'medium':
      case 'moderate':
      case 'note':
        return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
      case 'low':
        return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
      default:
        return 'bg-gray-500/20 border-gray-500/50 text-gray-400';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'error':
        return <XCircle className="w-5 h-5" />;
      case 'high':
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'medium':
      case 'moderate':
      case 'note':
        return <Eye className="w-5 h-5" />;
      default:
        return <CheckCircle className="w-5 h-5" />;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score) => {
    if (score >= 80) return 'from-green-500/20 to-green-500/5';
    if (score >= 60) return 'from-yellow-500/20 to-yellow-500/5';
    if (score >= 40) return 'from-orange-500/20 to-orange-500/5';
    return 'from-red-500/20 to-red-500/5';
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

  const securityStats = selectedRepo ? calculateSecurityScore() : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3">
            <Shield className="w-10 h-10 text-red-400" />
            Security Scanning Dashboard
          </h1>
          <p className="text-gray-300">Identify and fix security vulnerabilities</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6 border border-white/20">
          <div className="flex gap-3">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchRepos()}
              placeholder="Enter GitHub username..."
              className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-400 text-white"
            />
            <button
              onClick={fetchRepos}
              disabled={loading}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
            >
              {loading ? 'Loading...' : 'Scan Repos'}
            </button>
          </div>
          {error && <p className="text-red-400 mt-3 text-sm">{error}</p>}
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
                  onClick={() => fetchSecurityData(repo)}
                  className="bg-white/5 hover:bg-white/10 p-4 rounded-lg border border-white/10 cursor-pointer transition-all hover:scale-105"
                >
                  <h3 className="font-bold text-lg mb-2 truncate">{repo.name}</h3>
                  {repo.description && (
                    <p className="text-sm text-gray-300 mb-3 line-clamp-2">{repo.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Shield className="w-4 h-4" />
                    <span>Scan Security</span>
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
                setVulnerabilities([]);
                setDependabotAlerts([]);
                setCodeScanning([]);
                setSecretScanning([]);
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              ← Back to Repositories
            </button>

            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <h2 className="text-3xl font-bold mb-2">{selectedRepo.name}</h2>
              <p className="text-gray-300 mb-6">Security Analysis Report</p>

              {securityStats && (
                <>
                  <div className={`bg-gradient-to-r ${getScoreGradient(securityStats.score)} rounded-xl p-8 mb-6 border border-white/20`}>
                    <div className="text-center">
                      <p className="text-gray-300 mb-2">Security Score</p>
                      <p className={`text-6xl font-bold ${getScoreColor(securityStats.score)}`}>
                        {securityStats.score}
                      </p>
                      <p className="text-gray-400 mt-2">
                        {securityStats.score >= 80 ? 'Excellent Security' :
                         securityStats.score >= 60 ? 'Good Security' :
                         securityStats.score >= 40 ? 'Needs Improvement' : 'Critical Issues Detected'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-gray-500/20 p-4 rounded-lg border border-gray-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-300">Total Issues</span>
                      </div>
                      <p className="text-2xl font-bold">{securityStats.total}</p>
                    </div>

                    <div className="bg-red-500/20 p-4 rounded-lg border border-red-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-5 h-5 text-red-400" />
                        <span className="text-sm text-gray-300">Critical</span>
                      </div>
                      <p className="text-2xl font-bold text-red-400">{securityStats.critical}</p>
                    </div>

                    <div className="bg-orange-500/20 p-4 rounded-lg border border-orange-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-orange-400" />
                        <span className="text-sm text-gray-300">High</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-400">{securityStats.high}</p>
                    </div>

                    <div className="bg-yellow-500/20 p-4 rounded-lg border border-yellow-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-5 h-5 text-yellow-400" />
                        <span className="text-sm text-gray-300">Medium</span>
                      </div>
                      <p className="text-2xl font-bold text-yellow-400">{securityStats.medium}</p>
                    </div>

                    <div className="bg-blue-500/20 p-4 rounded-lg border border-blue-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-blue-400" />
                        <span className="text-sm text-gray-300">Low</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-400">{securityStats.low}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <div className="flex gap-2 mb-6 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                    activeTab === 'overview'
                      ? 'bg-red-600 text-white'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('vulnerabilities')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                    activeTab === 'vulnerabilities'
                      ? 'bg-red-600 text-white'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Dependencies ({dependabotAlerts.length})
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                    activeTab === 'code'
                      ? 'bg-red-600 text-white'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Code Scanning ({codeScanning.length})
                </button>
                <button
                  onClick={() => setActiveTab('secrets')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                    activeTab === 'secrets'
                      ? 'bg-red-600 text-white'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Secret Scanning ({secretScanning.length})
                </button>
              </div>

              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold mb-4">All Security Issues</h3>
                  {vulnerabilities.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                      <h3 className="text-xl font-bold mb-2">No Security Issues Found</h3>
                      <p className="text-gray-400">This repository appears to be secure or security features may not be enabled.</p>
                    </div>
                  ) : (
                    vulnerabilities.map((vuln, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg border ${getSeverityColor(
                          vuln.security_advisory?.severity || vuln.rule?.severity || vuln.state
                        )}`}
                      >
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(vuln.security_advisory?.severity || vuln.rule?.severity)}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-bold text-lg">
                                  {vuln.security_advisory?.summary || vuln.rule?.description || vuln.secret_type || 'Security Alert'}
                                </h4>
                                <div className="flex gap-2 mt-1">
                                  <span className="text-xs bg-black/30 px-2 py-1 rounded">
                                    {vuln.type === 'dependency' ? 'Dependency' : 
                                     vuln.type === 'code' ? 'Code' : 'Secret'}
                                  </span>
                                  <span className="text-xs bg-black/30 px-2 py-1 rounded">
                                    {vuln.state || 'open'}
                                  </span>
                                </div>
                              </div>
                              <span className={`text-xs px-3 py-1 rounded-full font-bold ${getSeverityColor(
                                vuln.security_advisory?.severity || vuln.rule?.severity || 'medium'
                              )}`}>
                                {(vuln.security_advisory?.severity || vuln.rule?.severity || 'medium').toUpperCase()}
                              </span>
                            </div>
                            {vuln.security_vulnerability?.package?.name && (
                              <p className="text-sm text-gray-300 mb-2">
                                Package: <span className="font-mono">{vuln.security_vulnerability.package.name}</span>
                              </p>
                            )}
                            {vuln.most_recent_instance?.location?.path && (
                              <p className="text-sm text-gray-300 mb-2">
                                File: <span className="font-mono">{vuln.most_recent_instance.location.path}</span>
                              </p>
                            )}
                            {vuln.created_at && (
                              <p className="text-xs text-gray-400 mt-2">
                                Detected: {formatDate(vuln.created_at)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'vulnerabilities' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Package className="w-6 h-6" />
                    Dependency Vulnerabilities
                  </h3>
                  {dependabotAlerts.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                      <p className="text-gray-400">No dependency vulnerabilities found</p>
                    </div>
                  ) : (
                    dependabotAlerts.map((alert) => (
                      <div
                        key={alert.number}
                        className={`p-4 rounded-lg border ${getSeverityColor(alert.security_advisory?.severity)}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-bold">{alert.security_advisory?.summary}</h4>
                            <p className="text-sm text-gray-300 mt-1">
                              Package: <span className="font-mono">{alert.security_vulnerability?.package?.name}</span>
                            </p>
                            <p className="text-sm text-gray-300">
                              Vulnerable: <span className="font-mono">{alert.security_vulnerability?.vulnerable_version_range}</span>
                            </p>
                          </div>
                          <span className={`text-xs px-3 py-1 rounded-full font-bold ${getSeverityColor(alert.security_advisory?.severity)}`}>
                            {alert.security_advisory?.severity?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'code' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <FileCode className="w-6 h-6" />
                    Code Scanning Alerts
                  </h3>
                  {codeScanning.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                      <p className="text-gray-400">No code scanning alerts found</p>
                    </div>
                  ) : (
                    codeScanning.map((alert) => (
                      <div
                        key={alert.number}
                        className={`p-4 rounded-lg border ${getSeverityColor(alert.rule?.severity)}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-bold">{alert.rule?.description}</h4>
                            <p className="text-sm text-gray-300 mt-1">
                              {alert.most_recent_instance?.location?.path}
                            </p>
                          </div>
                          <span className={`text-xs px-3 py-1 rounded-full font-bold ${getSeverityColor(alert.rule?.severity)}`}>
                            {alert.rule?.severity?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'secrets' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Lock className="w-6 h-6" />
                    Secret Scanning Alerts
                  </h3>
                  {secretScanning.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                      <p className="text-gray-400">No exposed secrets found</p>
                    </div>
                  ) : (
                    secretScanning.map((alert) => (
                      <div
                        key={alert.number}
                        className="p-4 rounded-lg border bg-red-500/20 border-red-500/50 text-red-400"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-bold">{alert.secret_type_display_name}</h4>
                            <p className="text-sm text-gray-300 mt-1">
                              State: {alert.state}
                            </p>
                          </div>
                          <Unlock className="w-6 h-6" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}