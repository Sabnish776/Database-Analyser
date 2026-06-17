package com.dbanalyser.handler.impl;

import com.dbanalyser.handler.DatabaseHandler;
import org.springframework.stereotype.Component;

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
}
