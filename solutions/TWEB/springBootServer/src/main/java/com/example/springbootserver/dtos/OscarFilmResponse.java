package com.example.springbootserver.dtos;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(
        name = "OscarFilmResponse",
        description = "Contains movie information with Oscar award statistics including wins and nominations"
)
public class OscarFilmResponse {
    @Schema(
            description = "Unique identifier of the movie",
            //example = "12345",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private Long id;
    @Schema(
            description = "Title of the movie",
            //example = "The Godfather",
            requiredMode = Schema.RequiredMode.REQUIRED,
            maxLength = 255
    )
    private String title;
    @Schema(
            description = "Release year of the movie"//,
            //example = "1972",
            //minimum = "1927",  // Primo anno degli Oscar
            //maximum = "2100"
    )
    private Integer year;
    @Schema(
            description = "URL to the movie poster image",
            //example = "https://example.com/posters/godfather.jpg",
            format = "uri",
            nullable = true
    )
    private String posterUrl;
    @Schema(
            description = "Number of Academy Awards won"//,
            //example = "3",
            //minimum = "0"
    )
    private int oscarWins;
    @Schema(
            description = "Total number of Oscar nominations"//,
            //example = "9",
            //minimum = "0"
    )
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