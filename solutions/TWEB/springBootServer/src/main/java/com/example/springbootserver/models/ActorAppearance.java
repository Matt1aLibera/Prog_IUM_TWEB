package com.example.springbootserver.models;
import jakarta.persistence.*;

@Entity
@Table(name = "actor_appearances")
public class ActorAppearance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "movie_id", nullable = false)
    private Long movieId;

    @Column(nullable = false)
    private String actorName;

    @Column(name = "character_role")
    private String characterRole;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "movie_id",
            referencedColumnName = "id",
            insertable = false,
            updatable = false
    )
    private Movie movie;

    // Costruttore vuoto richiesto da JPA
    public ActorAppearance() {
    }

    // Costruttore con parametri per comodità
    public ActorAppearance(Long movieId, String actorName, String characterRole) {
        this.movieId = movieId;
        this.actorName = actorName;
        this.characterRole = characterRole;
    }

    // Getters e setters...
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

    public String getActorName() {
        return actorName;
    }

    public void setActorName(String actorName) {
        this.actorName = actorName;
    }

    public String getCharacterRole() {
        return characterRole;
    }

    public void setCharacterRole(String characterRole) {
        this.characterRole = characterRole;
    }

    public Movie getMovie() {
        return movie;
    }

    public void setMovie(Movie movie) {
        this.movie = movie;
    }
}
