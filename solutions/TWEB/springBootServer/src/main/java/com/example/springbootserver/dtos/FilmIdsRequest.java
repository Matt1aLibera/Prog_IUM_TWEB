package com.example.springbootserver.dtos;

import java.util.List;

public class FilmIdsRequest {
    private List<Long> ids;

    // Costruttore vuoto e getter/setter
    public FilmIdsRequest() {}

    public List<Long> getIds() {
        return ids;
    }

    public void setIds(List<Long> ids) {
        this.ids = ids;
    }
}