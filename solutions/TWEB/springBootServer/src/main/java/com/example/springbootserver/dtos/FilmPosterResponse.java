package com.example.springbootserver.dtos;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(
        name = "FilmPosterResponse",
        description = "Contains basic movie information with poster URL for thumbnail displays"
)
public class FilmPosterResponse {
    @Schema(
            description = "Unique identifier of the movie",
            //example = "1000001",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private Long id;
    @Schema(
            description = "Title of the movie",
            //example = "The Shawshank Redemption",
            requiredMode = Schema.RequiredMode.REQUIRED,
            maxLength = 255
    )
    private String name;
    @Schema(
            description = "URL to the movie poster image",
            example = "https://example.com/posters/1000001.jpg",
            nullable = true
    )
    private String posterLink;

    public FilmPosterResponse() {

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

    public String getPosterLink() {
        return posterLink;
    }

    public void setPosterLink(String posterLink) {
        this.posterLink = posterLink;
    }

    public FilmPosterResponse(Long id, String name, String posterLink) {
        this.id = id;
        this.name = name;
        this.posterLink = posterLink;
    }
}
