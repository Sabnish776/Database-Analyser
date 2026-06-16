package com.dbanalyser.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BenchmarkResult {
    private String connectionName;
    private String dbType;
    private boolean success;
    private MetricResult metrics;
    private String error;
}
