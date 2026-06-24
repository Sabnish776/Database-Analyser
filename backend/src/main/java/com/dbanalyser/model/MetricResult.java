package com.dbanalyser.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MetricResult {
    private double connectionTimeMs;
    private double schemaCreationTimeMs;
    private double totalSingleInsertTime;
    private double avgSingleInsertLatency; // ms per row
    private double singleInsertRate; // rows per second
    private double batchInsertionTimeMs;
    private double batchInsertionRate; // rows per second
    private double readTimeMs;
    private double joinTimeMs;
    private double aggregateTimeMs;
}
