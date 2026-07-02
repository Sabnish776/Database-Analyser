package com.app.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ImportMetrics {
    private int tablesImported;
    private long totalRowsLoaded;
    private double totalImportTimmeMs;
    private double averageTableImportTimeMs;
    private double csvImportRate; // rows per sec
}
