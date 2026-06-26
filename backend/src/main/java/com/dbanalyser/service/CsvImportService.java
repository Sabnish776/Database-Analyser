package com.dbanalyser.service;

import com.dbanalyser.customConfigModel.CsvImportResult;
import com.dbanalyser.customConfigModel.Table;
import com.dbanalyser.handler.DatabaseHandler;
import com.dbanalyser.model.ConnectionDetail;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class CsvImportService {

    public List<CsvImportResult> createAndImportCsv(Connection conn, ConnectionDetail detail, DatabaseHandler handler, List<Table> tables, Map<String, Path> csvPaths) throws Exception {
        List<CsvImportResult> csvImportResults = new ArrayList<>() ;

        int trialRuns = 50;
        for(Table table : tables){
            double totalLoadTimeMs = 0;
            CsvImportResult result = null ;
            for(int i=0 ; i<trialRuns ; i++){
                try (Statement stmt = conn.createStatement()) {
                    handler.dropTable(conn, table.getTableName());
                    stmt.execute(table.getSchemas().get(detail.getDbType()));
                }
                result = handler.importCsv(conn, detail, table, csvPaths.get(table.getCsvFileName()));
                totalLoadTimeMs += result.getLoadTimeMs();
            }
            
            double averageLoadTimeMs = totalLoadTimeMs / trialRuns;
            CsvImportResult averagedResult = CsvImportResult.builder()
                    .tableName(result.getTableName())
                    .csvFileName(result.getCsvFileName())
                    .rowsLoaded(result.getRowsLoaded())
                    .loadTimeMs(Math.round(averageLoadTimeMs*100.0)/100.0)
                    .success(result.isSuccess())
                    .errorMessage(result.getErrorMessage())
                    .build();
            
            csvImportResults.add(averagedResult);
            log.info("{} rows of {} imported in {} in {} ms\n", averagedResult.getRowsLoaded() , table.getTableName() ,detail.getName() , averagedResult.getLoadTimeMs() );
        }
        return csvImportResults ;
    }
}
