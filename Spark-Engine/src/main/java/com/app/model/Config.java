package com.app.model;

import lombok.Data;

import java.util.List;

@Data
public class Config {
    private List<ConnectionDetail> connectionDetails;
    private List<Table> tables;
    private List<Query> queries;
}
