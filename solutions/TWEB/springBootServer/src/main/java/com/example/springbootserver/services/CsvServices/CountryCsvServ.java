package com.example.springbootserver.services.CsvServices;

import com.example.springbootserver.models.Country;
import com.example.springbootserver.repositories.CountryRepo;
import jakarta.persistence.EntityManager;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.LoggerFactory;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
/**
 * Service for loading movie country data from CSV into database
 * Handles CSV parsing, validation and batch insertion of country information
 */
@Service
public class CountryCsvServ {
    private static final Logger logger = LoggerFactory.getLogger(CountryCsvServ.class);
    private static final int BATCH_SIZE = 1000;

    private final CountryRepo countryRepo;
    private final Resource csvFile;
    private final EntityManager entityManager;
    private final JdbcTemplate jdbcTemplate;
    /**
     * Initialize service with required dependencies
     * @param countryRepo Repository for country data
     * @param csvFile CSV resource file from classpath
     * @param entityManager JPA EntityManager for batch operations
     * @param jdbcTemplate JDBC template for DDL operations
     */
    public CountryCsvServ(
            CountryRepo countryRepo,
            @Value("classpath:csv/countries.csv") Resource csvFile,
            EntityManager entityManager,
            JdbcTemplate jdbcTemplate) {
        this.countryRepo = countryRepo;
        this.csvFile = csvFile;
        this.entityManager = entityManager;
        this.jdbcTemplate = jdbcTemplate;
    }
    /**
     * Check if country data is already loaded in database
     * @return true if table exists and contains data, false otherwise
     * @throws Exception if database check fails
     */
    @Transactional(readOnly = true)
    public boolean isAlreadyLoaded() {
        try {
            if (!tableExists("country")) {
                return false;
            }
            return countryRepo.count() > 0;
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
     * Main method to load country data from CSV
     * Performs: table creation, CSV parsing, validation and batch insert
     * @throws RuntimeException if file access fails or table creation fails
     */
    @Transactional
    public void loadCountries() {
        if (isAlreadyLoaded()) {
            logger.info("SKIP - Tabella Country già popolata");
            return;
        }

        createTableIfNotExists();

        List<Country> validCountries = new ArrayList<>();
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
                    String[] values = parseCsvLine(line);

                    if (values.length < 2 || values[0].isEmpty() || values[1].isEmpty()) {
                        skippedRows.incrementAndGet();
                        logger.warn("SKIP - Riga {}: Formato non valido", lineNumber);
                        continue;
                    }

                    Country country = new Country();
                    try {
                        country.setMovieId(Long.parseLong(values[0].trim()));
                    } catch (NumberFormatException e) {
                        skippedRows.incrementAndGet();
                        logger.warn("SKIP - Riga {}: movie_id non numerico", lineNumber);
                        continue;
                    }

                    country.setCountryName(values[1].trim().replaceAll("^\"|\"$", ""));

                    validCountries.add(country);

                } catch (Exception e) {
                    skippedRows.incrementAndGet();
                    logger.error("ERR - Riga {}: {}", lineNumber, e.getMessage());
                }
            }

            if (!validCountries.isEmpty()) {
                // Batch processing ottimizzato per JPA
                int batchSize = 1000;
                for (int i = 0; i < validCountries.size(); i++) {
                    entityManager.persist(validCountries.get(i));

                    if (i % batchSize == 0 && i > 0) {
                        entityManager.flush();
                        entityManager.clear();
                    }
                }

                logger.info("SUCCESS - Caricati {} paesi ({} righe processate, {} saltate)",
                        validCountries.size(), processedRows.get(), skippedRows.get());
            } else {
                logger.warn("WARN - Nessun paese valido trovato");
            }

        } catch (IOException e) {
            logger.error("CRITICAL - Errore accesso file CSV", e);
            throw new RuntimeException("Errore di lettura file CSV", e);
        }
    }
    /**
     * Create country table if not exists
     * Uses direct JDBC for DDL operations
     * @throws RuntimeException if table creation fails
     */
    private void createTableIfNotExists() {
        try {
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS country (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "movie_id BIGINT NOT NULL, " +
                    "country_name VARCHAR(1000) NOT NULL)"); // Aumentato a 1000 caratteri
        } catch (Exception e) {
            logger.error("Errore nella creazione della tabella country", e);
            throw new RuntimeException("Impossibile creare la tabella country", e);
        }
    }

    /**
     * Custom CSV line parser that handles quoted values
     * @param line Raw CSV line to parse
     * @return Array of parsed values
     */
    private String[] parseCsvLine(String line) {
        List<String> values = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder currentValue = new StringBuilder();

        for (char c : line.toCharArray()) {
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                values.add(currentValue.toString());
                currentValue.setLength(0);
            } else {
                currentValue.append(c);
            }
        }
        values.add(currentValue.toString());
        return values.toArray(new String[0]);
    }
}