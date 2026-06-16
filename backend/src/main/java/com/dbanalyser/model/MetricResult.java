package com.dbanalyser.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MetricResult {
    private double connectionTimeMs;
    private double schemaCreationTimeMs;
    private double insertionTimeMs;
    private double insertionRate; // rows per second
    private double readTimeMs;
    private double joinTimeMs;
    private double aggregateTimeMs;
}
