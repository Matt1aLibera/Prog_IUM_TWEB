package com.example.springbootserver.repositories;

import com.example.springbootserver.models.Crew;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CrewRepo extends JpaRepository<Crew, Long> {
    List<Crew> findByMovieId(Long movieId);
    List<Crew> findByNameContainingIgnoreCase(String name);
    List<Crew> findByRoleAndMovieId(String role, Long movieId);
}