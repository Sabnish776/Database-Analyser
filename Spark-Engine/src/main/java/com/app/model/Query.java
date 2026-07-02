package com.app.model;

import lombok.Data;

import java.util.Map;

@Data
public class Query {
    private String name;
    private String category;
    private Map<String, String> queriesByDb;
}
