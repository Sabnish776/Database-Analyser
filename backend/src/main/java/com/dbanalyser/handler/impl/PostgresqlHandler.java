package com.dbanalyser.handler.impl;

import com.dbanalyser.customConfigModel.CsvImportResult;import com.dbanalyser.customConfigModel.Table;
import com.dbanalyser.handler.DatabaseHandler;
import com.dbanalyser.model.ConnectionDetail;
import lombok.extern.slf4j.Slf4j;
import org.postgresql.copy.CopyManager;import org.postgresql.core.BaseConnection;import org.springframework.stereotype.Component;

import java.io.FileReader;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

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
}
