package com.dbanalyser.service;

import com.dbanalyser.customConfigModel.*;
import com.dbanalyser.handler.DatabaseHandler;
import com.dbanalyser.handler.DatabaseHandlerRegistry;
import com.dbanalyser.model.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.sql.*;
import java.sql.Date;
import java.util.*;

@Slf4j
@Service
public class BenchmarkService {

    @Autowired
    private DatabaseHandlerRegistry handlerRegistry;

    private Map<String, DbQueries> defaultQueries;

    @Autowired
    private CsvImportService csvImportService;

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
            log.error("Unsupported database type: {}", detail.getDbType());
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
            double totalSingleInsertTime = 0 ;
            double avgSingleInsertLatency = 0 ; // ms per row
            double singleInsertRate = 0 ; // rows per sec
            double batchInsertTimeMs = 0;
            double batchInsertRate = 0;
            double readTimeMs = 0;
            double joinTimeMs = 0;
            double aggregateTimeMs = 0;

            // 1. Measure Connection Time
            long start = System.nanoTime();
            try (Connection conn = DriverManager.getConnection(detail.getUrl(), detail.getUsername(), detail.getPassword())) {
                connTimeMs = (System.nanoTime() - start) / 1_000_000.0;

                // 2. Measure Schema Creation Time
                start = System.nanoTime();
                executeSchema(conn,queries.getSchema());
                schemaTimeMs = (System.nanoTime() - start) / 1_000_000.0;

                // Disable auto-commit for optimal batch insertion performance and accurate rate metrics
                if(handler.supportsTransactions())
                    conn.setAutoCommit(false);

                // single insert time
                start = System.nanoTime();
                try {
                    // Insert Users
                    try (PreparedStatement psUser = conn.prepareStatement(queries.getInsertUser())) {
                        for (int i = 0; i < insertCount; i++) {
                            psUser.setInt(1,i+1);
                            psUser.setString(2, "BenchUser_" + i+1);
                            psUser.setString(3, "user_" + (i+1) + "@benchmark.com");
                            psUser.executeUpdate() ;
                        }
                    }

                    // Insert Orders mapping to those users
                    try (PreparedStatement psOrder = conn.prepareStatement(queries.getInsertOrder())) {
                        for (int i = 0; i < insertCount; i++) {
                            psOrder.setInt(1, i+1);
                            psOrder.setInt(2, i+1);
                            psOrder.setBigDecimal(3, BigDecimal.valueOf(10.0 + i));
                            psOrder.setDate(4, new Date(System.currentTimeMillis()));
                            psOrder.executeUpdate() ;
                        }
                    }
                    int totalRowsInserted = insertCount*2 ;
                    totalSingleInsertTime =( System.nanoTime() - start ) / 1_000_000.0 ;
                    avgSingleInsertLatency = totalSingleInsertTime/ totalRowsInserted ;
                    singleInsertRate = totalRowsInserted / (totalSingleInsertTime/1000.0) ;

                    if(handler.supportsTransactions())
                        conn.commit();
                } catch (Exception e) {
                    if(handler.supportsTransactions())
                        conn.rollback();
                    throw e;
                } finally {
                    if(handler.supportsTransactions())
                        conn.setAutoCommit(true);
                }


                // reset schema for batch insert
                executeSchema(conn,queries.getSchema());

                // 3. Measure Insertion Time and Rate
                if(handler.supportsTransactions())
                    conn.setAutoCommit(false);
                start = System.nanoTime();
                try {
                    // Insert Users
                    try (PreparedStatement psUser = conn.prepareStatement(queries.getInsertUser())) {
                        for (int i = 0; i < insertCount; i++) {
                            psUser.setInt(1,i+1);
                            psUser.setString(2, "BenchUser_" + i+1);
                            psUser.setString(3, "user_" + (i+1) + "@benchmark.com");
                            psUser.addBatch();
                        }
                        psUser.executeBatch();
                    }

                    // Insert Orders mapping to those users
                    try (PreparedStatement psOrder = conn.prepareStatement(queries.getInsertOrder())) {
                        for (int i = 0; i < insertCount; i++) {
                            psOrder.setInt(1, i+1);
                            psOrder.setInt(2, i+1);
                            psOrder.setBigDecimal(3, BigDecimal.valueOf(10.0 + i));
                            psOrder.setDate(4, new Date(System.currentTimeMillis()));
                            psOrder.addBatch();
                        }
                        psOrder.executeBatch();
                    }
                    batchInsertTimeMs = (System.nanoTime() - start) / 1_000_000.0;
                    if(handler.supportsTransactions())
                        conn.commit();
                } catch (Exception e) {
                    if(handler.supportsTransactions())
                        conn.rollback();
                    throw e;
                } finally {
                    if(handler.supportsTransactions())
                        conn.setAutoCommit(true);
                }

                int totalRowsInserted = insertCount*2 ; // Users + Orders
                batchInsertRate = batchInsertTimeMs > 0 ? (totalRowsInserted / (batchInsertTimeMs / 1000.0)) : 0;

                // 4. Measure Read Metrics (Simple Read)
                int readRuns = 50 ;
                start = System.nanoTime();
                for(int i=0;i<readRuns;i++){
                    try(
                            Statement st = conn.createStatement();
                            ResultSet rs = st.executeQuery(queries.getRead())
                    ){
                        while(rs.next()){
                            // consume rows
                        }
                    }
                }
                readTimeMs = ((System.nanoTime() - start) / 1_000_000.0) / readRuns;

                // 5. Measure Join Metrics
                start = System.nanoTime();
                try (PreparedStatement psJoin = conn.prepareStatement(queries.getJoin())) {
                    psJoin.setBigDecimal(1, java.math.BigDecimal.valueOf(50.0));
                    try (ResultSet rs = psJoin.executeQuery()) {
                        while (rs.next()) {
                            rs.getString(1);
                        }
                    }
                }
                joinTimeMs = (System.nanoTime() - start) / 1_000_000.0;

                // 6. Measure Aggregate Metrics
                start = System.nanoTime();
                try (PreparedStatement psAggregate = conn.prepareStatement(queries.getAggregate())) {
                    psAggregate.setBigDecimal(1, java.math.BigDecimal.valueOf(10.0));
                    try (ResultSet rs = psAggregate.executeQuery()) {
                        while (rs.next()) {
                            rs.getString(1);
                        }
                    }
                }
                aggregateTimeMs = (System.nanoTime() - start) / 1_000_000.0;

                // reset -> cleans storage
                executeSchema(conn,queries.getSchema());
            }

