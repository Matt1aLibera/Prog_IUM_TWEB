package com.example.springbootserver.controllers.CsvController;

import com.example.springbootserver.services.CsvServices.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
/**
 * CSV Data Loading Controller - Handles bulk import of movie data
 * Provides endpoint for initializing database from CSV files
 * Cross-origin requests allowed from all origins
 */
@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api")
public class CsvCont {

    private final MovieCsvServ movieCsvServ;
    private final ActorCsvServ actorCsvServ;
    private final CountryCsvServ countryCsvServ;
    private final CrewCsvServ crewCsvServ;
    private final GenreCsvServ genreCsvServ;
    private final LanguagesCsvServ languagesCsvServ;
    private final PosterCsvServ posterCsvServ;
    private final ReleasesCsvServ releasesCsvServ;
    private final StudiosCsvServ studiosCsvServ;
    private final ThemeCsvServ themeCsvServ;
    private final OscarCsvServ oscarCsvServ;

    /**
     * Initializes CSV loading controller with all required services
     * @param movieCsvServ - Movie data loading service
     * @param actorCsvServ - Actor data loading service
     * @param countryCsvServ - Country data loading service
     * @param crewCsvServ - Crew data loading service
     * @param genreCsvServ - Genre data loading service
     * @param languagesCsvServ - Language data loading service
     * @param posterCsvServ - Poster data loading service
     * @param releasesCsvServ - Release data loading service
     * @param studiosCsvServ - Studio data loading service
     * @param themeCsvServ - Theme data loading service
     * @param oscarCsvServ - Oscar data loading service
     */
    @Autowired
    public CsvCont(MovieCsvServ movieCsvServ, ActorCsvServ actorCsvServ, CountryCsvServ countryCsvServ, CrewCsvServ crewCsvServ, GenreCsvServ genreCsvServ, LanguagesCsvServ languagesCsvServ,PosterCsvServ posterCsvServ, ReleasesCsvServ releasesCsvServ, StudiosCsvServ studiosCsvServ, ThemeCsvServ themeCsvServ, OscarCsvServ oscarCsvServ) {
        this.movieCsvServ = movieCsvServ;
        this.actorCsvServ = actorCsvServ;
        this.countryCsvServ = countryCsvServ;
        this.crewCsvServ = crewCsvServ;
        this.genreCsvServ = genreCsvServ;
        this.languagesCsvServ = languagesCsvServ;
        this.posterCsvServ = posterCsvServ;
        this.releasesCsvServ = releasesCsvServ;
        this.studiosCsvServ = studiosCsvServ;
        this.themeCsvServ = themeCsvServ;
        this.oscarCsvServ = oscarCsvServ;
    }

    /**
     * POST /api/upload-db - Loads all movie data from CSV files into database
     * @returns {JSON} 200 - Success message with loading status
     * @returns {JSON} 500 - Error details if loading fails
     * @throws {Exception} - Database errors or file parsing issues
     */
    @PostMapping("/upload-db")
    public ResponseEntity<?> uploadDatabase() {
        try {
            movieCsvServ.loadMovies();
            actorCsvServ.loadActorAppearances();
            countryCsvServ.loadCountries();
            crewCsvServ.loadCrewData();
            genreCsvServ.loadGenres();
            languagesCsvServ.loadLanguages();
            posterCsvServ.loadPosters();
            releasesCsvServ.loadReleases();
            studiosCsvServ.loadStudios();
            themeCsvServ.loadThemes();
            oscarCsvServ.loadOscarAwards();

            return ResponseEntity.ok().body(
                    Map.of(
                            "success", true,
                            "message", "Caricamento completato con alcuni errori",
                            "details", "Verificare i log per dettagli"
                    )
            );
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(
                    Map.of(
                            "success", false,
                            "message", "Errore durante il caricamento",
                            "error", e.getMessage()
                    )
            );
        }
    }

     // Classe interna per la risposta standardizzata
    private record UploadResponse(boolean success, String message) {}
}