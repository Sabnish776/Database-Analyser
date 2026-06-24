package com.dbanalyser.customConfigModel;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ImportMetrics {
    private int tablesImported ;
    private long totalRowsLoaded ;
    private double totalImportTimmeMs ;;
    private double averageTableImportTimeMs ;
    private double csvImportRate ; // rows per sec
}
