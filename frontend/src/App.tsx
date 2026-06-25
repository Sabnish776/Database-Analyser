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
  Upload,
  FileText,
  X,
  Eye,
} from 'lucide-react';
import { DashboardCharts } from './components/DashboardCharts';
import { CustomDashboardCharts } from './components/CustomDashboardCharts';

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
  totalSingleInsertTime: number;
  avgSingleInsertLatency: number;
  singleInsertRate: number;
  batchInsertionTimeMs: number;
  batchInsertionRate: number;
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

interface CustomImportMetrics {
  tablesImported: number;
  totalRowsLoaded: number;
  totalImportTimmeMs: number; // Matches Java model spelling
  averageTableImportTimeMs: number;
  csvImportRate: number;
}

interface CustomCsvImportResult {
  tableName: string;
  csvFileName: string;
  rowsLoaded: number;
  loadTimeMs: number;
  success: boolean;
  errorMessage: string | null;
}

interface CustomQueryResult {
  queryName: string;
  category: string;
  executionTimeMs: number;
  success: boolean;
  errorMessage: string | null;
}

interface CustomBenchmarkResult {
  connectionName: string;
  dbType: string;
  success: boolean;
  importMetrics?: CustomImportMetrics;
  csvImportResults?: CustomCsvImportResult[];
  queryResults?: CustomQueryResult[];
  error?: string | null;
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

  // Benchmark mode: 'standard' | 'custom'
  const [benchmarkMode, setBenchmarkMode] = useState<'standard' | 'custom'>('standard');

  // Custom Benchmarking states
  const [customConfigFile, setCustomConfigFile] = useState<File | null>(null);
  const [customCsvFiles, setCustomCsvFiles] = useState<File[]>([]);
  const [runningCustomBenchmark, setRunningCustomBenchmark] = useState<boolean>(false);
  const [customBenchmarkResults, setCustomBenchmarkResults] = useState<CustomBenchmarkResult[]>([]);
  const [customConfigText, setCustomConfigText] = useState<string>('');

  // Modal visibility states
  const [showDefaultQueriesModal, setShowDefaultQueriesModal] = useState<boolean>(false);
  const [showSchemaGuideModal, setShowSchemaGuideModal] = useState<boolean>(false);
  const [showUploadedConfigModal, setShowUploadedConfigModal] = useState<boolean>(false);

