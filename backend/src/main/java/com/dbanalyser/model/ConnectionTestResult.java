package com.dbanalyser.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ConnectionTestResult {
    private String connectionName;
    private boolean success;
    private double connectionTimeMs;
    private String error;
}
