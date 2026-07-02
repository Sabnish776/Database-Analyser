import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface CustomImportMetrics {
  tablesImported: number;
  totalRowsLoaded: number;
  totalImportTimmeMs: number;
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

interface CustomDashboardChartsProps {
  results: CustomBenchmarkResult[];
}

const DB_COLORS: { [key: string]: string } = {
  mysql: '#3b82f6', // Blue
  postgresql: '#8b5cf6', // Purple
  mariadb: '#06b6d4', // Cyan
  clickhouse: '#10b981', // Green
  oraclesql: '#f97316', // Orange
  spark: '#e25a24', // Spark Orange
  default: '#64748b', // Slate
};

export const CustomDashboardCharts: React.FC<CustomDashboardChartsProps> = ({ results }) => {
  const successfulResults = results.filter((r) => r.success && (r.importMetrics || r.dbType === 'spark'));

  if (successfulResults.length === 0) {
    return null;
  }

  const importResults = successfulResults.filter((r) => r.dbType !== 'spark');

  // Chart 1 & 2 Data: Overall Import rate and Total import time
  const overallData = importResults.map((r) => ({
    name: r.connectionName,
    dbType: r.dbType,
    'Import Rate (rows/s)': r.importMetrics?.csvImportRate || 0,
    'Total Import Time (ms)': r.importMetrics?.totalImportTimmeMs || 0,
    fill: DB_COLORS[r.dbType.toLowerCase()] || DB_COLORS.default,
  }));

  // Chart 3 Data: Grouped Table Loading Latency
  // Gather all unique table names
  const allTables = Array.from(
    new Set(
      importResults.flatMap((r) => (r.csvImportResults || []).map((t) => t.tableName))
    )
  );

  const tableData = allTables.map((tableName) => {
    const row: any = { name: tableName };
    importResults.forEach((r) => {
      const tableRes = (r.csvImportResults || []).find((t) => t.tableName === tableName);
      row[r.connectionName] = tableRes && tableRes.success ? tableRes.loadTimeMs : 0;
    });
    return row;
  });

  // Chart 4 Data: Grouped Query Execution Latency
  // Gather all unique query names
  const allQueries = Array.from(
    new Set(
      successfulResults.flatMap((r) => (r.queryResults || []).map((q) => q.queryName))
    )
  );

  const queryData = allQueries.map((queryName) => {
    const row: any = { name: queryName };
    successfulResults.forEach((r) => {
      const queryRes = (r.queryResults || []).find((q) => q.queryName === queryName);
      row[r.connectionName] = queryRes && queryRes.success ? queryRes.executionTimeMs : 0;
    });
    return row;
  });

  // Custom tooltips
  const CustomTooltip = ({ active, payload, label, unit = '' }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'rgba(13, 17, 28, 0.95)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)'
        }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.25rem', color: '#fff' }}>{label}</p>
          {payload.map((p: any, idx: number) => (
            <p key={idx} style={{ margin: 0, fontSize: '0.8rem', color: p.fill || p.color || '#fff' }}>
              {p.name}: <strong>{p.value.toLocaleString()} {unit}</strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="charts-grid">
      {/* Chart 1: CSV Import Rate */}
      <div className="chart-card glass-panel">
        <div className="chart-card-title">
          <span>CSV Import Throughput</span>
          <span className="chart-card-desc">Higher is better (rows/s)</span>
        </div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={overallData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
              <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip unit="rows/s" />} />
              <Bar name="CSV Import Rate" dataKey="Import Rate (rows/s)" radius={[4, 4, 0, 0]}>
                {overallData.map((entry, index) => (
                  <Bar key={`bar-${index}`} dataKey="Import Rate (rows/s)" fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Total Import Time */}
      <div className="chart-card glass-panel">
        <div className="chart-card-title">
          <span>Total CSV Import Time</span>
          <span className="chart-card-desc">Lower is better (ms)</span>
        </div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={overallData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
              <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip unit="ms" />} />
              <Bar name="Total Import Time" dataKey="Total Import Time (ms)" radius={[4, 4, 0, 0]}>
                {overallData.map((entry, index) => (
                  <Bar key={`bar-${index}`} dataKey="Total Import Time (ms)" fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: Table Loading Latencies */}
      <div className="chart-card glass-panel">
        <div className="chart-card-title">
          <span>Table Load Latency</span>
          <span className="chart-card-desc">Lower is better (ms)</span>
        </div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={tableData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
              <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip unit="ms" />} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              {successfulResults.map((r) => (
                <Bar
                  key={r.connectionName}
                  name={r.connectionName}
                  dataKey={r.connectionName}
                  fill={DB_COLORS[r.dbType.toLowerCase()] || DB_COLORS.default}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 4: Custom Query Latencies */}
      <div className="chart-card glass-panel">
        <div className="chart-card-title">
          <span>Custom Query Execution Speed</span>
          <span className="chart-card-desc">Lower is better (ms)</span>
        </div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={queryData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
              <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip unit="ms" />} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              {successfulResults.map((r) => (
                <Bar
                  key={r.connectionName}
                  name={r.connectionName}
                  dataKey={r.connectionName}
                  fill={DB_COLORS[r.dbType.toLowerCase()] || DB_COLORS.default}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
