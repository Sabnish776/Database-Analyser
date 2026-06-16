package com.dbanalyser.model;

import lombok.Data;

@Data
public class ConnectionDetail {
    private String name;
    private String dbType; // mysql, postgresql, mariadb
    private String url;
    private String username;
    private String password;
}
