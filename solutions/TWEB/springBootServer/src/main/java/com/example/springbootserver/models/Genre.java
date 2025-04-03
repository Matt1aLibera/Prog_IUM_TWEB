package com.example.springbootserver.models;

import jakarta.persistence.*;

@Entity
@Table
public class Genre {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // ID interno

    @Column(nullable = false)
    private Long movieId; // Riferimento a Movie (id CSV)

    @Column(nullable = false, columnDefinition = "TEXT")
    private String genre;

    // Costruttori
    public Genre() {}
    public Genre(Long movieId, String genre) {
        this.movieId = movieId;
        this.genre = genre;
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

    public String getGenre() {
        return genre;
    }

    public void setGenre(String genre) {
        this.genre = genre;
    }
}
