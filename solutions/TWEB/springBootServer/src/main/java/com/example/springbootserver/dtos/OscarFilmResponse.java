package com.example.springbootserver.dtos;

public class OscarFilmResponse {
    private Long id;
    private String title;
    private Integer year;
    private String posterUrl;
    private int oscarWins;
    private int oscarNominations;

    public OscarFilmResponse(Long id, String title, Integer year, String posterUrl, int oscarWins, int oscarNominations) {
        this.id = id;
        this.title = title;
        this.year = year;
        this.posterUrl = posterUrl;
        this.oscarWins = oscarWins;
        this.oscarNominations = oscarNominations;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public String getPosterUrl() {
        return posterUrl;
    }

    public void setPosterUrl(String posterUrl) {
        this.posterUrl = posterUrl;
    }

    public int getOscarWins() {
        return oscarWins;
    }

    public void setOscarWins(int oscarWins) {
        this.oscarWins = oscarWins;
    }

    public int getOscarNominations() {
        return oscarNominations;
    }

    public void setOscarNominations(int oscarNominations) {
        this.oscarNominations = oscarNominations;
    }
}