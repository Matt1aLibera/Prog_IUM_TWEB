package com.example.springbootserver.services.CsvServices;

import com.example.springbootserver.models.ActorAppearance;
import com.example.springbootserver.repositories.ActorAppearanceRepo;
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
 * Service for loading actor appearances data from CSV into database
 * Handles CSV parsing, data validation and batch database operations
 */
@Service
public class ActorCsvServ {
    private static final Logger logger = LoggerFactory.getLogger(ActorCsvServ.class);

    private final ActorAppearanceRepo actorAppearanceRepo;
    private final Resource csvFile;
    private final EntityManager entityManager;
    private final JdbcTemplate jdbcTemplate;
    /**
     * Initialize service with required dependencies
     * @param actorAppearanceRepo Repository for actor appearances
     * @param csvFile CSV resource file from classpath
     * @param entityManager JPA EntityManager for batch operations
     * @param jdbcTemplate JDBC template for DDL operations
     */
    public ActorCsvServ(
            ActorAppearanceRepo actorAppearanceRepo,
            @Value("classpath:csv/actors.csv") Resource csvFile,
            EntityManager entityManager,
            JdbcTemplate jdbcTemplate) {
        this.actorAppearanceRepo = actorAppearanceRepo;
        this.csvFile = csvFile;
        this.entityManager = entityManager;
        this.jdbcTemplate = jdbcTemplate;
    }
    /**
     * Check if data is already loaded in database
     * @return true if table exists and contains data, false otherwise
     */
    @Transactional(readOnly = true)
    public boolean isAlreadyLoaded() {
        try {
            if (!tableExists("actor_appearances")) {
                return false;
            }
            return actorAppearanceRepo.count() > 0;
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
     * Main method to load actor appearances from CSV
     * Performs: table creation, CSV parsing, validation and batch insert
     * @throws RuntimeException if file access fails or table creation fails
     */
    @Transactional
    public void loadActorAppearances() {
        if (isAlreadyLoaded()) {
            logger.info("SKIP - Tabella ActorAppearances già popolata");
            return;
        }

        createTableIfNotExists();

        List<ActorAppearance> validAppearances = new ArrayList<>();
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

                    ActorAppearance appearance = new ActorAppearance();
                    try {
                        appearance.setMovieId(Long.parseLong(values[0].trim()));
                    } catch (NumberFormatException e) {
                        skippedRows.incrementAndGet();
                        logger.warn("SKIP - Riga {}: movie_id non numerico", lineNumber);
                        continue;
                    }

                    appearance.setActorName(values[1].trim().replaceAll("^\"|\"$", ""));
                    appearance.setCharacterName(values.length > 2 ? values[2].trim().replaceAll("^\"|\"$", "") : null);

                    validAppearances.add(appearance);

                } catch (Exception e) {
                    skippedRows.incrementAndGet();
                    logger.error("ERR - Riga {}: {}", lineNumber, e.getMessage());
                }
            }

            if (!validAppearances.isEmpty()) {
                // Batch processing ottimizzato per JPA
                int batchSize = 1000;
                for (int i = 0; i < validAppearances.size(); i++) {
                    entityManager.persist(validAppearances.get(i));

                    if (i % batchSize == 0 && i > 0) {
                        entityManager.flush();
                        entityManager.clear();
                    }
                }

                logger.info("SUCCESS - Caricati {} record ({} righe processate, {} saltate)",
                        validAppearances.size(), processedRows.get(), skippedRows.get());
            } else {
                logger.warn("WARN - Nessun record valido trovato");
            }

        } catch (IOException e) {
            logger.error("CRITICAL - Errore accesso file CSV", e);
            throw new RuntimeException("Errore di lettura file CSV", e);
        }
    }
    /**
     * Create actor_appearances table if not exists
     * Uses direct JDBC for DDL operations
     * @throws RuntimeException if table creation fails
     */
    private void createTableIfNotExists() {
        try {
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS actor_appearances (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "movie_id BIGINT NOT NULL, " +
                    "actor_name VARCHAR(1000) NOT NULL, " +  // Aumentato a 1000
                    "character_name VARCHAR(1000))");        // Aumentato a 1000
        } catch (Exception e) {
            logger.error("Errore nella creazione della tabella", e);
            throw new RuntimeException("Errore creazione tabella", e);
        }
    }
}