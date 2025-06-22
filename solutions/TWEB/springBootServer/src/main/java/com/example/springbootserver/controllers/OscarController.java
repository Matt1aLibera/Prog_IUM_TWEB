package com.example.springbootserver.controllers;

import com.example.springbootserver.models.OscarAward;
import com.example.springbootserver.repositories.OscarAwardRepo;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "Oscar Awards", description = "Manage Oscar award data and search operations")
@RestController
@RequestMapping("/api/oscars")
public class OscarController {

    private final OscarAwardRepo oscarAwardRepo;
    /**
     * Initializes controller with Oscar award repository
     * @param oscarAwardRepo - Repository for Oscar award data access
     */
    @Autowired
    public OscarController(OscarAwardRepo oscarAwardRepo) {
        this.oscarAwardRepo = oscarAwardRepo;
    }

    @Operation(
            summary = "Search Oscar awards",
            description = "Searches awards by film name with optional year filter. Expands search to adjacent years if no exact match found.",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "List of matching Oscar awards",
                            content = @Content(
                                    mediaType = "application/json",
                                    array = @ArraySchema(schema = @Schema(implementation = OscarAward.class))
                            )
                    )
            }
    )
    @GetMapping("/search")
    public ResponseEntity<List<OscarAward>> searchOscars(
            @Parameter(description = "Partial film name (case insensitive)", example = "godfather", required = true)
            @RequestParam String filmName,
            @Parameter(description = "Optional release year filter", example = "1972")
            @RequestParam(required = false) Integer year) {

        List<OscarAward> results;

        if (year != null) {
            // 1. Prima ricerca con anno esatto
            results = oscarAwardRepo.findByFilmContainingIgnoreCaseAndYearFilm(filmName, year);

            // 2. Se nessun risultato, cerca negli anni adiacenti
            if (results.isEmpty()) {
                results = oscarAwardRepo.findByFilmContainingIgnoreCaseAndYearFilmBetween(
                        filmName,
                        year - 1,
                        year + 1
                );

                // 3. Filtra eventuali duplicati (stessa categoria in anni diversi)
                results = filterDuplicates(results);
            }
        } else {
            // Solo nome, ordinati per anno più recente
            results = oscarAwardRepo.findByFilmContainingIgnoreCaseOrderByYearFilmDesc(filmName);
        }

        return ResponseEntity.ok(results);
    }
    /**
     * Filters duplicate Oscar awards by category
     * @param awards - List of awards to filter
     * @returns {List<OscarAward>} - Filtered list with unique categories
     * @description Keeps only the first award for each category
     */
    private List<OscarAward> filterDuplicates(List<OscarAward> awards) {
        Map<String, OscarAward> uniqueAwards = new LinkedHashMap<>();

        for (OscarAward award : awards) {
            // Conserva solo il primo risultato per categoria
            uniqueAwards.putIfAbsent(award.getCategory(), award);
        }

        return new ArrayList<>(uniqueAwards.values());
    }
}
