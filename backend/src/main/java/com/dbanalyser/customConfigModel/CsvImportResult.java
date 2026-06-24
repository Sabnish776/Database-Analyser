package com.dbanalyser.customConfigModel;


import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CsvImportResult {
    private String tableName;
    private String csvFileName;
    private long rowsLoaded;
    private double loadTimeMs;
    private boolean success;
    private String errorMessage;
}
