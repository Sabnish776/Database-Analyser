package com.dbanalyser.handler;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class DatabaseHandlerRegistry {

    private final Map<String, DatabaseHandler> handlers = new HashMap<>();

    @Autowired
    public DatabaseHandlerRegistry(List<DatabaseHandler> databaseHandlers) {
        for (DatabaseHandler handler : databaseHandlers) {
            handlers.put(handler.getDbType().toLowerCase(), handler);
        }
    }


    public Optional<DatabaseHandler> getHandler(String dbType) {
        if (dbType == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(handlers.get(dbType.toLowerCase()));
    }
}
