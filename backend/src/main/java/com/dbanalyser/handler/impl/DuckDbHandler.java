package com.dbanalyser.handler.impl;

import com.dbanalyser.customConfigModel.CsvImportResult;
import com.dbanalyser.customConfigModel.Table;
import com.dbanalyser.handler.DatabaseHandler;
import com.dbanalyser.model.ConnectionDetail;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

@Slf4j
@Component
public class DuckDbHandler implements DatabaseHandler {
    @Override
    public String getDbType() {
        return "duckdb";
    }

    @Override
    public String getDriverClassName() {
        return "org.duckdb.DuckDBDriver";
    }

    @Override
    public boolean supportsTransactions() {
        return true;
    }

    @Override
    public CsvImportResult importCsv(Connection conn, ConnectionDetail detail, Table table, Path csvPath) throws SQLException {
        String filePath = csvPath.toAbsolutePath().toString();
        String sql = "COPY " + table.getTableName() + " FROM '" + filePath + "' (FORMAT CSV , HEADER)" ;
        CsvImportResult result ;
        try(Statement stmt = conn.createStatement()){
            long start = System.nanoTime() ;
            int rows = stmt.executeUpdate(sql) ;
            double time = (System.nanoTime() - start) / 1_000_000.0;
            result = CsvImportResult.builder()
                    .success(true)
                    .tableName(table.getTableName())
                    .csvFileName(table.getCsvFileName())
                    .rowsLoaded(rows)
                    .loadTimeMs(Math.round(time * 100.0) / 100.0).build() ;
        } catch (SQLException e) {
            throw new SQLException("Error importing CSV file " + table.getCsvFileName() + " into table " + table.getTableName() + ": " + e.getMessage(), e);
//            log.error(e.getMessage());
//            result = CsvImportResult.builder()
//                    .success(false)
//                    .tableName(table.getTableName())
//                    .csvFileName(table.getCsvFileName())
//                    .errorMessage(e.getMessage()).build() ;
        }
        return result;
    }

    @Override
    public void dropTable(Connection conn, String tableName) {
        String sql = "DROP TABLE IF EXISTS " + tableName ;
        try(Statement st = conn.createStatement()){
            st.execute(sql) ;
        }catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }
}
