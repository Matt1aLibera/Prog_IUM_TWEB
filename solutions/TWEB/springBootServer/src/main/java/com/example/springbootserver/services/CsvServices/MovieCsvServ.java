package com.example.springbootserver.services.CsvServices;

import com.example.springbootserver.models.Movie;
import com.example.springbootserver.repositories.MovieRepo;
import com.opencsv.bean.ColumnPositionMappingStrategy;
import com.opencsv.bean.CsvToBean;
import com.opencsv.bean.CsvToBeanBuilder;
import com.opencsv.bean.HeaderColumnNameMappingStrategy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class MovieCsvServ {
    private static final Logger logger = LoggerFactory.getLogger(MovieCsvServ.class);

    private final MovieRepo movieRepository;
    private final Resource csvFile;
    @Transactional(readOnly = true)
    public boolean isAlreadyLoaded() {
        return movieRepository.count() > 0;
    }

    public MovieCsvServ(MovieRepo movieRepository,
                        @Value("classpath:csv/movies.csv") Resource csvFile) {
        this.movieRepository = movieRepository;
        this.csvFile = csvFile;
    }

    @Transactional
    public void loadMovies() {
        if (isAlreadyLoaded()) {
            logger.info("SKIP - Tabella Movie già popolata");
            return;
        }
        List<Movie> validMovies = new ArrayList<>();
        AtomicInteger processedRows = new AtomicInteger(0);
        AtomicInteger skippedRows = new AtomicInteger(0);

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(csvFile.getInputStream()))) {
            String line;
            int lineNumber = 0;

            // Salta l'header
            reader.readLine();
            lineNumber++;

            while ((line = reader.readLine()) != null) {
                lineNumber++;
                processedRows.incrementAndGet();

                try {
                    // Parsing manuale più tollerante
                    String[] values = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)", -1);

                    // Validazione base
                    if (values.length < 2 || values[0].isEmpty() || values[1].isEmpty()) {
                        skippedRows.incrementAndGet();
                        logger.warn("SKIP - Riga {}: Formato non valido - {}", lineNumber, line);
                        continue;
                    }

                    // Costruzione oggetto Movie
                    Movie movie = new Movie();
                    try {
                        movie.setId(Long.parseLong(values[0].trim()));
                    } catch (NumberFormatException e) {
                        skippedRows.incrementAndGet();
                        logger.warn("SKIP - Riga {}: ID non numerico - {}", lineNumber, values[0]);
                        continue;
                    }

                    movie.setName(values[1].trim().replaceAll("^\"|\"$", ""));

                    // Campi opzionali con gestione errori
                    if (values.length > 2 && !values[2].isEmpty()) {
                        try {
                            movie.setDate(Integer.parseInt(values[2].trim()));
                        } catch (NumberFormatException e) {
                            movie.setDate(0);
                            logger.debug("WARN - Riga {}: Formato data non valido, impostato a 0", lineNumber);
                        }
                    } else {
                        movie.setDate(0);
                    }

                    if (values.length > 3) movie.setTagline(values[3].trim().replaceAll("^\"|\"$", ""));
                    if (values.length > 4) movie.setDescription(values[4].trim().replaceAll("^\"|\"$", ""));

                    if (values.length > 5 && !values[5].isEmpty()) {
                        try {
                            movie.setMinute(Integer.parseInt(values[5].trim()));
                        } catch (NumberFormatException e) {
                            movie.setMinute(0);
                            logger.debug("WARN - Riga {}: Formato minuti non valido, impostato a 0", lineNumber);
                        }
                    } else {
                        movie.setMinute(0);
                    }

                    validMovies.add(movie);

                } catch (Exception e) {
                    skippedRows.incrementAndGet();
                    logger.error("ERR - Riga {}: Errore elaborazione - {} | Linea: {}",
                            lineNumber, e.getMessage(), line);
                }
            }

            if (!validMovies.isEmpty()) {
                movieRepository.saveAll(validMovies);
                logger.info("SUCCESS - Caricati {} film ({} righe processate, {} saltate)",
                        validMovies.size(), processedRows.get(), skippedRows.get());
            } else {
                logger.warn("WARN - Nessun film valido trovato");
            }

        } catch (IOException e) {
            logger.error("CRITICAL - Errore accesso file CSV: {}", e.getMessage());
            throw new RuntimeException("Errore di lettura file CSV", e);
        }
    }
}