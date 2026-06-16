package com.dbanalyser.service;

import com.dbanalyser.handler.DatabaseHandler;
import com.dbanalyser.handler.DatabaseHandlerRegistry;
import com.dbanalyser.model.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.math.BigDecimal;
import java.sql.*;
import java.sql.Date;
import java.util.*;

@Slf4j
@Service
public class BenchmarkService {

    @Autowired
    private DatabaseHandlerRegistry handlerRegistry;

    private Map<String, DbQueries> defaultQueries;

    @PostConstruct
    public void init() {
        try {
            ObjectMapper mapper = new ObjectMapper();
            InputStream is = getClass().getResourceAsStream("/benchmark-queries.json");
            if (is == null) {
                log.error("Default queries config file benchmark-queries.json not found in resources!");
                defaultQueries = new HashMap<>();
            } else {
                defaultQueries = mapper.readValue(is, new TypeReference<Map<String, DbQueries>>() {});
                log.info("Successfully loaded default benchmark queries configuration.");
            }
        } catch (Exception e) {
            log.error("Error loading default benchmark queries configuration", e);
            defaultQueries = new HashMap<>();
        }
    }

    public Map<String, DbQueries> getDefaultQueries() {
        return defaultQueries;
    }

    public ConnectionTestResult testConnection(ConnectionDetail detail) {
        Optional<DatabaseHandler> handlerOpt = handlerRegistry.getHandler(detail.getDbType());
        if (handlerOpt.isEmpty()) {
            return ConnectionTestResult.builder()
                    .connectionName(detail.getName())
                    .success(false)
                    .error("Unsupported database type: " + detail.getDbType())
                    .build();
        }

        long start = 0;
        try {
            DatabaseHandler handler = handlerOpt.get();
            handler.loadDriver();
            start = System.nanoTime();
            try (Connection conn = DriverManager.getConnection(detail.getUrl(), detail.getUsername(), detail.getPassword())) {
                double connTimeMs = (System.nanoTime() - start) / 1_000_000.0;
                return ConnectionTestResult.builder()
                        .connectionName(detail.getName())
                        .success(true)
                        .connectionTimeMs(Math.round(connTimeMs * 100.0) / 100.0)
                        .build();
            }
        } catch (Exception e) {
            log.error("Connection test failed for connection: {}", detail.getName(), e);
            return ConnectionTestResult.builder()
                    .connectionName(detail.getName())
                    .success(false)
                    .error(e.getMessage() != null ? e.getMessage() : e.toString())
                    .build();
        }
    }

    public BenchmarkResponse runBenchmark(BenchmarkRequest request) {
        List<BenchmarkResult> results = new ArrayList<>();
        Map<String, DbQueries> activeQueries = request.getCustomConfig() != null && !request.getCustomConfig().isEmpty()
                ? request.getCustomConfig()
                : defaultQueries;

        for (ConnectionDetail connDetail : request.getConnections()) {
            try {
                BenchmarkResult result = runSingleBenchmark(connDetail, activeQueries.get(connDetail.getDbType().toLowerCase()), request.getInsertCount());
                results.add(result);
            } catch (Exception e) {
                log.error("Unexpected error benchmarking database: {}", connDetail.getName(), e);
                results.add(BenchmarkResult.builder()
                        .connectionName(connDetail.getName())
                        .dbType(connDetail.getDbType())
                        .success(false)
                        .error(e.getMessage() != null ? e.getMessage() : e.toString())
                        .build());
            }
        }

        return new BenchmarkResponse(results);
    }