  // Read customConfigFile content locally on selection
  useEffect(() => {
    if (customConfigFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setCustomConfigText(e.target.result as string);
        }
      };
      reader.onerror = () => {
        showToast('Error reading custom config file', 'error');
      };
      reader.readAsText(customConfigFile);
    } else {
      setCustomConfigText('');
    }
  }, [customConfigFile]);
  
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

  const runCustomBenchmark = async () => {
    if (!customConfigFile) {
      showToast('Please upload a config.json file', 'error');
      return;
    }
    if (customCsvFiles.length === 0) {
      showToast('Please upload at least one CSV file', 'error');
      return;
    }

    setRunningCustomBenchmark(true);
    setCustomBenchmarkResults([]);
    setBenchmarkResults([]); // clear standard results to avoid layout clash

    try {
      const formData = new FormData();
      formData.append('configFile', customConfigFile);
      customCsvFiles.forEach(file => {
        formData.append('csvFiles', file);
      });

      const res = await fetch(`${API_BASE}/run-custom-benchmark`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setCustomBenchmarkResults(data.benchmarkResults || []);
        showToast('Custom benchmark completed successfully!', 'success');
      } else {
        const errorText = await res.text();
        showToast(`Custom benchmark failed: ${errorText || 'Server Error'}`, 'error');
      }
    } catch (err: any) {
      showToast(`Network error running custom benchmark: ${err.message}`, 'error');
    } finally {
      setRunningCustomBenchmark(false);
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
  const batchWriteLeader = getLeader('batchInsertionRate', false);
  const singleWriteLeader = getLeader('avgSingleInsertLatency', true);
  const readLeader = getLeader('readTimeMs', true);

  const getCustomLeader = (metric: 'totalImportTimmeMs' | 'csvImportRate' | 'averageTableImportTimeMs' | 'avgQueryTime', lowerIsBetter = true) => {
    const valid = customBenchmarkResults.filter(r => r.success && r.importMetrics);
    if (valid.length === 0) return null;

    return valid.reduce((best, curr) => {
      let valBest = 0;
      let valCurr = 0;

      if (metric === 'avgQueryTime') {
        const bestQueries = best.queryResults?.filter(q => q.success) || [];
        const currQueries = curr.queryResults?.filter(q => q.success) || [];
        
        const bestSum = bestQueries.reduce((sum, q) => sum + q.executionTimeMs, 0);
        valBest = bestQueries.length > 0 ? bestSum / bestQueries.length : Infinity;
        
        const currSum = currQueries.reduce((sum, q) => sum + q.executionTimeMs, 0);
        valCurr = currQueries.length > 0 ? currSum / currQueries.length : Infinity;
      } else {
        valBest = best.importMetrics![metric];
        valCurr = curr.importMetrics![metric];
      }

      if (lowerIsBetter) {
        return valCurr < valBest ? curr : best;
      } else {
        return valCurr > valBest ? curr : best;
      }
    });
  };

  const customConnLeader = getCustomLeader('totalImportTimmeMs', true);
  const customRateLeader = getCustomLeader('csvImportRate', false);
  const customAvgTableLeader = getCustomLeader('averageTableImportTimeMs', true);
  const customQueryLeader = getCustomLeader('avgQueryTime', true);

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
          <p>Dynamically benchmark and analyze query throughput and connection latencies across MySQL, PostgreSQL, MariaDB, OracleSql, and Clickhouse</p>
        </div>
        <div className="mode-selector" style={{ display: 'flex' }}>
          <button
            className={`btn ${benchmarkMode === 'standard' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '6px 0 0 6px', borderRight: 'none' }}
            onClick={() => setBenchmarkMode('standard')}
          >
            Standard Mode
          </button>
          <button
            className={`btn ${benchmarkMode === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '0 6px 6px 0' }}
            onClick={() => setBenchmarkMode('custom')}
          >
            Custom Config Mode
          </button>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="dashboard-grid">
        {benchmarkMode === 'standard' ? (
          <>
            {/* Left Column: Target Connections */}
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
            </div>

            {/* Right Column: Test Options & Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="glass-panel">
                <div className="section-title">
                  <Terminal size={18} style={{ color: 'var(--accent)' }} />
                  Test Options & Execution
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
                    Rows inserted for each table in schema.
                  </span>
                </div>

                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                    onClick={() => setShowDefaultQueriesModal(true)}
                  >
                    <FileText size={16} />
                    View Default Config
                  </button>
                </div>

                <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  <div className="run-bar" style={{ margin: 0, padding: '0.75rem 1rem', border: 'none', background: 'rgba(255,255,255,0.02)', flexDirection: 'column', gap: '1rem', alignItems: 'stretch' }}>
                    <div className="run-stats-info" style={{ justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span>Databases: <strong>{connections.length}</strong></span>
                      <span>Workload: <strong>Standard Baseline</strong></span>
                      <span>Batch Insert: <strong>{insertCount} rows</strong></span>
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'center', display: 'flex', gap: '0.5rem' }}
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
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Left Column: Custom Uploads */}
            <div className="connections-section">
              {/* Custom Files Upload Panel */}
              <div className="glass-panel">
                <div className="section-title">
                  <Upload size={18} style={{ color: 'var(--primary)' }} />
                  Custom Benchmark Files
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={14} />
                      Configuration JSON File (config.json)
                    </label>
                    <div className="file-upload-zone">
                      <input
                        type="file"
                        accept=".json"
                        id="config-file-input"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setCustomConfigFile(e.target.files[0]);
                          }
                        }}
                      />
                      <label htmlFor="config-file-input" className="file-upload-label">
                        <Upload size={20} className="upload-icon" />
                        <span>
                          {customConfigFile ? customConfigFile.name : 'Select config.json'}
                        </span>
                        {customConfigFile && (
                          <span className="file-size">
                            ({(customConfigFile.size / 1024).toFixed(2)} KB)
                          </span>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Database size={14} />
                      CSV Data Files (*.csv)
                    </label>
                    <div className="file-upload-zone">
                      <input
                        type="file"
                        accept=".csv"
                        multiple
                        id="csv-files-input"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files) {
                            setCustomCsvFiles(Array.from(e.target.files));
                          }
                        }}
                      />
                      <label htmlFor="csv-files-input" className="file-upload-label">
                        <Upload size={20} className="upload-icon" />
                        <span>
                          {customCsvFiles.length > 0
                            ? `${customCsvFiles.length} CSV file(s) selected`
                            : 'Select multiple CSVs'}
                        </span>
                      </label>
                    </div>

                    {/* Display selected CSVs */}
                    {customCsvFiles.length > 0 && (
                      <div className="csv-files-list">
                        {customCsvFiles.map((file, idx) => (
                          <div key={idx} className="csv-file-item">
                            <Check size={12} className="text-success" />
                            <span className="csv-file-name">{file.name}</span>
                            <span className="csv-file-size">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Custom Options & Execution */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="glass-panel">
                <div className="section-title">
                  <Terminal size={18} style={{ color: 'var(--accent)' }} />
                  Custom Options & Execution
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                    onClick={() => setShowSchemaGuideModal(true)}
                  >
                    <FileText size={16} />
                    View Config Schema Guide
                  </button>

                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                    disabled={!customConfigFile}
                    onClick={() => setShowUploadedConfigModal(true)}
                    title={!customConfigFile ? "Upload a config.json file first" : ""}
                  >
                    <Eye size={16} />
                    View Uploaded Config
                  </button>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  <div className="run-bar" style={{ margin: 0, padding: '0.75rem 1rem', border: 'none', background: 'rgba(255,255,255,0.02)', flexDirection: 'column', gap: '1rem', alignItems: 'stretch' }}>
                    <div className="run-stats-info" style={{ justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span>Config JSON: <strong>{customConfigFile ? 'Loaded' : 'None'}</strong></span>
                      <span>CSV Files: <strong>{customCsvFiles.length} loaded</strong></span>
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'center', display: 'flex', gap: '0.5rem' }}
                      disabled={runningCustomBenchmark || !customConfigFile || customCsvFiles.length === 0}
                      onClick={runCustomBenchmark}
                    >
                      {runningCustomBenchmark ? (
                        <>
                          <RefreshCw size={16} className="spinner" />
                          Running Custom...
                        </>
                      ) : (
                        <>
                          <Play size={16} />
                          Run Custom Benchmark
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Results Section (Full width, placed below the setup section) */}
      <div className="results-section">
        {/* Standard Results Loading */}
        {runningBenchmark && (
          <div className="glass-panel loader-container">
            <div className="spinner" style={{ width: '40px', height: '40px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Measuring Database Engines...</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Connecting dynamically to JDBC endpoints, running schema changes, batches, and executing query categories.
            </p>
          </div>
        )}

        {/* Custom Results Loading */}
        {runningCustomBenchmark && (
          <div className="glass-panel loader-container">
            <div className="spinner" style={{ width: '40px', height: '40px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Running Custom Workloads...</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Executing schemas, loading CSVs, calculating loading throughput, and measuring custom query categories.
            </p>
          </div>
        )}

        {/* Standard Results Details */}
        {benchmarkMode === 'standard' && !runningBenchmark && benchmarkResults.length > 0 && (
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

              {/* Batch Insertion Throughput Leader */}
              <div className="metric-summary-card glass-panel">
                <div className="metric-summary-header">
                  <span>Highest Batch Write</span>
                  <Award size={16} style={{ color: 'var(--success)' }} />
                </div>
                {batchWriteLeader ? (
                  <>
                    <div className="metric-summary-value">{batchWriteLeader.metrics?.batchInsertionRate.toLocaleString()} rows/s</div>
                    <div className="metric-summary-db">
                      <span className={`badge badge-${batchWriteLeader.dbType}`}>{batchWriteLeader.dbType}</span>
                      <span>{batchWriteLeader.connectionName}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>N/A</div>
                )}
              </div>

              {/* Single Insertion Latency Leader */}
              <div className="metric-summary-card glass-panel">
                <div className="metric-summary-header">
                  <span>Fastest Single Insert</span>
                  <Award size={16} style={{ color: 'var(--accent)' }} />
                </div>
                {singleWriteLeader ? (
                  <>
                    <div className="metric-summary-value">{singleWriteLeader.metrics?.avgSingleInsertLatency} ms/row</div>
                    <div className="metric-summary-db">
                      <span className={`badge badge-${singleWriteLeader.dbType}`}>{singleWriteLeader.dbType}</span>
                      <span>{singleWriteLeader.connectionName}</span>
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
                      <th>Single Inserts (ms)</th>
                      <th>Avg Single (ms/row)</th>
                      <th>Single Rate (rows/s)</th>
                      <th>Batch Inserts (ms)</th>
                      <th>Batch Rate (rows/s)</th>
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
                            <span className="text-success" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
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
                        <td>{r.success && r.metrics ? `${r.metrics.totalSingleInsertTime} ms` : '-'}</td>
                        <td>{r.success && r.metrics ? `${r.metrics.avgSingleInsertLatency} ms` : '-'}</td>
                        <td className="text-success">{r.success && r.metrics ? `${r.metrics.singleInsertRate.toLocaleString()} rows/s` : '-'}</td>
                        <td>{r.success && r.metrics ? `${r.metrics.batchInsertionTimeMs} ms` : '-'}</td>
                        <td className="text-success" style={{ fontWeight: 700 }}>
                          {r.success && r.metrics ? `${r.metrics.batchInsertionRate.toLocaleString()} rows/s` : '-'}
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

        {/* Custom Results Details */}
        {benchmarkMode === 'custom' && !runningCustomBenchmark && customBenchmarkResults.length > 0 && (
          <>
            {/* Custom Leader Metrics Cards */}
            <div className="metrics-summary-grid">
              
              {/* Fastest CSV Import */}
              <div className="metric-summary-card glass-panel">
                <div className="metric-summary-header">
                  <span>Fastest CSV Import</span>
                  <Award size={16} style={{ color: 'var(--primary)' }} />
                </div>
                {customConnLeader ? (
                  <>
                    <div className="metric-summary-value">
                      {customConnLeader.importMetrics?.totalImportTimmeMs} ms
                    </div>
                    <div className="metric-summary-db">
                      <span className={`badge badge-${customConnLeader.dbType}`}>{customConnLeader.dbType}</span>
                      <span>{customConnLeader.connectionName}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>N/A</div>
                )}
              </div>

              {/* Highest CSV Import Throughput */}
              <div className="metric-summary-card glass-panel">
                <div className="metric-summary-header">
                  <span>Highest Import Rate</span>
                  <Award size={16} style={{ color: 'var(--success)' }} />
                </div>
                {customRateLeader ? (
                  <>
                    <div className="metric-summary-value">
                      {customRateLeader.importMetrics?.csvImportRate.toLocaleString()} rows/s
                    </div>
                    <div className="metric-summary-db">
                      <span className={`badge badge-${customRateLeader.dbType}`}>{customRateLeader.dbType}</span>
                      <span>{customRateLeader.connectionName}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>N/A</div>
                )}
              </div>

              {/* Fastest Average Table Load */}
              <div className="metric-summary-card glass-panel">
                <div className="metric-summary-header">
                  <span>Avg Table Import</span>
                  <Award size={16} style={{ color: 'var(--accent)' }} />
                </div>
                {customAvgTableLeader ? (
                  <>
                    <div className="metric-summary-value">
                      {customAvgTableLeader.importMetrics?.averageTableImportTimeMs} ms
                    </div>
                    <div className="metric-summary-db">
                      <span className={`badge badge-${customAvgTableLeader.dbType}`}>{customAvgTableLeader.dbType}</span>
                      <span>{customAvgTableLeader.connectionName}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>N/A</div>
                )}
              </div>

              {/* Fastest Custom Query Speed */}
              <div className="metric-summary-card glass-panel">
                <div className="metric-summary-header">
                  <span>Fastest Query Avg</span>
                  <Award size={16} style={{ color: 'var(--warning)' }} />
                </div>
                {customQueryLeader ? (
                  <>
                    <div className="metric-summary-value">
                      {(() => {
                        const queries = customQueryLeader.queryResults?.filter(q => q.success) || [];
                        const sum = queries.reduce((s, q) => s + q.executionTimeMs, 0);
                        return queries.length > 0 ? `${(sum / queries.length).toFixed(2)} ms` : 'N/A';
                      })()}
                    </div>
                    <div className="metric-summary-db">
                      <span className={`badge badge-${customQueryLeader.dbType}`}>{customQueryLeader.dbType}</span>
                      <span>{customQueryLeader.connectionName}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>N/A</div>
                )}
              </div>
            </div>

            {/* Custom Graphical Charts View */}
            <CustomDashboardCharts results={customBenchmarkResults} />

            {/* Custom Comparison Table */}
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div className="section-title">
                <Terminal size={18} style={{ color: 'var(--primary)' }} />
                Detailed Custom Metrics Comparison
              </div>

              <div className="results-table-container">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Metric / Query / Table</th>
                      <th>Category</th>
                      {customBenchmarkResults.map((r, idx) => (
                        <th key={idx}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700 }}>{r.connectionName}</span>
                            <span className={`badge badge-${r.dbType}`} style={{ marginTop: '0.25rem' }}>{r.dbType}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Header Row: Import Metrics */}
                    <tr style={{ background: 'rgba(255,255,255,0.02)', fontWeight: 'bold' }}>
                      <td style={{ textAlign: 'left', color: 'var(--primary)' }} colSpan={2 + customBenchmarkResults.length}>
                        CSV IMPORT OVERALL METRICS
                      </td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: 'left' }}>Total Rows Loaded</td>
                      <td>Import</td>
                      {customBenchmarkResults.map((r, idx) => (
                        <td key={idx}>{r.success && r.importMetrics ? r.importMetrics.totalRowsLoaded.toLocaleString() : '-'}</td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ textAlign: 'left' }}>Total Import Time (ms)</td>
                      <td>Import</td>
                      {customBenchmarkResults.map((r, idx) => (
                        <td key={idx}>{r.success && r.importMetrics ? `${r.importMetrics.totalImportTimmeMs} ms` : '-'}</td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ textAlign: 'left' }}>Average Table Import (ms)</td>
                      <td>Import</td>
                      {customBenchmarkResults.map((r, idx) => (
                        <td key={idx}>{r.success && r.importMetrics ? `${r.importMetrics.averageTableImportTimeMs} ms` : '-'}</td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ textAlign: 'left' }}>CSV Import Rate (rows/s)</td>
                      <td>Import</td>
                      {customBenchmarkResults.map((r, idx) => (
                        <td key={idx} className="text-success" style={{ fontWeight: 700 }}>
                          {r.success && r.importMetrics ? `${r.importMetrics.csvImportRate.toLocaleString()} rows/s` : '-'}
                        </td>
                      ))}
                    </tr>

                    {/* Header Row: Table loading times */}
                    {Array.from(new Set(customBenchmarkResults.flatMap(r => (r.csvImportResults || []).map(t => t.tableName)))).length > 0 && (
                      <>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', fontWeight: 'bold' }}>
                          <td style={{ textAlign: 'left', color: 'var(--accent)' }} colSpan={2 + customBenchmarkResults.length}>
                            CSV TABLES LOAD TIME (ms)
                          </td>
                        </tr>
                        {Array.from(new Set(customBenchmarkResults.flatMap(r => (r.csvImportResults || []).map(t => t.tableName)))).map((tableName, tIdx) => (
                          <tr key={`table-${tIdx}`}>
                            <td style={{ textAlign: 'left' }}>{tableName}</td>
                            <td>Table Load</td>
                            {customBenchmarkResults.map((r, idx) => {
                              const tRes = (r.csvImportResults || []).find(t => t.tableName === tableName);
                              if (!tRes) return <td key={idx}>-</td>;
                              return (
                                <td key={idx}>
                                  {tRes.success ? (
                                    <span>{tRes.loadTimeMs} ms <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({tRes.rowsLoaded.toLocaleString()} rows)</span></span>
                                  ) : (
                                    <span className="text-error" title={tRes.errorMessage || 'Unknown Error'}>Error</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </>
                    )}

                    {/* Header Row: Query execution times */}
                    {Array.from(new Set(customBenchmarkResults.flatMap(r => (r.queryResults || []).map(q => q.queryName)))).length > 0 && (
                      <>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', fontWeight: 'bold' }}>
                          <td style={{ textAlign: 'left', color: 'var(--warning)' }} colSpan={2 + customBenchmarkResults.length}>
                            CUSTOM QUERY EXECUTION TIME (ms)
                          </td>
                        </tr>
                        {Array.from(new Set(customBenchmarkResults.flatMap(r => (r.queryResults || []).map(q => q.queryName)))).map((queryName, qIdx) => {
                          const category = customBenchmarkResults.flatMap(r => r.queryResults || []).find(q => q.queryName === queryName)?.category || 'QUERY';
                          return (
                            <tr key={`query-${qIdx}`}>
                              <td style={{ textAlign: 'left' }}>{queryName}</td>
                              <td><span className="badge badge-secondary">{category}</span></td>
                              {customBenchmarkResults.map((r, idx) => {
                                const qRes = (r.queryResults || []).find(q => q.queryName === queryName);
                                if (!qRes) return <td key={idx}>-</td>;
                                return (
                                  <td key={idx}>
                                    {qRes.success ? (
                                      <span style={{ fontWeight: 700 }}>{qRes.executionTimeMs} ms</span>
                                    ) : (
                                      <span className="text-error" title={qRes.errorMessage || 'Unknown Error'}>Error</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {customBenchmarkResults.some(r => !r.success || r.error) && (
                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--error)', fontWeight: 700 }}>Failure Details:</h4>
                  {customBenchmarkResults.filter(r => !r.success || r.error).map((r, idx) => (
                    <div key={idx} style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', fontSize: '0.8rem', color: '#fca5a5', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      <strong>{r.connectionName}:</strong> {r.error || 'Check table import or queries failure above.'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Standard Empty State */}
        {benchmarkMode === 'standard' && !runningBenchmark && benchmarkResults.length === 0 && (
          <div className="glass-panel empty-state">
            <Database className="empty-state-icon" />
            <div className="empty-state-title">No comparison data available</div>
            <p style={{ fontSize: '0.85rem', maxWidth: '400px' }}>
              Add your database connection details on the left, check your query configurations, and click 'Run Comparison' to start benchmarking.
            </p>
          </div>
        )}

        {/* Custom Empty State */}
        {benchmarkMode === 'custom' && !runningCustomBenchmark && customBenchmarkResults.length === 0 && (
          <div className="glass-panel empty-state">
            <Database className="empty-state-icon" />
            <div className="empty-state-title">No custom comparison data available</div>
            <p style={{ fontSize: '0.85rem', maxWidth: '400px' }}>
              Select your custom config.json and multiple CSV files on the left, then click 'Run Custom Benchmark' to start benchmarking.
            </p>
          </div>
        )}
      </div>

      {/* Connection Editor Modal Overlay */}
      {editingConn && (
        <div className="modal-overlay" onClick={() => setEditingConn(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Settings size={18} style={{ color: 'var(--secondary)' }} />
                {editingConn.id ? 'Edit Connection' : 'Add Connection'}
              </div>
              <button className="modal-close-btn" onClick={() => setEditingConn(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditingConn(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={addOrSaveConnection}>
                Save Connection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Default Queries Modal Overlay */}
      {showDefaultQueriesModal && (
        <div className="modal-overlay" onClick={() => setShowDefaultQueriesModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Settings size={18} style={{ color: 'var(--primary)' }} />
                Default Benchmarking Queries Configuration
              </div>
              <button className="modal-close-btn" onClick={() => setShowDefaultQueriesModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Standardized queries and schemas used to dynamically test insertion throughput and execution times. These queries are pre-optimized and mapped to the backend implementation.
              </p>
              <div className="json-editor-container" style={{ height: '360px' }}>
                <textarea
                  className="json-textarea"
                  style={{ height: '100%' }}
                  readOnly
                  value={defaultQueriesJson || '// Loading default configurations from server...'}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowDefaultQueriesModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uploaded Custom Config Modal Overlay */}
      {showUploadedConfigModal && (
        <div className="modal-overlay" onClick={() => setShowUploadedConfigModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Eye size={18} style={{ color: 'var(--primary)' }} />
                Uploaded Configuration JSON
              </div>
              <button className="modal-close-btn" onClick={() => setShowUploadedConfigModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Below is the content of the uploaded custom configuration file <code>{customConfigFile?.name}</code>.
              </p>
              <div className="json-editor-container" style={{ height: '360px' }}>
                <textarea
                  className="json-textarea"
                  style={{ height: '100%' }}
                  readOnly
                  value={customConfigText || '// Empty or unreadable file content.'}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowUploadedConfigModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Config Schema Guide Modal Overlay */}
      {showSchemaGuideModal && (
        <div className="modal-overlay" onClick={() => setShowSchemaGuideModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Terminal size={18} style={{ color: 'var(--accent)' }} />
                Custom Config Schema Guide
              </div>
              <button className="modal-close-btn" onClick={() => setShowSchemaGuideModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Your custom <code>config.json</code> should define the connections, table names mapping to the uploaded CSV files, and query categories to compare. Here is a template format:
              </p>
              <div className="json-editor-container" style={{ height: '360px' }}>
                <textarea
                  className="json-textarea"
                  style={{ height: '100%' }}
                  readOnly
                  value={`{
  "connectionDetails": [
    {
      "name": "mysql-local",
      "dbType": "mysql",
      "url": "jdbc:mysql://localhost:3306/db",
      "username": "root",
      "password": "pwd"
    }
  ],
  "tables": [
    {
      "tableName": "employee",
      "csvFileName": "employee.csv",
      "schemas": {
        "mysql": "CREATE TABLE employee (id INT PRIMARY KEY, name VARCHAR(50), salary DECIMAL(10,2))",
        "postgresql": "CREATE TABLE employee (id INT PRIMARY KEY, name VARCHAR(50), salary NUMERIC(10,2))"
      }
    }
  ],
  "queries": [
    {
      "name": "Select High Earners",
      "category": "SELECT",
      "queriesByDb": {
        "mysql": "SELECT * FROM employee WHERE salary > 50000",
        "postgresql": "SELECT * FROM employee WHERE salary > 50000"
      }
    }
  ]
}`}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowSchemaGuideModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
