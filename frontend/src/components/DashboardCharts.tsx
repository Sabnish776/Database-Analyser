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

interface DashboardChartsProps {
  results: BenchmarkResult[];
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ results }) => {
  const successfulResults = results.filter((r) => r.success && r.metrics);

  if (successfulResults.length === 0) {
    return null;
  }

  // Map data for Recharts
  const data = successfulResults.map((r) => ({
    name: r.connectionName,
    dbType: r.dbType,
    'Connection (ms)': r.metrics?.connectionTimeMs || 0,
    'Schema Creation (ms)': r.metrics?.schemaCreationTimeMs || 0,
    'Insertion Rate (rows/s)': r.metrics?.insertionRate || 0,
    'Simple Read (ms)': r.metrics?.readTimeMs || 0,
    'Join Query (ms)': r.metrics?.joinTimeMs || 0,
    'Aggregate Query (ms)': r.metrics?.aggregateTimeMs || 0,
  }));

  // Custom tooltips for nice dark-theme design matching index.css
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
            <p key={idx} style={{ margin: 0, fontSize: '0.8rem', color: p.color || '#fff' }}>
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
      {/* Chart 1: Connection & Schema Creation Latency */}
      <div className="chart-card glass-panel">
        <div className="chart-card-title">
          <span>Connection & Schema Latency</span>
          <span className="chart-card-desc">Lower is better (ms)</span>
        </div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorConn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorSchema" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
              <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip unit="ms" />} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar name="Connection" dataKey="Connection (ms)" fill="url(#colorConn)" radius={[4, 4, 0, 0]} />
              <Bar name="Schema Creation" dataKey="Schema Creation (ms)" fill="url(#colorSchema)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Write Throughput (Insertion Rate) */}
      <div className="chart-card glass-panel">
        <div className="chart-card-title">
          <span>Write Throughput</span>
          <span className="chart-card-desc">Higher is better (rows/s)</span>
        </div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorInsert" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
              <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip unit="rows/s" />} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar name="Insertion Rate" dataKey="Insertion Rate (rows/s)" fill="url(#colorInsert)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: Query Latencies (Reads, Joins, Aggregates) */}
      <div className="chart-card glass-panel" style={{ gridColumn: 'span 1' }}>
        <div className="chart-card-title">
          <span>Read & Query Latency</span>
          <span className="chart-card-desc">Lower is better (ms)</span>
        </div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
              <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip unit="ms" />} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar name="Simple Read" dataKey="Simple Read (ms)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar name="Join Query" dataKey="Join Query (ms)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar name="Aggregate Query" dataKey="Aggregate Query (ms)" fill="#ec4899" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
