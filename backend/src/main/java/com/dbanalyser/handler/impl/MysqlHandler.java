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
public class MysqlHandler implements DatabaseHandler {

    @Override
    public String getDbType() {
        return "mysql";
    }

    @Override
    public String getDriverClassName() {
        return "com.mysql.cj.jdbc.Driver";
    }

    @Override
    public boolean supportsTransactions() {
        return true;
    }

    @Override
    public CsvImportResult importCsv(Connection conn, ConnectionDetail detail, Table table, Path csvPath) {
        String tableName = table.getTableName() ;
        String filePath = csvPath.toAbsolutePath().toString();
        CsvImportResult result ;
        String sql = "LOAD DATA LOCAL INFILE '" + filePath + "' INTO TABLE " + tableName
                + " FIELDS TERMINATED BY ',' LINES TERMINATED BY '\\n' IGNORE 1 ROWS";

        try(Statement stmt = conn.createStatement()) {

            // TODO to be removed later
            stmt.execute("SET GLOBAL local_infile = 1") ;

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

//    @Override
//    public TableStatistics getTableStatistics(Connection conn, String database, String tableName) {
//        String countSql = "SELECT COUNT(*) FROM " + tableName ;
//        try(Statement st = conn.g)
//        return null;
//    }

}
