package com.example.springbootserver.repositories;
import com.example.springbootserver.models.Language;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LanguageRepo extends JpaRepository<Language, Long> {
    List<Language> findByMovieId(Long movieId);
    List<Language> findByMovieIdAndType(Long movieId, String type);
    List<Language> findByLanguageContainingIgnoreCase(String language);
}