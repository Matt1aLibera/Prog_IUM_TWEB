package com.example.springbootserver.services.CsvServices;
import com.example.springbootserver.models.ActorAppearance;
import com.example.springbootserver.models.Genre;
import com.example.springbootserver.repositories.ActorAppearanceRepo;
import com.example.springbootserver.repositories.GenreRepo;
import jakarta.persistence.EntityManager;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.LoggerFactory;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.ArrayList;
import java.util.List;
/**
 * Service for loading movie genres data from CSV into database
 * Handles CSV parsing, validation and batch insertion of genre information
 */
@Service
public class GenreCsvServ {
    private static final Logger logger = LoggerFactory.getLogger(GenreCsvServ.class);
    private static final int BATCH_SIZE = 1000;

    private final GenreRepo genreRepo;
    private final Resource csvFile;
    private final EntityManager entityManager;
    private final JdbcTemplate jdbcTemplate;
    /**
     * Initialize service with required dependencies
     * @param genreRepo Repository for genre data
     * @param csvFile CSV resource file from classpath (genres.csv)
     * @param entityManager JPA EntityManager for batch operations
     * @param jdbcTemplate JDBC template for DDL operations
     */
    public GenreCsvServ(
            GenreRepo genreRepo,
            @Value("classpath:csv/genres.csv") Resource csvFile,
            EntityManager entityManager,
            JdbcTemplate jdbcTemplate) {
        this.genreRepo = genreRepo;
        this.csvFile = csvFile;
        this.entityManager = entityManager;
        this.jdbcTemplate = jdbcTemplate;
    }
    /**
     * Check if genre data is already loaded in database
     * @return true if table exists and contains data, false otherwise
     * @throws Exception if database check fails
     */
    @Transactional(readOnly = true)
    public boolean isAlreadyLoaded() {
        try {
            if (!tableExists("genre")) {
                return false;
            }
            return genreRepo.count() > 0;
        } catch (Exception e) {
            logger.warn("Errore nel verificare lo stato del caricamento", e);
            return false;
        }
    }
    /**
     * Check if database table exists
     * @param tableName Name of table to check
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
     * Main method to load genre data from CSV
     * Performs: table creation, CSV parsing, validation and batch insert
     * Expected CSV format: movie_id,genre
     * @throws RuntimeException if file access fails or table creation fails
     */
    @Transactional
    public void loadGenres() {
        if (isAlreadyLoaded()) {
            logger.info("SKIP - Tabella Genre già popolata");
            return;
        }

        createTableIfNotExists();

        List<Genre> validGenres = new ArrayList<>();
        AtomicInteger processedRows = new AtomicInteger(0);
        AtomicInteger skippedRows = new AtomicInteger(0);

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(csvFile.getInputStream()))) {
            String line;
            int lineNumber = 0;

            reader.readLine(); // Skip header
            lineNumber++;

            while ((line = reader.readLine()) != null) {
                lineNumber++;
                processedRows.incrementAndGet();

                try {
                    String[] values = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)", -1);

                    if (values.length < 2 || values[0].isEmpty() || values[1].isEmpty()) {
                        skippedRows.incrementAndGet();
                        logger.warn("SKIP - Riga {}: Formato non valido (campi mancanti)", lineNumber);
                        continue;
                    }

                    Genre genre = new Genre();
                    try {
                        genre.setMovieId(Long.parseLong(values[0].trim()));
                    } catch (NumberFormatException e) {
                        skippedRows.incrementAndGet();
                        logger.warn("SKIP - Riga {}: movie_id non numerico - {}", lineNumber, values[0]);
                        continue;
                    }

                    genre.setGenre(values[1].trim().replaceAll("^\"|\"$", ""));

                    validGenres.add(genre);

                } catch (Exception e) {
                    skippedRows.incrementAndGet();
                    logger.error("ERR - Riga {}: {} - Linea: {}", lineNumber, e.getMessage(), line);
                }
            }

            if (!validGenres.isEmpty()) {
                // Batch processing ottimizzato per JPA
                int batchSize = 1000;
                for (int i = 0; i < validGenres.size(); i++) {
                    entityManager.persist(validGenres.get(i));

                    if (i % batchSize == 0 && i > 0) {
                        entityManager.flush();
                        entityManager.clear();
                    }
                }

                logger.info("SUCCESS - Caricati {} generi ({} righe processate, {} saltate)",
                        validGenres.size(), processedRows.get(), skippedRows.get());
            } else {
                logger.warn("WARN - Nessun genere valido trovato");
            }

        } catch (IOException e) {
            logger.error("CRITICAL - Errore accesso file CSV", e);
            throw new RuntimeException("Errore di lettura file CSV", e);
        }
    }

    /**
     * Create genre table if not exists
     * Uses direct JDBC for DDL operations with TEXT column for genre names
     * @throws RuntimeException if table creation fails
     */
    private void createTableIfNotExists() {
        try {
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS genre (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "movie_id BIGINT NOT NULL, " +
                    "genre TEXT NOT NULL)");
            logger.info("Tabella genre verificata/creata con successo");
        } catch (Exception e) {
            logger.error("Errore nella creazione della tabella genre", e);
            throw new RuntimeException("Impossibile creare la tabella genre", e);
        }
    }
}
