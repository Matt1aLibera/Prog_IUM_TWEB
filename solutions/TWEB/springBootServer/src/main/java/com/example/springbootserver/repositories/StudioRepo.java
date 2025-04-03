package com.example.springbootserver.repositories;

import com.example.springbootserver.models.Studio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudioRepo extends JpaRepository<Studio, Long> {
    List<Studio> findByMovieId(Long movieId);
    List<Studio> findByStudioContainingIgnoreCase(String studio);
}
