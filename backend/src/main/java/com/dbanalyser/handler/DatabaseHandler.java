package com.dbanalyser.handler;

public interface DatabaseHandler {

    String getDbType();
    String getDriverClassName();
    default void loadDriver() throws ClassNotFoundException {
        Class.forName(getDriverClassName());
    }
}
