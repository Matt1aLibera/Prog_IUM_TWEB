package com.example.springbootserver.models;

import jakarta.persistence.*;

@Entity
@Table
public class Theme {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // ID interno

    @Column(nullable = false)
    private Long movieId; // Riferimento a Movie (id CSV)

    @Column(nullable = false, columnDefinition = "TEXT")
    private String theme;

    // Costruttori
    public Theme() {}
    public Theme(Long movieId, String theme) {
        this.movieId = movieId;
        this.theme = theme;
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

    public String getTheme() {
        return theme;
    }

    public void setTheme(String theme) {
        this.theme = theme;
    }
}