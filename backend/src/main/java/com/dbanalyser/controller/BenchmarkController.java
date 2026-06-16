package com.dbanalyser.controller;

import com.dbanalyser.model.*;
import com.dbanalyser.service.BenchmarkService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/benchmark")
@CrossOrigin(origins = "*")
public class BenchmarkController {

    @Autowired
    private BenchmarkService benchmarkService;

    @GetMapping("/default-config")
    public ResponseEntity<Map<String, DbQueries>> getDefaultConfig() {
        return ResponseEntity.ok(benchmarkService.getDefaultQueries());
    }

    @PostMapping("/test-connection")
    public ResponseEntity<ConnectionTestResult> testConnection(@RequestBody ConnectionDetail connectionDetail) {
        ConnectionTestResult result = benchmarkService.testConnection(connectionDetail);
        if (result.isSuccess()) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    @PostMapping("/run")
    public ResponseEntity<BenchmarkResponse> runBenchmark(@RequestBody BenchmarkRequest request) {
        if (request.getConnections() == null || request.getConnections().isEmpty()) {
            return ResponseEntity.badRequest().body(new BenchmarkResponse(java.util.Collections.emptyList()));
        }
        BenchmarkResponse response = benchmarkService.runBenchmark(request);
        return ResponseEntity.ok(response);
    }
}
