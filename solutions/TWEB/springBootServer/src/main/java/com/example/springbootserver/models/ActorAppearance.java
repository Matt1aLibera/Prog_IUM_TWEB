package com.example.springbootserver.models;
import jakarta.persistence.*;

@Entity
@Table(name = "actor_appearances", schema = "public")
public class ActorAppearance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "movie_id", nullable = false)
    private Long movieId;

    @Column(name = "actor_name", nullable = false, length = 1000)
    private String actorName;

    @Column(name = "character_name", length = 1000)
    private String characterName;

    public ActorAppearance() {}

    public ActorAppearance(Long movieId, String actorName, String characterName) {
        this.movieId = movieId;
        this.actorName = actorName;
        this.characterName = characterName;
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

    public String getCharacterName() {
        return characterName;
    }

    public void setCharacterName(String characterName) {
        this.characterName = characterName;
    }
}
