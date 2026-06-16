package com.dbanalyser.model;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BenchmarkResponse {
    private List<BenchmarkResult> results;
}
