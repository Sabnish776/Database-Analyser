package com.dbanalyser.customConfigModel;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CustomBenchmarkResult {
    private String connectionName;
    private String dbType;
    private boolean success;
    private ImportMetrics importMetrics ;
    List<CsvImportResult> csvImportResults ;
    List<QueryResult> queryResults ;
    private String error ;
}
