package com.app.model;

import lombok.Data;

import java.util.Map;

@Data
public class Table {
    private String tableName;
    private String csvFileName;
    private Map<String, String> schemas; // { mysql -> create table ..... , psql -> create table .... }
}
