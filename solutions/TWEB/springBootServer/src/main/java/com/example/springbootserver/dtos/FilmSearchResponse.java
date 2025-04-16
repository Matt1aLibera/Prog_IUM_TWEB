package com.example.springbootserver.dtos;

public class FilmSearchResponse {
    private Long id;
    private String name;
    private Integer year;
    private String posterLink;

    public FilmSearchResponse(Long id, String name, Integer year, String posterLink) {
        this.id = id;
        this.name = name;
        this.year = year;
        this.posterLink = posterLink;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public String getPosterLink() {
        return posterLink;
    }

    public void setPosterLink(String posterLink) {
        this.posterLink = posterLink;
    }

    // Costruttori, getter e setter
    public FilmSearchResponse() {}

    // ... aggiungi getter e setter per tutti i campi
}