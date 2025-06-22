package com.example.springbootserver.dtos;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(
        name = "MovieInfoProjection",
        description = "Minimal movie information projection for efficient genre-based queries"
)
public class MovieInfoProjection {
    @Schema(
            description = "Unique identifier of the movie",
            //example = "123",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private Long id;
    @Schema(
            description = "Title of the movie",
            //example = "Inception",
            requiredMode = Schema.RequiredMode.REQUIRED,
            maxLength = 255
    )
    private String name;
    @Schema(
            description = "Release year of the movie"//,
            //example = "2010",
            //minimum = "1900",
            //maximum = "2100"
    )
    private Integer date;
    // Nasconde il costruttore dalla documentazione

    public MovieInfoProjection(Long id, String name, Integer date) {
        this.id = id;
        this.name = name;
        this.date = date;
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

    public Integer getDate() {
        return date;
    }

    public void setDate(Integer date) {
        this.date = date;
    }
}