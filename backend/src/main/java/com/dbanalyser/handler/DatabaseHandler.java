package com.dbanalyser.handler;

import com.dbanalyser.customConfigModel.CsvImportResult;
import com.dbanalyser.customConfigModel.Table;
import com.dbanalyser.model.ConnectionDetail;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;

public interface DatabaseHandler {
    String getDbType();
    String getDriverClassName();
    boolean supportsTransactions() ;
    CsvImportResult importCsv(Connection conn , ConnectionDetail detail, Table table , Path csvPath) throws SQLException;
    void dropTable(Connection conn,String tableName) ;
    default void loadDriver() throws ClassNotFoundException {
        try {
            Class.forName(getDriverClassName());
        } catch (ClassNotFoundException e) {
            throw e;
        }
    }
}
