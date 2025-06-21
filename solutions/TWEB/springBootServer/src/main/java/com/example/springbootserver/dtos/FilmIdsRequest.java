package com.example.springbootserver.dtos;

import java.util.List;
/**
 * Simple request wrapper for list of movie IDs
 * Used for batch operations on multiple movies
 */
public class FilmIdsRequest {
    private List<Long> ids;

    public FilmIdsRequest() {}

    public List<Long> getIds() {
        return ids;
    }

    public void setIds(List<Long> ids) {
        this.ids = ids;
    }
}