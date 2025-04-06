package com.example.springbootserver.services.CsvServices;
import com.example.springbootserver.models.ActorAppearance;
import com.example.springbootserver.models.Studio;
import com.example.springbootserver.repositories.ActorAppearanceRepo;
import com.example.springbootserver.repositories.StudioRepo;
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
@Service
public class StudiosCsvServ {
    private static final Logger logger = LoggerFactory.getLogger(StudiosCsvServ.class);
    private static final int BATCH_SIZE = 1000;

    private final StudioRepo studioRepo;
    private final Resource csvFile;
    private final EntityManager entityManager;
    private final JdbcTemplate jdbcTemplate;

    public StudiosCsvServ(
            StudioRepo studioRepo,
            @Value("classpath:csv/studios.csv") Resource csvFile,
            EntityManager entityManager,
            JdbcTemplate jdbcTemplate) {
        this.studioRepo = studioRepo;
        this.csvFile = csvFile;
        this.entityManager = entityManager;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public boolean isAlreadyLoaded() {
        try {
            if (!tableExists("studio")) {
                return false;
            }
            return studioRepo.count() > 0;
        } catch (Exception e) {
            logger.warn("Errore nel verificare lo stato del caricamento", e);
            return false;
        }
    }

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

    @Transactional
    public void loadStudios() {
        if (isAlreadyLoaded()) {
            logger.info("SKIP - Tabella Studio già popolata");
            return;
        }

        createTableIfNotExists();

        List<Studio> validStudios = new ArrayList<>();
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

                    Studio studio = new Studio();
                    try {
                        studio.setMovieId(Long.parseLong(values[0].trim()));
                    } catch (NumberFormatException e) {
                        skippedRows.incrementAndGet();
                        logger.warn("SKIP - Riga {}: movie_id non numerico", lineNumber);
                        continue;
                    }

                    studio.setStudio(values[1].trim().replaceAll("^\"|\"$", ""));

                    validStudios.add(studio);

                } catch (Exception e) {
                    skippedRows.incrementAndGet();
                    logger.error("ERR - Riga {}: {}", lineNumber, e.getMessage());
                }
            }

            if (!validStudios.isEmpty()) {
                // Batch processing ottimizzato per JPA
                int batchSize = 1000;
                for (int i = 0; i < validStudios.size(); i++) {
                    entityManager.persist(validStudios.get(i));

                    if (i % batchSize == 0 && i > 0) {
                        entityManager.flush();
                        entityManager.clear();
                    }
                }

                logger.info("SUCCESS - Caricati {} studi ({} righe processate, {} saltate)",
                        validStudios.size(), processedRows.get(), skippedRows.get());
            } else {
                logger.warn("WARN - Nessuno studio valido trovato");
            }

        } catch (IOException e) {
            logger.error("CRITICAL - Errore accesso file CSV", e);
            throw new RuntimeException("Errore di lettura file CSV", e);
        }
    }

    private void createTableIfNotExists() {
        try {
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS studio (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "movie_id BIGINT NOT NULL, " +
                    "studio VARCHAR(1000) NOT NULL)");
            logger.info("Tabella studio verificata/creata con successo");
        } catch (Exception e) {
            logger.error("Errore nella creazione della tabella studio", e);
            throw new RuntimeException("Impossibile creare la tabella studio", e);
        }
    }
}