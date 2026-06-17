package com.dbanalyser.handler.impl;

import com.dbanalyser.handler.DatabaseHandler;
import org.springframework.stereotype.Component;

@Component
public class MysqlHandler implements DatabaseHandler {

    @Override
    public String getDbType() {
        return "mysql";
    }

    @Override
    public String getDriverClassName() {
        return "com.mysql.cj.jdbc.Driver";
    }

    @Override
    public boolean supportsTransactions() {
        return true;
    }
}
