package com.example.springbootserver.models;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "release")
public class Release {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "movie_id", nullable = false)
    private Long movieId;

    @Column(nullable = false, length = 255)
    private String country;

    @Column
    private LocalDate date;

    @Column(length = 255)
    private String type; // "Theatrical", "Digital", etc.

    @Column(length = 50)
    private String rating; // "PG", "ATP", etc.

    // Costruttori
    public Release() {}

    public Release(Long movieId, String country, LocalDate date, String type, String rating) {
        this.movieId = movieId;
        this.country = country;
        this.date = date;
        this.type = type;
        this.rating = rating;
    }

    // Getter e Setter
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

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getRating() {
        return rating;
    }

    public void setRating(String rating) {
        this.rating = rating;

    }
}