package com.example.springbootserver.models;
import jakarta.persistence.*;

@Entity
@Table
public class Studio {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // ID interno

    @Column(nullable = false)
    private Long movieId; // Riferimento a Movie (id CSV)

    @Column(nullable = false)
    private String studio;

    // Costruttori
    public Studio() {}
    public Studio(Long movieId, String studio) {
        this.movieId = movieId;
        this.studio = studio;
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

    public String getStudio() {
        return studio;
    }

    public void setStudio(String studio) {
        this.studio = studio;
    }
}