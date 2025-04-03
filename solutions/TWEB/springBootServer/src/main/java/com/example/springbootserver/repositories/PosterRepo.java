package com.example.springbootserver.repositories;

import com.example.springbootserver.models.Poster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PosterRepo extends JpaRepository<Poster, Long> {
    Optional<Poster> findByMovieId(Long movieId);
}