package com.dbanalyser.handler.impl;

import com.dbanalyser.customConfigModel.CsvImportResult;
import com.dbanalyser.customConfigModel.Table;
import com.dbanalyser.handler.DatabaseHandler;
import com.dbanalyser.model.ConnectionDetail;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

@Component
public class OraclesqlHandler implements DatabaseHandler {
    @Override
    public String getDbType() {
        return "oraclesql";
    }

    @Override
    public String getDriverClassName() {
        return "oracle.jdbc.OracleDriver";
    }

    @Override
    public boolean supportsTransactions() {
        return true;
    }

    @Override
    public CsvImportResult importCsv(Connection conn, ConnectionDetail detail, Table table, Path csvPath) {
        throw new RuntimeException("Csv import not supported for Oracle sql") ;
    }

    @Override
    public void dropTable(Connection conn , String tableName) {
        String sql = "BEGIN EXECUTE IMMEDIATE 'DROP TABLE " + tableName+"'; EXCEPTION WHEN OTHERS THEN NULL; END;";
        try(Statement st = conn.createStatement()){
            st.execute(sql) ;
        }catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }
}
