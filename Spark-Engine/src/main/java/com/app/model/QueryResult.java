package com.app.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class QueryResult {
    private String queryName;
    private String category;
    private double executionTimeMs;
    private boolean success;
    private String errorMessage;
}
