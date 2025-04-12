package com.example.springbootserver.repositories;

import com.example.springbootserver.models.Movie;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface MovieRepo extends JpaRepository<Movie, Long> {
    // Rimosso il metodo findByRatingGreaterThan
    List<Movie> findByNameContainingIgnoreCase(String name);

    // Aggiunti metodi utili
    List<Movie> findByDateBetween(Integer start, Integer end);
    List<Movie> findByMinuteLessThanEqual(Integer maxMinute);
    List<Movie> findByIdIn(List<Long> ids);
}