package com.dbanalyser.controller;

import com.dbanalyser.customConfigModel.Config;
import com.dbanalyser.customConfigModel.CustomBenchmarkResponse;
import com.dbanalyser.model.*;
import com.dbanalyser.service.BenchmarkService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
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

    @PostMapping("/run-custom-benchmark")
    public ResponseEntity<CustomBenchmarkResponse> runCustomBenchmark(
            @RequestParam MultipartFile configFile, @RequestParam List<MultipartFile> csvFiles , @RequestParam(defaultValue = "0") long thresholdRecords
            ) throws IOException {
        ObjectMapper mapper = new ObjectMapper() ;
        Config config = mapper.readValue(configFile.getInputStream(),Config.class) ;

        Map<String, Path> csvPaths = new HashMap<>();

        Path tempDir = Files.createTempDirectory("db-analyser-") ;
        System.out.println(tempDir);

        for(MultipartFile csv : csvFiles){
            Path csvPath = tempDir.resolve(csv.getOriginalFilename()) ;
            csv.transferTo(csvPath);
            System.out.println(csvPath);
            csvPaths.put(csv.getOriginalFilename(),csvPath) ;
        }
        try{
            benchmarkService.validateConfig(config,csvPaths) ;
        } catch (Exception e) {
            System.out.println(e.getMessage());
            throw new RuntimeException(e);
        }
        CustomBenchmarkResponse response = benchmarkService.runCustomBenchmark(config,csvPaths,thresholdRecords) ;
        return ResponseEntity.ok().body(response) ;
    }
}
