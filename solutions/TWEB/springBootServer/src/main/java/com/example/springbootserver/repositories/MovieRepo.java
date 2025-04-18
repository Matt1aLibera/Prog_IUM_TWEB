package com.example.springbootserver.repositories;

import com.example.springbootserver.dtos.FilmSearchResponse;
import com.example.springbootserver.models.Movie;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface MovieRepo extends JpaRepository<Movie, Long> {
    @Query("SELECT m FROM Movie m WHERE LOWER(m.name) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY m.name ASC, m.id ASC")
    Page<Movie> findByNameContaining(@Param("query") String query, Pageable pageable);

    @Query("SELECT COUNT(m) FROM Movie m WHERE LOWER(m.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    Long countByNameContaining(@Param("query") String query);
    List<Movie> findByMinuteLessThanEqual(Integer maxMinute);
    List<Movie> findByIdIn(List<Long> ids);
    @Query("SELECT m FROM Movie m WHERE LOWER(m.name) LIKE LOWER(CONCAT(:query, '%')) ORDER BY m.name ASC, m.id ASC")
    Page<Movie> findByNameStartingWith(@Param("query") String query, Pageable pageable);

    @Query("SELECT m FROM Movie m WHERE LOWER(m.name) LIKE LOWER(CONCAT('%', :query, '%')) AND LOWER(m.name) NOT LIKE LOWER(CONCAT(:query, '%')) ORDER BY m.name ASC, m.id ASC")
    Page<Movie> findByNameContainingButNotStartingWith(@Param("query") String query, Pageable pageable);
}