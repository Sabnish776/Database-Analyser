package com.dbanalyser.model;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class BenchmarkResult {
    private String connectionName;
    private String dbType;
    private boolean success;
    private MetricResult metrics;
    List<TableStatistics> tableStatisticsList ;
    private String error;
}
