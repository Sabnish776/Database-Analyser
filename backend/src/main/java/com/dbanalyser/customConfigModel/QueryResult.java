package com.dbanalyser.customConfigModel;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class QueryResult {
    private String queryName;
    private String category;
    private double executionTimeMs;
    private boolean success;
    private String errorMessage;
}