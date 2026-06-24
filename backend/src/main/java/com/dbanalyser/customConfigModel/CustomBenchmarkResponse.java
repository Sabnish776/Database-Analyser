package com.dbanalyser.customConfigModel;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CustomBenchmarkResponse {
    private List<CustomBenchmarkResult> benchmarkResults ;
}
