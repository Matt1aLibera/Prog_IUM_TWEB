package com.example.springbootserver.controllers;

import com.example.springbootserver.dtos.*;
import com.example.springbootserver.services.FilmAggregationService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

/**
 * Film Aggregation Controller - Handles all movie data requests
 * Provides endpoints for searching, filtering and retrieving movie details
 */
@RestController
@RequestMapping("/api/films")
public class FilmAggregationController {
    private final FilmAggregationService filmAggregationService;
    /**
     * Initializes controller with aggregation service
     * @param filmAggregationService - Core service for movie data operations
     */
    @Autowired
    public FilmAggregationController(FilmAggregationService filmAggregationService) {
        this.filmAggregationService = filmAggregationService;
    }
    /**
     * POST /api/films/posters - Gets posters for multiple movies
     * @param {FilmIdsRequest} request - List of movie IDs to retrieve
     * @returns {FilmPosterResponse[]} 200 - List of movie posters
     * @throws {500} Internal server error
     */
    @PostMapping("/posters")
    public ResponseEntity<List<FilmPosterResponse>> getFilmsPosters(@RequestBody FilmIdsRequest request) {
        try {
            List<FilmPosterResponse> posters = filmAggregationService.getFilmsPosters(request.getIds());
            return ResponseEntity.ok(posters);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/films/{id} - Gets complete details for a specific movie
     * @param {number} id - Movie ID to retrieve
     * @returns {FilmDetailsResponse} 200 - Complete movie details
     * @throws {404} Movie not found
     * @throws {500} Internal server error
     */
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
    /**
     * GET /api/films/search/autocomplete - Quick search for autocomplete suggestions
     * @param {string} q - Search query string
     * @returns {FilmSearchResponse[]} 200 - Matching movie suggestions
     */
    @GetMapping("/search/autocomplete")
    public ResponseEntity<List<FilmSearchResponse>> autocomplete(
            @RequestParam String q) {
        return ResponseEntity.ok(filmAggregationService.searchFilmsAutocomplete(q));
    }
    /**
     * GET /api/films/search/full - Full text search with pagination
     * @param {string} q - Search query string
     * @param {Pageable} pageable - Pagination parameters
     * @returns {Page<FilmSearchResponse>} 200 - Paginated search results
     */
    @GetMapping("/search/full")
    public ResponseEntity<Page<FilmSearchResponse>> fullSearch(
            @RequestParam String q,
            @PageableDefault(size = 15) Pageable pageable) {

        return ResponseEntity.ok(filmAggregationService.searchFilmsFull(q, pageable));
    }
    /**
     * GET /api/films/advanced-search - Advanced filtered search
     * @param {string} [title] - Partial title match
     * @param {string} [actor] - Filter by actor name
     * @param {string} [character] - Filter by character name
     * @param {string} [crew] - Filter by crew member
     * @param {string} [studio] - Filter by studio
     * @param {string[]} [genres] - Filter by genres
     * @param {number} [yearFrom] - Minimum release year
     * @param {number} [yearTo] - Maximum release year
     * @param {string} [oscarStatus] - 'winner' or 'nominee'
     * @param {string} [sort] - Sorting criteria (format: field_order)
     * @param {Pageable} pageable - Pagination parameters
     * @returns {Page<FilmSearchResponse>} 200 - Filtered results
     * @throws {400} Invalid filter combination
     * @throws {500} Internal server error
     */
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
            @RequestParam(required = false) String sort,
            @PageableDefault(size = 15) Pageable pageable) {

        try {
            if (Stream.of(actor, character, crew, studio).filter(Objects::nonNull).count() > 1) {
                return ResponseEntity.badRequest().body("Puoi specificare solo un filtro tra attore, personaggio, crew e studio");
            }

            Page<FilmSearchResponse> results = filmAggregationService.advancedSearchFilms(
                    title, actor, character, crew, studio,
                    genres, yearFrom, yearTo, oscarStatus, sort,
                    pageable);

            return ResponseEntity.ok(results);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/films/by-genre - Gets movies by genre with Oscar stats
     * @param {string} genre - Genre to filter by
     * @param {number} [limit=15] - Maximum results to return
     * @returns {OscarFilmResponse[]} 200 - Movies with Oscar info
     * @throws {500} Internal server error
     */
    @GetMapping("/by-genre")
    public ResponseEntity<?> getFilmsByGenre(
            @RequestParam String genre,
            @RequestParam(defaultValue = "15") int limit) {

        try {
            List<OscarFilmResponse> results = filmAggregationService.getFilmsByGenreWithOscars(genre, limit);
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Error processing request: " + e.getMessage());
        }
    }
}