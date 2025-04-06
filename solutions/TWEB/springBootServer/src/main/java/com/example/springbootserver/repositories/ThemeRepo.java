package com.example.springbootserver.repositories;

import com.example.springbootserver.models.Theme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
@Repository
public interface ThemeRepo extends JpaRepository<Theme, Long> {
    List<Theme> findByMovieId(Long movieId);
    List<Theme> findByThemeContainingIgnoreCase(String theme);
}
