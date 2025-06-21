package com.example.springbootserver.services.CsvServices;

import com.example.springbootserver.models.Movie;
import com.example.springbootserver.repositories.MovieRepo;
import com.opencsv.bean.ColumnPositionMappingStrategy;
import com.opencsv.bean.CsvToBean;
import com.opencsv.bean.CsvToBeanBuilder;
import com.opencsv.bean.HeaderColumnNameMappingStrategy;
import jakarta.persistence.EntityManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
/**
 * Service for loading movie data from CSV into database
 * Handles CSV parsing, validation and batch insertion of movie information
 * including title, release date, tagline, description and runtime
 */
@Service
public class MovieCsvServ {
    private static final Logger logger = LoggerFactory.getLogger(MovieCsvServ.class);

    private final MovieRepo movieRepository;
    private final Resource csvFile;
    private final EntityManager entityManager;
    private final JdbcTemplate jdbcTemplate; // Aggiunto questo campo

    /**
     * Initialize service with required dependencies
     * @param movieRepository Repository for movie data
     * @param csvFile CSV resource file from classpath (movies.csv)
     * @param entityManager JPA EntityManager for database operations
     * @param jdbcTemplate JDBC template for DDL operations
     */
    public MovieCsvServ(MovieRepo movieRepository,
                        @Value("classpath:csv/movies.csv") Resource csvFile,
                        EntityManager entityManager,
                        JdbcTemplate jdbcTemplate) {
        this.movieRepository = movieRepository;
        this.csvFile = csvFile;
        this.entityManager = entityManager;
        this.jdbcTemplate = jdbcTemplate;
    }
    /**
     * Check if movie data is already loaded in database
     * @return true if table exists and contains data, false otherwise
     * @throws Exception if database check fails
     */
    @Transactional(readOnly = true)
    public boolean isAlreadyLoaded() {
        try {
            // Verifica prima se la tabella esiste
            if (!tableExists("movie")) {
                return false;
            }
            return movieRepository.count() > 0;
        } catch (Exception e) {
            logger.warn("Errore nel verificare lo stato del caricamento, assumendo tabella vuota", e);
            return false;
        }
    }
    /**
     * Check if database table exists
     * @param tableName Name of table to check (case insensitive)
     * @return true if table exists in schema
     */
    private boolean tableExists(String tableName) {
        try {
            Long count = (Long) entityManager.createNativeQuery(
                            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ?1")
                    .setParameter(1, tableName.toLowerCase())
                    .getSingleResult();
            return count > 0;
        } catch (Exception e) {
            logger.warn("Errore nel verificare l'esistenza della tabella", e);
            return false;
        }
    }
    /**
     * Main method to load movie data from CSV
     * Performs: table creation, CSV parsing, validation and batch insert
     * Expected CSV format: id,name,date,tagline,description,minute
     * Required fields: id and name (others have default values if missing/invalid)
     * @throws RuntimeException if file access fails or table creation fails
     */
    @Transactional
    public void loadMovies() {
        if (isAlreadyLoaded()) {
            logger.info("SKIP - Tabella Movie già popolata");
            return;
        }

        // Crea la tabella se non esiste
        createMovieTableIfNotExists();

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
                    String[] values = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)", -1);

                    if (values.length < 2 || values[0].isEmpty() || values[1].isEmpty()) {
                        skippedRows.incrementAndGet();
                        logger.warn("SKIP - Riga {}: Formato non valido - {}", lineNumber, line);
                        continue;
                    }

                    Movie movie = new Movie();
                    try {
                        movie.setId(Long.parseLong(values[0].trim()));
                    } catch (NumberFormatException e) {
                        skippedRows.incrementAndGet();
                        logger.warn("SKIP - Riga {}: ID non numerico - {}", lineNumber, values[0]);
                        continue;
                    }

                    movie.setName(values[1].trim().replaceAll("^\"|\"$", ""));

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

    /**
     * Create movie table if not exists with all required columns
     * Uses direct JDBC for DDL operations with columns:
     * id (PK), name, date, tagline, description, minute
     * @throws RuntimeException if table creation fails
     */
    private void createMovieTableIfNotExists() {
        try {
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS movie (" +  // Nota: qui usiamo "movie" non "movies"
                    "id BIGINT PRIMARY KEY, " +
                    "name VARCHAR(255), " +
                    "date INTEGER, " +
                    "tagline TEXT, " +
                    "description TEXT, " +
                    "minute INTEGER)");
        } catch (Exception e) {
            logger.error("Errore nella creazione della tabella movie", e);
            throw new RuntimeException("Errore nella creazione della tabella movie", e);
        }
    }
}