    private BenchmarkResult runSingleBenchmark(ConnectionDetail detail, DbQueries queries, int insertCount) {
        if (queries == null) {
            return BenchmarkResult.builder()
                    .connectionName(detail.getName())
                    .dbType(detail.getDbType())
                    .success(false)
                    .error("No queries configuration found for database type: " + detail.getDbType())
                    .build();
        }

        Optional<DatabaseHandler> handlerOpt = handlerRegistry.getHandler(detail.getDbType());
        if (handlerOpt.isEmpty()) {
            return BenchmarkResult.builder()
                    .connectionName(detail.getName())
                    .dbType(detail.getDbType())
                    .success(false)
                    .error("Unsupported database type: " + detail.getDbType())
                    .build();
        }

        try {
            DatabaseHandler handler = handlerOpt.get();
            handler.loadDriver();

            double connTimeMs;
            double schemaTimeMs = 0;
            double insertTimeMs = 0;
            double insertRate = 0;
            double readTimeMs = 0;
            double joinTimeMs = 0;
            double aggregateTimeMs = 0;

            // 1. Measure Connection Time
            long start = System.nanoTime();
            try (Connection conn = DriverManager.getConnection(detail.getUrl(), detail.getUsername(), detail.getPassword())) {
                connTimeMs = (System.nanoTime() - start) / 1_000_000.0;

                // 2. Measure Schema Creation Time
                start = System.nanoTime();
                try (Statement stmt = conn.createStatement()) {
                    for (String ddl : queries.getSchema()) {
                        if (ddl != null && !ddl.trim().isEmpty()) {
                            stmt.execute(ddl);
                        }
                    }
                }
                schemaTimeMs = (System.nanoTime() - start) / 1_000_000.0;

                // Disable auto-commit for optimal batch insertion performance and accurate rate metrics
                conn.setAutoCommit(false);

                // 3. Measure Insertion Time and Rate
                List<Integer> userIds = new ArrayList<>();
                start = System.nanoTime();
                try {
                    // Insert Users
                    try (PreparedStatement psUser = conn.prepareStatement(queries.getInsertUser(), Statement.RETURN_GENERATED_KEYS)) {
                        for (int i = 0; i < insertCount; i++) {
                            psUser.setString(1, "BenchUser_" + i);
                            psUser.setString(2, "user_" + i + "@benchmark.com");
                            psUser.addBatch();
                        }
                        psUser.executeBatch();

                        try (ResultSet rs = psUser.getGeneratedKeys()) {
                            while (rs.next()) {
                                userIds.add(rs.getInt(1));
                            }
                        }
                    }

                    // Insert Orders mapping to those users
                    try (PreparedStatement psOrder = conn.prepareStatement(queries.getInsertOrder())) {
                        for (int i = 0; i < userIds.size(); i++) {
                            psOrder.setInt(1, userIds.get(i));
                            psOrder.setBigDecimal(2, BigDecimal.valueOf(10.0 + i));
                            psOrder.setDate(3, new Date(System.currentTimeMillis()));
                            psOrder.addBatch();
                        }
                        psOrder.executeBatch();
                    }
                    insertTimeMs = (System.nanoTime() - start) / 1_000_000.0;
                    conn.commit();
                } catch (Exception e) {
                    conn.rollback();
                    throw e;
                } finally {
                    conn.setAutoCommit(true);
                }

                int totalRowsInserted = userIds.size() + userIds.size(); // Users + Orders
                insertRate = insertTimeMs > 0 ? (totalRowsInserted / (insertTimeMs / 1000.0)) : 0;

                // 4. Measure Read Metrics (Simple Read)
                int readRuns = Math.min(userIds.size(), 50);
                if (readRuns > 0) {
                    start = System.nanoTime();
                    try (PreparedStatement psRead = conn.prepareStatement(queries.getRead())) {
                        for (int i = 0; i < readRuns; i++) {
                            int randomId = userIds.get(i);
                            psRead.setInt(1, randomId);
                            try (ResultSet rs = psRead.executeQuery()) {
//                                if (rs.next()) {
//                                    // Read columns to verify query execution
//                                    rs.getString("name");
//                                }
                            }
                        }
                    }
                    readTimeMs = ((System.nanoTime() - start) / 1_000_000.0) / readRuns; // Average time per query
                }

                // 5. Measure Join Metrics
                start = System.nanoTime();
                try (PreparedStatement psJoin = conn.prepareStatement(queries.getJoin())) {
                    psJoin.setBigDecimal(1, java.math.BigDecimal.valueOf(50.0));
                    try (ResultSet rs = psJoin.executeQuery()) {
//                        while (rs.next()) {
//                            rs.getString(1);
//                        }
                    }
                }
                joinTimeMs = (System.nanoTime() - start) / 1_000_000.0;

                // 6. Measure Aggregate Metrics
                start = System.nanoTime();
                try (PreparedStatement psAggregate = conn.prepareStatement(queries.getAggregate())) {
                    psAggregate.setBigDecimal(1, java.math.BigDecimal.valueOf(10.0));
                    try (ResultSet rs = psAggregate.executeQuery()) {
//                        while (rs.next()) {
//                            rs.getString(1);
//                        }
                    }
                }
                aggregateTimeMs = (System.nanoTime() - start) / 1_000_000.0;
            }

            MetricResult metrics = MetricResult.builder()
                    .connectionTimeMs(Math.round(connTimeMs * 100.0) / 100.0)
                    .schemaCreationTimeMs(Math.round(schemaTimeMs * 100.0) / 100.0)
                    .insertionTimeMs(Math.round(insertTimeMs * 100.0) / 100.0)
                    .insertionRate(Math.round(insertRate * 100.0) / 100.0)
                    .readTimeMs(Math.round(readTimeMs * 100.0) / 100.0)
                    .joinTimeMs(Math.round(joinTimeMs * 100.0) / 100.0)
                    .aggregateTimeMs(Math.round(aggregateTimeMs * 100.0) / 100.0)
                    .build();

            return BenchmarkResult.builder()
                    .connectionName(detail.getName())
                    .dbType(detail.getDbType())
                    .success(true)
                    .metrics(metrics)
                    .build();

        } catch (Exception e) {
            log.error("Benchmark failed for connection: {}", detail.getName(), e);
            return BenchmarkResult.builder()
                    .connectionName(detail.getName())
                    .dbType(detail.getDbType())
                    .success(false)
                    .error(e.getMessage() != null ? e.getMessage() : e.toString())
                    .build();
        }
    }
}
