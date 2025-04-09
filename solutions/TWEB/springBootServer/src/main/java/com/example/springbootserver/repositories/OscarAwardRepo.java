package com.example.springbootserver.repositories;

import com.example.springbootserver.models.OscarAward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OscarAwardRepo extends JpaRepository<OscarAward, Long> {
    List<OscarAward> findByCategory(String category);
    List<OscarAward> findByWinner(Boolean winner);
    List<OscarAward> findByYearFilmBetween(Integer startYear, Integer endYear);
    List<OscarAward> findByFilmContainingIgnoreCase(String filmName);
    List<OscarAward> findByNameContainingIgnoreCase(String name);
}