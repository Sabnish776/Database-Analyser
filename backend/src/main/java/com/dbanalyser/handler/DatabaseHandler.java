package com.dbanalyser.handler;

public interface DatabaseHandler {
    String getDbType();
    String getDriverClassName();
    boolean supportsTransactions() ;
    default void loadDriver() throws ClassNotFoundException {
        Class.forName(getDriverClassName());
    }
}
