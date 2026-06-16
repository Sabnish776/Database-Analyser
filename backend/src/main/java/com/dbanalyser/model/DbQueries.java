package com.dbanalyser.model;

import java.util.List;
import lombok.Data;

@Data
public class DbQueries {
    private List<String> schema;
    private String insertUser;
    private String insertOrder;
    private String read;
    private String join;
    private String aggregate;
}
