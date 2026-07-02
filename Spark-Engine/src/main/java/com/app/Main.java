package com.app;

import com.app.model.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SparkSession;

import java.io.File;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        if (args.length < 4) {
            System.err.println("Usage: Main <configJsonPath> <tempDir> <outputPath> <thresholdRecords>");
            System.exit(1);
        }

        String configJsonPath = args[0];
        String tempDir = args[1];
        String outputPath = args[2];
        long thresholdRecords = Long.parseLong(args[3]);

        ObjectMapper mapper = new ObjectMapper();
        SparkSession spark = null;
        CustomBenchmarkResult result = null;

        try {
            // Load configuration
            Config config = mapper.readValue(new File(configJsonPath), Config.class);

            // Initialize Spark Session in local mode
            spark = SparkSession.builder()
                    .appName("SparkEngine")
                    .master("local[*]")
                    .getOrCreate();

            // Set log level to reduce noise
            spark.sparkContext().setLogLevel("ERROR");

            // Load CSVs into Spark DataFrames and register as temp views
            for (Table table : config.getTables()) {
                String csvFilePath = Paths.get(tempDir, table.getCsvFileName()).toString();
                Dataset<Row> original = spark.read()
                        .option("header", "true")
                        .option("inferSchema", "true")
                        .csv(csvFilePath);

                long originalRows = original.count();

                Dataset<Row> expanded = original;

                if (thresholdRecords > originalRows) {

                    int copies = (int) Math.ceil((double) thresholdRecords / originalRows);

                    for (int i = 1; i < copies; i++) {
                        expanded = expanded.union(original);
                    }

                    expanded = expanded.limit((int) thresholdRecords);
                }

                expanded.cache();
                long count = expanded.count();          // materialize cache
                System.out.println("Expanded count "+count);
                expanded.createOrReplaceTempView(table.getTableName());

            }

            int readRuns = (thresholdRecords == 0) ? 50 : 5;
            List<QueryResult> queryResults = new ArrayList<>();

            // Execute Spark SQL queries
            for (Query query : config.getQueries()) {
                String sql = query.getQueriesByDb() != null ? query.getQueriesByDb().get("spark") : null;
                if (sql == null || sql.trim().isEmpty()) {
                    System.out.println("Skipping query '" + query.getName() + "': No Spark SQL query defined.");
                    continue;
                }

                System.out.println("Executing Spark SQL query: " + query.getName());
                long start = 0;
                double time = 0;
                boolean success = true;
                String errorMessage = null;

                try {
                    spark.sql(sql).count(); // warmup
                    start = System.nanoTime();
                    for (int i = 0; i < readRuns; i++) {
                        spark.sql(sql).count(); // Action to force execution
                    }
                    time = ((System.nanoTime() - start) / 1_000_000.0) / readRuns;
                } catch (Exception e) {
                    success = false;
                    errorMessage = e.getMessage() != null ? e.getMessage() : e.toString();
                    System.err.println("Error executing query '" + query.getName() + "': " + errorMessage);
                }

                queryResults.add(QueryResult.builder()
                        .queryName(query.getName())
                        .category(query.getCategory())
                        .executionTimeMs(success ? Math.round(time * 100.0) / 100.0 : 0.0)
                        .success(success)
                        .errorMessage(errorMessage)
                        .build());
            }

            result = CustomBenchmarkResult.builder()
                    .connectionName("SparkSQL")
                    .dbType("spark")
                    .success(true)
                    .importMetrics(null)
                    .csvImportResults(null)
                    .tableStatistics(null)
                    .queryResults(queryResults)
                    .error(null)
                    .build();

        } catch (Exception e) {
            System.err.println("Exception in Spark Benchmarker execution: " + e.getMessage());
            e.printStackTrace();
            result = CustomBenchmarkResult.builder()
                    .connectionName("SparkSQL")
                    .dbType("spark")
                    .success(false)
                    .error(e.getMessage() != null ? e.getMessage() : e.toString())
                    .build();
        } finally {
            if (spark != null) {
                spark.stop();
            }
        }

        // Write output JSON
        try {
            mapper.writeValue(new File(outputPath), result);
            System.out.println("Successfully wrote Spark benchmark results to: " + outputPath);
        } catch (Exception e) {
            System.err.println("Failed to write Spark benchmark output: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
}