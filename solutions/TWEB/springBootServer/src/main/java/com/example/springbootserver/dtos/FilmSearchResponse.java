package com.example.springbootserver.dtos;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(
        name = "FilmSearchResponse",
        description = "Contains basic movie information with poster URL for full-text search results and autocomplete suggestions"
)
public class FilmSearchResponse {
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
    private String name;

    @Schema(
            description = "Release year of the movie",
            example = "1972"
    )
    private Integer year;
    @Schema(
            description = "URL to the movie poster thumbnail",
            example = "https://example.com/posters/12345.jpg",
            nullable = true
    )
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

    public FilmSearchResponse() {}

}