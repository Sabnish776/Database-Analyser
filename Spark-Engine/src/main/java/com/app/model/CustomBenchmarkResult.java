package com.app.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CustomBenchmarkResult {
    private String connectionName;
    private String dbType;
    private boolean success;
    private ImportMetrics importMetrics;
    private List<CsvImportResult> csvImportResults;
    private List<TableStatistics> tableStatistics;
    private List<QueryResult> queryResults;
    private String error;
}
