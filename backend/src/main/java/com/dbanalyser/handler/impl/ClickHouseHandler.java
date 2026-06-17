package com.dbanalyser.handler.impl;

import com.dbanalyser.handler.DatabaseHandler;
import org.springframework.stereotype.Component;

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
}
