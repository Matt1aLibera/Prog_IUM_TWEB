package com.example.springbootserver.repositories;

import com.example.springbootserver.models.Genre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GenreRepo extends JpaRepository<Genre, Long> {
    List<Genre> findByMovieId(Long movieId);
    List<Genre> findByGenreContainingIgnoreCase(String genre);
}