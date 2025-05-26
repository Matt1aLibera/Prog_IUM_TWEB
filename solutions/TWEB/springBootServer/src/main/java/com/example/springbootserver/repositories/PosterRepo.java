package com.example.springbootserver.repositories;

import com.example.springbootserver.models.Crew;
import com.example.springbootserver.models.Poster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PosterRepo extends JpaRepository<Poster, Long> {
    @Query("SELECT p FROM Poster p WHERE p.movieId IN :movieIds")
    List<Poster> findByMovieIdIn(@Param("movieIds") List<Long> movieIds);
    Optional<Poster> findFirstByMovieId(Long movieId);
}