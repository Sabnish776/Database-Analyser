package com.dbanalyser.service;

import com.dbanalyser.customConfigModel.CsvImportResult;import com.dbanalyser.customConfigModel.Table;
import com.dbanalyser.handler.DatabaseHandler;
import com.dbanalyser.model.ConnectionDetail;import org.springframework.stereotype.Service;

import java.nio.file.Path;
import java.sql.Connection;
import java.util.ArrayList;import java.util.List;
import java.util.Map;

@Service
public class CsvImportService {

    public List<CsvImportResult> importCsv(Connection conn,ConnectionDetail detail, DatabaseHandler handler, List<Table> tables, Map<String, Path> csvPaths) throws Exception {
        List<CsvImportResult> csvImportResults = new ArrayList<>() ;
        for(Table table : tables){
            CsvImportResult result = handler.importCsv(conn,detail,table,csvPaths.get(table.getCsvFileName()));
            csvImportResults.add(result) ;
        }
        return csvImportResults ;
    }
}