            MetricResult metrics = MetricResult.builder()
                    .connectionTimeMs(Math.round(connTimeMs * 100.0) / 100.0)
                    .schemaCreationTimeMs(Math.round(schemaTimeMs * 100.0) / 100.0)
                    .totalSingleInsertTime(Math.round(totalSingleInsertTime * 100.0) / 100.0 )
                    .avgSingleInsertLatency(Math.round(avgSingleInsertLatency * 100.0) / 100.0)
                    .singleInsertRate(Math.round(singleInsertRate * 100.0) / 100.0)
                    .batchInsertionTimeMs(Math.round(batchInsertTimeMs * 100.0) / 100.0)
                    .batchInsertionRate(Math.round(batchInsertRate * 100.0) / 100.0)
                    .readTimeMs(Math.round(readTimeMs * 100.0) / 100.0)
                    .joinTimeMs(Math.round(joinTimeMs * 100.0) / 100.0)
                    .aggregateTimeMs(Math.round(aggregateTimeMs * 100.0) / 100.0)
                    .build();
            log.info("{} benchmarking finished",detail.getName()) ;
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

    public void executeSchema(Connection conn , List<String> schema) throws SQLException{
        try (Statement stmt = conn.createStatement()) {
            for (String ddl : schema) {
                if (ddl != null && !ddl.trim().isEmpty()) {
                    stmt.execute(ddl);
                }
            }
        }
    }
    public void validateConfig(Config config, Map<String, Path> csvPathMap) {
        for(Table table : config.getTables()){
            if(csvPathMap.get(table.getCsvFileName()) == null ){
                throw new RuntimeException(table.getCsvFileName() +" not uploaded") ;
            }
        }
    }

