package com.app.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CsvImportResult {
    private String tableName;
    private String csvFileName;
    private long rowsLoaded;
    private double loadTimeMs;
    private boolean success;
    private String errorMessage;
}
