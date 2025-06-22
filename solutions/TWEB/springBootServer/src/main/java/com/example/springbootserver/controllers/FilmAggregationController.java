package com.example.springbootserver.controllers;

import com.example.springbootserver.dtos.*;
import com.example.springbootserver.services.FilmAggregationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.apache.commons.lang3.StringUtils;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

/**
 * Film Aggregation Controller - Handles all movie data requests
 * Provides endpoints for searching, filtering and retrieving movie details
 */
@Tag(name = "Film Aggregation", description = "Handles all movie data requests and search operations")
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

    @Operation(
            summary = "Get movie posters",
            description = "Retrieves posters for multiple movies by their IDs",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "List of movie posters retrieved successfully",
                            content = @Content(array = @ArraySchema(schema = @Schema(implementation = FilmPosterResponse.class)))
                    ),
                    @ApiResponse(
                            responseCode = "500",
                            description = "Internal server error"
                    )
            }
    )
    @PostMapping("/posters")
    public ResponseEntity<List<FilmPosterResponse>> getFilmsPosters(@RequestBody @Schema(description = "List of movie IDs to retrieve")
                                                                        FilmIdsRequest request) {
        try {
            List<FilmPosterResponse> posters = filmAggregationService.getFilmsPosters(request.getIds());
            return ResponseEntity.ok(posters);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Operation(
            summary = "Get movie details",
            description = "Retrieves complete details for a specific movie",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Movie details retrieved successfully",
                            content = @Content(schema = @Schema(implementation = FilmDetailsResponse.class))
                    ),
                    @ApiResponse(
                            responseCode = "404",
                            description = "Movie not found"
                    ),
                    @ApiResponse(
                            responseCode = "500",
                            description = "Internal server error"
                    )
            }
    )
    @GetMapping("/{id}")
    public ResponseEntity<FilmDetailsResponse> getFilmDetails( @Parameter(description = "ID of the movie to retrieve", required = true)
                                                                   @PathVariable Long id) {
        try {
            FilmDetailsResponse film = filmAggregationService.getFilmDetails(id);
            return ResponseEntity.ok(film);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Operation(
            summary = "Autocomplete search",
            description = "Provides quick search for autocomplete suggestions",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "List of matching movie suggestions",
                            content = @Content(array = @ArraySchema(schema = @Schema(implementation = FilmSearchResponse.class)))
                    )
            }
    )
    @GetMapping("/search/autocomplete")
    public ResponseEntity<List<FilmSearchResponse>> autocomplete(
            @Parameter(description = "Search query string", required = true)
            @RequestParam String q) {
        return ResponseEntity.ok(filmAggregationService.searchFilmsAutocomplete(q));
    }

    @Operation(
            summary = "Full text search",
            description = "Performs full text search with pagination support",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Paginated search results",
                            content = @Content(schema = @Schema(implementation = FilmSearchResponse.class)))
                            }
    )

    @GetMapping("/search/full")
    public ResponseEntity<Page<FilmSearchResponse>> fullSearch(
            @Parameter(description = "Search query string", required = true)
            @RequestParam String q,
            @Parameter(description = "Pagination parameters")
            @PageableDefault(size = 15) Pageable pageable) {

        return ResponseEntity.ok(filmAggregationService.searchFilmsFull(q, pageable));
    }
    @Operation(
            summary = "Advanced search",
            description = "Performs advanced filtered search with multiple criteria",
            parameters = {
                    @Parameter(name = "title", description = "Partial title match"),
                    @Parameter(name = "actor", description = "Filter by actor name"),
                    @Parameter(name = "character", description = "Filter by character name"),
                    @Parameter(name = "crew", description = "Filter by crew member"),
                    @Parameter(name = "studio", description = "Filter by studio"),
                    @Parameter(name = "genres", description = "Filter by genres (array)"),
                    @Parameter(name = "yearFrom", description = "Minimum release year"),
                    @Parameter(name = "yearTo", description = "Maximum release year"),
                    @Parameter(name = "oscarStatus", description = "Filter by Oscar status",
                            schema = @Schema(allowableValues = {"winner", "nominee"})),
                    @Parameter(name = "sort", description = "Sorting criteria (field_order)")
            },
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Filtered search results",
                            content = @Content(schema = @Schema(implementation = FilmSearchResponse.class))
                    ),
                    @ApiResponse(
                            responseCode = "400",
                            description = "Invalid filter combination"
                    ),
                    @ApiResponse(
                            responseCode = "500",
                            description = "Internal server error"
                    )
            }
    )
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
    @Operation(
            summary = "Get movies by genre",
            description = "Retrieves movies by genre with Oscar statistics",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "List of movies with Oscar info",
                            content = @Content(array = @ArraySchema(schema = @Schema(implementation = OscarFilmResponse.class)))
                    ),
                    @ApiResponse(
                            responseCode = "500",
                            description = "Internal server error"
                    )
            }
    )
    @GetMapping("/by-genre")
    public ResponseEntity<?> getFilmsByGenre(
            @Parameter(description = "Genre to filter by", required = true)
            @RequestParam String genre,
            @Parameter(description = "Maximum number of results to return", example = "15")
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