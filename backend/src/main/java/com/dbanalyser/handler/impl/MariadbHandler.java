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

@Slf4j
@Component
public class MariadbHandler implements DatabaseHandler {

    @Override
    public String getDbType() {
        return "mariadb";
    }

    @Override
    public String getDriverClassName() {
        return "org.mariadb.jdbc.Driver";
    }

    @Override
    public boolean supportsTransactions() {
        return true;
    }

    @Override
    public CsvImportResult importCsv(Connection conn,
                                           ConnectionDetail detail, Table table,
                                           Path csvPath) {

        String filePath =
                csvPath.toAbsolutePath().toString();

        String sql =
                "LOAD DATA LOCAL INFILE '" + filePath + "' " +
                        "INTO TABLE " + table.getTableName() + " " +
                        "FIELDS TERMINATED BY ',' " +
                        "LINES TERMINATED BY '\\n' " +
                        "IGNORE 1 ROWS";
        CsvImportResult result ;
        try (Statement stmt = conn.createStatement()) {

            long start = System.nanoTime() ;
            int rows = stmt.executeUpdate(sql);
            double time = (System.nanoTime() - start) / 1_000_000.0;
            result = CsvImportResult.builder()
                    .success(true)
                    .tableName(table.getTableName())
                    .csvFileName(table.getCsvFileName())
                    .rowsLoaded(rows)
                    .loadTimeMs(Math.round(time * 100.0) / 100.0).build() ;

        } catch (Exception e) {

            log.error(e.getMessage());
            result = CsvImportResult.builder()
                    .success(false)
                    .tableName(table.getTableName())
                    .csvFileName(table.getCsvFileName())
                    .errorMessage(e.getMessage()).build() ;
        }
        return result ;
    }
    @Override
    public void dropTable(Connection conn , String tableName) {
        String sql = "DROP TABLE IF EXISTS " + tableName ;
        try(Statement st = conn.createStatement()){
            st.execute(sql) ;
        }catch (SQLException e) {
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
        String sizeSql = """
            SELECT
                DATA_LENGTH,
                INDEX_LENGTH,
                DATA_LENGTH + INDEX_LENGTH AS TOTAL_SIZE
            FROM information_schema.tables
            WHERE table_schema = ?
              AND table_name = ?
            """;

        try(PreparedStatement ps = conn.prepareStatement(sizeSql)){
            ps.setString(1, database);
            ps.setString(2, tableName);

            try(ResultSet rs = ps.executeQuery()){
                if(rs.next()){
                    long dataSizeBytes = rs.getLong("DATA_LENGTH");
                    long indexSizeBytes = rs.getLong("INDEX_LENGTH");
                    long totalSizeBytes = rs.getLong("TOTAL_SIZE");
                    double bytesPerRow = rowCount > 0 ? (double) dataSizeBytes / rowCount : 0;

                    tableStatistics = TableStatistics.builder()
                            .tableName(tableName)
                            .rowCount(rowCount)
                            .dataSizeBytes(dataSizeBytes)
                            .totalSizeBytes(totalSizeBytes)
                            .totalSizeMb(Math.round(((double) totalSizeBytes /1024/1024 )*100.0) / 100.0)
                            .bytesPerRow(bytesPerRow)
                            .build();
                }
            }
        }
        return tableStatistics ;
    }
}
