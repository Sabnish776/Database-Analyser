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
}
