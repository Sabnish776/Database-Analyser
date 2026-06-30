package com.dbanalyser.handler.impl;

import com.dbanalyser.customConfigModel.CsvImportResult;
import com.dbanalyser.customConfigModel.Table;
import com.dbanalyser.handler.DatabaseHandler;
import com.dbanalyser.model.ConnectionDetail;
import com.dbanalyser.model.TableStatistics;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.sql.*;
import java.util.Arrays;

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
    public CsvImportResult importCsv(Connection conn, ConnectionDetail detail, Table table, Path csvPath)
            throws SQLException {
        String filePath = csvPath.toAbsolutePath().toString();
        String sql = "COPY " + table.getTableName() + " FROM '" + filePath + "' (FORMAT CSV , HEADER)";
        CsvImportResult result;
        try (Statement stmt = conn.createStatement()) {

            long start = System.nanoTime();
            int rows = stmt.executeUpdate(sql);
            double time = (System.nanoTime() - start) / 1_000_000.0;

            // flush data into memory
            stmt.execute("CHECKPOINT");

            result = CsvImportResult.builder()
                    .success(true)
                    .tableName(table.getTableName())
                    .csvFileName(table.getCsvFileName())
                    .rowsLoaded(rows)
                    .loadTimeMs(Math.round(time * 100.0) / 100.0).build();
        } catch (SQLException e) {
            log.error(e.getMessage());
            log.error(Arrays.toString(e.getStackTrace()));
            result = CsvImportResult.builder()
                    .success(false)
                    .tableName(table.getTableName())
                    .csvFileName(table.getCsvFileName())
                    .errorMessage(e.getMessage()).build();
        }
        return result;
    }

    @Override
    public void dropTable(Connection conn, String tableName) {
        String sql = "DROP TABLE IF EXISTS " + tableName;
        try (Statement st = conn.createStatement()) {
            st.execute(sql);
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public TableStatistics getTableStatistics(Connection conn, String database, String tableName) throws SQLException {
        TableStatistics tableStatistics = new TableStatistics() ;

        String countSql = "SELECT COUNT(*) FROM " + tableName ;
        long rowCount = 0 ;

        try(Statement st = conn.createStatement() ;
            ResultSet rs = st.executeQuery(countSql)){
            if(rs.next())
                rowCount = rs.getLong(1) ;
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }

        tableStatistics.setTableName(tableName);
        tableStatistics.setRowCount(rowCount);

        String sizeSql = "WITH block_info AS (" +
                "    SELECT block_size FROM pragma_database_size()" +
                "), " +
                "table_blocks AS (" +
                "    SELECT COUNT(DISTINCT block_id) AS num_blocks " +
                "    FROM pragma_storage_info(?) " +
                "    WHERE block_id IS NOT NULL" +
                ") " +
                "SELECT " +
                "    num_blocks * block_size AS size_bytes," +
                "    round((num_blocks * block_size) / 1024.0 / 1024.0 , 2) AS size_mb " +
                "FROM table_blocks, block_info" ;

        try(PreparedStatement ps = conn.prepareStatement(sizeSql)){
            ps.setString(1,tableName);
            try(ResultSet rs = ps.executeQuery()){
                if(rs.next()){
                    long sizeBytes = rs.getLong("size_bytes") ;
                    System.out.println(sizeBytes);
                    double sizeMb = rs.getDouble("size_mb") ;
                    System.out.println(sizeMb);
                    tableStatistics.setDataSizeBytes(sizeBytes);
                    tableStatistics.setTotalSizeBytes(sizeBytes);
                    tableStatistics.setTotalSizeMb(sizeMb);
                    tableStatistics.setBytesPerRow(rowCount == 0 ? 0 : (double) sizeBytes / rowCount); }

            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        return tableStatistics;
    }
}