    public CustomBenchmarkResponse runCustomBenchmark(Config config, Map<String, Path> csvPaths) throws IOException {

        List<CustomBenchmarkResult> results = new ArrayList<>();


        for(ConnectionDetail detail : config.getConnectionDetails()){
            try{
                CustomBenchmarkResult result = runSingleCustomBenchmark(detail,config,csvPaths) ;
                results.add(result) ;
            }catch (Exception e) {
                log.error("Unexpected error benchmarking database: {}", detail.getName(), e);
                results.add(CustomBenchmarkResult.builder()
                        .connectionName(detail.getName())
                        .dbType(detail.getDbType())
                        .success(false)
                        .error(e.getMessage() != null ? e.getMessage() : e.toString())
                        .build()) ;
            }
        }
        return CustomBenchmarkResponse.builder()
                .benchmarkResults(results)
                .build() ;


    }
    public CustomBenchmarkResult runSingleCustomBenchmark(ConnectionDetail detail,Config config,Map<String, Path> csvPaths) throws SQLException {
        if (config.getQueries().isEmpty()) {
            return CustomBenchmarkResult.builder()
                    .connectionName(detail.getName())
                    .dbType(detail.getDbType())
                    .success(false)
                    .error("No queries configuration found for database type: " + detail.getDbType())
                    .build();
        }


        Optional<DatabaseHandler> handlerOpt = handlerRegistry.getHandler(detail.getDbType());
        if (handlerOpt.isEmpty()) {
            return CustomBenchmarkResult.builder()
                    .connectionName(detail.getName())
                    .dbType(detail.getDbType())
                    .success(false)
                    .error("Unsupported database type: " + detail.getDbType())
                    .build();
        }


        List<CsvImportResult> csvImportResults ;
        List<QueryResult> queryResults = new ArrayList<>() ;

        try{

            DatabaseHandler handler = handlerOpt.get();
            log.info("Loading driver for database type: {} with driver class: {}", detail.getDbType(), handler.getDriverClassName());
            handler.loadDriver();
            log.info("Driver loaded successfully. Attempting connection to: {}", detail.getUrl());
            
            try(Connection conn = DriverManager.getConnection(detail.getUrl(),detail.getUsername(),detail.getPassword())){

//                List<String> schemas = new ArrayList<>() ;
//                for(Table table : config.getTables()){
//                    handler.dropTable(conn,table.getTableName());
//                    String schema = table.getSchemas().get(detail.getDbType()) ;
//                    schemas.add(schema) ;
//                }
//                System.out.println(schemas);
//                executeSchema(conn,schemas);

                try{
                    csvImportResults = csvImportService.createAndImportCsv(conn,detail,handler,config.getTables(),csvPaths) ;
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }

                //query execution
                int readRuns = 50 ;
                long start =0;
                double time = 0 ;

                for(Query query : config.getQueries()){
                    QueryResult result ;
                    try(Statement st = conn.createStatement()){
                        String sql = query.getQueriesByDb().get(detail.getDbType()) ;
                        start = System.nanoTime() ;
                        for(int i=0;i<readRuns;i++){
                            st.execute(sql) ;
                        }
                        time = ((System.nanoTime() - start) / 1_000_000.0) /readRuns ;
                        result = QueryResult.builder()
                                .success(true)
                                .queryName(query.getName())
                                .category(query.getCategory())
                                .executionTimeMs(Math.round(time * 100.0) / 100.0).build() ;

                        log.info("{} executed : {} ->>> in {} ms", detail.getName() ,query.getCategory(), time);

                    } catch (Exception e) {
                        log.error(e.getMessage());
                        result = QueryResult.builder()
                                .success(false)
                                .queryName(query.getName())
                                .category(query.getCategory())
                                .errorMessage(e.getMessage()).build() ;
                    }
                    queryResults.add(result) ;

                }

            }



            return CustomBenchmarkResult.builder()
                    .connectionName(detail.getName())
                    .dbType(detail.getDbType())
                    .success(true)
                    .importMetrics(processImportMetric(csvImportResults))
                    .csvImportResults(csvImportResults)
                    .queryResults(queryResults).build();

        } catch (Exception e) {
            log.error("Error in runSingleCustomBenchmark for {}: {}", detail.getName(), e.getMessage(), e);
            return CustomBenchmarkResult.builder()
                    .connectionName(detail.getName())
                    .dbType(detail.getDbType())
                    .success(false)
                    .error(e.getMessage() != null ? e.getMessage() : e.toString())
                    .build() ;
        }
    }

    private ImportMetrics processImportMetric(List<CsvImportResult> csvImportResults){
        int tablesImported = 0;
        long totalRowsLoaded = 0 ;
        double totalImportTimeMs = 0;;
        double averageTableImportTimeMs = 0 ;
        double csvImportRate = 0 ; // rows per sec


        for(CsvImportResult result : csvImportResults){
            tablesImported++ ;
            totalRowsLoaded += result.getRowsLoaded() ;
            totalImportTimeMs += result.getLoadTimeMs() ;
        }
        averageTableImportTimeMs = tablesImported == 0 ? 0 : totalImportTimeMs / (double) tablesImported ;
        csvImportRate = totalImportTimeMs == 0 ? 0 : totalRowsLoaded / (totalImportTimeMs/1000.0) ;


        return ImportMetrics.builder()
                .tablesImported(tablesImported)
                .totalRowsLoaded(totalRowsLoaded)
                .totalImportTimmeMs(Math.round(totalImportTimeMs*100.0)/100.0)
                .averageTableImportTimeMs(Math.round(averageTableImportTimeMs*100.0)/100.0)
                .csvImportRate(Math.round(csvImportRate*100.0)/100.0).build() ;

    }

}
