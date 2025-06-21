package com.example.springbootserver.repositories;

import com.example.springbootserver.models.OscarAward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OscarAwardRepo extends JpaRepository<OscarAward, Long> {
    // Trova premi Oscar per nome film (parziale) e intervallo anni
    List<OscarAward> findByFilmContainingIgnoreCaseAndYearFilmBetween(
            String filmName, int startYear, int endYear);

    // Trova premi Oscar per lista di film (query nativa)
    @Query(nativeQuery = true, value = """
        SELECT o.* FROM oscar_awards o
        WHERE EXISTS (
            SELECT 1 FROM movie m 
            WHERE LOWER(o.film) = LOWER(m.name) 
            AND o.year_film BETWEEN m.date-1 AND m.date+1
            AND m.id IN (:movieIds)
        """)
    List<OscarAward> findOscarsForMovies(@Param("movieIds") List<Long> movieIds);List<OscarAward> findByFilmContainingIgnoreCaseAndYearFilm(String filmName, Integer year);

    // Trova premi Oscar per nome film (parziale) e anno specifico
    List<OscarAward> findByFilmContainingIgnoreCaseOrderByYearFilmDesc(String filmName);

    // Trova premi Oscar per nome film (parziale) e intervallo anni (versione allargata)
    List<OscarAward> findByFilmContainingIgnoreCaseAndYearFilmBetween(
            String filmName,
            Integer startYear,
            Integer endYear
    );

    // Trova premi Oscar per nome film esatto e anno ±1 (query nativa)
    @Query(nativeQuery = true, value = """
        SELECT o.* FROM oscar_awards o
        WHERE (LOWER(o.film), o.year_film) IN (
            SELECT LOWER(?1), ?2 UNION
            SELECT LOWER(?1), ?2-1 UNION
            SELECT LOWER(?1), ?2+1
        )
        """)
    List<OscarAward> findByMovieNameAndYear(String filmName, Integer year);

    // Trova premi Oscar per lista di nomi film e anni (query nativa)
    @Query(nativeQuery = true, value = """
        SELECT o.* FROM oscar_awards o, 
        (VALUES (:params)) AS movies(name, year)
        WHERE (LOWER(o.film), o.year_film) IN (
            (LOWER(movies.name), movies.year),
            (LOWER(movies.name), movies.year-1),
            (LOWER(movies.name), movies.year+1)
        )
        """)
    List<OscarAward> findByMovieNamesAndYears(@Param("params") List<Object[]> movieParams);
}