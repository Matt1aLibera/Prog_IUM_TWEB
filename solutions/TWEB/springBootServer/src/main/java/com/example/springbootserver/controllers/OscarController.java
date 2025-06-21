package com.example.springbootserver.controllers;

import com.example.springbootserver.models.OscarAward;
import com.example.springbootserver.repositories.OscarAwardRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
/**
 * Oscar Awards Controller - Handles Oscar-related data operations
 * Provides endpoints for searching and filtering Oscar award records
 */
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
    /**
     * GET /api/oscars/search - Searches Oscar awards by film name and optional year
     * @param {string} filmName - Partial film name to search (case insensitive)
     * @param {number} [year] - Optional year to filter awards
     * @returns {OscarAward[]} 200 - List of matching Oscar awards
     * @description Performs expanded year search if no exact matches found (+/- 1 year)
     * @description Returns results ordered by year when no year specified
     */
    @GetMapping("/search")
    public ResponseEntity<List<OscarAward>> searchOscars(
            @RequestParam String filmName,
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
