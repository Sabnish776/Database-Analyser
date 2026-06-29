package com.dbanalyser.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TableStatistics {

    private String tableName;

    private long rowCount;

    private long dataSizeBytes;

    private long totalSizeBytes;

    private double bytesPerRow;
}
