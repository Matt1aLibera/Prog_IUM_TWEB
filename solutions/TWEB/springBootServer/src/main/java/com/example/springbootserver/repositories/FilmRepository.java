package com.example.springbootserver.repositories;

import org.springframework.stereotype.Repository;

@Repository
public interface FilmRepository extends JpaRepository<Film, String> { }
