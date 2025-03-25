package com.example.springbootserver.controllers;

import com.example.springbootserver.repositories.FilmRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/films")
public class FilmController {

    @Autowired
    private FilmRepository filmRepository;

    @PostMapping
    public ResponseEntity<?> uploadFilms(@RequestBody List<Film> films) {
        filmRepository.saveAll(films);
        return ResponseEntity.ok("Dati caricati in PostgreSQL!");
    }
}