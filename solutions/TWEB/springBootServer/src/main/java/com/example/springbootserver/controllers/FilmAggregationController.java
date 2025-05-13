package com.example.springbootserver.controllers;

import com.example.springbootserver.dtos.FilmDetailsResponse;
import com.example.springbootserver.dtos.FilmIdsRequest;
import com.example.springbootserver.dtos.FilmPosterResponse;
import com.example.springbootserver.dtos.FilmSearchResponse;
import com.example.springbootserver.services.FilmAggregationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;
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

    @GetMapping("/search/autocomplete")
    public ResponseEntity<List<FilmSearchResponse>> autocomplete(
            @RequestParam String q) {
        return ResponseEntity.ok(filmAggregationService.searchFilmsAutocomplete(q));
    }

    @GetMapping("/search/full")
    public ResponseEntity<Page<FilmSearchResponse>> fullSearch(
            @RequestParam String q,
            @PageableDefault(size = 15) Pageable pageable) {

        return ResponseEntity.ok(filmAggregationService.searchFilmsFull(q, pageable));
    }
    @GetMapping("/advanced-search")
    public ResponseEntity<?> advancedSearch(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) String character,
            @RequestParam(required = false) String crew,
            @RequestParam(required = false) String studio,
            @RequestParam(required = false) List<String> genres,
            @RequestParam(required = false) Integer yearFrom,
            @RequestParam(required = false) Integer yearTo,
            @RequestParam(required = false) String oscarStatus,
            @PageableDefault(size = 15) Pageable pageable) {

        try {
            // Validazione input
            if (Stream.of(actor, character, crew, studio).filter(Objects::nonNull).count() > 1) {
                return ResponseEntity.badRequest().body("Puoi specificare solo un filtro tra attore, personaggio, crew e studio");
            }

            Page<FilmSearchResponse> results = filmAggregationService.advancedSearchFilms(
                    title, actor, character, crew, studio,
                    genres, yearFrom, yearTo, oscarStatus,
                    pageable);

            return ResponseEntity.ok(results);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}