package com.dbanalyser.customConfigModel;

import com.dbanalyser.model.TableStatistics;
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
    List<TableStatistics> tableStatistics ;
    List<QueryResult> queryResults ;
    private String error ;
}
