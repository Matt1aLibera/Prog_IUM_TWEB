package com.example.springbootserver.models;

import jakarta.persistence.*;

@Entity
@Table
public class Poster {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // ID interno

    @Column(nullable = false)
    private Long movieId; // Riferimento a Movie

    @Column(nullable = false, columnDefinition = "TEXT")
    private String link;

    // Costruttori
    public Poster() {}
    public Poster(Long movieId, String link) {
        this.movieId = movieId;
        this.link = link;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getMovieId() {
        return movieId;
    }

    public void setMovieId(Long movieId) {
        this.movieId = movieId;
    }

    public String getLink() {
        return link;
    }

    public void setLink(String link) {
        this.link = link;
    }
}