package com.example.springbootserver.repositories;

import com.example.springbootserver.models.OscarAward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OscarAwardRepo extends JpaRepository<OscarAward, Long> {

    List<OscarAward> findByFilmContainingIgnoreCaseAndYearFilm(String filmName, Integer year);
    List<OscarAward> findByFilmContainingIgnoreCaseOrderByYearFilmDesc(String filmName);
    // metodo per la ricerca allargata
    List<OscarAward> findByFilmContainingIgnoreCaseAndYearFilmBetween(
            String filmName,
            Integer startYear,
            Integer endYear
    );
    List<OscarAward> findByCategory(String category);
    List<OscarAward> findByWinner(Boolean winner);
    List<OscarAward> findByYearFilmBetween(Integer startYear, Integer endYear);
    List<OscarAward> findByFilmContainingIgnoreCase(String filmName);
    List<OscarAward> findByNameContainingIgnoreCase(String name);
}