package com.example.springbootserver.controllers.CsvController;

import com.example.springbootserver.services.CsvServices.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

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