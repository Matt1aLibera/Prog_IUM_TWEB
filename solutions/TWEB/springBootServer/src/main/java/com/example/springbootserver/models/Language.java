package com.example.springbootserver.models;

import jakarta.persistence.*;

@Entity
@Table
public class Language {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // ID interno

    @Column(nullable = false)
    private Long movieId; // Riferimento a Movie (id CSV)

    @Column
    private String type; // "Primary language", "Spoken language", etc.

    @Column(nullable = false)
    private String language;

    // Costruttori
    public Language() {}
    public Language(Long movieId, String type, String language) {
        this.movieId = movieId;
        this.type = type;
        this.language = language;
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

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }
}