package com.example.springbootserver.dtos;
/**
 * Basic movie info with poster link
 * Used for displaying movie lists with thumbnails
 */
public class FilmPosterResponse {
    private Long id;
    private String name;
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
