package com.example.springbootserver.repositories;

import java.time.LocalDate;

import com.example.springbootserver.models.Release;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReleaseRepo extends JpaRepository<Release, Long> {
    List<Release> findByMovieId(Long movieId);
}