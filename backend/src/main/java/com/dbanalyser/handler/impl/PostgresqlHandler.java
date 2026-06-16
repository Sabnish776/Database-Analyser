package com.dbanalyser.handler.impl;

import com.dbanalyser.handler.DatabaseHandler;
import org.springframework.stereotype.Component;

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
}
