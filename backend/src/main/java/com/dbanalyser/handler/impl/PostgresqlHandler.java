package com.dbanalyser.handler.impl;

import com.dbanalyser.customConfigModel.CsvImportResult;import com.dbanalyser.customConfigModel.Table;
import com.dbanalyser.handler.DatabaseHandler;
import com.dbanalyser.model.ConnectionDetail;
import com.dbanalyser.model.TableStatistics;
import lombok.extern.slf4j.Slf4j;
import org.postgresql.copy.CopyManager;import org.postgresql.core.BaseConnection;import org.springframework.stereotype.Component;

import java.io.FileReader;
import java.nio.file.Path;
import java.sql.*;

@Slf4j
@Component
public class PostgresqlHandler implements DatabaseHandler {

    @Override
    public String getDbType() {
        return "postgresql";
    }

    @Override
    public String getDriverClassName() {
        return "org.postgresql.Driver";
    }

    @Override
    public boolean supportsTransactions() {
        return true;
    }

    @Override
    public CsvImportResult importCsv(Connection conn, ConnectionDetail detail, Table table, Path csvPath) {

        String tableName = table.getTableName() ;
        String sql = "COPY " + tableName + " FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',')" ;
        CsvImportResult result ;

        try(FileReader reader =  new FileReader(csvPath.toFile())){
            CopyManager copyManager = new CopyManager((BaseConnection) conn) ;

            long start = System.nanoTime() ;
            long rows = copyManager.copyIn(sql,reader) ;
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
        String sql = "DROP TABLE IF EXISTS " + tableName +" CASCADE" ;
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
                pg_table_size(?) AS data_size,
                pg_total_relation_size(?) AS total_size
            """;
        try(PreparedStatement ps = conn.prepareStatement(sizeSql)){
            ps.setString(1,tableName);
            ps.setString(2,tableName);

            try(ResultSet rs = ps.executeQuery()){
                if(rs.next()){
                    long dataSize = rs.getLong("data_size");
                    long totalSizeBytes = rs.getLong("total_size");
                    double bytesPerRow = rowCount > 0 ? (double) dataSize / rowCount : 0;
                    tableStatistics = TableStatistics.builder()
                            .tableName(tableName)
                            .rowCount(rowCount)
                            .dataSizeBytes(dataSize)
                            .totalSizeBytes(totalSizeBytes)
                            .totalSizeMb(Math.round(((double) totalSizeBytes /1024/1024 )*100.0) / 100.0)
                            .bytesPerRow(bytesPerRow)
                            .build() ;
                }
            }
        }

        return tableStatistics;
    }

}
