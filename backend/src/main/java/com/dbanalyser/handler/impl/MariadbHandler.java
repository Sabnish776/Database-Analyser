package com.dbanalyser.handler.impl;

import com.dbanalyser.handler.DatabaseHandler;
import org.springframework.stereotype.Component;

@Component
public class MariadbHandler implements DatabaseHandler {

    @Override
    public String getDbType() {
        return "mariadb";
    }

    @Override
    public String getDriverClassName() {
        return "org.mariadb.jdbc.Driver";
    }

    @Override
    public boolean supportsTransactions() {
        return true;
    }
}
