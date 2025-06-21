package com.example.springbootserver.services.CsvServices;

import com.example.springbootserver.models.ActorAppearance;
import com.example.springbootserver.models.Theme;
import com.example.springbootserver.repositories.ActorAppearanceRepo;
import com.example.springbootserver.repositories.ThemeRepo;
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
 * Service for loading movie theme data from CSV into database
 * Handles CSV parsing, validation and batch insertion of thematic information
 * including movie ID and theme classification
 */
@Service
public class ThemeCsvServ {
    private static final Logger logger = LoggerFactory.getLogger(ThemeCsvServ.class);
    private static final int BATCH_SIZE = 1000;

    private final ThemeRepo themeRepo;
    private final Resource csvFile;
    private final EntityManager entityManager;
    private final JdbcTemplate jdbcTemplate;
    /**
     * Initialize service with required dependencies
     * @param themeRepo Repository for theme data
     * @param csvFile CSV resource file from classpath (themes.csv)
     * @param entityManager JPA EntityManager for batch operations
     * @param jdbcTemplate JDBC template for DDL operations
     */
    public ThemeCsvServ(
            ThemeRepo themeRepo,
            @Value("classpath:csv/themes.csv") Resource csvFile,
            EntityManager entityManager,
            JdbcTemplate jdbcTemplate) {
        this.themeRepo = themeRepo;
        this.csvFile = csvFile;
        this.entityManager = entityManager;
        this.jdbcTemplate = jdbcTemplate;
    }
    /**
     * Check if theme data is already loaded in database
     * @return true if table exists and contains data, false otherwise
     * @throws Exception if database check fails
     */
    @Transactional(readOnly = true)
    public boolean isAlreadyLoaded() {
        try {
            if (!tableExists("theme")) {
                return false;
            }
            return themeRepo.count() > 0;
        } catch (Exception e) {
            logger.warn("Errore nel verificare lo stato del caricamento", e);
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
     * Main method to load theme data from CSV
     * Performs: table creation, CSV parsing, validation and batch insert
     * Expected CSV format: movie_id,theme
     * Required fields: both movie_id (numeric) and theme (textual classification)
     * @throws RuntimeException if file access fails or table creation fails
     */
    @Transactional
    public void loadThemes() {
        if (isAlreadyLoaded()) {
            logger.info("SKIP - Tabella Theme già popolata");
            return;
        }

        createTableIfNotExists();

        List<Theme> validThemes = new ArrayList<>();
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
                        logger.warn("SKIP - Riga {}: Formato non valido", lineNumber);
                        continue;
                    }

                    Theme theme = new Theme();
                    try {
                        theme.setMovieId(Long.parseLong(values[0].trim()));
                    } catch (NumberFormatException e) {
                        skippedRows.incrementAndGet();
                        logger.warn("SKIP - Riga {}: movie_id non numerico", lineNumber);
                        continue;
                    }

                    theme.setTheme(values[1].trim().replaceAll("^\"|\"$", ""));

                    validThemes.add(theme);

                } catch (Exception e) {
                    skippedRows.incrementAndGet();
                    logger.error("ERR - Riga {}: {}", lineNumber, e.getMessage());
                }
            }

            if (!validThemes.isEmpty()) {
                // Batch processing ottimizzato per JPA
                int batchSize = 1000;
                for (int i = 0; i < validThemes.size(); i++) {
                    entityManager.persist(validThemes.get(i));

                    if (i % batchSize == 0 && i > 0) {
                        entityManager.flush();
                        entityManager.clear();
                    }
                }

                logger.info("SUCCESS - Caricati {} temi ({} righe processate, {} saltate)",
                        validThemes.size(), processedRows.get(), skippedRows.get());
            } else {
                logger.warn("WARN - Nessun tema valido trovato");
            }

        } catch (IOException e) {
            logger.error("CRITICAL - Errore accesso file CSV", e);
            throw new RuntimeException("Errore di lettura file CSV", e);
        }
    }
    /**
     * Create theme table if not exists with required columns
     * Uses direct JDBC for DDL operations with columns:
     * id (auto-increment), movie_id (FK to movie), theme (textual classification)
     * @throws RuntimeException if table creation fails
     */
    private void createTableIfNotExists() {
        try {
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS theme (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "movie_id BIGINT NOT NULL, " +
                    "theme TEXT NOT NULL)");
            logger.info("Tabella theme verificata/creata con successo");
        } catch (Exception e) {
            logger.error("Errore nella creazione della tabella theme", e);
            throw new RuntimeException("Impossibile creare la tabella theme", e);
        }
    }
}