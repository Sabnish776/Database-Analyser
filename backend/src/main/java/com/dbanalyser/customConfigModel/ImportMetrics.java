package com.dbanalyser.customConfigModel;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportMetrics {
    private int tablesImported ;
    private long totalRowsLoaded ;
    private double totalImportTimmeMs ;;
    private double averageTableImportTimeMs ;
    private double csvImportRate ; // rows per sec
}
