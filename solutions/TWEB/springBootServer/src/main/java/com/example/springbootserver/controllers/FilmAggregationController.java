package com.example.springbootserver.controllers;

import com.example.springbootserver.dtos.FilmDetailsResponse;
import com.example.springbootserver.dtos.FilmIdsRequest;
import com.example.springbootserver.dtos.FilmPosterResponse;
import com.example.springbootserver.services.FilmAggregationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
// Route per il carosello usa curl -X POST http://localhost:8082/api/films/posters ^
//  -H "Content-Type: application/json" ^
//  -d "{\"ids\": [1000001,1000002,1000003]}"
@RestController
@RequestMapping("/api/films")
public class FilmAggregationController {
    private final FilmAggregationService filmAggregationService;

    @Autowired
    public FilmAggregationController(FilmAggregationService filmAggregationService) {
        this.filmAggregationService = filmAggregationService;
    }
    @PostMapping("/posters")
    public ResponseEntity<List<FilmPosterResponse>> getFilmsPosters(@RequestBody FilmIdsRequest request) {
        try {
            List<FilmPosterResponse> posters = filmAggregationService.getFilmsPosters(request.getIds());
            return ResponseEntity.ok(posters);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    @GetMapping("/{id}")
    public ResponseEntity<FilmDetailsResponse> getFilmDetails(@PathVariable Long id) {
        try {
            FilmDetailsResponse film = filmAggregationService.getFilmDetails(id);
            return ResponseEntity.ok(film);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}