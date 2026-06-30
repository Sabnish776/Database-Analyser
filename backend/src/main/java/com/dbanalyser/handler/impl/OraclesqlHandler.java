package com.dbanalyser.handler.impl;

import com.dbanalyser.customConfigModel.CsvImportResult;
import com.dbanalyser.customConfigModel.Table;
import com.dbanalyser.handler.DatabaseHandler;
import com.dbanalyser.model.ConnectionDetail;
import com.dbanalyser.model.TableStatistics;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.sql.*;

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

        String size1Spl = "SELECT BYTES " +
                "FROM USER_SEGMENTS " +
                "WHERE SEGMENT_NAME = UPPER(?) " +
                "AND SEGMENT_TYPE = 'TABLE' " ;

        String size2Sql = "SELECT" +
                "    SUM(BYTES) AS TOTAL_SIZE " +
                "FROM USER_SEGMENTS " +
                "WHERE SEGMENT_NAME = UPPER(?)" +
                "   OR SEGMENT_NAME IN (" +
                "       SELECT INDEX_NAME" +
                "       FROM USER_INDEXES" +
                "       WHERE TABLE_NAME = UPPER(?)" +
                "   ) " ;

        try(PreparedStatement ps1 = conn.prepareStatement(size1Spl) ;
            PreparedStatement ps2 = conn.prepareStatement(size2Sql)){

            long dataSize = 0;
            long totalSizeBytes = 0;
            ps1.setString(1, tableName);

            try (ResultSet rs1 = ps1.executeQuery()) {
                if (rs1.next()) {
                    dataSize = rs1.getLong("BYTES");
                }
            } catch (SQLException e) {
                throw new RuntimeException(e);
            }

            ps2.setString(1, tableName);
            ps2.setString(2, tableName);

            try (ResultSet rs2 = ps2.executeQuery()) {
                if (rs2.next()) {
                    totalSizeBytes = rs2.getLong("TOTAL_SIZE");
                }
            } catch (SQLException e) {
                throw new RuntimeException(e);
            }

            tableStatistics.setDataSizeBytes(dataSize);
            tableStatistics.setTotalSizeBytes(totalSizeBytes);

            double bytesPerRow = rowCount > 0 ? (double) dataSize / rowCount : 0;
            tableStatistics.setBytesPerRow(bytesPerRow);
            tableStatistics.setTotalSizeMb(Math.round((totalSizeBytes / 1024.0/ 1024.0)*100.0) / 100.0);

        }

        return tableStatistics;
    }
}
