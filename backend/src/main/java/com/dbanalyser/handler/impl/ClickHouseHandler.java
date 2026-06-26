package com.dbanalyser.handler.impl;

import com.clickhouse.client.api.Client;
import com.clickhouse.client.api.insert.InsertResponse;
import com.clickhouse.client.api.metrics.ClientMetrics;
import com.clickhouse.client.api.metrics.OperationMetrics;
import com.clickhouse.data.ClickHouseFormat;
import com.dbanalyser.customConfigModel.CsvImportResult;
import com.dbanalyser.customConfigModel.Table;
import com.dbanalyser.handler.DatabaseHandler;
import com.dbanalyser.model.ConnectionDetail;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.concurrent.ExecutionException;

@Slf4j
@Component
public class ClickHouseHandler implements DatabaseHandler {
    @Override
    public String getDbType() {
        return "clickhouse";
    }

    @Override
    public String getDriverClassName() {
        return "com.clickhouse.jdbc.ClickHouseDriver";
    }

    @Override
    public boolean supportsTransactions() {
        return false;
    }

    @Override
    public CsvImportResult importCsv(Connection conn, ConnectionDetail detail, Table table, Path csvPath) {
        CsvImportResult result ;
        int indexOfParams = detail.getUrl().indexOf("?") ;
        String dbUrl = "" ;
        if(indexOfParams != -1){
            dbUrl = detail.getUrl().substring(0,indexOfParams) ;
        }else{
            dbUrl = detail.getUrl() ;
        }
        String httpUrl = "" ;
        if(dbUrl.startsWith("jdbc:clickhouse://")){
            httpUrl = dbUrl.replace("jdbc:clickhouse://","http://") ;
        }else if(dbUrl.startsWith("jdbc:ch://")){
            httpUrl = dbUrl.replace("jdbc:ch://","http://") ;
        }
        String http = httpUrl.substring(0,httpUrl.lastIndexOf("/"));
        String database = httpUrl.substring(httpUrl.lastIndexOf("/")+1) ;
        Client client1 = new Client.Builder()
                .addEndpoint(http)
                .setUsername(detail.getUsername())
                .setPassword(detail.getPassword())
                .build() ;

        try{
            InputStream in = Files.newInputStream(csvPath) ;
            InsertResponse response1 = client1.insert(database+"."+table.getTableName(),in,ClickHouseFormat.CSVWithNames).get() ;
            OperationMetrics metrics = response1.getMetrics() ;


            result = CsvImportResult.builder()
                    .success(true)
                    .tableName(table.getTableName())
                    .csvFileName(table.getCsvFileName())
                    .rowsLoaded(response1.getWrittenRows())
                    .loadTimeMs(metrics.getMetric(ClientMetrics.OP_DURATION).getLong()).build() ;


        } catch (IOException | ExecutionException | InterruptedException e) {
            log.error(e.getMessage());
            e.printStackTrace();
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
