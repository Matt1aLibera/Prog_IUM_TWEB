package com.example.springbootserver.repositories;
import com.example.springbootserver.models.ActorAppearance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActorAppearanceRepo extends JpaRepository<ActorAppearance, Long> {

    // Trova tutte le apparizioni per un film specifico
    List<ActorAppearance> findByMovieId(Long movieId);

    // Trova apparizioni per nome attore (case insensitive)
    List<ActorAppearance> findByActorNameContainingIgnoreCase(String actorName);

    // Trova apparizioni per ruolo e film
    @Query("SELECT a FROM ActorAppearance a WHERE a.characterName = :role AND a.movieId = :movieId")
    List<ActorAppearance> findByCharacterNameAndMovieId(@Param("role") String role, @Param("movieId") Long movieId);

    // Trova apparizioni per lista di film (ordinato per nome attore)
    @Query(value = "SELECT * FROM actor_appearances WHERE movie_id IN :movieIds ORDER BY actor_name", nativeQuery = true)
    List<ActorAppearance> findByMovieIdsInOrderByActorName(@Param("movieIds") List<Long> movieIds);

}