package com.example.springbootserver.repositories;

import com.example.springbootserver.models.Genre;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GenreRepo extends JpaRepository<Genre, Long> {
    // Trova tutti i generi associati a un film specifico
    List<Genre> findByMovieId(Long movieId);
    // Trova gli ID dei film che hanno un determinato genere (case insensitive)
    @Query("SELECT DISTINCT g.movieId FROM Genre g WHERE LOWER(g.genre) = LOWER(:genre)")
    List<Long> findMovieIdsByGenre(@Param("genre") String genre);
    // Trova gli ID dei film paginati che hanno un determinato genere
    @Query("SELECT DISTINCT g.movieId FROM Genre g WHERE g.genre = :genre")
    Page<Long> findMovieIdsByGenre(@Param("genre") String genre, Pageable pageable);
}