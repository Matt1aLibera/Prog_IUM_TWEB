package com.example.springbootserver.controllers.CsvController;

import com.example.springbootserver.services.CsvServices.ActorCsvServ;
import com.example.springbootserver.services.CsvServices.MovieCsvServ;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class CsvCont {

    private final MovieCsvServ movieCsvServ;
    private final ActorCsvServ actorCsvServ;

    @Autowired
    public CsvCont(MovieCsvServ movieCsvServ, ActorCsvServ actorCsvServ) {
        this.movieCsvServ = movieCsvServ;
        this.actorCsvServ = actorCsvServ;
    }
    @PostMapping("/upload-db")
    public ResponseEntity<?> uploadDatabase() {
        try {
            movieCsvServ.loadMovies();
            actorCsvServ.loadActorAppearances();

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