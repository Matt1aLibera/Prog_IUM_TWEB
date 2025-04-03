package com.example.springbootserver.models;
import jakarta.persistence.*;

@Entity
@Table
public class Crew {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // ID interno

    @Column(nullable = false)
    private Long movieId; // Riferimento a Movie

    @Column(nullable = false, columnDefinition = "TEXT")
    private String role;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String name;

    // Costruttori
    public Crew() {}
    public Crew(Long movieId, String role, String name) {
        this.movieId = movieId;
        this.role = role;
        this.name = name;
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

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}