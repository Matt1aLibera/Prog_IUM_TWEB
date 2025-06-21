package com.example.springbootserver.repositories;

import com.example.springbootserver.models.Country;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CountryRepo extends JpaRepository<Country, Long> {
    List<Country> findByMovieId(Long movieId);
}
