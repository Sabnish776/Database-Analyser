package com.app.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TableStatistics {
    private String tableName;
    private long rowCount;
    private long dataSizeBytes;
    private long totalSizeBytes;
    private double totalSizeMb;
    private double bytesPerRow;
}
