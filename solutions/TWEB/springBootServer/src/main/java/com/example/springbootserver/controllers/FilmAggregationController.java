package com.example.springbootserver.controllers;

import com.example.springbootserver.dtos.FilmDetailsResponse;
import com.example.springbootserver.dtos.FilmIdsRequest;
import com.example.springbootserver.services.FilmAggregationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/films")
public class FilmAggregationController {
    private final FilmAggregationService filmAggregationService;

    @Autowired
    public FilmAggregationController(FilmAggregationService filmAggregationService) {
        this.filmAggregationService = filmAggregationService;
    }

    @PostMapping("/batch")
    public ResponseEntity<List<FilmDetailsResponse>> getFilmsBatch(@RequestBody FilmIdsRequest request) {
        try {
            List<FilmDetailsResponse> films = filmAggregationService.getFilmsDetails(request.getIds());
            return ResponseEntity.ok(films);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}