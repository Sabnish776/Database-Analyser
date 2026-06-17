import React, { useState, useEffect } from 'react';
import {
  Database,
  Settings,
  Plus,
  Trash2,
  Play,
  Check,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Edit2,
  Terminal,
  Activity,
  Award,
} from 'lucide-react';
import { DashboardCharts } from './components/DashboardCharts';

interface ConnectionDetail {
  id: string;
  name: string;
  dbType: string;
  url: string;
  username: string;
  password?: string;
}

interface MetricResult {
  connectionTimeMs: number;
  schemaCreationTimeMs: number;
  insertionTimeMs: number;
  insertionRate: number;
  readTimeMs: number;
  joinTimeMs: number;
  aggregateTimeMs: number;
}

interface BenchmarkResult {
  connectionName: string;
  dbType: string;
  success: boolean;
  metrics?: MetricResult;
  error?: string;
}

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
}

const API_BASE = 'http://localhost:8080/api/benchmark';

export default function App() {
  // Connections list persisted in localStorage
  const [connections, setConnections] = useState<ConnectionDetail[]>(() => {
    const saved = localStorage.getItem('db_connections');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    // Default mock connections to help the user get started
    return [
      {
        id: '1',
        name: 'Local MySQL',
        dbType: 'mysql',
        url: 'jdbc:mysql://localhost:3306/benchmark_db?useSSL=false&allowPublicKeyRetrieval=true',
        username: 'root',
        password: '',
      },
      {
        id: '2',
        name: 'Local PostgreSQL',
        dbType: 'postgresql',
        url: 'jdbc:postgresql://localhost:5432/benchmark_db',
        username: 'postgres',
        password: '',
      },
      {
        id: '3',
        name: 'Local MariaDB',
        dbType: 'mariadb',
        url: 'jdbc:mariadb://localhost:3306/benchmark_db',
        username: 'root',
        password: '',
      },
    ];
  });

  // Save connections on change
  useEffect(() => {
    localStorage.setItem('db_connections', JSON.stringify(connections));
  }, [connections]);

  // UI state variables
  const [editingConn, setEditingConn] = useState<Partial<ConnectionDetail> | null>(null);
  const [insertCount, setInsertCount] = useState<number>(1000);
  const [defaultQueriesJson, setDefaultQueriesJson] = useState<string>('');
  const [toast, setToast] = useState<Toast | null>(null);
  
  // Loading states
  const [testingConnId, setTestingConnId] = useState<string | null>(null);
  const [runningBenchmark, setRunningBenchmark] = useState<boolean>(false);
  
  // Benchmark output
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);

  // Fetch default config queries from Spring Boot backend on mount
  useEffect(() => {
    fetchDefaultQueries();
  }, []);

  const fetchDefaultQueries = async () => {
    try {
      const res = await fetch(`${API_BASE}/default-config`);
      if (res.ok) {
        const data = await res.json();
        const formatted = JSON.stringify(data, null, 2);
        setDefaultQueriesJson(formatted);
      }
    } catch (e) {
      showToast('Could not reach backend to load default configurations', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const addOrSaveConnection = () => {
    if (!editingConn) return;
    if (!editingConn.name || !editingConn.url || !editingConn.username) {
      showToast('Please fill in Name, URL, and Username', 'error');
      return;
    }

    if (editingConn.id) {
      // Edit
      setConnections(connections.map(c => c.id === editingConn.id ? (editingConn as ConnectionDetail) : c));
      showToast('Connection updated', 'success');
    } else {
      // Create
      const newConn: ConnectionDetail = {
        id: Date.now().toString(),
        name: editingConn.name,
        dbType: editingConn.dbType || 'mysql',
        url: editingConn.url,
        username: editingConn.username,
        password: editingConn.password || '',
      };
      setConnections([...connections, newConn]);
      showToast('Connection added', 'success');
    }
    setEditingConn(null);
  };

  const deleteConnection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConnections(connections.filter(c => c.id !== id));
    showToast('Connection deleted', 'info');
  };

  const testConnection = async (conn: ConnectionDetail, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTestingConnId(conn.id);
    try {
      const res = await fetch(`${API_BASE}/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: conn.name,
          dbType: conn.dbType,
          url: conn.url,
          username: conn.username,
          password: conn.password,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Connected successfully in ${data.connectionTimeMs}ms!`, 'success');
      } else {
        showToast(`Connection failed: ${data.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`Network error testing connection: ${err.message}`, 'error');
    } finally {
      setTestingConnId(null);
    }
  };

  const runBenchmark = async () => {
    if (connections.length === 0) {
      showToast('Please add at least one database connection first', 'error');
      return;
    }

    setRunningBenchmark(true);
    setBenchmarkResults([]);
    try {
      const res = await fetch(`${API_BASE}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connections: connections.map(c => ({
            name: c.name,
            dbType: c.dbType,
            url: c.url,
            username: c.username,
            password: c.password,
          })),
          customConfig: null,
          insertCount: insertCount,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBenchmarkResults(data.results);
        showToast('Benchmark run completed successfully!', 'success');
      } else {
        const errorText = await res.text();
        showToast(`Benchmark failed: ${errorText || 'Server Error'}`, 'error');
      }
    } catch (err: any) {
      showToast(`Network error running benchmark: ${err.message}`, 'error');
    } finally {
      setRunningBenchmark(false);
    }
  };

  // Find overall leaders / winners
  const getLeader = (metric: keyof MetricResult, lowerIsBetter: boolean = true) => {
    const valid = benchmarkResults.filter(r => r.success && r.metrics);
    if (valid.length === 0) return null;

    return valid.reduce((best, curr) => {
      const valBest = best.metrics![metric];
      const valCurr = curr.metrics![metric];
      if (lowerIsBetter) {
        return valCurr < valBest ? curr : best;
      } else {
        return valCurr > valBest ? curr : best;
      }
    });
  };

  const connLeader = getLeader('connectionTimeMs', true);
  const writeLeader = getLeader('insertionRate', false);
  const readLeader = getLeader('readTimeMs', true);

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toast && (
        <div className="toast">
          {toast.type === 'success' && <Check className="text-success" size={20} />}
          {toast.type === 'error' && <AlertCircle className="text-error" size={20} />}
          {toast.type === 'info' && <Sparkles style={{ color: 'var(--primary)' }} size={20} />}
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="header-title-section">
          <h1>Database Analyzer & Benchmarker</h1>
          <p>Dynamically benchmark and analyze query throughput and connection latencies across MySQL, PostgreSQL, and MariaDB</p>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="dashboard-grid">
        
        {/* Left Sidebar: Connections & Parameters */}
        <div className="connections-section">
          
          {/* Connection List Container */}
          <div className="glass-panel">
            <div className="section-title" style={{ justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database size={18} className="text-success" />
                Target Connections ({connections.length})
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setEditingConn({ dbType: 'mysql', url: 'jdbc:mysql://localhost:3306/benchmark_db?useSSL=false&allowPublicKeyRetrieval=true', username: 'root', password: '' })}
              >
                <Plus size={14} /> Add
              </button>
            </div>

            {connections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No database connections defined. Click 'Add' to set one up.
              </div>
            ) : (
              <div className="connection-list">
                {connections.map((conn) => (
                  <div key={conn.id} className="connection-card">
                    <div className="connection-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="connection-name">{conn.name}</span>
                        <span className={`badge badge-${conn.dbType}`}>{conn.dbType}</span>
                      </div>
                      <div className="connection-actions">
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.25rem' }}
                          title="Test Connection"
                          disabled={testingConnId === conn.id}
                          onClick={(e) => testConnection(conn, e)}
                        >
                          {testingConnId === conn.id ? (
                            <RefreshCw size={12} className="spinner" />
                          ) : (
                            <Activity size={12} style={{ color: 'var(--success)' }} />
                          )}
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.25rem' }}
                          title="Edit Connection"
                          onClick={() => setEditingConn(conn)}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm btn-danger"
                          style={{ padding: '0.25rem' }}
                          title="Remove Connection"
                          onClick={(e) => deleteConnection(conn.id, e)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="connection-url">{conn.url}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Connection Editor Modal/Card */}
          {editingConn && (
            <div className="glass-panel" style={{ border: '1px solid var(--border-glow-focus)' }}>
              <div className="section-title">
                <Settings size={18} style={{ color: 'var(--secondary)' }} />
                {editingConn.id ? 'Edit Connection' : 'Add Connection'}
              </div>

              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Local MySQL Test"
                  value={editingConn.name || ''}
                  onChange={(e) => setEditingConn({ ...editingConn, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Database Type</label>
                <select
                  className="form-select"
                  value={editingConn.dbType || 'mysql'}
                  onChange={(e) => setEditingConn({ ...editingConn, dbType: e.target.value })}
                >
                  <option value="mysql">MySQL</option>
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mariadb">MariaDB</option>
                  <option value="clickhouse">Clickhouse</option>
                  <option value="oraclesql">OracleSql</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">JDBC URL</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="jdbc:..."
                  value={editingConn.url || ''}
                  onChange={(e) => setEditingConn({ ...editingConn, url: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="root"
                  value={editingConn.username || ''}
                  onChange={(e) => setEditingConn({ ...editingConn, username: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Password"
                  value={editingConn.password || ''}
                  onChange={(e) => setEditingConn({ ...editingConn, password: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={addOrSaveConnection}>
                  Save
                </button>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingConn(null)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Benchmark Settings Panel */}
          <div className="glass-panel">
            <div className="section-title">
              <Terminal size={18} style={{ color: 'var(--accent)' }} />
              Test Options
            </div>

            <div className="form-group">
              <label className="form-label">Batch Rows (Insert benchmark)</label>
              <select
                className="form-select"
                value={insertCount}
                onChange={(e) => setInsertCount(Number(e.target.value))}
              >
                <option value="100">100 rows</option>
                <option value="500">500 rows</option>
                <option value="1000">1,000 rows (Default)</option>
                <option value="5000">5,000 rows</option>
                <option value="10000">10,000 rows</option>
              </select>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Rows inserted for parent-child relationship.
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Configuration Panels and Outputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Query Configuration Preview */}
          <div className="glass-panel">
            <div className="section-title">
              <Settings size={18} style={{ color: 'var(--primary)' }} />
              Default Benchmarking Queries Configuration
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Standardized queries and schemas used to dynamically test insertion throughput and execution times. These queries are pre-optimized and mapped to the backend implementation.
              </p>
              <div className="json-editor-container" style={{ height: '260px' }}>
                <textarea
                  className="json-textarea"
                  readOnly
                  value={defaultQueriesJson || '// Loading default configurations from server...'}
                />
              </div>
            </div>
          </div>

          {/* Benchmark Actions & Progress Bar */}
          <div className="run-bar">
            <div className="run-stats-info">
              <span>Databases: <strong>{connections.length}</strong></span>
              <span>Workload: <strong>Standard Baseline</strong></span>
              <span>Batch Insert: <strong>{insertCount} rows</strong></span>
            </div>
            <button
              className="btn btn-primary"
              disabled={runningBenchmark}
              onClick={runBenchmark}
            >
              {runningBenchmark ? (
                <>
                  <RefreshCw size={16} className="spinner" />
                  Running Benchmarks...
                </>
              ) : (
                <>
                  <Play size={16} />
                  Run Comparison
                </>
              )}
            </button>
          </div>

          {/* Results Section */}
          {runningBenchmark && (
            <div className="glass-panel loader-container">
              <div className="spinner" style={{ width: '40px', height: '40px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Measuring Database Engines...</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Connecting dynamically to JDBC endpoints, running schema changes, batches, and executing query categories.
              </p>
            </div>
          )}

          {!runningBenchmark && benchmarkResults.length > 0 && (
            <>
              {/* Leader Metrics Cards */}
              <div className="metrics-summary-grid">
                
                {/* Connection Leader */}
                <div className="metric-summary-card glass-panel">
                  <div className="metric-summary-header">
                    <span>Fastest Connect</span>
                    <Award size={16} style={{ color: 'var(--primary)' }} />
                  </div>
                  {connLeader ? (
                    <>
                      <div className="metric-summary-value">{connLeader.metrics?.connectionTimeMs}ms</div>
                      <div className="metric-summary-db">
                        <span className={`badge badge-${connLeader.dbType}`}>{connLeader.dbType}</span>
                        <span>{connLeader.connectionName}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>N/A</div>
                  )}
                </div>

                {/* Insertion Throughput Leader */}
                <div className="metric-summary-card glass-panel">
                  <div className="metric-summary-header">
                    <span>Highest Write Rate</span>
                    <Award size={16} style={{ color: 'var(--success)' }} />
                  </div>
                  {writeLeader ? (
                    <>
                      <div className="metric-summary-value">{writeLeader.metrics?.insertionRate.toLocaleString()} rows/s</div>
                      <div className="metric-summary-db">
                        <span className={`badge badge-${writeLeader.dbType}`}>{writeLeader.dbType}</span>
                        <span>{writeLeader.connectionName}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>N/A</div>
                  )}
                </div>

                {/* Simple Read Leader */}
                <div className="metric-summary-card glass-panel">
                  <div className="metric-summary-header">
                    <span>Fastest Avg Read</span>
                    <Award size={16} style={{ color: 'var(--warning)' }} />
                  </div>
                  {readLeader ? (
                    <>
                      <div className="metric-summary-value">{readLeader.metrics?.readTimeMs}ms</div>
                      <div className="metric-summary-db">
                        <span className={`badge badge-${readLeader.dbType}`}>{readLeader.dbType}</span>
                        <span>{readLeader.connectionName}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>N/A</div>
                  )}
                </div>
              </div>

              {/* Graphical Charts View */}
              <DashboardCharts results={benchmarkResults} />

              {/* Raw Comparison Table */}
              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <div className="section-title">
                  <Terminal size={18} style={{ color: 'var(--primary)' }} />
                  Detailed Metrics Comparison
                </div>

                <div className="results-table-container">
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>Database</th>
                        <th>Status</th>
                        <th>Connect (ms)</th>
                        <th>Schema (ms)</th>
                        <th>Inserts (ms)</th>
                        <th>Insert Rate (rows/s)</th>
                        <th>Avg Read (ms)</th>
                        <th>Join Query (ms)</th>
                        <th>Agg Query (ms)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {benchmarkResults.map((r, i) => (
                        <tr key={i}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 700 }}>{r.connectionName}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.dbType}</span>
                            </div>
                          </td>
                          <td>
                            {r.success ? (
                              <span className="text-success" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Check size={14} /> OK
                              </span>
                            ) : (
                              <span className="text-error" title={r.error}>
                                Error
                              </span>
                            )}
                          </td>
                          <td>{r.success && r.metrics ? `${r.metrics.connectionTimeMs} ms` : '-'}</td>
                          <td>{r.success && r.metrics ? `${r.metrics.schemaCreationTimeMs} ms` : '-'}</td>
                          <td>{r.success && r.metrics ? `${r.metrics.insertionTimeMs} ms` : '-'}</td>
                          <td className="text-success" style={{ fontWeight: 700 }}>
                            {r.success && r.metrics ? `${r.metrics.insertionRate.toLocaleString()} rows/s` : '-'}
                          </td>
                          <td>{r.success && r.metrics ? `${r.metrics.readTimeMs} ms` : '-'}</td>
                          <td>{r.success && r.metrics ? `${r.metrics.joinTimeMs} ms` : '-'}</td>
                          <td>{r.success && r.metrics ? `${r.metrics.aggregateTimeMs} ms` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {benchmarkResults.some(r => !r.success) && (
                  <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--error)', fontWeight: 700 }}>Failure Details:</h4>
                    {benchmarkResults.filter(r => !r.success).map((r, idx) => (
                      <div key={idx} style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', fontSize: '0.8rem', color: '#fca5a5', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        <strong>{r.connectionName}:</strong> {r.error}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {!runningBenchmark && benchmarkResults.length === 0 && (
            <div className="glass-panel empty-state">
              <Database className="empty-state-icon" />
              <div className="empty-state-title">No comparison data available</div>
              <p style={{ fontSize: '0.85rem', maxWidth: '400px' }}>
                Add your database connection details on the left, check your query configurations, and click 'Run Comparison' to start benchmarking.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
