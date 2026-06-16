package com.dbanalyser.model;

import java.util.List;
import java.util.Map;
import lombok.Data;

@Data
public class BenchmarkRequest {
    private List<ConnectionDetail> connections;
    private Map<String, DbQueries> customConfig; // Optional custom configuration
    private int insertCount = 1000; // Default number of rows to insert
}
