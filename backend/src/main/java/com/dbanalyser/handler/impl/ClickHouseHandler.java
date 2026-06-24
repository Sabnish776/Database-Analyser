package com.dbanalyser.handler.impl;

import com.clickhouse.client.*;
import com.clickhouse.data.ClickHouseFile;
import com.clickhouse.data.ClickHouseFormat;
import com.dbanalyser.customConfigModel.CsvImportResult;
import com.dbanalyser.customConfigModel.Table;
import com.dbanalyser.handler.DatabaseHandler;
import com.dbanalyser.model.ConnectionDetail;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

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
        String url = detail.getUrl().replace("jdbc:clickhouse://", "");
        String host = url.split(":")[0];
        String database = url.contains("/") ? url.split("/")[1] : "default";
        CsvImportResult result ;
        ClickHouseNode server = ClickHouseNode.builder()
                .host(host)
                .database(database).port(ClickHouseProtocol.HTTP)
                .credentials(ClickHouseCredentials
                .fromUserAndPassword(detail.getUsername(),detail.getPassword())).build();

        try (ClickHouseClient client = ClickHouseClient.newInstance() ;
            Statement stmt = conn.createStatement() ;) {

            long start = System.nanoTime() ;
            client.write(server)
                    .table(table.getTableName())
                    .format(ClickHouseFormat.CSVWithNames)
                    .data(ClickHouseFile.of(csvPath.toString()))
                    .executeAndWait();
            double time = (System.nanoTime() - start) / 1_000_000.0;
            log.info("csv Import Time of {} is {} ms for table {}",detail.getName(),time,table.getTableName());
            long rows ;
            try(ResultSet rs = stmt.executeQuery(
                    "SELECT count(*) FROM " + table.getTableName())){
                rs.next() ;
                rows = rs.getLong(1) ;
            }
            log.info("{} rows imported in clickhouse\n", rows);

            result = CsvImportResult.builder()
                    .success(true)
                    .tableName(table.getTableName())
                    .csvFileName(table.getCsvFileName())
                    .rowsLoaded(rows)
                    .loadTimeMs(Math.round(time * 100.0) / 100.0).build() ;


        } catch (ClickHouseException  | SQLException e) {
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
